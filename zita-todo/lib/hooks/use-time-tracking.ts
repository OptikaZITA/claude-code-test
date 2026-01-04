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

// Global timer hook - checks for any running timer across all tasks
export function useGlobalTimer() {
  const [activeTimer, setActiveTimer] = useState<{
    entry: TimeEntry
    task: { id: string; title: string } | null
  } | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  const fetchActiveTimer = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Find any running time entry for this user
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          task:tasks(id, title)
        `)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      if (data) {
        setActiveTimer({
          entry: data,
          task: data.task,
        })
        const startTime = new Date(data.started_at).getTime()
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setElapsedSeconds(elapsed)
      } else {
        setActiveTimer(null)
        setElapsedSeconds(0)
      }
    } catch (err) {
      console.error('Error fetching active timer:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchActiveTimer()

    // Poll for updates every 30 seconds
    const pollInterval = setInterval(fetchActiveTimer, 30000)
    return () => clearInterval(pollInterval)
  }, [fetchActiveTimer])

  // Timer interval
  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        const startTime = new Date(activeTimer.entry.started_at).getTime()
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
  }, [activeTimer])

  const stopTimer = async () => {
    if (!activeTimer) return

    const endedAt = new Date()
    const startedAt = new Date(activeTimer.entry.started_at)
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

    const { error } = await supabase
      .from('time_entries')
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', activeTimer.entry.id)

    if (error) throw error

    // Update task total time
    if (activeTimer.entry.task_id) {
      const { data: task } = await supabase
        .from('tasks')
        .select('total_time_seconds')
        .eq('id', activeTimer.entry.task_id)
        .single()

      const newTotal = (task?.total_time_seconds || 0) + durationSeconds

      await supabase
        .from('tasks')
        .update({ total_time_seconds: newTotal })
        .eq('id', activeTimer.entry.task_id)
    }

    setActiveTimer(null)
    setElapsedSeconds(0)
  }

  return {
    activeTimer,
    elapsedSeconds,
    loading,
    isRunning: !!activeTimer,
    stopTimer,
    refetch: fetchActiveTimer,
  }
}

// Hook for getting time totals by project or area
export function useTimeTotals(options?: {
  projectId?: string
  areaId?: string
  period?: 'day' | 'week' | 'month' | 'all'
}) {
  const [totals, setTotals] = useState<{
    totalSeconds: number
    todaySeconds: number
    weekSeconds: number
  }>({ totalSeconds: 0, todaySeconds: 0, weekSeconds: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        let query = supabase
          .from('time_entries')
          .select('duration_seconds, started_at')
          .eq('user_id', user.id)
          .not('duration_seconds', 'is', null)

        if (options?.projectId) {
          query = query.eq('project_id', options.projectId)
        }
        if (options?.areaId) {
          query = query.eq('area_id', options.areaId)
        }

        const { data, error } = await query

        if (error) throw error

        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString()

        let totalSeconds = 0
        let todaySeconds = 0
        let weekSeconds = 0

        data?.forEach(entry => {
          const duration = entry.duration_seconds || 0
          totalSeconds += duration

          if (entry.started_at >= todayStart) {
            todaySeconds += duration
          }
          if (entry.started_at >= weekStart) {
            weekSeconds += duration
          }
        })

        setTotals({ totalSeconds, todaySeconds, weekSeconds })
      } catch (err) {
        console.error('Error fetching time totals:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTotals()
  }, [supabase, options?.projectId, options?.areaId, options?.period])

  return { ...totals, loading }
}
