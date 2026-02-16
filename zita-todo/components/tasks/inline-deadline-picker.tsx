'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isTomorrow, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths, isPast, startOfDay } from 'date-fns'
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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const hasValue = !!value
  const isOverdue = value ? isPast(startOfDay(new Date(value))) && !isToday(new Date(value)) : false

  // Update dropdown position when opened
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const dropdownWidth = 288 // w-72 = 18rem = 288px

      // Position below the trigger, aligned to the right
      let left = rect.right - dropdownWidth
      const top = rect.bottom + 8

      // Ensure dropdown doesn't go off-screen left
      if (left < 8) left = 8

      setDropdownPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
      setDropdownPosition(null)
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setIsOpen(false)
    setDropdownPosition(null)
  }

  const handleDateSelect = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'))
    setIsOpen(false)
    setDropdownPosition(null)
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

  const weekDays = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

  return (
    <>
      {/* Icon trigger */}
      <button
        ref={triggerRef}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false)
            setDropdownPosition(null)
          } else {
            setIsOpen(true)
          }
        }}
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
          <CalendarClock className="w-4 h-4" />
        )}
      </button>

      {/* Dropdown via Portal */}
      {isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-72 rounded-xl border border-[var(--border)] bg-card shadow-xl z-[9999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          <div className="p-2 border-b border-[var(--border)]">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">Deadline</span>
              {hasValue && (
                <span className={cn(
                  'text-xs font-medium',
                  isOverdue ? 'text-[var(--color-error)]' : 'text-foreground'
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
                className="p-1 rounded hover:bg-accent"
              >
                <span className="text-muted-foreground">‹</span>
              </button>
              <span className="text-sm font-medium text-foreground capitalize">
                {format(currentMonth, 'LLLL yyyy', { locale: sk })}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 rounded hover:bg-accent"
              >
                <span className="text-muted-foreground">›</span>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map((day, i) => (
                <div key={i} className="text-center text-[10px] font-medium text-muted-foreground">
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
                      isCurrentMonth && 'hover:bg-accent',
                      isTodayDate && 'bg-primary text-white hover:bg-primary',
                      isSelectedDate && !isTodayDate && 'ring-2 ring-[var(--color-error)] bg-[var(--color-error)]/10',
                      isPastDate && isCurrentMonth && !isTodayDate && 'text-muted-foreground'
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
            <div className="p-2 border-t border-[var(--border)]">
              <button
                onClick={handleClear}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Zrušiť deadline</span>
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
