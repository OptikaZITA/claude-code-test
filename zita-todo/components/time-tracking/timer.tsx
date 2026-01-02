'use client'

import { Play, Square, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface TimerProps {
  elapsedSeconds: number
  isRunning: boolean
  onStart: () => void
  onStop: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function Timer({
  elapsedSeconds,
  isRunning,
  onStart,
  onStop,
  size = 'md',
  className,
}: TimerProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }

  const buttonSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={isRunning ? onStop : onStart}
        className={cn(
          'flex items-center justify-center rounded-full transition-colors',
          buttonSizes[size],
          isRunning
            ? 'bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90'
            : 'bg-[#34C759] text-white hover:bg-[#34C759]/90'
        )}
      >
        {isRunning ? (
          <Square className={iconSizes[size]} fill="currentColor" />
        ) : (
          <Play className={iconSizes[size]} fill="currentColor" />
        )}
      </button>

      <div
        className={cn(
          'font-mono tabular-nums',
          sizeClasses[size],
          isRunning ? 'text-[#FF3B30]' : 'text-[#86868B]'
        )}
      >
        {formatTime(elapsedSeconds)}
      </div>
    </div>
  )
}

interface TimerDisplayProps {
  totalSeconds: number
  className?: string
}

export function TimerDisplay({ totalSeconds, className }: TimerDisplayProps) {
  return (
    <div className={cn('flex items-center gap-1 text-sm text-[#86868B]', className)}>
      <Clock className="h-4 w-4" />
      <span className="font-mono tabular-nums">{formatTime(totalSeconds)}</span>
    </div>
  )
}
