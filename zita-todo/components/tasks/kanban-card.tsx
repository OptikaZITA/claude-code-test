'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, Clock } from 'lucide-react'
import { TaskWithRelations, TaskPriority } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatDurationShort, isOverdue } from '@/lib/utils/date'

interface KanbanCardProps {
  task: TaskWithRelations
  onClick: () => void
  isDragging?: boolean
}

const priorityDots: Record<TaskPriority, string> = {
  urgent: 'bg-[#FF3B30]',
  high: 'bg-[#FF9500]',
  medium: 'bg-[#007AFF]',
  low: 'bg-[#86868B]',
}

export function KanbanCard({ task, onClick, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isCompleted = task.status === 'done'
  const overdue = task.due_date && isOverdue(task.due_date) && !isCompleted

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-lg bg-white p-3 shadow-sm transition-all hover:shadow-md',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Priority indicator + tags */}
      <div className="mb-2 flex items-center gap-2">
        <div className={cn('h-2 w-2 rounded-full', priorityDots[task.priority])} />
        {task.tags?.slice(0, 2).map((tag) => (
          <Badge
            key={tag.id}
            className="text-xs"
            style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined }}
          >
            {tag.name}
          </Badge>
        ))}
      </div>

      {/* Title */}
      <p
        className={cn(
          'mb-2 text-sm font-medium text-[#1D1D1F]',
          isCompleted && 'line-through text-[#86868B]'
        )}
      >
        {task.title}
      </p>

      {/* Meta info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-[#86868B]">
          {task.due_date && (
            <span className={cn('flex items-center gap-1', overdue && 'text-[#FF3B30]')}>
              <Calendar className="h-3 w-3" />
              {formatDate(task.due_date)}
            </span>
          )}
          {task.total_time_seconds && task.total_time_seconds > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDurationShort(task.total_time_seconds)}
            </span>
          )}
        </div>

        {task.assignee && (
          <Avatar
            src={task.assignee.avatar_url}
            name={task.assignee.full_name}
            size="sm"
          />
        )}
      </div>
    </div>
  )
}
