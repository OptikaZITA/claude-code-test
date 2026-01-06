'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  className?: string
  /** Use circular style (Things 3 style) */
  circular?: boolean
}

export function Checkbox({
  checked = false,
  onChange,
  className,
  circular = true, // Default to circular per design spec
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'flex items-center justify-center border-2 transition-all',
        // Size
        'h-5 w-5',
        // Shape - circular by default (Things 3 style)
        circular ? 'rounded-full' : 'rounded-[var(--radius-sm)]',
        // States
        checked
          ? 'border-success bg-success text-white'
          : 'border-primary bg-transparent hover:border-primary/70 hover:bg-primary/5',
        className
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  )
}
