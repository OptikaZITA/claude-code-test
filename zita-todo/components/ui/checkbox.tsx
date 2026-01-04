'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  className?: string
}

export function Checkbox({ checked = false, onChange, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
        checked
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
          : 'border-[var(--border-primary)] hover:border-[var(--color-primary)]',
        className
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  )
}
