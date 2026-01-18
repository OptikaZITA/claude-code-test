'use client'

import { useState } from 'react'
import { Play, Pause, Clock } from 'lucide-react'
import { useGlobalTimerContext } from '@/lib/contexts/global-timer-context'
import { useTaskTimeTotal } from '@/lib/hooks/use-task-time-total'
import { cn } from '@/lib/utils/cn'

interface InlineTimeTrackerProps {
  taskId: string
  className?: string
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

export function InlineTimeTracker({ taskId, className }: InlineTimeTrackerProps) {
  const {
    isRunning,
    currentTaskId,
    elapsedSeconds,
    startTimer,
    stopTimer,
    loading: timerLoading,
  } = useGlobalTimerContext()

  const { totalSeconds } = useTaskTimeTotal(taskId)
  const [actionLoading, setActionLoading] = useState(false)

  const isThisTaskRunning = isRunning && currentTaskId === taskId

  // Display time: total from DB + live elapsed if this task is running
  const displaySeconds = isThisTaskRunning ? totalSeconds + elapsedSeconds : totalSeconds
  const hasTime = displaySeconds > 0 || isThisTaskRunning

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (actionLoading || timerLoading) return

    setActionLoading(true)
    try {
      if (isThisTaskRunning) {
        await stopTimer()
      } else {
        await startTimer(taskId)
      }
    } catch (err) {
      console.error('Timer action error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const loading = actionLoading || timerLoading

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        isThisTaskRunning && 'animate-pulse',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Play/Pause button */}
      <button
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'p-1.5 rounded-md transition-colors touch-manipulation',
          isThisTaskRunning
            ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20'
            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
          loading && 'opacity-50 cursor-not-allowed'
        )}
        title={isThisTaskRunning ? 'Zastavit casovac' : 'Spustit casovac'}
      >
        {isThisTaskRunning ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Time display */}
      {hasTime && (
        <span
          className={cn(
            'text-xs font-mono tabular-nums',
            isThisTaskRunning
              ? 'text-[var(--color-success)] font-medium'
              : 'text-[var(--text-secondary)]'
          )}
        >
          {isThisTaskRunning ? formatRunningTime(displaySeconds) : formatTime(displaySeconds)}
        </span>
      )}
    </div>
  )
}

// Compact version without button - just shows time (for readonly)
export function TimeDisplay({ taskId, className }: { taskId: string; className?: string }) {
  const { isRunning, currentTaskId, elapsedSeconds } = useGlobalTimerContext()
  const { totalSeconds } = useTaskTimeTotal(taskId)

  const isThisTaskRunning = isRunning && currentTaskId === taskId
  const displaySeconds = isThisTaskRunning ? totalSeconds + elapsedSeconds : totalSeconds

  if (displaySeconds === 0 && !isThisTaskRunning) return null

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Clock className="h-3 w-3 text-[var(--text-secondary)]" />
      <span
        className={cn(
          'text-xs font-mono tabular-nums',
          isThisTaskRunning
            ? 'text-[var(--color-success)] font-medium'
            : 'text-[var(--text-secondary)]'
        )}
      >
        {isThisTaskRunning ? formatRunningTime(displaySeconds) : formatTime(displaySeconds)}
      </span>
    </div>
  )
}

// Play/Pause button only (for fixed column layout)
export function TimerPlayButton({ taskId, className }: { taskId: string; className?: string }) {
  const {
    isRunning,
    currentTaskId,
    startTimer,
    stopTimer,
    loading: timerLoading,
  } = useGlobalTimerContext()

  const [actionLoading, setActionLoading] = useState(false)
  const isThisTaskRunning = isRunning && currentTaskId === taskId
  const loading = actionLoading || timerLoading

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return

    setActionLoading(true)
    try {
      if (isThisTaskRunning) {
        await stopTimer()
      } else {
        await startTimer(taskId)
      }
    } catch (err) {
      console.error('Timer action error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'p-1.5 rounded-md transition-colors touch-manipulation',
        isThisTaskRunning
          ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20'
          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        loading && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={isThisTaskRunning ? 'Zastaviť časovač' : 'Spustiť časovač'}
    >
      {isThisTaskRunning ? (
        <Pause className="h-3.5 w-3.5" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

// Time display only (for fixed column layout) - shows time text without icon
export function TimerTimeDisplay({ taskId, className }: { taskId: string; className?: string }) {
  const { isRunning, currentTaskId, elapsedSeconds } = useGlobalTimerContext()
  const { totalSeconds } = useTaskTimeTotal(taskId)

  const isThisTaskRunning = isRunning && currentTaskId === taskId
  const displaySeconds = isThisTaskRunning ? totalSeconds + elapsedSeconds : totalSeconds

  // Return empty div to maintain column width even when no time
  if (displaySeconds === 0 && !isThisTaskRunning) {
    return <div className={className} />
  }

  return (
    <span
      className={cn(
        'text-xs font-mono tabular-nums',
        isThisTaskRunning
          ? 'text-[var(--color-success)] font-medium animate-pulse'
          : 'text-[var(--text-secondary)]',
        className
      )}
    >
      {isThisTaskRunning ? formatRunningTime(displaySeconds) : formatTime(displaySeconds)}
    </span>
  )
}
