'use client'

import { useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock } from 'lucide-react'
import { TaskWithRelations, TaskPriority } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { TagChipList } from '@/components/tags'
import { WhenBadge } from '@/components/tasks/when-picker'
import { DeadlineBadge } from '@/components/tasks/deadline-picker'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { cn } from '@/lib/utils/cn'
import { formatDurationShort } from '@/lib/utils/date'

interface KanbanCardProps {
  task: TaskWithRelations
  onClick: () => void
  isDragging?: boolean
}

const priorityDots: Record<TaskPriority, string> = {
  urgent: 'bg-error',
  high: 'bg-warning',
  medium: 'bg-[var(--priority-medium)]',
  low: 'bg-[var(--priority-low)]',
}

export function KanbanCard({ task, onClick, isDragging }: KanbanCardProps) {
  const { setDraggedTask } = useSidebarDrop()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  // Notify sidebar context when dragging starts/ends
  // This enables drag to sidebar drop targets (Trash, Areas, Projects, etc.)
  useEffect(() => {
    if (isSortableDragging) {
      setDraggedTask(task)
    } else {
      setDraggedTask(null)
    }
  }, [isSortableDragging, task, setDraggedTask])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isCompleted = task.status === 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-[var(--radius-md)] bg-card p-3 shadow-sm transition-all hover:shadow-md border border-[var(--border)]',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2 scale-105',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Priority indicator + tags */}
      <div className="mb-2 flex items-center gap-2">
        <div className={cn('h-2.5 w-2.5 rounded-full', priorityDots[task.priority])} />
        {task.tags && task.tags.length > 0 && (
          <TagChipList tags={task.tags.slice(0, 2)} size="sm" />
        )}
        {task.tags && task.tags.length > 2 && (
          <span className="text-xs text-muted-foreground">
            +{task.tags.length - 2}
          </span>
        )}
      </div>

      {/* Title */}
      <p
        className={cn(
          'mb-2 text-sm font-medium text-foreground',
          isCompleted && 'line-through text-muted-foreground'
        )}
      >
        {task.title}
      </p>

      {/* Meta info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* When badge (Things 3 style) */}
          <WhenBadge value={task.when_type} whenDate={task.when_date} size="xs" />

          {/* Deadline badge */}
          <DeadlineBadge value={task.deadline} size="xs" />

          {task.total_time_seconds && task.total_time_seconds > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
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
