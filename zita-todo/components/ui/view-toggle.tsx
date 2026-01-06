'use client'

import { List, LayoutGrid, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type ViewMode = 'list' | 'kanban' | 'calendar'

interface ViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center rounded-lg bg-[var(--bg-secondary)] p-1', className)}>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'flex items-center justify-center rounded-md p-1.5 transition-colors',
          value === 'list'
            ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        )}
        title="Zoznam"
        aria-label="Zobraziť ako zoznam"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('kanban')}
        className={cn(
          'flex items-center justify-center rounded-md p-1.5 transition-colors',
          value === 'kanban'
            ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        )}
        title="Kanban"
        aria-label="Zobraziť ako kanban"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('calendar')}
        className={cn(
          'flex items-center justify-center rounded-md p-1.5 transition-colors',
          value === 'calendar'
            ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        )}
        title="Kalendár"
        aria-label="Zobraziť ako kalendár"
      >
        <Calendar className="h-4 w-4" />
      </button>
    </div>
  )
}
