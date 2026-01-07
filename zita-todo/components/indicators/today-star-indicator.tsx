'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface TodayStarIndicatorProps {
  isInToday: boolean
  className?: string
  size?: 'sm' | 'md'
}

/**
 * Hviezdička signalizujuca ze task je v "Dnes"
 * Zobrazuje sa na strankach projektov a oddeleni
 */
export function TodayStarIndicator({
  isInToday,
  className,
  size = 'sm'
}: TodayStarIndicatorProps) {
  if (!isInToday) return null

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  }

  return (
    <Star
      className={cn(
        sizeClasses[size],
        'text-amber-500 fill-amber-500 flex-shrink-0',
        className
      )}
      aria-label="Task je v Dnes"
    />
  )
}
