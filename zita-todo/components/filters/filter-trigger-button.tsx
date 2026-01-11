'use client'

import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface FilterTriggerButtonProps {
  hasActiveFilters: boolean
  onClick: () => void
  className?: string
}

export function FilterTriggerButton({
  hasActiveFilters,
  onClick,
  className,
}: FilterTriggerButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
        'border border-border',
        hasActiveFilters
          ? 'bg-primary text-white border-primary'
          : 'bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        className
      )}
      title="Filtre"
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span className="text-sm font-medium">Filtre</span>
      {/* Blue dot indicator for active filters */}
      {hasActiveFilters && (
        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-white border-2 border-primary" />
      )}
    </button>
  )
}
