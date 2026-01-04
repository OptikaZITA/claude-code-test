import * as React from 'react'
import { cn } from '@/lib/utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
  className?: string
  style?: React.CSSProperties
}

export function Badge({ children, variant = 'default', className, style }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-[var(--bg-secondary)] text-[var(--text-primary)]': variant === 'default',
          'bg-[var(--color-success)]/10 text-[var(--color-success)]': variant === 'success',
          'bg-[var(--color-warning)]/10 text-[var(--color-warning)]': variant === 'warning',
          'bg-[var(--color-error)]/10 text-[var(--color-error)]': variant === 'error',
        },
        className
      )}
      style={style}
    >
      {children}
    </span>
  )
}
