'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry } from '@/types'

export function useTimeTracking(taskId?: string) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const fetchTimeEntries = useCallback(async () => {
    if (!taskId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId)
        .order('started_at', { ascending: false })

      if (error) throw error
      setTimeEntries(data || [])

      // Check for active (running) entry
      const running = data?.find((entry) => !entry.ended_at)
      if (running) {
        setActiveEntry(running)
        const startTime = new Date(running.started_at).getTime()
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setElapsedSeconds(elapsed)
      }
    } catch (err) {
      console.error('Error fetching time entries:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, taskId])

  useEffect(() => {
    fetchTimeEntries()
  }, [fetchTimeEntries])

  // Timer interval
  useEffect(() => {
    if (activeEntry) {
      intervalRef.current = setInterval(() => {
        const startTime = new Date(activeEntry.started_at).getTime()
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setElapsedSeconds(elapsed)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setElapsedSeconds(0)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [activeEntry])

  const startTimer = async () => {
    if (!taskId) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        task_id: taskId,
        user_id: user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    setActiveEntry(data)
    setElapsedSeconds(0)
  }

  const stopTimer = async () => {
    if (!activeEntry) return

    const endedAt = new Date()
    const startedAt = new Date(activeEntry.started_at)
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

    const { error } = await supabase
      .from('time_entries')
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', activeEntry.id)

    if (error) throw error

    // Update task total time
    if (taskId) {
      const { data: task } = await supabase
        .from('tasks')
        .select('total_time_seconds')
        .eq('id', taskId)
        .single()

      const newTotal = (task?.total_time_seconds || 0) + durationSeconds

      await supabase
        .from('tasks')
        .update({ total_time_seconds: newTotal })
        .eq('id', taskId)
    }

    setActiveEntry(null)
    setElapsedSeconds(0)
    fetchTimeEntries()
  }

  const deleteTimeEntry = async (entryId: string) => {
    const entry = timeEntries.find((e) => e.id === entryId)
    if (!entry) return

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId)

    if (error) throw error

    // Update task total time if entry had duration
    if (taskId && entry.duration_seconds) {
      const { data: task } = await supabase
        .from('tasks')
        .select('total_time_seconds')
        .eq('id', taskId)
        .single()

      const newTotal = Math.max(0, (task?.total_time_seconds || 0) - entry.duration_seconds)

      await supabase
        .from('tasks')
        .update({ total_time_seconds: newTotal })
        .eq('id', taskId)
    }

    fetchTimeEntries()
  }

  const totalTime = timeEntries.reduce(
    (acc, entry) => acc + (entry.duration_seconds || 0),
    0
  )

  return {
    timeEntries,
    activeEntry,
    elapsedSeconds,
    totalTime,
    loading,
    isRunning: !!activeEntry,
    startTimer,
    stopTimer,
    deleteTimeEntry,
    refetch: fetchTimeEntries,
  }
}
