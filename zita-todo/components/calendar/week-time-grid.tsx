'use client'

import { useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isWeekend,
  isSameDay,
  parseISO,
} from 'date-fns'
import { sk } from 'date-fns/locale'
import { useDroppable } from '@dnd-kit/core'
import { TaskWithRelations } from '@/types'
import { GoogleCalendarEvent } from '@/app/api/google/events/route'
import { TimeBlockItem, GoogleEventTimeBlock } from './time-block-item'
import { cn } from '@/lib/utils/cn'
import { findConflicts } from '@/lib/hooks/use-time-blocks'

// Pracovné hodiny - 07:00 až 19:00
const WORK_HOURS = Array.from({ length: 13 }, (_, i) => i + 7)
const HOUR_HEIGHT = 60 // px

interface WeekTimeGridProps {
  currentDate: Date
  timeBlocks: TaskWithRelations[]
  googleEvents?: GoogleCalendarEvent[]
  onTimeBlockClick: (task: TaskWithRelations) => void
  onScheduleTask: (taskId: string, start: Date, end: Date) => Promise<void>
  onMoveTimeBlock: (taskId: string, newStart: Date, newEnd: Date) => Promise<void>
  onGoogleEventClick?: (event: GoogleCalendarEvent) => void
  /** Active drag ID from parent DndContext */
  activeDragId?: string | null
}

/**
 * Droppable time slot component
 */
function TimeSlot({
  day,
  hour,
  hourHeight,
}: {
  day: Date
  hour: number
  hourHeight: number
}) {
  const slotId = `slot-${format(day, 'yyyy-MM-dd')}-${hour}`
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { day, hour, type: 'time-slot' },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ height: hourHeight }}
      className={cn(
        'border-b border-dashed border-[var(--border-primary)]/50',
        'transition-colors',
        isOver && 'bg-[var(--color-primary)]/10'
      )}
    />
  )
}

/**
 * Hlavná časová mriežka pre týždenný pohľad
 */
export function WeekTimeGrid({
  currentDate,
  timeBlocks,
  googleEvents = [],
  onTimeBlockClick,
  onScheduleTask,
  onMoveTimeBlock,
  onGoogleEventClick,
  activeDragId = null,
}: WeekTimeGridProps) {

  // Dni v týždni
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  // Zoskupiť time blocks podľa dňa
  const timeBlocksByDay = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>()

    timeBlocks.forEach((task) => {
      if (task.scheduled_start) {
        const dateKey = format(parseISO(task.scheduled_start), 'yyyy-MM-dd')
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, task])
      }
    })

    return map
  }, [timeBlocks])

  // Zoskupiť Google eventy podľa dňa
  const googleEventsByDay = useMemo(() => {
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

  // Úlohy s deadline na daný deň (zobrazia sa v hlavičke)
  const tasksByDeadline = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>()

    // Filtrujeme úlohy ktoré majú deadline ale nie sú naplánované
    timeBlocks.forEach((task) => {
      if (task.deadline && !task.scheduled_start) {
        const dateKey = task.deadline
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, task])
      }
    })

    return map
  }, [timeBlocks])

  // Celodenné Google eventy
  const allDayEvents = useMemo(() => {
    return googleEvents.filter(event => !event.start.dateTime)
  }, [googleEvents])

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header s dňami */}
      <div className="flex sticky top-0 z-20 bg-[var(--bg-primary)] border-b border-[var(--border-primary)]">
        {/* Prázdna bunka pre časovú os */}
        <div className="w-16 flex-shrink-0 border-r border-[var(--border-primary)]" />

          {/* Dni */}
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayTimeBlocks = timeBlocksByDay.get(dateKey) || []
            const deadlineTasks = tasksByDeadline.get(dateKey) || []
            const dayAllDayEvents = allDayEvents.filter(e =>
              e.start.date && isSameDay(parseISO(e.start.date), day)
            )

            return (
              <div
                key={dateKey}
                className={cn(
                  'flex-1 min-w-[120px] border-r border-[var(--border-primary)] last:border-r-0',
                  isWeekend(day) && 'bg-[var(--bg-tertiary)]/30'
                )}
              >
                {/* Deň a dátum */}
                <div className="py-2 px-2 text-center">
                  <div className={cn(
                    'text-xs font-medium uppercase tracking-wide mb-1',
                    isWeekend(day) ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                  )}>
                    {format(day, 'EEEEEE', { locale: sk })}
                  </div>
                  <span
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                      isToday(day)
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--text-primary)]'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Celodenné eventy */}
                {dayAllDayEvents.length > 0 && (
                  <div className="px-1 pb-1 space-y-1">
                    {dayAllDayEvents.map(event => (
                      <div
                        key={event.id}
                        className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded truncate cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                        onClick={() => onGoogleEventClick?.(event)}
                      >
                        📅 {event.summary}
                      </div>
                    ))}
                  </div>
                )}

                {/* Úlohy s deadline */}
                {deadlineTasks.length > 0 && (
                  <div className="px-1 pb-1 border-t border-dashed border-[var(--border-primary)]">
                    <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wide py-0.5">
                      Deadline
                    </div>
                    <div className="space-y-0.5">
                      {deadlineTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className="text-[10px] px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded truncate cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30"
                          onClick={() => onTimeBlockClick(task)}
                        >
                          {task.title}
                        </div>
                      ))}
                      {deadlineTasks.length > 3 && (
                        <div className="text-[9px] text-[var(--text-secondary)] px-1">
                          +{deadlineTasks.length - 3} ďalších
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Časová mriežka */}
        <div className="flex flex-1">
          {/* Časová os */}
          <div className="w-16 flex-shrink-0 border-r border-[var(--border-primary)]">
            {WORK_HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="text-xs text-[var(--text-secondary)] text-right pr-2 pt-0 -mt-2"
              >
                {hour}:00
              </div>
            ))}
          </div>

          {/* Dni s time slotmi */}
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayTimeBlocks = timeBlocksByDay.get(dateKey) || []
            const dayGoogleEvents = (googleEventsByDay.get(dateKey) || []).filter(
              e => e.start.dateTime // Len eventy s časom
            )

            return (
              <div
                key={dateKey}
                className={cn(
                  'flex-1 min-w-[120px] relative border-r border-[var(--border-primary)] last:border-r-0',
                  isWeekend(day) && 'bg-[var(--bg-tertiary)]/20',
                  isToday(day) && 'bg-[var(--color-primary)]/5'
                )}
              >
                {/* Time slots (droppable) */}
                {WORK_HOURS.map((hour) => (
                  <TimeSlot
                    key={`${dateKey}-${hour}`}
                    day={day}
                    hour={hour}
                    hourHeight={HOUR_HEIGHT}
                  />
                ))}

                {/* Google Calendar eventy */}
                {dayGoogleEvents.map((event) => (
                  <GoogleEventTimeBlock
                    key={event.id}
                    event={event}
                    hourHeight={HOUR_HEIGHT}
                    startHour={WORK_HOURS[0]}
                    onClick={() => onGoogleEventClick?.(event)}
                  />
                ))}

                {/* Time blocks (ZITA úlohy) */}
                {dayTimeBlocks.map((task) => {
                  const conflicts = findConflicts(
                    task,
                    dayTimeBlocks,
                    dayGoogleEvents.map(e => ({
                      id: e.id,
                      start: parseISO(e.start.dateTime!),
                      end: parseISO(e.end.dateTime || e.end.date!),
                    }))
                  )

                  return (
                    <TimeBlockItem
                      key={task.id}
                      task={task}
                      hourHeight={HOUR_HEIGHT}
                      startHour={WORK_HOURS[0]}
                      hasConflict={conflicts.length > 0}
                      onClick={() => onTimeBlockClick(task)}
                      isDragging={activeDragId === `time-block-${task.id}`}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
  )
}
