'use client'

import { useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, Flag, FileText, Tag as TagIcon } from 'lucide-react'
import { TaskWithRelations, TaskPriority } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { DeadlineBadge } from '@/components/tasks/deadline-picker'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { cn } from '@/lib/utils/cn'
import { formatDurationShort } from '@/lib/utils/date'

interface KanbanCardProps {
  task: TaskWithRelations
  onClick: () => void
  isDragging?: boolean
  /** Show avatar only if multiple assignees */
  showAvatar?: boolean
}

// Priority flag colors: red (high), yellow (low)
const priorityFlagColors: Record<TaskPriority, string> = {
  high: 'text-red-500',
  low: 'text-yellow-500',
}

export function KanbanCard({ task, onClick, isDragging, showAvatar = true }: KanbanCardProps) {
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

  // Smart display rules
  const shouldShowPriority = task.priority && ['high', 'low'].includes(task.priority)
  const shouldShowDeadline = !!task.deadline
  const shouldShowTime = (task.total_time_seconds ?? 0) > 0
  const hasTags = task.tags && task.tags.length > 0
  const hasNotes = !!task.notes

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-[var(--radius-md)] bg-card shadow-sm transition-all hover:shadow-md border border-[var(--border)]',
        'py-[var(--task-padding-y)] px-[var(--task-padding-x)]',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2 scale-105',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Row 1: Priority + Title + Notes icon */}
      <div className="flex items-center gap-1.5 mb-1">
        {shouldShowPriority && (
          <Flag
            className={cn('h-3 w-3 shrink-0', priorityFlagColors[task.priority!])}
            fill="currentColor"
          />
        )}
        <p
          className={cn(
            'flex-1 min-w-0 truncate text-[var(--task-font-size)] font-medium text-foreground',
            isCompleted && 'line-through text-muted-foreground'
          )}
        >
          {task.title}
        </p>
        {hasNotes && (
          <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Row 2: Tags (max 2) */}
      {hasTags && (
        <div className="flex items-center gap-1 mb-1">
          {task.tags!.slice(0, 2).map(tag => (
            <span
              key={tag.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground whitespace-nowrap"
            >
              {tag.name}
            </span>
          ))}
          {task.tags!.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{task.tags!.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Row 3: Meta info - deadline, time, avatar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {shouldShowDeadline && (
            <DeadlineBadge value={task.deadline} size="xs" />
          )}

          {shouldShowTime && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {formatDurationShort(task.total_time_seconds!)}
            </span>
          )}
        </div>

        {showAvatar && task.assignee && (
          <Avatar
            src={task.assignee.avatar_url}
            name={task.assignee.full_name}
            size="xs"
          />
        )}
      </div>
    </div>
  )
}
