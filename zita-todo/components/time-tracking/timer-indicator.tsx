'use client'

import { useState } from 'react'
import { Clock, Square, X } from 'lucide-react'
import { useGlobalTimerContext } from '@/lib/contexts/global-timer-context'
import { formatDurationShort } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

export function TimerIndicator() {
  const {
    isRunning,
    elapsedSeconds,
    currentTask,
    startedAt,
    stopTimer,
    loading,
  } = useGlobalTimerContext()

  const [isExpanded, setIsExpanded] = useState(false)
  const [isStopping, setIsStopping] = useState(false)

  if (loading || !isRunning) return null

  const handleStop = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsStopping(true)
    try {
      await stopTimer()
      setIsExpanded(false)
    } catch (error) {
      console.error('Error stopping timer:', error)
    } finally {
      setIsStopping(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
          "timer-badge-active" // Uses our custom CSS class with pulse animation
        )}
      >
        <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
        <span className="font-mono text-sm font-medium text-success tabular-nums min-w-[52px] text-right">
          {formatDurationShort(elapsedSeconds)}
        </span>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsExpanded(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-[var(--radius-lg)] border border-[var(--border)] bg-card shadow-lg animate-scale-in">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs font-medium text-success">
                    Timer beží
                  </span>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded hover:bg-accent/50 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Task info */}
              {currentTask && (
                <p className="text-sm font-medium text-foreground line-clamp-2 mb-3">
                  {currentTask.title}
                </p>
              )}

              {/* Timer display */}
              <div className="text-center py-4 bg-muted rounded-[var(--radius-md)] mb-3">
                <p className="text-3xl font-mono font-bold text-foreground tabular-nums">
                  {formatDurationShort(elapsedSeconds)}
                </p>
                {startedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Začaté {startedAt.toLocaleTimeString('sk-SK', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>

              {/* Stop button */}
              <button
                onClick={handleStop}
                disabled={isStopping}
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-2 rounded-[var(--radius-sm)] font-medium transition-colors",
                  "bg-error text-white hover:opacity-90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Square className="w-4 h-4" />
                {isStopping ? 'Zastavujem...' : 'Zastaviť'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Compact version for mobile
export function TimerIndicatorCompact() {
  const { isRunning, elapsedSeconds, stopTimer, loading } = useGlobalTimerContext()
  const [isStopping, setIsStopping] = useState(false)

  if (loading || !isRunning) return null

  const handleStop = async () => {
    setIsStopping(true)
    try {
      await stopTimer()
    } catch (error) {
      console.error('Error stopping timer:', error)
    } finally {
      setIsStopping(false)
    }
  }

  return (
    <button
      onClick={handleStop}
      disabled={isStopping}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
        "timer-badge-active",
        "disabled:opacity-50"
      )}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
      <span className="font-mono text-success tabular-nums min-w-[44px] text-right">{formatDurationShort(elapsedSeconds)}</span>
    </button>
  )
}
