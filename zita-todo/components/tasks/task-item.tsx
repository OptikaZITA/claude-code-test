'use client'

import { Calendar, Clock } from 'lucide-react'
import { TaskWithRelations, TaskPriority } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatDurationShort, isOverdue } from '@/lib/utils/date'

interface TaskItemProps {
  task: TaskWithRelations
  onClick: () => void
  onComplete: (completed: boolean) => void
}

const priorityColors: Record<TaskPriority, string> = {
  urgent: 'border-l-[#FF3B30]',
  high: 'border-l-[#FF9500]',
  medium: 'border-l-[#007AFF]',
  low: 'border-l-[#86868B]',
}

export function TaskItem({ task, onClick, onComplete }: TaskItemProps) {
  const isCompleted = task.status === 'done'
  const overdue = task.due_date && isOverdue(task.due_date) && !isCompleted

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border-l-4 bg-white p-3 transition-colors hover:bg-[#F5F5F7] cursor-pointer',
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
            'text-sm font-medium text-[#1D1D1F]',
            isCompleted && 'line-through text-[#86868B]'
          )}
        >
          {task.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {task.project && (
            <span className="text-xs text-[#86868B]">
              {task.project.name}
            </span>
          )}

          {task.due_date && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                overdue ? 'text-[#FF3B30]' : 'text-[#86868B]'
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.due_date)}
            </span>
          )}

          {task.total_time_seconds && task.total_time_seconds > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#86868B]">
              <Clock className="h-3 w-3" />
              {formatDurationShort(task.total_time_seconds)}
            </span>
          )}

          {task.tags?.map((tag) => (
            <Badge
              key={tag.id}
              className="text-xs"
              style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined }}
            >
              {tag.name}
            </Badge>
          ))}
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
