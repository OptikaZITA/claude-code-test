'use client'

import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface TimeSummaryCardProps {
  totalSeconds: number
  taskCount: number
  label?: string
  className?: string
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0 && minutes === 0) {
    return '0m'
  }
  if (hours === 0) {
    return `${minutes}m`
  }
  if (minutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${minutes}m`
}

export function TimeSummaryCard({
  totalSeconds,
  taskCount,
  label = 'Dnes',
  className,
}: TimeSummaryCardProps) {
  // Don't render if no time tracked
  if (totalSeconds === 0 && taskCount === 0) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]',
        className
      )}
    >
      <Clock className="h-4 w-4 text-[var(--color-primary)]" />
      <span className="text-sm text-[var(--text-primary)]">
        {label}: <span className="font-medium">{formatDuration(totalSeconds)}</span>
      </span>
      {taskCount > 0 && (
        <span className="text-xs text-[var(--text-secondary)]">
          ({taskCount} {taskCount === 1 ? 'úloha' : taskCount < 5 ? 'úlohy' : 'úloh'})
        </span>
      )}
    </div>
  )
}
