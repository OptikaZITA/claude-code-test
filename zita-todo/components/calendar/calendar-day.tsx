'use client'

import { format } from 'date-fns'
import { TaskWithRelations, TaskPriority } from '@/types'
import { cn } from '@/lib/utils/cn'

interface CalendarDayProps {
  date: Date
  tasks: TaskWithRelations[]
  isCurrentMonth: boolean
  isToday: boolean
  onClick: () => void
  onTaskClick: (task: TaskWithRelations) => void
  onTaskMove?: (taskId: string, newDate: Date) => void
}

const priorityColors: Record<TaskPriority, string> = {
  urgent: 'bg-[var(--color-error)]',
  high: 'bg-[var(--color-warning)]',
  medium: 'bg-[var(--color-primary)]',
  low: 'bg-[var(--text-secondary)]',
}

export function CalendarDay({
  date,
  tasks,
  isCurrentMonth,
  isToday,
  onClick,
  onTaskClick,
  onTaskMove,
}: CalendarDayProps) {
  const dayNumber = format(date, 'd')
  const completedTasks = tasks.filter((t) => t.status === 'done')
  const pendingTasks = tasks.filter((t) => t.status !== 'done')

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-[var(--color-primary)]/10')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-[var(--color-primary)]/10')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-[var(--color-primary)]/10')
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId && onTaskMove) {
      onTaskMove(taskId, date)
    }
  }

  return (
    <div
      className={cn(
        'min-h-[100px] border-b border-r border-[var(--border-primary)] p-1 transition-colors',
        !isCurrentMonth && 'bg-[var(--bg-secondary)]/50',
        isToday && 'bg-[var(--color-primary)]/5'
      )}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Day number */}
      <div className="mb-1 flex items-center justify-between">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-sm',
            isToday
              ? 'bg-[var(--color-primary)] font-semibold text-white'
              : isCurrentMonth
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)]'
          )}
        >
          {dayNumber}
        </span>
        {tasks.length > 0 && (
          <span className="text-xs text-[var(--text-secondary)]">
            {completedTasks.length}/{tasks.length}
          </span>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-0.5 overflow-hidden">
        {pendingTasks.slice(0, 3).map((task) => (
          <CalendarTask
            key={task.id}
            task={task}
            onClick={(e) => {
              e.stopPropagation()
              onTaskClick(task)
            }}
          />
        ))}
        {pendingTasks.length > 3 && (
          <div className="px-1 text-xs text-[var(--text-secondary)]">
            +{pendingTasks.length - 3} ďalších
          </div>
        )}
      </div>
    </div>
  )
}

interface CalendarTaskProps {
  task: TaskWithRelations
  onClick: (e: React.MouseEvent) => void
}

function CalendarTask({ task, onClick }: CalendarTaskProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors hover:bg-[var(--bg-hover)]',
        task.status === 'done' && 'opacity-50 line-through'
      )}
    >
      <div
        className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', priorityColors[task.priority])}
      />
      <span className="truncate text-[var(--text-primary)]">{task.title}</span>
    </div>
  )
}
