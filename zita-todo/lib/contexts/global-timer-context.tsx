'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TaskInfo {
  id: string
  title: string
}

interface GlobalTimerContextValue {
  // Timer state
  isRunning: boolean
  currentTaskId: string | null
  currentEntryId: string | null
  startedAt: Date | null
  elapsedSeconds: number
  currentTask: TaskInfo | null

  // Actions
  startTimer: (taskId: string) => Promise<void>
  stopTimer: () => Promise<{ durationSeconds: number } | null>

  // Loading state
  loading: boolean
}

const GlobalTimerContext = createContext<GlobalTimerContextValue | null>(null)

export function GlobalTimerProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentTask, setCurrentTask] = useState<TaskInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  // Fetch any running timer on mount
  useEffect(() => {
    const fetchRunningTimer = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Find running timer
        const { data, error } = await supabase
          .from('time_entries')
          .select(`
            id,
            task_id,
            started_at,
            tasks (
              id,
              title
            )
          `)
          .eq('user_id', user.id)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('Error fetching running timer:', error)
          setLoading(false)
          return
        }

        if (data) {
          const started = new Date(data.started_at)
          setIsRunning(true)
          setCurrentTaskId(data.task_id)
          setCurrentEntryId(data.id)
          setStartedAt(started)
          setElapsedSeconds(Math.floor((Date.now() - started.getTime()) / 1000))

          const taskData = data.tasks as any
          if (taskData) {
            setCurrentTask({
              id: taskData.id,
              title: taskData.title,
            })
          }
        }
      } catch (err) {
        console.error('Error in fetchRunningTimer:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRunningTimer()
  }, [supabase])

  // Timer interval - updates every second when running
  useEffect(() => {
    if (isRunning && startedAt) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000))
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, startedAt])

  const startTimer = useCallback(async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Stop any existing timer first
    if (isRunning && currentEntryId) {
      await stopTimerInternal()
    }

    // Get task info
    const { data: taskData } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('id', taskId)
      .single()

    // Create new time entry
    const startTime = new Date()
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        task_id: taskId,
        user_id: user.id,
        started_at: startTime.toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    setIsRunning(true)
    setCurrentTaskId(taskId)
    setCurrentEntryId(data.id)
    setStartedAt(startTime)
    setElapsedSeconds(0)

    if (taskData) {
      setCurrentTask({
        id: taskData.id,
        title: taskData.title,
      })
    }

    // Dispatch event for other components to know timer started
    window.dispatchEvent(new CustomEvent('timer:started', {
      detail: { taskId, entryId: data.id }
    }))
  }, [supabase, isRunning, currentEntryId])

  const stopTimerInternal = async (): Promise<{ durationSeconds: number } | null> => {
    if (!currentEntryId || !startedAt) return null

    const endedAt = new Date()
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

    const { error } = await supabase
      .from('time_entries')
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', currentEntryId)

    if (error) throw error

    // Update task total_time_seconds
    if (currentTaskId) {
      const { data: task } = await supabase
        .from('tasks')
        .select('total_time_seconds')
        .eq('id', currentTaskId)
        .single()

      const newTotal = (task?.total_time_seconds || 0) + durationSeconds

      await supabase
        .from('tasks')
        .update({ total_time_seconds: newTotal })
        .eq('id', currentTaskId)
    }

    const stoppedTaskId = currentTaskId

    // Reset state
    setIsRunning(false)
    setCurrentTaskId(null)
    setCurrentEntryId(null)
    setStartedAt(null)
    setElapsedSeconds(0)
    setCurrentTask(null)

    // Dispatch event for other components to know timer stopped
    window.dispatchEvent(new CustomEvent('timer:stopped', {
      detail: { taskId: stoppedTaskId, durationSeconds }
    }))

    return { durationSeconds }
  }

  const stopTimer = useCallback(async (): Promise<{ durationSeconds: number } | null> => {
    return stopTimerInternal()
  }, [currentEntryId, currentTaskId, startedAt, supabase])

  return (
    <GlobalTimerContext.Provider
      value={{
        isRunning,
        currentTaskId,
        currentEntryId,
        startedAt,
        elapsedSeconds,
        currentTask,
        startTimer,
        stopTimer,
        loading,
      }}
    >
      {children}
    </GlobalTimerContext.Provider>
  )
}

export function useGlobalTimerContext() {
  const context = useContext(GlobalTimerContext)
  if (!context) {
    throw new Error('useGlobalTimerContext must be used within a GlobalTimerProvider')
  }
  return context
}
