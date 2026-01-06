import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function escapeCSV(value: string | null | undefined): string {
  if (!value) return ''
  // Escape quotes and wrap in quotes if contains special characters
  const escaped = value.replace(/"/g, '""')
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`
  }
  return escaped
}

export async function GET(request: NextRequest): Promise<NextResponse> {
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
      const taskIds = filteredEntries.map(e => e.task_id).filter(Boolean)

      const { data: taggedTasks } = await supabase
        .from('item_tags')
        .select('item_id')
        .eq('item_type', 'task')
        .in('tag_id', tagIds)
        .in('item_id', taskIds)

      const taggedTaskIds = new Set(taggedTasks?.map(t => t.item_id) || [])
      filteredEntries = filteredEntries.filter(e => taggedTaskIds.has(e.task_id))
    }

    // Get tags for each task
    const taskIds = [...new Set(filteredEntries.map(e => e.task_id).filter(Boolean))]
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

    // Build CSV
    const header = 'Dátum,Používateľ,Oddelenie,Projekt,Úloha,Tagy,Trvanie,Popis\n'

    const rows = filteredEntries.map(e => {
      const userData = e.users as any
      const areaData = e.areas as any
      const projectData = e.projects as any
      const taskData = e.tasks as any
      const tags = taskTagsMap.get(e.task_id) || []

      const date = e.started_at.split('T')[0]
      const userName = userData?.nickname || userData?.full_name || ''
      const areaName = areaData?.name || ''
      const projectName = projectData?.name || ''
      const taskTitle = taskData?.title || ''
      const tagsString = tags.join(', ')
      const duration = formatDuration(e.duration_seconds || 0)
      const description = e.description || ''

      return [
        date,
        escapeCSV(userName),
        escapeCSV(areaName),
        escapeCSV(projectName),
        escapeCSV(taskTitle),
        escapeCSV(tagsString),
        duration,
        escapeCSV(description),
      ].join(',')
    })

    const csv = header + rows.join('\n')

    // Return CSV file
    const filename = `time-report-${from}-${to}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Time export error:', error)
    return NextResponse.json({ error: 'Nastala neočakávaná chyba' }, { status: 500 })
  }
}
