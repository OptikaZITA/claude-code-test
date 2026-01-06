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
          "bg-[var(--color-success)] text-white",
          "hover:bg-[var(--color-success)]/90",
          "animate-pulse"
        )}
      >
        <Clock className="w-4 h-4" />
        <span className="font-mono text-sm font-medium">
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
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                  <span className="text-xs font-medium text-[var(--color-success)]">
                    Timer bezi
                  </span>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Task info */}
              {currentTask && (
                <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-3">
                  {currentTask.title}
                </p>
              )}

              {/* Timer display */}
              <div className="text-center py-4 bg-[var(--bg-secondary)] rounded-lg mb-3">
                <p className="text-3xl font-mono font-bold text-[var(--text-primary)]">
                  {formatDurationShort(elapsedSeconds)}
                </p>
                {startedAt && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Zacate {startedAt.toLocaleTimeString('sk-SK', {
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
                  "flex items-center justify-center gap-2 w-full py-2 rounded-lg font-medium transition-colors",
                  "bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Square className="w-4 h-4" />
                {isStopping ? 'Zastavujem...' : 'Zastavit'}
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
        "bg-[var(--color-success)] text-white",
        "hover:bg-[var(--color-success)]/90",
        "disabled:opacity-50"
      )}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
      <span className="font-mono">{formatDurationShort(elapsedSeconds)}</span>
    </button>
  )
}
