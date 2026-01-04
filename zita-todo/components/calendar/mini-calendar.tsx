'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  isPast,
  startOfDay,
} from 'date-fns'
import { sk } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TaskWithRelations } from '@/types'
import { cn } from '@/lib/utils/cn'

interface MiniCalendarProps {
  tasks: TaskWithRelations[]
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  className?: string
}

const WEEKDAYS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

export function MiniCalendar({
  tasks,
  selectedDate,
  onDateSelect,
  className,
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Map of dates to task counts
  const taskCountByDate = useMemo(() => {
    const map = new Map<string, number>()

    tasks.forEach((task) => {
      if (task.when_date) {
        const dateKey = format(new Date(task.when_date), 'yyyy-MM-dd')
        map.set(dateKey, (map.get(dateKey) || 0) + 1)
      }
    })

    return map
  }, [tasks])

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <div className={cn('rounded-xl bg-[var(--bg-primary)] p-4 shadow-sm border border-[var(--border-primary)]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] capitalize">
          {format(currentMonth, 'LLLL yyyy', { locale: sk })}
        </h3>
        <button
          onClick={goToNextMonth}
          className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-[var(--text-secondary)]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const taskCount = taskCountByDate.get(dateKey) || 0
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isPastDay = isPast(startOfDay(day)) && !isToday(day)

          return (
            <button
              key={dateKey}
              onClick={() => onDateSelect(day)}
              disabled={!isCurrentMonth}
              className={cn(
                'relative flex flex-col items-center justify-center h-8 w-8 rounded-lg text-xs transition-all',
                !isCurrentMonth && 'opacity-30 cursor-not-allowed',
                isCurrentMonth && 'hover:bg-[var(--bg-secondary)]',
                isToday(day) && 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]',
                isSelected && !isToday(day) && 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/10',
                isPastDay && isCurrentMonth && !isToday(day) && 'text-[var(--text-secondary)]'
              )}
            >
              <span className={cn(
                'font-medium',
                isToday(day) ? 'text-white' : 'text-[var(--text-primary)]',
                !isCurrentMonth && 'text-[var(--text-secondary)]'
              )}>
                {format(day, 'd')}
              </span>
              {/* Task indicator dots */}
              {taskCount > 0 && isCurrentMonth && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {taskCount === 1 && (
                    <span className={cn(
                      'h-1 w-1 rounded-full',
                      isToday(day) ? 'bg-white' : 'bg-[var(--color-primary)]'
                    )} />
                  )}
                  {taskCount === 2 && (
                    <>
                      <span className={cn(
                        'h-1 w-1 rounded-full',
                        isToday(day) ? 'bg-white' : 'bg-[var(--color-primary)]'
                      )} />
                      <span className={cn(
                        'h-1 w-1 rounded-full',
                        isToday(day) ? 'bg-white' : 'bg-[var(--color-primary)]'
                      )} />
                    </>
                  )}
                  {taskCount >= 3 && (
                    <>
                      <span className={cn(
                        'h-1 w-1 rounded-full',
                        isToday(day) ? 'bg-white' : 'bg-[var(--color-primary)]'
                      )} />
                      <span className={cn(
                        'h-1 w-1 rounded-full',
                        isToday(day) ? 'bg-white' : 'bg-[var(--color-warning)]'
                      )} />
                      <span className={cn(
                        'h-1 w-1 rounded-full',
                        isToday(day) ? 'bg-white' : 'bg-[var(--color-error)]'
                      )} />
                    </>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-[var(--border-primary)]">
        <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--text-secondary)]">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
            <span>1-2 ulohy</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warning)]" />
            <span>3+ ulohy</span>
          </div>
        </div>
      </div>
    </div>
  )
}
