import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'

// Helper function to check for overlapping time entries
async function checkOverlap(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  startedAt: string,
  endedAt: string,
  excludeId?: string
): Promise<{ hasOverlap: boolean; overlappingEntry?: { id: string; started_at: string; ended_at: string } }> {
  let query = supabase
    .from('time_entries')
    .select('id, started_at, ended_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .lt('started_at', endedAt)  // existing start < new end
    .gt('ended_at', startedAt)  // existing end > new start

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query.limit(1)

  if (error || !data || data.length === 0) {
    return { hasOverlap: false }
  }

  return { hasOverlap: true, overlappingEntry: data[0] }
}

// PUT /api/time-entries/[id] - Update time entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { task_id, description, started_at, stopped_at } = body

    // Validate times
    if (started_at && stopped_at) {
      const start = new Date(started_at)
      const stop = new Date(stopped_at)
      if (stop <= start) {
        return NextResponse.json(
          { error: 'Koniec musí byť po začiatku' },
          { status: 400 }
        )
      }
    }

    // Get the existing entry to check ownership
    const { data: existingEntry, error: fetchError } = await supabase
      .from('time_entries')
      .select('*, user:users!time_entries_user_id_fkey(role)')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingEntry) {
      return NextResponse.json({ error: 'Záznam nebol nájdený' }, { status: 404 })
    }

    // Check if user can edit (owner or admin)
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isOwner = existingEntry.user_id === user.id
    const isAdmin = currentUser?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Nemáte oprávnenie upraviť tento záznam' },
        { status: 403 }
      )
    }

    // Calculate duration if both times provided
    let duration_seconds = existingEntry.duration_seconds
    const finalStartedAt = started_at || existingEntry.started_at
    const finalEndedAt = stopped_at || existingEntry.ended_at

    if (started_at && stopped_at) {
      const start = new Date(started_at)
      const stop = new Date(stopped_at)
      duration_seconds = Math.floor((stop.getTime() - start.getTime()) / 1000)
    }

    // Check for overlapping entries
    if (finalStartedAt && finalEndedAt) {
      const { hasOverlap, overlappingEntry } = await checkOverlap(
        supabase,
        existingEntry.user_id,
        finalStartedAt,
        finalEndedAt,
        id // exclude current entry
      )

      if (hasOverlap && overlappingEntry) {
        const overlapStart = format(parseISO(overlappingEntry.started_at), 'HH:mm', { locale: sk })
        const overlapEnd = format(parseISO(overlappingEntry.ended_at), 'HH:mm', { locale: sk })
        return NextResponse.json(
          { error: `Časový záznam sa prekrýva s iným záznamom (${overlapStart} – ${overlapEnd})` },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (task_id !== undefined) updateData.task_id = task_id
    if (description !== undefined) updateData.description = description
    if (started_at !== undefined) updateData.started_at = started_at
    if (stopped_at !== undefined) updateData.ended_at = stopped_at
    if (duration_seconds !== undefined) updateData.duration_seconds = duration_seconds

    const { data, error } = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Chyba pri aktualizácii' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PUT /api/time-entries/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/time-entries/[id] - Soft delete time entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the existing entry to check ownership
    const { data: existingEntry, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingEntry) {
      return NextResponse.json({ error: 'Záznam nebol nájdený' }, { status: 404 })
    }

    // Check if user can delete (owner or admin)
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isOwner = existingEntry.user_id === user.id
    const isAdmin = currentUser?.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Nemáte oprávnenie vymazať tento záznam' },
        { status: 403 }
      )
    }

    // Soft delete - set deleted_at timestamp
    const { data, error } = await supabase
      .from('time_entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json({ error: 'Chyba pri mazaní' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id, deleted_at: data.deleted_at })
  } catch (error) {
    console.error('DELETE /api/time-entries/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/time-entries/[id] - Get single time entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        task:tasks(id, title),
        user:users!time_entries_user_id_fkey(id, full_name, nickname)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Záznam nebol nájdený' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/time-entries/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
