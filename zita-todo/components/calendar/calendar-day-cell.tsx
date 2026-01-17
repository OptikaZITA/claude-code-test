'use client'

import { format } from 'date-fns'
import { TaskWithRelations } from '@/types'
import { CalendarTaskItem } from './calendar-task-item'
import { GoogleCalendarEventDot } from '@/components/integrations/google-calendar-event'
import { GoogleCalendarEvent } from '@/app/api/google/events/route'
import { cn } from '@/lib/utils/cn'

interface CalendarDayCellProps {
  date: Date
  tasks: TaskWithRelations[]
  googleEvents?: GoogleCalendarEvent[]
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  onClick: () => void
  onTaskClick: (task: TaskWithRelations) => void
  onTaskMove?: (taskId: string, newDate: Date) => void
  onGoogleEventClick?: (event: GoogleCalendarEvent) => void
  maxVisibleTasks?: number
}

export function CalendarDayCell({
  date,
  tasks,
  googleEvents = [],
  isCurrentMonth,
  isToday,
  isWeekend,
  onClick,
  onTaskClick,
  onTaskMove,
  onGoogleEventClick,
  maxVisibleTasks = 3,
}: CalendarDayCellProps) {
  const dayNumber = format(date, 'd')
  const pendingTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled')
  const completedTasks = tasks.filter((t) => t.status === 'done')
  const totalItemCount = tasks.length + googleEvents.length

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('ring-2', 'ring-[var(--color-primary)]', 'ring-inset')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-[var(--color-primary)]', 'ring-inset')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('ring-2', 'ring-[var(--color-primary)]', 'ring-inset')
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId && onTaskMove) {
      onTaskMove(taskId, date)
    }
  }

  // Calculate visible items: Google events first, then tasks
  const maxGoogleEvents = Math.min(googleEvents.length, 2)
  const remainingSlots = maxVisibleTasks - maxGoogleEvents
  const visibleGoogleEvents = googleEvents.slice(0, maxGoogleEvents)
  const visibleTasks = pendingTasks.slice(0, remainingSlots)
  const hiddenCount = pendingTasks.length - visibleTasks.length + (googleEvents.length - maxGoogleEvents)

  return (
    <div
      className={cn(
        'min-h-[120px] border-b border-r border-[var(--border-primary)] p-2 transition-colors cursor-pointer',
        !isCurrentMonth && 'bg-[var(--bg-tertiary)]/30',
        isCurrentMonth && isWeekend && 'bg-[var(--bg-secondary)]/50',
        isToday && 'bg-[var(--color-primary)]/5',
        'hover:bg-[var(--bg-hover)]'
      )}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
            isToday
              ? 'bg-[var(--color-primary)] text-white'
              : isCurrentMonth
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)]/50'
          )}
        >
          {dayNumber}
        </span>
        {totalItemCount > 0 && (
          <span className="text-[10px] text-[var(--text-secondary)]">
            {completedTasks.length > 0 ? `${completedTasks.length}/${tasks.length}` : totalItemCount}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="space-y-1">
        {/* Google events first */}
        {visibleGoogleEvents.map((event) => (
          <GoogleCalendarEventDot
            key={event.id}
            event={event}
            onClick={onGoogleEventClick ? () => {
              onGoogleEventClick(event)
            } : undefined}
          />
        ))}

        {/* ZITA tasks */}
        {visibleTasks.map((task) => (
          <CalendarTaskItem
            key={task.id}
            task={task}
            compact
            onClick={(e) => {
              e.stopPropagation()
              onTaskClick(task)
            }}
          />
        ))}
        {hiddenCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClick() // This will switch to week view
            }}
            className="w-full text-left px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--color-primary)] transition-colors"
          >
            +{hiddenCount} ďalších
          </button>
        )}
      </div>
    </div>
  )
}
