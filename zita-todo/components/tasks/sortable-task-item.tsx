'use client'

import { useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskWithRelations } from '@/types'
import { TaskItem } from './task-item'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { cn } from '@/lib/utils/cn'

interface SortableTaskItemProps {
  task: TaskWithRelations
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
  onClick?: () => void
  onComplete: (completed: boolean) => void
  onUpdate?: (updates: Partial<TaskWithRelations>) => void
  onDelete?: () => void
  enableInlineEdit?: boolean
  isDragDisabled?: boolean
}

export function SortableTaskItem({
  task,
  isExpanded,
  onExpand,
  onCollapse,
  onClick,
  onComplete,
  onUpdate,
  onDelete,
  enableInlineEdit = true,
  isDragDisabled = false,
}: SortableTaskItemProps) {
  const { setDraggedTask } = useSidebarDrop()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragDisabled || isExpanded,
  })

  // Notify sidebar context when dragging starts/ends
  useEffect(() => {
    if (isDragging) {
      setDraggedTask(task)
    } else {
      setDraggedTask(null)
    }
  }, [isDragging, task, setDraggedTask])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // When expanded, render without drag functionality
  if (isExpanded) {
    return (
      <TaskItem
        task={task}
        isExpanded={isExpanded}
        onExpand={onExpand}
        onCollapse={onCollapse}
        onClick={onClick}
        onComplete={onComplete}
        onUpdate={onUpdate}
        onDelete={onDelete}
        enableInlineEdit={enableInlineEdit}
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <TaskItem
        task={task}
        isExpanded={isExpanded}
        onExpand={onExpand}
        onCollapse={onCollapse}
        onClick={onClick}
        onComplete={onComplete}
        onUpdate={onUpdate}
        onDelete={onDelete}
        enableInlineEdit={enableInlineEdit}
      />
    </div>
  )
}
