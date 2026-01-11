'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { TaskFilters } from '@/types'

interface FilterChip {
  key: keyof TaskFilters
  label: string
  value: unknown
}

interface FilterChipsProps {
  filters: FilterChip[]
  onClearFilter: (key: keyof TaskFilters) => void
  onClearAll: () => void
  className?: string
}

export function FilterChips({
  filters,
  onClearFilter,
  onClearAll,
  className,
}: FilterChipsProps) {
  if (filters.length === 0) return null

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <span className="text-sm text-muted-foreground">Aktívne:</span>

      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onClearFilter(filter.key)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm',
            'bg-primary/10 text-primary hover:bg-primary/20 transition-colors'
          )}
        >
          <span>{filter.label}</span>
          <X className="h-3.5 w-3.5" />
        </button>
      ))}

      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className={cn(
            'text-sm text-muted-foreground hover:text-foreground transition-colors',
            'underline underline-offset-2'
          )}
        >
          Zrušiť všetky
        </button>
      )}
    </div>
  )
}
