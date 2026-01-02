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
          'bg-[#F5F5F7] text-[#1D1D1F]': variant === 'default',
          'bg-[#34C759]/10 text-[#34C759]': variant === 'success',
          'bg-[#FF9500]/10 text-[#FF9500]': variant === 'warning',
          'bg-[#FF3B30]/10 text-[#FF3B30]': variant === 'error',
        },
        className
      )}
      style={style}
    >
      {children}
    </span>
  )
}
