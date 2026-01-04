'use client'

import { useState, useRef, useEffect } from 'react'
import { Flag, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isTomorrow, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths, isPast, startOfDay } from 'date-fns'
import { sk } from 'date-fns/locale'

interface InlineDeadlinePickerProps {
  value?: string | null
  onChange: (deadline: string | null) => void
}

export function InlineDeadlinePicker({
  value,
  onChange,
}: InlineDeadlinePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  const hasValue = !!value
  const isOverdue = value ? isPast(startOfDay(new Date(value))) && !isToday(new Date(value)) : false

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setIsOpen(false)
  }

  const handleDateSelect = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'))
    setIsOpen(false)
  }

  const formatDeadline = (date: string) => {
    try {
      const d = new Date(date)
      if (isToday(d)) return 'Dnes'
      if (isTomorrow(d)) return 'Zajtra'
      return format(d, 'd. MMM', { locale: sk })
    } catch {
      return date
    }
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekDays = ['Po', 'Ut', 'St', 'St', 'Pi', 'So', 'Ne']

  return (
    <div ref={containerRef} className="relative">
      {/* Icon trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2 rounded-lg transition-colors',
          hasValue
            ? isOverdue
              ? 'text-[var(--color-error)] bg-[var(--color-error)]/10'
              : 'text-[var(--color-error)] bg-[var(--color-error)]/10'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
        )}
        title={hasValue ? `Deadline: ${formatDeadline(value)}` : 'Set deadline'}
      >
        {isOverdue ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Flag className="w-4 h-4" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-xl z-50">
          <div className="p-2 border-b border-[var(--border-primary)]">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Deadline</span>
              {hasValue && (
                <span className={cn(
                  'text-xs font-medium',
                  isOverdue ? 'text-[var(--color-error)]' : 'text-[var(--text-primary)]'
                )}>
                  {formatDeadline(value)}
                </span>
              )}
            </div>
          </div>

          {/* Mini calendar */}
          <div className="p-3">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 rounded hover:bg-[var(--bg-secondary)]"
              >
                <span className="text-[var(--text-secondary)]">‹</span>
              </button>
              <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
                {format(currentMonth, 'LLLL yyyy', { locale: sk })}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 rounded hover:bg-[var(--bg-secondary)]"
              >
                <span className="text-[var(--text-secondary)]">›</span>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map((day, i) => (
                <div key={i} className="text-center text-[10px] font-medium text-[var(--text-secondary)]">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isSelectedDate = value && isSameDay(day, new Date(value))
                const isTodayDate = isToday(day)
                const isPastDate = isPast(startOfDay(day)) && !isTodayDate

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateSelect(day)}
                    disabled={!isCurrentMonth}
                    className={cn(
                      'h-7 w-7 rounded-md text-xs transition-colors',
                      !isCurrentMonth && 'opacity-30 cursor-not-allowed',
                      isCurrentMonth && 'hover:bg-[var(--bg-secondary)]',
                      isTodayDate && 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]',
                      isSelectedDate && !isTodayDate && 'ring-2 ring-[var(--color-error)] bg-[var(--color-error)]/10',
                      isPastDate && isCurrentMonth && !isTodayDate && 'text-[var(--text-secondary)]'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Clear button */}
          {hasValue && (
            <div className="p-2 border-t border-[var(--border-primary)]">
              <button
                onClick={handleClear}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Zrusit deadline</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
