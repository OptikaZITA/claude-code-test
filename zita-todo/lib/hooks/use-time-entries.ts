'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry } from '@/types'

export interface UpdateTimeEntryData {
  task_id?: string
  description?: string
  started_at?: string
  stopped_at?: string
  mode?: 'duration' | 'range'
}

export interface CreateTimeEntryData {
  task_id: string
  description?: string
  started_at: string
  stopped_at: string
  mode?: 'duration' | 'range'
}

// Truncate a Date to minute precision (zero out seconds and milliseconds)
function truncateToMinute(date: Date): Date {
  const d = new Date(date)
  d.setSeconds(0, 0)
  return d
}

// Build a localized overlap warning string from raw timestamps
function formatOverlapWarning(overlap: { started_at: string; ended_at: string }): string {
  const start = new Date(overlap.started_at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
  const end = new Date(overlap.ended_at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
  return `Pozor: Časový záznam sa prekrýva s iným záznamom (${start} – ${end})`
}

// Client-side overlap check (minute precision to avoid false positives)
async function checkOverlap(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  startedAt: string,
  endedAt: string,
  excludeId?: string
): Promise<{ hasOverlap: boolean; overlappingEntry?: { started_at: string; ended_at: string } }> {
  const bufferMs = 60000
  const queryStart = new Date(new Date(startedAt).getTime() - bufferMs).toISOString()
  const queryEnd = new Date(new Date(endedAt).getTime() + bufferMs).toISOString()

  let query = supabase
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

  const newStart = truncateToMinute(new Date(startedAt))
  const newEnd = truncateToMinute(new Date(endedAt))

  for (const entry of data) {
    if (!entry.ended_at) continue
    const entryStart = truncateToMinute(new Date(entry.started_at))
    const entryEnd = truncateToMinute(new Date(entry.ended_at))

    if (newStart < entryEnd && entryStart < newEnd) {
      return { hasOverlap: true, overlappingEntry: { started_at: entry.started_at, ended_at: entry.ended_at } }
    }
  }

  return { hasOverlap: false }
}

// Hook for updating a time entry (direct Supabase call)
export function useUpdateTimeEntry() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const updateTimeEntry = useCallback(async (id: string, data: UpdateTimeEntryData): Promise<{ data: TimeEntry | null; error: Error | null; warning: string | null }> => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nie ste prihlásený')

      const { started_at, stopped_at, mode, ...rest } = data

      // Build update object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = { ...rest }

      if (started_at) updates.started_at = started_at
      if (stopped_at) updates.ended_at = stopped_at

      if (started_at && stopped_at) {
        const start = new Date(started_at)
        const stop = new Date(stopped_at)
        if (stop <= start) throw new Error('Koniec musí byť po začiatku')
        updates.duration_seconds = Math.floor((stop.getTime() - start.getTime()) / 1000)
      }

      // If task_id changed, update denormalized fields
      if (data.task_id) {
        const { data: task } = await supabase
          .from('tasks')
          .select('project_id, area_id, organization_id')
          .eq('id', data.task_id)
          .single()

        if (task) {
          updates.project_id = task.project_id
          updates.area_id = task.area_id
          updates.organization_id = task.organization_id
        }
      }

      const { data: result, error: updateErr } = await supabase
        .from('time_entries')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateErr) throw new Error(updateErr.message || 'Chyba pri aktualizácii')

      // Check for overlap warning (non-blocking)
      let warning: string | null = null
      if (mode !== 'duration' && started_at && stopped_at) {
        const { hasOverlap, overlappingEntry } = await checkOverlap(supabase, user.id, started_at, stopped_at, id)
        if (hasOverlap && overlappingEntry) {
          warning = formatOverlapWarning(overlappingEntry)
        }
      }

      return { data: result as TimeEntry, error: null, warning }
    } catch (err) {
      const error = err as Error
      setError(error)
      return { data: null, error, warning: null }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return { updateTimeEntry, loading, error }
}

// Hook for deleting (soft delete) a time entry (direct Supabase call)
export function useDeleteTimeEntry() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const deleteTimeEntry = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nie ste prihlásený')

      const { error: deleteErr } = await supabase
        .from('time_entries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)

      if (deleteErr) throw new Error(deleteErr.message || 'Chyba pri mazaní')

      return true
    } catch (err) {
      setError(err as Error)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return { deleteTimeEntry, loading, error }
}

// Hook for creating a manual time entry (direct Supabase call)
export function useCreateTimeEntry() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const createTimeEntry = useCallback(async (data: CreateTimeEntryData): Promise<{ data: TimeEntry | null; error: Error | null; warning: string | null }> => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nie ste prihlásený')

      const { task_id, description, started_at, stopped_at, mode } = data

      if (!task_id) throw new Error('task_id je povinný')
      if (!started_at || !stopped_at) throw new Error('started_at a stopped_at sú povinné')

      const start = new Date(started_at)
      const stop = new Date(stopped_at)
      if (stop <= start) throw new Error('Koniec musí byť po začiatku')

      const duration_seconds = Math.floor((stop.getTime() - start.getTime()) / 1000)

      // Get task details for denormalization
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('project_id, area_id, organization_id')
        .eq('id', task_id)
        .single()

      if (taskError || !task) throw new Error('Úloha nebola nájdená')

      // Insert time entry
      const { data: result, error: insertError } = await supabase
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

      if (insertError) throw new Error(insertError.message || 'Chyba pri vytváraní záznamu')

      // Check for overlap warning (non-blocking — only in range mode)
      let warning: string | null = null
      if (mode !== 'duration') {
        const { hasOverlap, overlappingEntry } = await checkOverlap(supabase, user.id, started_at, stopped_at)
        if (hasOverlap && overlappingEntry) {
          warning = formatOverlapWarning(overlappingEntry)
        }
      }

      return { data: result as TimeEntry, error: null, warning }
    } catch (err) {
      const error = err as Error
      setError(error)
      return { data: null, error, warning: null }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return { createTimeEntry, loading, error }
}

// Hook for getting a single time entry
export function useTimeEntry(id: string | null) {
  const [entry, setEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchEntry = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchErr } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (fetchErr) throw new Error(fetchErr.message || 'Chyba pri načítaní')
      setEntry(data as TimeEntry)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [id, supabase])

  return { entry, loading, error, refetch: fetchEntry }
}
