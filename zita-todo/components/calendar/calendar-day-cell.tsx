'use client'

import { format } from 'date-fns'
import { TaskWithRelations } from '@/types'
import { CalendarTaskItem } from './calendar-task-item'
import { cn } from '@/lib/utils/cn'

interface CalendarDayCellProps {
  date: Date
  tasks: TaskWithRelations[]
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  onClick: () => void
  onTaskClick: (task: TaskWithRelations) => void
  onTaskMove?: (taskId: string, newDate: Date) => void
  maxVisibleTasks?: number
}

export function CalendarDayCell({
  date,
  tasks,
  isCurrentMonth,
  isToday,
  isWeekend,
  onClick,
  onTaskClick,
  onTaskMove,
  maxVisibleTasks = 3,
}: CalendarDayCellProps) {
  const dayNumber = format(date, 'd')
  const pendingTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled')
  const completedTasks = tasks.filter((t) => t.status === 'done')

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

  const visibleTasks = pendingTasks.slice(0, maxVisibleTasks)
  const hiddenCount = pendingTasks.length - maxVisibleTasks

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
        {tasks.length > 0 && (
          <span className="text-[10px] text-[var(--text-secondary)]">
            {completedTasks.length > 0 ? `${completedTasks.length}/${tasks.length}` : tasks.length}
          </span>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-1">
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
