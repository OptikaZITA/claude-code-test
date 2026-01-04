'use client'

import { useState } from 'react'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { sk } from 'date-fns/locale'
import { X, Calendar } from 'lucide-react'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { cn } from '@/lib/utils/cn'

export function CalendarDropPicker() {
  const {
    showCalendarPicker,
    setShowCalendarPicker,
    pendingCalendarTask,
    handleCalendarDateSelect,
  } = useSidebarDrop()

  const [currentMonth, setCurrentMonth] = useState(new Date())

  if (!showCalendarPicker || !pendingCalendarTask) return null

  const handleClose = () => {
    setShowCalendarPicker(false)
  }

  const handleDateClick = (date: Date) => {
    handleCalendarDateSelect(format(date, 'yyyy-MM-dd'))
  }

  // Quick options
  const quickOptions = [
    { label: 'Dnes', date: new Date() },
    { label: 'Zajtra', date: addDays(new Date(), 1) },
    { label: 'O týždeň', date: addDays(new Date(), 7) },
    { label: 'O mesiac', date: addMonths(new Date(), 1) },
  ]

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekDays = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">
                Nastaviť termín
              </h3>
              <p className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">
                {pendingCalendarTask.title}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick options */}
        <div className="p-3 border-b border-[var(--border-primary)]">
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => handleDateClick(option.date)}
                className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <span className="text-lg text-[var(--text-secondary)]">‹</span>
            </button>
            <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
              {format(currentMonth, 'LLLL yyyy', { locale: sk })}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <span className="text-lg text-[var(--text-secondary)]">›</span>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-[var(--text-secondary)] py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isTodayDate = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  disabled={!isCurrentMonth}
                  className={cn(
                    'h-9 w-9 rounded-lg text-sm transition-colors',
                    !isCurrentMonth && 'opacity-30 cursor-not-allowed',
                    isCurrentMonth && 'hover:bg-[var(--color-primary)] hover:text-white',
                    isTodayDate && 'bg-[var(--color-primary)] text-white font-semibold',
                    !isTodayDate && isCurrentMonth && 'text-[var(--text-primary)]'
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <button
            onClick={handleClose}
            className="w-full py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Zrušiť
          </button>
        </div>
      </div>
    </div>
  )
}
