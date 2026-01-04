'use client'

import { Clock } from 'lucide-react'
import { TaskWithRelations, TaskPriority } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar } from '@/components/ui/avatar'
import { TagChipList } from '@/components/tags'
import { WhenBadge } from '@/components/tasks/when-picker'
import { DeadlineBadge } from '@/components/tasks/deadline-picker'
import { cn } from '@/lib/utils/cn'
import { formatDurationShort } from '@/lib/utils/date'

interface TaskItemProps {
  task: TaskWithRelations
  onClick: () => void
  onComplete: (completed: boolean) => void
}

const priorityColors: Record<TaskPriority, string> = {
  urgent: 'border-l-[var(--color-error)]',
  high: 'border-l-[var(--color-warning)]',
  medium: 'border-l-[var(--color-primary)]',
  low: 'border-l-[var(--text-secondary)]',
}

export function TaskItem({ task, onClick, onComplete }: TaskItemProps) {
  const isCompleted = task.status === 'done'

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border-l-4 bg-[var(--bg-primary)] p-3 transition-colors hover:bg-[var(--bg-hover)] cursor-pointer',
        priorityColors[task.priority],
        isCompleted && 'opacity-60'
      )}
      onClick={onClick}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isCompleted}
          onChange={(checked) => onComplete(checked)}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium text-[var(--text-primary)]',
            isCompleted && 'line-through text-[var(--text-secondary)]'
          )}
        >
          {task.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {task.project && (
            <span className="text-xs text-[var(--text-secondary)]">
              {task.project.name}
            </span>
          )}

          {/* When badge (Things 3 style) */}
          <WhenBadge value={task.when_type} whenDate={task.when_date} />

          {/* Deadline badge */}
          <DeadlineBadge value={task.deadline} />

          {task.total_time_seconds && task.total_time_seconds > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Clock className="h-3 w-3" />
              {formatDurationShort(task.total_time_seconds)}
            </span>
          )}

          {task.tags && task.tags.length > 0 && (
            <TagChipList tags={task.tags} size="sm" />
          )}
        </div>
      </div>

      {task.assignee && (
        <Avatar
          src={task.assignee.avatar_url}
          name={task.assignee.full_name}
          size="sm"
        />
      )}
    </div>
  )
}
