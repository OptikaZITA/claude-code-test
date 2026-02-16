'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Inbox,
  Star,
  Clock,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'
import { WhenType } from '@/types'
import { cn } from '@/lib/utils/cn'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns'
import { sk } from 'date-fns/locale'

interface WhenPickerProps {
  value: WhenType | null  // null = Logbook
  whenDate?: string | null
  onChange: (whenType: WhenType, whenDate?: string | null) => void
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const whenOptions: { value: WhenType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'inbox',
    label: 'Inbox',
    icon: <Inbox className="w-4 h-4" />,
    description: 'Spracovať neskôr'
  },
  {
    value: 'today',
    label: 'Dnes',
    icon: <Star className="w-4 h-4 text-[var(--color-warning)]" />,
    description: 'Urobiť dnes'
  },
  {
    value: 'anytime',
    label: 'Kedykoľvek',
    icon: <Clock className="w-4 h-4 text-[var(--color-primary)]" />,
    description: 'Bez konkrétneho termínu'
  },
  {
    value: 'scheduled',
    label: 'Naplánované',
    icon: <Calendar className="w-4 h-4 text-[var(--color-success)]" />,
    description: 'Na konkrétny dátum'
  },
]

export function WhenPicker({
  value,
  whenDate,
  onChange,
  showLabel = true,
  size = 'md'
}: WhenPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(whenDate ? new Date(whenDate) : new Date())
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // null = Logbook, show inbox as default
  const currentOption = whenOptions.find(opt => opt.value === (value || 'inbox')) || whenOptions[0]

  // Update dropdown position when opened
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const dropdownWidth = 280

      let left = rect.left
      const top = rect.bottom + 8

      // Ensure dropdown doesn't go off-screen right
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8
      }
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
      setShowCalendar(false)
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

  const handleOptionClick = (optionValue: WhenType) => {
    if (optionValue === 'scheduled') {
      // Show calendar, DON'T close dropdown
      setShowCalendar(true)
    } else {
      onChange(optionValue, null)
      setIsOpen(false)
      setShowCalendar(false)
      setDropdownPosition(null)
    }
  }

  const handleDateSelect = (date: Date) => {
    onChange('scheduled', format(date, 'yyyy-MM-dd'))
    setIsOpen(false)
    setShowCalendar(false)
    setDropdownPosition(null)
  }

  const formatWhenDate = (date: string) => {
    try {
      return format(new Date(date), 'd. MMM yyyy', { locale: sk })
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
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false)
            setShowCalendar(false)
            setDropdownPosition(null)
          } else {
            setIsOpen(true)
          }
        }}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-[var(--bg-secondary)] bg-[var(--bg-primary)] transition-colors hover:border-[var(--color-primary)]",
          size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
        )}
      >
        {currentOption.icon}
        {showLabel && (
          <span className="text-[var(--text-primary)]">
            {value === 'scheduled' && whenDate
              ? formatWhenDate(whenDate)
              : currentOption.label
            }
          </span>
        )}
        <ChevronDown className={cn(
          "text-[var(--text-secondary)]",
          size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
        )} />
      </button>

      {/* Dropdown via Portal */}
      {isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed min-w-[280px] rounded-xl border border-[var(--border)] bg-card shadow-xl z-[9999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {/* Options */}
          <div className="py-1">
            {whenOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent transition-colors",
                  value === option.value && !showCalendar && "bg-accent",
                  option.value === 'scheduled' && showCalendar && "bg-accent"
                )}
              >
                {option.icon}
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {option.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Visual Calendar for scheduled */}
          {showCalendar && (
            <div className="border-t border-[var(--border)] p-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 rounded hover:bg-accent"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <span className="text-sm font-medium text-foreground capitalize">
                  {format(currentMonth, 'LLLL yyyy', { locale: sk })}
                </span>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 rounded hover:bg-accent"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                  const isSelectedDate = whenDate && isSameDay(day, new Date(whenDate))
                  const isTodayDate = isToday(day)

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateSelect(day)}
                      disabled={!isCurrentMonth}
                      className={cn(
                        'h-8 w-8 rounded-lg text-xs transition-colors',
                        !isCurrentMonth && 'opacity-30 cursor-not-allowed',
                        isCurrentMonth && 'hover:bg-accent',
                        isTodayDate && !isSelectedDate && 'bg-primary/20 text-primary font-medium',
                        isSelectedDate && 'bg-[var(--color-success)] text-white hover:bg-[var(--color-success)]'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

// Compact version for task items
export function WhenBadge({
  value,
  whenDate,
  size = 'sm',
  hideToday = false
}: {
  value: WhenType | null
  whenDate?: string | null
  size?: 'sm' | 'xs'
  /** Hide "Dnes" badge (use on Today page where it's redundant) */
  hideToday?: boolean
}) {
  // null = Logbook (dokončené úlohy), nezobrazuj badge
  if (!value) return null

  // Don't show badge for inbox or anytime (anytime is redundant)
  if (value === 'inbox' || value === 'anytime') return null

  // Hide "today" badge if hideToday is true (e.g., on Today page)
  if (value === 'today' && hideToday) return null

  const option = whenOptions.find(opt => opt.value === value)
  if (!option) return null

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'd. MMM', { locale: sk })
    } catch {
      return date
    }
  }

  // Custom icon with correct colors for badges
  const getBadgeIcon = () => {
    const iconClass = size === 'sm' ? 'w-3 h-3' : 'w-2.5 h-2.5'
    switch (value) {
      case 'today':
        return <Star className={cn(iconClass, 'text-white fill-white')} />
      case 'scheduled':
        return <Calendar className={cn(iconClass, 'text-[var(--color-success)]')} />
      default:
        return null
    }
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full font-medium",
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]',
      value === 'today' && 'bg-primary text-white',
      value === 'scheduled' && 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
    )}>
      {getBadgeIcon()}
      <span>
        {value === 'scheduled' && whenDate
          ? formatDate(whenDate)
          : option.label
        }
      </span>
    </span>
  )
}

// Area/Department badge for task items
export function AreaBadge({
  area,
  size = 'sm'
}: {
  area: { name: string; color: string | null } | null | undefined
  size?: 'sm' | 'xs'
}) {
  if (!area) return null

  const color = area.color || '#007AFF' // Default to primary color

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'
      )}
      style={{
        backgroundColor: `${color}20`, // 20 = ~12% opacity in hex
        color: color
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{area.name}</span>
    </span>
  )
}
