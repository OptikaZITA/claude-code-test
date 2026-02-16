'use client'

import { useEffect, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Flag, Trash2, Repeat } from 'lucide-react'
import { TaskWithRelations, TaskPriority, RecurrenceRule } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { TagChipList } from '@/components/tags'
import { WhenBadge } from '@/components/tasks/when-picker'
import { DeadlineBadge } from '@/components/tasks/deadline-picker'
import { TimerPlayButton, TimerTimeDisplay } from '@/components/tasks/inline-time-tracker'
import { RecurrenceBadge } from '@/components/tasks/recurrence-badge'
import { RecurrenceConfigModal } from '@/components/tasks/recurrence-config-modal'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { useGlobalTimerContext } from '@/lib/contexts/global-timer-context'
import { useTaskTimeTotal } from '@/lib/hooks/use-task-time-total'
import { cn } from '@/lib/utils/cn'

interface KanbanCardProps {
  task: TaskWithRelations
  onClick: () => void
  onDelete?: () => void
  onUpdate?: (updates: Partial<TaskWithRelations>) => void
  isDragging?: boolean
  /** Hide "Dnes" badge (use on Today page where it's redundant) */
  hideToday?: boolean
  /** Je task oznaceny (multi-select) */
  isSelected?: boolean
  /** Callback for modifier key clicks (shift/cmd/ctrl) */
  onModifierClick?: (event: React.MouseEvent) => void
}

// Priority flag colors: red (high), yellow (low)
const priorityFlagColors: Record<TaskPriority, string> = {
  high: 'text-red-500',     // #EF4444 - Červená
  low: 'text-yellow-500',   // #EAB308 - Žltá
}

export function KanbanCard({ task, onClick, onDelete, onUpdate, isDragging, hideToday, isSelected = false, onModifierClick }: KanbanCardProps) {
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false)
  const { setDraggedTask } = useSidebarDrop()
  const { isRunning, currentTaskId } = useGlobalTimerContext()
  const { totalSeconds } = useTaskTimeTotal(task.id)

  const hasRecurrence = !!task.recurrence_rule

  // Check if timer is running for this task or if task has recorded time
  const isThisTaskRunning = isRunning && currentTaskId === task.id
  const hasTimeData = totalSeconds > 0 || isThisTaskRunning

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

  const handleClick = (e: React.MouseEvent) => {
    // Check for modifier keys (shift, cmd, ctrl)
    const hasModifier = e.shiftKey || e.metaKey || e.ctrlKey
    if (hasModifier && onModifierClick) {
      e.preventDefault()
      e.stopPropagation()
      onModifierClick(e)
      return
    }
    onClick()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        'group relative cursor-pointer rounded-[var(--radius-md)] bg-card p-3 shadow-sm transition-all hover:shadow-md border border-[var(--border)]',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2 scale-105',
        isCompleted && 'opacity-60',
        isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
    >
      {/* Action buttons - top right - hidden by default, show on hover */}
      <div className={cn(
        "absolute top-1.5 right-1.5 flex gap-0.5 z-10 transition-opacity",
        !hasRecurrence && "opacity-0 group-hover:opacity-100"
      )}>
        {/* Recurrence button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowRecurrenceModal(true)
          }}
          className={cn(
            'p-1 rounded transition-colors',
            hasRecurrence
              ? 'text-primary hover:text-primary/80'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title={hasRecurrence ? 'Upraviť opakovanie' : 'Nastaviť opakovanie'}
        >
          <Repeat className="h-3.5 w-3.5" />
        </button>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
            title="Vymazať"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Priority flag + tags - zobrazuje sa LEN pre definované priority */}
      <div className="mb-2 flex items-center gap-2">
        {task.priority && ['high', 'low'].includes(task.priority) && (
          <Flag
            className={cn('h-4 w-4 shrink-0', priorityFlagColors[task.priority])}
            fill="currentColor"
          />
        )}
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
          <WhenBadge value={task.when_type} whenDate={task.when_date} size="xs" hideToday={hideToday} />

          {/* Deadline badge */}
          <DeadlineBadge value={task.deadline} size="xs" />

          {/* Recurrence badge - always visible when task has recurrence */}
          {hasRecurrence && task.recurrence_rule && (
            <RecurrenceBadge rule={task.recurrence_rule} className="text-xs" />
          )}

          {/* Time tracker - play/pause button always visible, time display only when has time */}
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <TimerPlayButton taskId={task.id} className="p-1" />
            {hasTimeData && <TimerTimeDisplay taskId={task.id} />}
          </div>
        </div>

        {task.assignee && (
          <div className={cn(
            "relative",
            task.assignee.status === 'inactive' && "opacity-60"
          )}>
            <Avatar
              src={task.assignee.avatar_url}
              name={task.assignee.full_name}
              size="sm"
            />
            {task.assignee.status === 'inactive' && (
              <span className="absolute -bottom-1 -right-1 text-[8px] bg-[var(--bg-secondary)] px-0.5 rounded text-[var(--text-secondary)]">
                ×
              </span>
            )}
          </div>
        )}
      </div>

      {/* Recurrence Config Modal */}
      <RecurrenceConfigModal
        isOpen={showRecurrenceModal}
        onClose={() => setShowRecurrenceModal(false)}
        task={task}
        onSave={(rule) => {
          onUpdate?.({ recurrence_rule: rule })
        }}
      />
    </div>
  )
}
