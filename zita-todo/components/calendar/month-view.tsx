'use client'

import { useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  parseISO,
} from 'date-fns'
import { TaskWithRelations } from '@/types'
import { CalendarDayCell } from './calendar-day-cell'
import { GoogleCalendarEvent } from '@/app/api/google/events/route'
import { cn } from '@/lib/utils/cn'

interface MonthViewProps {
  currentDate: Date
  tasks: TaskWithRelations[]
  googleEvents?: GoogleCalendarEvent[]
  onDayClick: (date: Date) => void
  onTaskClick: (task: TaskWithRelations) => void
  onTaskMove?: (taskId: string, newDate: Date) => void
}

const WEEKDAYS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

export function MonthView({
  currentDate,
  tasks,
  googleEvents = [],
  onDayClick,
  onTaskClick,
  onTaskMove,
}: MonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  // Group tasks by deadline date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>()

    tasks.forEach((task) => {
      if (task.deadline) {
        const dateKey = task.deadline // Already in yyyy-MM-dd format
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, task])
      }
    })

    return map
  }, [tasks])

  // Group Google events by date
  const googleEventsByDate = useMemo(() => {
    const map = new Map<string, GoogleCalendarEvent[]>()

    googleEvents.forEach((event) => {
      const eventDate = event.start.dateTime
        ? parseISO(event.start.dateTime)
        : event.start.date
          ? parseISO(event.start.date)
          : null

      if (eventDate) {
        const dateKey = format(eventDate, 'yyyy-MM-dd')
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, event])
      }
    })

    return map
  }, [googleEvents])

  // Group days into weeks for row rendering
  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [days])

  return (
    <div className="flex flex-col h-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={cn(
              'py-2 text-center text-xs font-medium uppercase tracking-wide',
              index >= 5 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-rows-[repeat(auto-fill,minmax(120px,1fr))] h-full">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const dayTasks = tasksByDate.get(dateKey) || []
                const dayGoogleEvents = googleEventsByDate.get(dateKey) || []
                const isCurrentMonth = isSameMonth(day, currentDate)

                return (
                  <CalendarDayCell
                    key={dateKey}
                    date={day}
                    tasks={dayTasks}
                    googleEvents={dayGoogleEvents}
                    isCurrentMonth={isCurrentMonth}
                    isToday={isToday(day)}
                    isWeekend={isWeekend(day)}
                    onClick={() => onDayClick(day)}
                    onTaskClick={onTaskClick}
                    onTaskMove={onTaskMove}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
