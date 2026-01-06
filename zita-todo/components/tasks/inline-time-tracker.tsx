'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

interface InlineTimeTrackerProps {
  taskId: string
  taskAssigneeId: string | null
  taskCreatedBy: string | null
  totalTimeSeconds: number
  onTimeUpdate?: (newTotalSeconds: number) => void
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function formatRunningTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function InlineTimeTracker({
  taskId,
  taskAssigneeId,
  taskCreatedBy,
  totalTimeSeconds,
  onTimeUpdate,
}: InlineTimeTrackerProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  // Local total for immediate UI updates after STOP
  const [localTotal, setLocalTotal] = useState(totalTimeSeconds)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const supabase = createClient()

  // Sync localTotal when prop changes (e.g., from parent refetch)
  useEffect(() => {
    setLocalTotal(totalTimeSeconds)
  }, [totalTimeSeconds])

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getUser()
  }, [supabase])

  // Check for running timer on this task
  useEffect(() => {
    if (!currentUserId || !taskId) return

    const checkRunningTimer = async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('id, started_at')
        .eq('task_id', taskId)
        .eq('user_id', currentUserId)
        .is('ended_at', null)
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        setIsRunning(true)
        setActiveEntryId(data.id)
        startTimeRef.current = new Date(data.started_at)
        const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)
        setElapsedSeconds(elapsed)
      }
    }

    checkRunningTimer()
  }, [supabase, taskId, currentUserId])

  // Timer interval
  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000)
        setElapsedSeconds(elapsed)
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
  }, [isRunning])

  const stopOtherTimers = useCallback(async () => {
    if (!currentUserId) return

    // Find and stop any other running timers for this user
    const { data: runningEntries } = await supabase
      .from('time_entries')
      .select('id, task_id, started_at')
      .eq('user_id', currentUserId)
      .is('ended_at', null)

    if (runningEntries && runningEntries.length > 0) {
      for (const entry of runningEntries) {
        const endedAt = new Date()
        const startedAt = new Date(entry.started_at)
        const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

        await supabase
          .from('time_entries')
          .update({
            ended_at: endedAt.toISOString(),
            duration_seconds: durationSeconds,
          })
          .eq('id', entry.id)

        // Update task total time
        if (entry.task_id) {
          const { data: task } = await supabase
            .from('tasks')
            .select('total_time_seconds')
            .eq('id', entry.task_id)
            .single()

          const newTotal = (task?.total_time_seconds || 0) + durationSeconds

          await supabase
            .from('tasks')
            .update({ total_time_seconds: newTotal })
            .eq('id', entry.task_id)
        }
      }
    }
  }, [supabase, currentUserId])

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId || loading) return

    setLoading(true)
    try {
      // Stop any other running timers first
      await stopOtherTimers()

      // Start new timer
      const startTime = new Date()
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          user_id: currentUserId,
          started_at: startTime.toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setActiveEntryId(data.id)
      setIsRunning(true)
      startTimeRef.current = startTime
      setElapsedSeconds(0)
    } catch (err) {
      console.error('Error starting timer:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!activeEntryId || loading) return

    setLoading(true)
    try {
      const endedAt = new Date()
      const durationSeconds = elapsedSeconds

      const { error } = await supabase
        .from('time_entries')
        .update({
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', activeEntryId)

      if (error) throw error

      // Calculate new total using localTotal for accuracy
      const newTotal = localTotal + durationSeconds

      // Update task total time
      await supabase
        .from('tasks')
        .update({ total_time_seconds: newTotal })
        .eq('id', taskId)

      // Update local state immediately for responsive UI
      setLocalTotal(newTotal)
      setIsRunning(false)
      setActiveEntryId(null)
      setElapsedSeconds(0)
      startTimeRef.current = null
      onTimeUpdate?.(newTotal)
    } catch (err) {
      console.error('Error stopping timer:', err)
    } finally {
      setLoading(false)
    }
  }

  // Can track time if: assigned to current user, OR created by current user (when no assignee)
  const canTrackTime = currentUserId && (
    taskAssigneeId === currentUserId ||
    (!taskAssigneeId && taskCreatedBy === currentUserId)
  )
  // When running: show total (existing) + elapsed (current session)
  // When stopped: show localTotal (which updates immediately after stop)
  const displayTime = isRunning ? (localTotal + elapsedSeconds) : localTotal
  const hasTime = displayTime > 0 || isRunning

  // Don't show anything if no time and user can't track
  if (!hasTime && !canTrackTime) return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        isRunning && 'animate-pulse'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Play/Pause button - only for assignee */}
      {canTrackTime && (
        <button
          onClick={isRunning ? handleStop : handleStart}
          disabled={loading}
          className={cn(
            'p-1.5 rounded-md transition-colors touch-manipulation',
            isRunning
              ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
            loading && 'opacity-50 cursor-not-allowed'
          )}
          title={isRunning ? 'Zastaviť časovač' : 'Spustiť časovač'}
        >
          {isRunning ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {/* Time display */}
      {hasTime && (
        <span
          className={cn(
            'text-xs font-mono tabular-nums',
            isRunning
              ? 'text-[var(--color-success)] font-medium'
              : 'text-[var(--text-secondary)]'
          )}
        >
          {isRunning ? formatRunningTime(displayTime) : formatTime(displayTime)}
        </span>
      )}

      {/* Clock icon for readonly time (not assignee) */}
      {!canTrackTime && hasTime && (
        <Clock className="h-3 w-3 text-[var(--text-secondary)]" />
      )}
    </div>
  )
}
