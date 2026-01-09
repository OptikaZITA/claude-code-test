'use client'

import { useState } from 'react'
import { ChevronDown, X, AlertTriangle, AlertCircle, Calendar } from 'lucide-react'
import { Dropdown } from '@/components/ui/dropdown'
import { cn } from '@/lib/utils/cn'
import { format, addDays, isToday, isTomorrow, isPast, startOfDay, differenceInDays } from 'date-fns'
import { sk } from 'date-fns/locale'

interface DeadlinePickerProps {
  value?: string | null
  onChange: (deadline: string | null) => void
  size?: 'sm' | 'md'
  className?: string
}

export function DeadlinePicker({
  value,
  onChange,
  size = 'md',
  className,
}: DeadlinePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempDate, setTempDate] = useState(value || '')

  const isOverdue = value ? isPast(startOfDay(new Date(value))) && !isToday(new Date(value)) : false

  const formatDeadline = (date: string) => {
    try {
      const d = new Date(date)
      if (isToday(d)) return 'Dnes'
      if (isTomorrow(d)) return 'Zajtra'
      return format(d, 'd. MMM yyyy', { locale: sk })
    } catch {
      return date
    }
  }

  const handleQuickSelect = (days: number) => {
    const date = addDays(new Date(), days)
    onChange(format(date, 'yyyy-MM-dd'))
  }

  const handleDateConfirm = () => {
    if (tempDate) {
      onChange(tempDate)
    }
    setShowDatePicker(false)
  }

  const handleClear = () => {
    onChange(null)
    setTempDate('')
    setShowDatePicker(false)
  }

  return (
    <div className={cn('relative', className)}>
      <Dropdown
        trigger={
          <button
            className={cn(
              'flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] transition-colors hover:border-[var(--color-primary)]',
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
              isOverdue && 'border-[var(--color-error)] text-[var(--color-error)]',
              !value && 'text-[var(--text-secondary)]'
            )}
          >
            {isOverdue ? (
              <AlertTriangle className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
            ) : (
              <Calendar className={cn(
                size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
                value && 'text-[var(--color-primary)]'
              )} />
            )}
            <span>
              {value ? formatDeadline(value) : 'Deadline'}
            </span>
            <ChevronDown className={cn(
              'text-[var(--text-secondary)]',
              size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
            )} />
          </button>
        }
        align="left"
      >
        <div className="min-w-[200px]">
          {/* Quick select options */}
          <button
            onClick={() => handleQuickSelect(0)}
            className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <span className="text-sm text-[var(--text-primary)]">Dnes</span>
          </button>
          <button
            onClick={() => handleQuickSelect(1)}
            className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <span className="text-sm text-[var(--text-primary)]">Zajtra</span>
          </button>
          <button
            onClick={() => handleQuickSelect(7)}
            className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <span className="text-sm text-[var(--text-primary)]">O tyzden</span>
          </button>

          {/* Custom date picker */}
          <div className="border-t border-[var(--border-primary)]">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <span className="text-sm text-[var(--text-primary)]">Vybrat datum...</span>
            </button>

            {showDatePicker && (
              <div className="px-3 pb-3 space-y-2">
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDateConfirm}
                    disabled={!tempDate}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Potvrdit
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clear option */}
          {value && (
            <div className="border-t border-[var(--border-primary)]">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-[var(--color-error)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <X className="h-4 w-4" />
                <span className="text-sm">Zrušiť deadline</span>
              </button>
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  )
}

// Badge variant for task lists - colorful warnings based on urgency
// Shows only date with color indicating urgency (no text descriptions)
export function DeadlineBadge({
  value,
  size = 'sm'
}: {
  value?: string | null
  size?: 'sm' | 'xs'
}) {
  if (!value) return null

  const formatDate = (date: string) => {
    try {
      const d = new Date(date)
      return format(d, 'd.M.', { locale: sk })
    } catch {
      return date
    }
  }

  // Calculate days difference
  const today = startOfDay(new Date())
  const deadlineDate = startOfDay(new Date(value))
  const diffDays = differenceInDays(deadlineDate, today)

  // Determine color based on urgency (always show date, color indicates urgency)
  let colorClass = ''

  if (diffDays < 0) {
    // OVERDUE - červená
    colorClass = 'text-red-500 font-medium'
  } else if (diffDays <= 1) {
    // DNES alebo ZAJTRA - oranžová
    colorClass = 'text-orange-500'
  } else {
    // BUDÚCI (2+ dni) - sivá
    colorClass = 'text-muted-foreground'
  }

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-2.5 w-2.5'

  return (
    <span className={cn(
      'inline-flex items-center gap-1',
      size === 'sm' ? 'text-sm' : 'text-xs',
      colorClass
    )}>
      <Calendar className={iconSize} />
      <span>{formatDate(value)}</span>
    </span>
  )
}
