'use client'

import { cn } from '@/lib/utils/cn'

interface NewTaskIndicatorProps {
  isNew: boolean
  className?: string
}

/**
 * Zlta bodka signalizujuca novy task v "Dnes"
 * Zobrazuje sa len na stranke Dnes
 */
export function NewTaskIndicator({
  isNew,
  className
}: NewTaskIndicatorProps) {
  if (!isNew) return null

  return (
    <span
      className={cn(
        'h-2 w-2 rounded-full bg-amber-500 flex-shrink-0',
        className
      )}
      aria-label="Novy task"
    />
  )
}
