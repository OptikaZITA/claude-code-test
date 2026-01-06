import * as React from 'react'
import { cn } from '@/lib/utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'outline'
  // Priority variants
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  // Kanban variants
  kanban?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  className?: string
  style?: React.CSSProperties
}

export function Badge({
  children,
  variant = 'default',
  priority,
  kanban,
  className,
  style,
}: BadgeProps) {
  // Priority-specific styling
  if (priority) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          {
            'bg-info/20 text-info': priority === 'low',
            'bg-[var(--priority-medium)]/20 text-[var(--priority-medium)]': priority === 'medium',
            'bg-warning/20 text-warning': priority === 'high',
            'bg-error/20 text-error': priority === 'urgent',
          },
          className
        )}
        style={style}
      >
        {children}
      </span>
    )
  }

  // Kanban-specific styling
  if (kanban) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          {
            'bg-[var(--kanban-backlog)]/20 text-[var(--kanban-backlog)]': kanban === 'backlog',
            'bg-[var(--kanban-todo)]/20 text-[var(--kanban-todo)]': kanban === 'todo',
            'bg-[var(--kanban-in-progress)]/20 text-[var(--kanban-in-progress)]': kanban === 'in_progress',
            'bg-[var(--kanban-review)]/20 text-[var(--kanban-review)]': kanban === 'review',
            'bg-[var(--kanban-done)]/20 text-[var(--kanban-done)]': kanban === 'done',
          },
          className
        )}
        style={style}
      >
        {children}
      </span>
    )
  }

  // Standard variants
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-muted text-foreground': variant === 'default',
          'bg-success/10 text-success': variant === 'success',
          'bg-warning/10 text-warning': variant === 'warning',
          'bg-error/10 text-error': variant === 'error',
          'bg-info/10 text-info': variant === 'info',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'border border-border bg-transparent text-foreground': variant === 'outline',
        },
        className
      )}
      style={style}
    >
      {children}
    </span>
  )
}
