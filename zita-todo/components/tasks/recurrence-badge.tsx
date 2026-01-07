'use client'

import { Repeat } from 'lucide-react'
import { RecurrenceRule, formatRecurrenceRule } from '@/types'
import { cn } from '@/lib/utils/cn'

interface RecurrenceBadgeProps {
  rule: RecurrenceRule
  className?: string
  showLabel?: boolean
}

export function RecurrenceBadge({ rule, className, showLabel = false }: RecurrenceBadgeProps) {
  const label = formatRecurrenceRule(rule)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-muted-foreground',
        className
      )}
      title={label}
    >
      <Repeat className="h-3.5 w-3.5" />
      {showLabel && (
        <span className="text-xs truncate max-w-[120px]">{label}</span>
      )}
    </div>
  )
}

interface RecurrenceIconButtonProps {
  hasRecurrence: boolean
  onClick: () => void
  className?: string
}

export function RecurrenceIconButton({ hasRecurrence, onClick, className }: RecurrenceIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        hasRecurrence
          ? 'text-primary hover:bg-primary/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
        className
      )}
      title={hasRecurrence ? 'Upraviť opakovanie' : 'Nastaviť opakovanie'}
    >
      <Repeat className="h-4 w-4" />
    </button>
  )
}
