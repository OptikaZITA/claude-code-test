'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Clock, AlertTriangle, GripVertical } from 'lucide-react'
import { TaskWithRelations, TaskStatus } from '@/types'
import { cn } from '@/lib/utils/cn'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface TimeBlockItemProps {
  task: TaskWithRelations
  hourHeight: number
  startHour: number
  hasConflict?: boolean
  onClick?: () => void
  onResizeStart?: (edge: 'top' | 'bottom') => void
  isDragging?: boolean
}

// Farby podľa statusu úlohy
const STATUS_COLORS: Record<TaskStatus, { bg: string; border: string; text: string }> = {
  backlog: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-700 dark:text-gray-300',
  },
  todo: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
  },
  in_progress: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-200',
  },
  review: {
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-800 dark:text-purple-200',
  },
  done: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-800 dark:text-green-200',
  },
  canceled: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-500 dark:text-gray-400',
  },
}

/**
 * Pomocná funkcia pre výpočet pozície a výšky time blocku
 */
function calculatePosition(
  scheduledStart: string,
  scheduledEnd: string,
  startHour: number,
  hourHeight: number
): { top: number; height: number } {
  const start = parseISO(scheduledStart)
  const end = parseISO(scheduledEnd)

  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const gridStartMinutes = startHour * 60

  const top = ((startMinutes - gridStartMinutes) / 60) * hourHeight
  const height = ((endMinutes - startMinutes) / 60) * hourHeight

  // Minimálna výška 15 minút
  const minHeight = hourHeight / 4
  return {
    top: Math.max(0, top),
    height: Math.max(minHeight, height)
  }
}

/**
 * Formátovanie časového rozsahu
 */
function formatTimeRange(start: string, end: string): string {
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  return `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`
}

/**
 * Výpočet trvania v minútach
 */
function getDurationMinutes(start: string, end: string): number {
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000)
}

export function TimeBlockItem({
  task,
  hourHeight,
  startHour,
  hasConflict = false,
  onClick,
  onResizeStart,
  isDragging = false,
}: TimeBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `time-block-${task.id}`,
    data: { task, type: 'time-block' },
  })

  const { top, height } = useMemo(() => {
    if (!task.scheduled_start || !task.scheduled_end) {
      return { top: 0, height: hourHeight }
    }
    return calculatePosition(task.scheduled_start, task.scheduled_end, startHour, hourHeight)
  }, [task.scheduled_start, task.scheduled_end, startHour, hourHeight])

  const colors = STATUS_COLORS[task.status] || STATUS_COLORS.todo

  const timeRange = useMemo(() => {
    if (!task.scheduled_start || !task.scheduled_end) return ''
    return formatTimeRange(task.scheduled_start, task.scheduled_end)
  }, [task.scheduled_start, task.scheduled_end])

  const durationMinutes = useMemo(() => {
    if (!task.scheduled_start || !task.scheduled_end) return 0
    return getDurationMinutes(task.scheduled_start, task.scheduled_end)
  }, [task.scheduled_start, task.scheduled_end])

  // Zobraziť trvanie ak je dosť miesta
  const showDuration = height >= hourHeight * 0.5
  // Zobraziť čas ak je dosť miesta
  const showTime = height >= hourHeight * 0.75

  const style = {
    top: `${top}px`,
    height: `${height}px`,
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'absolute left-1 right-1 rounded-lg border-2 overflow-hidden cursor-pointer',
        'transition-shadow hover:shadow-md',
        colors.bg,
        colors.border,
        hasConflict && 'ring-2 ring-red-500 ring-offset-1',
        isDragging && 'opacity-50 shadow-lg z-50'
      )}
      onClick={onClick}
      {...attributes}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center',
          'cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity',
          colors.bg
        )}
      >
        <GripVertical className="h-3 w-3 text-[var(--text-secondary)]" />
      </div>

      {/* Content */}
      <div className={cn('px-2 py-1 h-full flex flex-col', colors.text)}>
        {/* Title */}
        <div className="font-medium text-xs truncate flex-shrink-0">
          {task.title}
        </div>

        {/* Time and duration */}
        {showTime && (
          <div className="flex items-center gap-1 text-[10px] opacity-75 mt-0.5">
            <Clock className="h-2.5 w-2.5" />
            <span>{timeRange}</span>
          </div>
        )}

        {showDuration && !showTime && (
          <div className="text-[10px] opacity-75 mt-0.5">
            {durationMinutes >= 60
              ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
              : `${durationMinutes}m`
            }
          </div>
        )}

        {/* Project badge */}
        {task.project && height >= hourHeight && (
          <div className="mt-auto flex-shrink-0">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-white/50 dark:bg-black/20"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: task.project.color || 'var(--color-primary)' }}
              />
              <span className="truncate max-w-[80px]">{task.project.name}</span>
            </span>
          </div>
        )}

        {/* Conflict indicator */}
        {hasConflict && (
          <div className="absolute top-1 right-1">
            <AlertTriangle className="h-3 w-3 text-red-500" />
          </div>
        )}
      </div>

      {/* Resize handles */}
      {onResizeStart && (
        <>
          {/* Top resize handle */}
          <div
            className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10"
            onMouseDown={(e) => {
              e.stopPropagation()
              onResizeStart('top')
            }}
          />
          {/* Bottom resize handle */}
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10"
            onMouseDown={(e) => {
              e.stopPropagation()
              onResizeStart('bottom')
            }}
          />
        </>
      )}
    </div>
  )
}

/**
 * Komponent pre Google Calendar event v časovej mriežke
 */
interface GoogleEventTimeBlockProps {
  event: {
    id: string
    summary: string
    start: { dateTime?: string; date?: string }
    end: { dateTime?: string; date?: string }
  }
  hourHeight: number
  startHour: number
  onClick?: () => void
}

export function GoogleEventTimeBlock({
  event,
  hourHeight,
  startHour,
  onClick,
}: GoogleEventTimeBlockProps) {
  const { top, height } = useMemo(() => {
    const startDateTime = event.start.dateTime || event.start.date
    const endDateTime = event.end.dateTime || event.end.date

    if (!startDateTime || !endDateTime) {
      return { top: 0, height: hourHeight }
    }

    // Pre celodenné eventy (len dátum bez času)
    if (!event.start.dateTime) {
      return { top: 0, height: 24 } // Malá výška pre celodenné eventy
    }

    return calculatePosition(startDateTime, endDateTime, startHour, hourHeight)
  }, [event, startHour, hourHeight])

  const isAllDay = !event.start.dateTime

  const timeRange = useMemo(() => {
    if (isAllDay) return 'Celý deň'
    if (!event.start.dateTime || !event.end.dateTime) return ''
    return formatTimeRange(event.start.dateTime, event.end.dateTime)
  }, [event.start.dateTime, event.end.dateTime, isAllDay])

  const style = {
    top: isAllDay ? undefined : `${top}px`,
    height: isAllDay ? undefined : `${height}px`,
  }

  if (isAllDay) {
    // Celodenný event sa zobrazuje v hlavičke
    return null
  }

  return (
    <div
      style={style}
      className={cn(
        'absolute left-1 right-1 rounded-lg border overflow-hidden cursor-pointer',
        'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
        'hover:shadow-md transition-shadow'
      )}
      onClick={onClick}
    >
      <div className="px-2 py-1 h-full flex flex-col">
        {/* Title with calendar icon */}
        <div className="font-medium text-xs truncate text-gray-600 dark:text-gray-300 flex items-center gap-1">
          <span className="opacity-70">📅</span>
          <span>{event.summary || '(Bez názvu)'}</span>
        </div>

        {/* Time */}
        {height >= hourHeight * 0.5 && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            {timeRange}
          </div>
        )}
      </div>
    </div>
  )
}
