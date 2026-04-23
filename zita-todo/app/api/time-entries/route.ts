import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Truncate a Date to minute precision (zero out seconds and milliseconds)
function truncateToMinute(date: Date): Date {
  const d = new Date(date)
  d.setSeconds(0, 0)
  return d
}

// Helper function to check for overlapping time entries (uses admin client)
// Uses minute-precision comparison to avoid false positives from timer seconds
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkOverlapAdmin(
  client: any,
  userId: string,
  startedAt: string,
  endedAt: string,
  excludeId?: string
): Promise<{ hasOverlap: boolean; overlappingEntry?: { id: string; started_at: string; ended_at: string } }> {
  // Fetch potential overlapping entries with a 1-minute buffer
  const bufferMs = 60000
  const queryStart = new Date(new Date(startedAt).getTime() - bufferMs).toISOString()
  const queryEnd = new Date(new Date(endedAt).getTime() + bufferMs).toISOString()

  let query = client
    .from('time_entries')
    .select('id, started_at, ended_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .lt('started_at', queryEnd)
    .gt('ended_at', queryStart)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query.limit(20)

  if (error || !data || data.length === 0) {
    return { hasOverlap: false }
  }

  // Check overlap at minute precision in JavaScript
  const newStart = truncateToMinute(new Date(startedAt))
  const newEnd = truncateToMinute(new Date(endedAt))

  for (const entry of data) {
    if (!entry.ended_at) continue // skip running timers
    const entryStart = truncateToMinute(new Date(entry.started_at))
    const entryEnd = truncateToMinute(new Date(entry.ended_at))

    // Two intervals overlap if: start1 < end2 AND start2 < end1
    if (newStart < entryEnd && entryStart < newEnd) {
      return { hasOverlap: true, overlappingEntry: entry }
    }
  }

  return { hasOverlap: false }
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
    const { task_id, description, started_at, stopped_at, mode } = body

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

    // Check for overlapping entries only in range mode
    // In duration mode, user only specifies how long they worked, not exact time slot
    if (mode !== 'duration') {
      const { hasOverlap, overlappingEntry } = await checkOverlapAdmin(
        adminClient,
        user.id,
        started_at,
        stopped_at
      )

      if (hasOverlap && overlappingEntry) {
        // Return raw timestamps so the frontend can format in user's local timezone
        return NextResponse.json(
          {
            error: 'Časový záznam sa prekrýva s iným záznamom',
            overlap: {
              started_at: overlappingEntry.started_at,
              ended_at: overlappingEntry.ended_at,
            },
          },
          { status: 400 }
        )
      }
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
