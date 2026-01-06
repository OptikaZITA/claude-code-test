import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          'flex min-h-[80px] w-full px-3 py-2 text-sm',
          // Border and background
          'rounded-[var(--radius-md)] border border-[var(--border)]',
          'bg-background text-foreground',
          // Placeholder
          'placeholder:text-muted-foreground',
          // Focus state
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Resize
          'resize-y',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
