import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'rounded-[var(--radius-sm)]',
          {
            // Primary - ZITA Blue (light) / Peach (dark)
            'bg-primary text-primary-foreground hover:opacity-90': variant === 'primary',
            // Secondary - Peach background
            'bg-secondary text-secondary-foreground hover:opacity-90': variant === 'secondary',
            // Ghost - transparent with hover
            'text-foreground hover:bg-accent/50': variant === 'ghost',
            // Danger - Red
            'bg-error text-white hover:opacity-90': variant === 'danger',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
