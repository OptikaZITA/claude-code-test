'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Inbox,
  Sun,
  Clock,
  Moon,
  Calendar,
  X
} from 'lucide-react'
import { WhenType } from '@/types'
import { cn } from '@/lib/utils/cn'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { sk } from 'date-fns/locale'

interface InlineWhenPickerProps {
  value: WhenType
  whenDate?: string | null
  onChange: (whenType: WhenType, whenDate?: string | null) => void
}

const whenOptions: { value: WhenType; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'today',
    label: 'Dnes',
    icon: <Sun className="w-3.5 h-3.5" />,
    color: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/30'
  },
  {
    value: 'anytime',
    label: 'Kedykolvek',
    icon: <Clock className="w-3.5 h-3.5" />,
    color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/30'
  },
  {
    value: 'someday',
    label: 'Niekedy',
    icon: <Moon className="w-3.5 h-3.5" />,
    color: 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)] border-[var(--text-secondary)]/30'
  },
  {
    value: 'scheduled',
    label: 'Naplanovane',
    icon: <Calendar className="w-3.5 h-3.5" />,
    color: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/30'
  },
]

export function InlineWhenPicker({
  value,
  whenDate,
  onChange,
}: InlineWhenPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(whenDate ? new Date(whenDate) : new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  const currentOption = whenOptions.find(opt => opt.value === value)
  const hasValue = value !== 'inbox'

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
    onChange('inbox', null)
    setIsOpen(false)
  }

  const handleOptionClick = (optionValue: WhenType) => {
    if (optionValue !== 'scheduled') {
      onChange(optionValue, null)
      setIsOpen(false)
    }
  }

  const handleDateSelect = (date: Date) => {
    onChange('scheduled', format(date, 'yyyy-MM-dd'))
    setIsOpen(false)
  }

  const formatWhenDate = (date: string) => {
    try {
      return format(new Date(date), 'd. MMM', { locale: sk })
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
      {/* Badge trigger */}
      {hasValue ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors',
            currentOption?.color
          )}
        >
          {currentOption?.icon}
          <span>
            {value === 'scheduled' && whenDate
              ? formatWhenDate(whenDate)
              : currentOption?.label
            }
          </span>
          <button
            onClick={handleClear}
            className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="w-3 h-3" />
          </button>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-[var(--text-secondary)] border border-dashed border-[var(--border-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>When</span>
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-xl z-50">
          <div className="p-2 border-b border-[var(--border-primary)]">
            <p className="text-xs font-medium text-[var(--text-secondary)] px-2 mb-2">When</p>

            {/* Quick options */}
            <div className="space-y-0.5">
              {whenOptions.filter(opt => opt.value !== 'scheduled').map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionClick(option.value)}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left transition-colors',
                    value === option.value
                      ? 'bg-[var(--bg-secondary)]'
                      : 'hover:bg-[var(--bg-secondary)]'
                  )}
                >
                  <span className={option.color.split(' ')[1]}>{option.icon}</span>
                  <span className="text-sm text-[var(--text-primary)]">{option.label}</span>
                  {value === option.value && (
                    <span className="ml-auto text-[var(--color-primary)]">✓</span>
                  )}
                </button>
              ))}
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
                const isSelectedDate = whenDate && isSameDay(day, new Date(whenDate))
                const isTodayDate = isToday(day)

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
                      isSelectedDate && !isTodayDate && 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/10'
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
                className="w-full py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
