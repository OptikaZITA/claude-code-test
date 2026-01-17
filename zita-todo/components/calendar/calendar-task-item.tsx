'use client'

import { useMemo } from 'react'
import { format, isToday, isPast, parseISO, startOfDay } from 'date-fns'
import { TaskWithRelations } from '@/types'
import { cn } from '@/lib/utils/cn'

interface CalendarTaskItemProps {
  task: TaskWithRelations
  onClick: (e: React.MouseEvent) => void
  onDragStart?: (e: React.DragEvent) => void
  compact?: boolean // For month view (shorter display)
}

// Color based on deadline status
function getDeadlineColor(deadline: string | null): {
  bg: string
  text: string
  dot: string
} {
  if (!deadline) {
    return {
      bg: 'bg-[var(--bg-tertiary)]',
      text: 'text-[var(--text-primary)]',
      dot: 'bg-gray-400',
    }
  }

  const deadlineDate = startOfDay(parseISO(deadline))
  const today = startOfDay(new Date())

  if (isPast(deadlineDate) && !isToday(deadlineDate)) {
    // Overdue - red
    return {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      dot: 'bg-red-500',
    }
  }

  if (isToday(deadlineDate)) {
    // Today - yellow/orange
    return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
      dot: 'bg-amber-500',
    }
  }

  // Future - blue
  return {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
  }
}

export function CalendarTaskItem({
  task,
  onClick,
  onDragStart,
  compact = false,
}: CalendarTaskItemProps) {
  const colors = useMemo(() => getDeadlineColor(task.deadline), [task.deadline])

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(e)
  }

  if (compact) {
    // Month view - compact display
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={onClick}
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors',
          colors.bg,
          'hover:opacity-80',
          task.status === 'done' && 'opacity-50 line-through'
        )}
      >
        <div className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', colors.dot)} />
        <span className={cn('truncate', colors.text)}>{task.title}</span>
      </div>
    )
  }

  // Week view - expanded display
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-lg px-2 py-1.5 transition-colors',
        colors.bg,
        'hover:opacity-80',
        task.status === 'done' && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', colors.dot)} />
        <div className="min-w-0 flex-1">
          <p className={cn(
            'text-sm font-medium truncate',
            colors.text,
            task.status === 'done' && 'line-through'
          )}>
            {task.title}
          </p>
          {task.project && (
            <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
              {task.project.name}
            </p>
          )}
        </div>
      </div>
      {task.assignee && (
        <div className="flex items-center gap-1 mt-1 ml-4">
          {task.assignee.avatar_url ? (
            <img
              src={task.assignee.avatar_url}
              alt={task.assignee.nickname || task.assignee.full_name || ''}
              className="h-4 w-4 rounded-full"
            />
          ) : (
            <div className="h-4 w-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[8px] text-[var(--text-secondary)]">
              {(task.assignee.nickname || task.assignee.full_name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-[var(--text-secondary)] truncate">
            {task.assignee.nickname || task.assignee.full_name}
          </span>
        </div>
      )}
    </div>
  )
}

export { getDeadlineColor }
