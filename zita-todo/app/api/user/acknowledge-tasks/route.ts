import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AcknowledgeResponse {
  success: boolean
  acknowledged_at: string
  tasks_acknowledged: number
}

export async function POST(request: NextRequest): Promise<NextResponse<AcknowledgeResponse | { error: string }>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Get current last_acknowledged to count new tasks
    const { data: settings } = await supabase
      .from('user_settings')
      .select('last_acknowledged')
      .eq('user_id', user.id)
      .single()

    // Count tasks that will be acknowledged
    // Filter: MOJE úlohy (created_by alebo assignee_id)
    let countQuery = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('when_type', 'today')
      .is('deleted_at', null)
      .not('status', 'in', '("done","canceled")')
      .or(`created_by.eq.${user.id},assignee_id.eq.${user.id}`)

    // Filter by added_to_today_at > last_acknowledged if exists
    if (settings?.last_acknowledged) {
      countQuery = countQuery.gt('added_to_today_at', settings.last_acknowledged)
    } else {
      // If no last_acknowledged, count all tasks in Today with added_to_today_at
      countQuery = countQuery.not('added_to_today_at', 'is', null)
    }

    const { count } = await countQuery

    // Upsert user_settings with new last_acknowledged
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        last_acknowledged: now,
        updated_at: now,
      }, {
        onConflict: 'user_id',
      })

    if (upsertError) {
      console.error('Error upserting user_settings:', upsertError)
      return NextResponse.json({ error: 'Chyba pri aktualizácii nastavení' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      acknowledged_at: now,
      tasks_acknowledged: count || 0,
    })
  } catch (error) {
    console.error('Error acknowledging tasks:', error)
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 })
  }
}

// GET endpoint to retrieve new tasks count
export async function GET(request: NextRequest): Promise<NextResponse<{
  count: number
  last_acknowledged: string | null
  counts_by_area: Record<string, number>
  counts_by_project: Record<string, number>
} | { error: string }>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 })
    }

    // Get last_acknowledged
    const { data: settings } = await supabase
      .from('user_settings')
      .select('last_acknowledged')
      .eq('user_id', user.id)
      .single()

    // Fetch new tasks with area_id and project_id for grouping
    // Filter: MOJE úlohy (created_by alebo assignee_id)
    let tasksQuery = supabase
      .from('tasks')
      .select('id, area_id, project_id')
      .eq('when_type', 'today')
      .is('deleted_at', null)
      .not('status', 'in', '("done","canceled")')
      .not('added_to_today_at', 'is', null)
      .or(`created_by.eq.${user.id},assignee_id.eq.${user.id}`)

    if (settings?.last_acknowledged) {
      tasksQuery = tasksQuery.gt('added_to_today_at', settings.last_acknowledged)
    }

    const { data: tasks, error: tasksError } = await tasksQuery

    if (tasksError) {
      console.error('Error fetching new tasks:', tasksError)
      return NextResponse.json({ error: 'Chyba pri načítaní úloh' }, { status: 500 })
    }

    // Group by area_id and project_id
    const countsByArea: Record<string, number> = {}
    const countsByProject: Record<string, number> = {}

    tasks?.forEach(task => {
      if (task.area_id) {
        countsByArea[task.area_id] = (countsByArea[task.area_id] || 0) + 1
      }
      if (task.project_id) {
        countsByProject[task.project_id] = (countsByProject[task.project_id] || 0) + 1
      }
    })

    return NextResponse.json({
      count: tasks?.length || 0,
      last_acknowledged: settings?.last_acknowledged || null,
      counts_by_area: countsByArea,
      counts_by_project: countsByProject,
    })
  } catch (error) {
    console.error('Error getting new tasks count:', error)
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 })
  }
}
