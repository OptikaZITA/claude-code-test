import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface TimeEntry {
  id: string
  date: string
  startedAt: string  // Full timestamp for time display
  endedAt: string | null  // Full timestamp for end time
  userId: string
  userName: string
  userNickname: string
  areaId: string | null
  areaName: string | null
  projectId: string | null
  projectName: string | null
  taskId: string
  taskTitle: string
  tags: string[]
  durationSeconds: number
  description: string | null
}

interface SummaryItem {
  id: string
  label: string
  type: 'user' | 'area' | 'project' | 'tag'
  totalSeconds: number
  percent: number
}

interface DayEntry {
  date: string
  totalSeconds: number
}

interface TimeReportResponse {
  totalSeconds: number
  entryCount: number
  avgPerDay: number
  summary: SummaryItem[]
  byDay: DayEntry[]
  entries: TimeEntry[]
}

export async function GET(request: NextRequest): Promise<NextResponse<TimeReportResponse | { error: string }>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const groupBy = searchParams.get('groupBy') || 'user'
    const onlyMine = searchParams.get('onlyMine') === 'true'
    const userIds = searchParams.getAll('userId')
    const areaIds = searchParams.getAll('areaId')
    const projectIds = searchParams.getAll('projectId')
    const tagIds = searchParams.getAll('tagId')

    // Validate required parameters
    if (!from || !to) {
      return NextResponse.json({ error: 'Parametre from a to sú povinné' }, { status: 400 })
    }

    // Build base query
    let query = supabase
      .from('time_entries')
      .select(`
        id,
        started_at,
        ended_at,
        duration_seconds,
        description,
        user_id,
        area_id,
        project_id,
        task_id,
        users!inner (
          id,
          full_name,
          nickname
        ),
        areas (
          id,
          name
        ),
        projects (
          id,
          name
        ),
        tasks (
          id,
          title,
          is_private,
          created_by,
          assignee_id,
          inbox_user_id
        )
      `)
      .is('deleted_at', null)
      .gte('started_at', from)
      .lt('started_at', to)
      .not('duration_seconds', 'is', null)
      .order('started_at', { ascending: false })

    // Apply filters
    if (onlyMine) {
      query = query.eq('user_id', user.id)
    }

    if (userIds.length > 0) {
      query = query.in('user_id', userIds)
    }

    if (areaIds.length > 0) {
      query = query.in('area_id', areaIds)
    }

    if (projectIds.length > 0) {
      query = query.in('project_id', projectIds)
    }

    const { data: rawEntries, error: entriesError } = await query

    if (entriesError) {
      console.error('Error fetching time entries:', entriesError)
      return NextResponse.json({ error: 'Chyba pri načítaní záznamov' }, { status: 500 })
    }

    // Filter by tags if needed
    let filteredEntries = rawEntries || []
    if (tagIds.length > 0 && filteredEntries.length > 0) {
      const taskIdsForFilter = filteredEntries.map(e => e.task_id).filter(Boolean)

      const { data: taggedTasks } = await supabase
        .from('task_tags')
        .select('task_id')
        .in('tag_id', tagIds)
        .in('task_id', taskIdsForFilter)

      const taggedTaskIds = new Set(taggedTasks?.map(t => t.task_id) || [])
      filteredEntries = filteredEntries.filter(e => taggedTaskIds.has(e.task_id))
    }

    // Get tags for each task
    const taskIds = [...new Set(filteredEntries.map(e => e.task_id).filter(Boolean))]
    let taskTagsMap = new Map<string, string[]>()

    if (taskIds.length > 0) {
      const { data: taskTagsData } = await supabase
        .from('task_tags')
        .select(`
          task_id,
          tags (
            name
          )
        `)
        .in('task_id', taskIds)

      if (taskTagsData) {
        taskTagsData.forEach(tt => {
          const current = taskTagsMap.get(tt.task_id) || []
          const tagName = (tt.tags as any)?.name
          if (tagName) {
            current.push(tagName)
            taskTagsMap.set(tt.task_id, current)
          }
        })
      }
    }

    // Transform entries
    const entries: TimeEntry[] = filteredEntries.map(e => {
      const userData = e.users as any
      const areaData = e.areas as any
      const projectData = e.projects as any
      const taskData = e.tasks as any

      // Anonymizácia súkromných úloh iných používateľov
      const isTaskPrivate = taskData?.is_private === true
      const isTaskOwner =
        taskData?.created_by === user.id ||
        taskData?.assignee_id === user.id ||
        taskData?.inbox_user_id === user.id ||
        e.user_id === user.id  // Alebo je to môj time entry

      // Ak je úloha súkromná a nie som vlastník, anonymizuj názov
      const taskTitle = isTaskPrivate && !isTaskOwner
        ? '🔒 Súkromná úloha'
        : (taskData?.title || '')

      // Extract date - handle both ISO format (with T) and Postgres format (with space)
      const dateStr = e.started_at.includes('T')
        ? e.started_at.split('T')[0]
        : e.started_at.split(' ')[0]

      return {
        id: e.id,
        date: dateStr,
        startedAt: e.started_at,  // Full timestamp for time display
        endedAt: e.ended_at,  // Full timestamp for end time
        userId: e.user_id,
        userName: userData?.full_name || '',
        userNickname: userData?.nickname || userData?.full_name || '',
        areaId: e.area_id,
        areaName: areaData?.name || null,
        projectId: e.project_id,
        projectName: projectData?.name || null,
        taskId: e.task_id,
        taskTitle,
        tags: isTaskPrivate && !isTaskOwner ? [] : (taskTagsMap.get(e.task_id) || []),  // Skry aj tagy
        durationSeconds: e.duration_seconds || 0,
        description: isTaskPrivate && !isTaskOwner ? null : e.description,  // Skry aj popis
      }
    })

    // Calculate totals
    const totalSeconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0)
    const entryCount = entries.length

    // Calculate unique days
    const uniqueDays = new Set(entries.map(e => e.date))
    const avgPerDay = uniqueDays.size > 0 ? Math.round(totalSeconds / uniqueDays.size) : 0

    // Calculate summary by groupBy
    const summary: SummaryItem[] = []
    if (groupBy === 'user') {
      const byUser = new Map<string, { label: string; total: number }>()
      entries.forEach(e => {
        const current = byUser.get(e.userId) || { label: e.userNickname, total: 0 }
        current.total += e.durationSeconds
        byUser.set(e.userId, current)
      })
      byUser.forEach((value, key) => {
        summary.push({
          id: key,
          label: value.label,
          type: 'user',
          totalSeconds: value.total,
          percent: totalSeconds > 0 ? Math.round((value.total / totalSeconds) * 1000) / 10 : 0,
        })
      })
    } else if (groupBy === 'area') {
      const byArea = new Map<string, { label: string; total: number }>()
      entries.forEach(e => {
        if (e.areaId) {
          const current = byArea.get(e.areaId) || { label: e.areaName || 'Bez oddelenia', total: 0 }
          current.total += e.durationSeconds
          byArea.set(e.areaId, current)
        } else {
          const current = byArea.get('none') || { label: 'Bez oddelenia', total: 0 }
          current.total += e.durationSeconds
          byArea.set('none', current)
        }
      })
      byArea.forEach((value, key) => {
        summary.push({
          id: key,
          label: value.label,
          type: 'area',
          totalSeconds: value.total,
          percent: totalSeconds > 0 ? Math.round((value.total / totalSeconds) * 1000) / 10 : 0,
        })
      })
    } else if (groupBy === 'project') {
      const byProject = new Map<string, { label: string; total: number }>()
      entries.forEach(e => {
        if (e.projectId) {
          const current = byProject.get(e.projectId) || { label: e.projectName || 'Bez projektu', total: 0 }
          current.total += e.durationSeconds
          byProject.set(e.projectId, current)
        } else {
          const current = byProject.get('none') || { label: 'Bez projektu', total: 0 }
          current.total += e.durationSeconds
          byProject.set('none', current)
        }
      })
      byProject.forEach((value, key) => {
        summary.push({
          id: key,
          label: value.label,
          type: 'project',
          totalSeconds: value.total,
          percent: totalSeconds > 0 ? Math.round((value.total / totalSeconds) * 1000) / 10 : 0,
        })
      })
    } else if (groupBy === 'tag') {
      const byTag = new Map<string, { label: string; total: number }>()
      entries.forEach(e => {
        if (e.tags && e.tags.length > 0) {
          // Entry can have multiple tags - add duration to each tag
          e.tags.forEach(tagName => {
            const current = byTag.get(tagName) || { label: tagName, total: 0 }
            current.total += e.durationSeconds
            byTag.set(tagName, current)
          })
        } else {
          const current = byTag.get('none') || { label: 'Bez tagu', total: 0 }
          current.total += e.durationSeconds
          byTag.set('none', current)
        }
      })
      byTag.forEach((value, key) => {
        summary.push({
          id: key,
          label: value.label,
          type: 'tag',
          totalSeconds: value.total,
          percent: totalSeconds > 0 ? Math.round((value.total / totalSeconds) * 1000) / 10 : 0,
        })
      })
    }

    // Sort summary by totalSeconds descending
    summary.sort((a, b) => b.totalSeconds - a.totalSeconds)

    // Calculate byDay - include ALL days in the range, even with 0 hours
    const byDayMap = new Map<string, number>()

    // First, populate with actual entry data
    entries.forEach(e => {
      const current = byDayMap.get(e.date) || 0
      byDayMap.set(e.date, current + e.durationSeconds)
    })

    // Generate all dates in the range (avoid timezone issues by using local date parts)
    const allDates: string[] = []
    const [startYear, startMonth, startDay] = from.split('-').map(Number)
    const [endYear, endMonth, endDay] = to.split('-').map(Number)

    // Use local dates to avoid UTC conversion issues
    const currentDate = new Date(startYear, startMonth - 1, startDay)
    const endDate = new Date(endYear, endMonth - 1, endDay)

    while (currentDate < endDate) {
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      allDates.push(`${year}-${month}-${day}`)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Create byDay array with all dates (0 for days without entries)
    const byDay: DayEntry[] = allDates.map(date => ({
      date,
      totalSeconds: byDayMap.get(date) || 0,
    }))

    return NextResponse.json({
      totalSeconds,
      entryCount,
      avgPerDay,
      summary,
      byDay,
      entries,
    })
  } catch (error) {
    console.error('Time report error:', error)
    return NextResponse.json({ error: 'Nastala neočakávaná chyba' }, { status: 500 })
  }
}
