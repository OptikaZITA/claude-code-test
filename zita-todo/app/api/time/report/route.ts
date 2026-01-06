import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface TimeEntry {
  id: string
  date: string
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
  type: 'user' | 'area' | 'project'
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
        duration_seconds,
        description,
        user_id,
        area_id,
        project_id,
        todo_id,
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
        tasks!time_entries_todo_id_fkey (
          id,
          title
        )
      `)
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
      const taskIds = filteredEntries.map(e => e.todo_id).filter(Boolean)

      const { data: taggedTasks } = await supabase
        .from('item_tags')
        .select('item_id')
        .eq('item_type', 'task')
        .in('tag_id', tagIds)
        .in('item_id', taskIds)

      const taggedTaskIds = new Set(taggedTasks?.map(t => t.item_id) || [])
      filteredEntries = filteredEntries.filter(e => taggedTaskIds.has(e.todo_id))
    }

    // Get tags for each task
    const taskIds = [...new Set(filteredEntries.map(e => e.todo_id).filter(Boolean))]
    let taskTagsMap = new Map<string, string[]>()

    if (taskIds.length > 0) {
      const { data: itemTags } = await supabase
        .from('item_tags')
        .select(`
          item_id,
          tags (
            name
          )
        `)
        .eq('item_type', 'task')
        .in('item_id', taskIds)

      if (itemTags) {
        itemTags.forEach(it => {
          const current = taskTagsMap.get(it.item_id) || []
          const tagName = (it.tags as any)?.name
          if (tagName) {
            current.push(tagName)
            taskTagsMap.set(it.item_id, current)
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

      return {
        id: e.id,
        date: e.started_at.split('T')[0],
        userId: e.user_id,
        userName: userData?.full_name || '',
        userNickname: userData?.nickname || userData?.full_name || '',
        areaId: e.area_id,
        areaName: areaData?.name || null,
        projectId: e.project_id,
        projectName: projectData?.name || null,
        taskId: e.todo_id,
        taskTitle: taskData?.title || '',
        tags: taskTagsMap.get(e.todo_id) || [],
        durationSeconds: e.duration_seconds || 0,
        description: e.description,
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
    }

    // Sort summary by totalSeconds descending
    summary.sort((a, b) => b.totalSeconds - a.totalSeconds)

    // Calculate byDay
    const byDayMap = new Map<string, number>()
    entries.forEach(e => {
      const current = byDayMap.get(e.date) || 0
      byDayMap.set(e.date, current + e.durationSeconds)
    })
    const byDay: DayEntry[] = Array.from(byDayMap.entries())
      .map(([date, totalSeconds]) => ({ date, totalSeconds }))
      .sort((a, b) => a.date.localeCompare(b.date))

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
