import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'

// Helper function to check for overlapping time entries (uses admin client)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkOverlapAdmin(
  client: any,
  userId: string,
  startedAt: string,
  endedAt: string
): Promise<{ hasOverlap: boolean; overlappingEntry?: { id: string; started_at: string; ended_at: string } }> {
  const { data, error } = await client
    .from('time_entries')
    .select('id, started_at, ended_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .lt('started_at', endedAt)  // existing start < new end
    .gt('ended_at', startedAt)  // existing end > new start
    .limit(1)

  if (error || !data || data.length === 0) {
    return { hasOverlap: false }
  }

  return { hasOverlap: true, overlappingEntry: data[0] }
}

// POST /api/time-entries - Create manual time entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { task_id, description, started_at, stopped_at } = body

    // Validate required fields
    if (!task_id) {
      return NextResponse.json({ error: 'task_id je povinný' }, { status: 400 })
    }

    if (!started_at || !stopped_at) {
      return NextResponse.json(
        { error: 'started_at a stopped_at sú povinné' },
        { status: 400 }
      )
    }

    // Validate times
    const start = new Date(started_at)
    const stop = new Date(stopped_at)

    if (stop <= start) {
      return NextResponse.json(
        { error: 'Koniec musí byť po začiatku' },
        { status: 400 }
      )
    }

    // Calculate duration
    const duration_seconds = Math.floor((stop.getTime() - start.getTime()) / 1000)

    // Use admin client for all operations to bypass RLS issues
    const adminClient = createAdminClient()

    // Check for overlapping entries (use admin client)
    const { hasOverlap, overlappingEntry } = await checkOverlapAdmin(
      adminClient,
      user.id,
      started_at,
      stopped_at
    )

    if (hasOverlap && overlappingEntry) {
      const overlapStart = format(parseISO(overlappingEntry.started_at), 'HH:mm', { locale: sk })
      const overlapEnd = format(parseISO(overlappingEntry.ended_at), 'HH:mm', { locale: sk })
      return NextResponse.json(
        { error: `Časový záznam sa prekrýva s iným záznamom (${overlapStart} – ${overlapEnd})` },
        { status: 400 }
      )
    }

    // Get task details for denormalization
    const { data: task, error: taskError } = await adminClient
      .from('tasks')
      .select('project_id, area_id, organization_id')
      .eq('id', task_id)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Úloha nebola nájdená' }, { status: 404 })
    }

    // Create time entry
    const { data, error } = await adminClient
      .from('time_entries')
      .insert({
        user_id: user.id,
        task_id,
        project_id: task.project_id,
        area_id: task.area_id,
        organization_id: task.organization_id,
        description: description || null,
        started_at,
        ended_at: stopped_at,
        duration_seconds,
        entry_type: 'task',
        is_running: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Create error:', error)
      return NextResponse.json({ error: 'Chyba pri vytváraní záznamu' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/time-entries error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/time-entries - List time entries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('task_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('time_entries')
      .select(`
        *,
        task:tasks(id, title),
        user:users!time_entries_user_id_fkey(id, full_name, nickname, avatar_url)
      `)
      .is('deleted_at', null)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (taskId) {
      query = query.eq('task_id', taskId)
    }

    const { data, error } = await query

    if (error) {
      console.error('List error:', error)
      return NextResponse.json({ error: 'Chyba pri načítaní záznamov' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/time-entries error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
