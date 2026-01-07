'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SidebarStarBadgeProps {
  todayTasksCount: number
  className?: string
  showCount?: boolean
}

/**
 * Hviezdicka v sidebar pre projekty/oddelenia s taskami v "Dnes"
 */
export function SidebarStarBadge({
  todayTasksCount,
  className,
  showCount = true
}: SidebarStarBadgeProps) {
  if (todayTasksCount <= 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-amber-500',
        className
      )}
      aria-label={`${todayTasksCount} uloh v Dnes`}
    >
      <Star className="h-3 w-3 fill-amber-500" />
      {showCount && todayTasksCount > 1 && (
        <span className="text-[10px] font-medium">{todayTasksCount}</span>
      )}
    </span>
  )
}
