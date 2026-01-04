'use client'

import { useState, useEffect, useRef } from 'react'
import { TaskWithRelations } from '@/types'
import { TaskItem } from './task-item'
import { TaskQuickAdd } from './task-quick-add'
import { DraggableTask } from './draggable-task'

interface TaskListProps {
  tasks: TaskWithRelations[]
  onTaskClick?: (task: TaskWithRelations) => void
  onTaskComplete: (taskId: string, completed: boolean) => void
  onTaskUpdate?: (taskId: string, updates: Partial<TaskWithRelations>) => void
  onTaskDelete?: (taskId: string) => void
  onQuickAdd: (title: string) => void
  emptyMessage?: string
  showQuickAdd?: boolean
  enableDrag?: boolean
  enableInlineEdit?: boolean
}

export function TaskList({
  tasks,
  onTaskClick,
  onTaskComplete,
  onTaskUpdate,
  onTaskDelete,
  onQuickAdd,
  emptyMessage = 'Ziadne ulohy',
  showQuickAdd = true,
  enableDrag = true,
  enableInlineEdit = true,
}: TaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle click outside to collapse
  useEffect(() => {
    if (!expandedTaskId) return

    const handleClickOutside = (e: MouseEvent) => {
      // Don't collapse if clicking inside a dropdown/popover
      const target = e.target as HTMLElement
      if (target.closest('[data-radix-popper-content-wrapper]') ||
          target.closest('[role="dialog"]') ||
          target.closest('[role="listbox"]')) {
        return
      }

      if (containerRef.current && !containerRef.current.contains(target)) {
        setExpandedTaskId(null)
      }
    }

    // Use setTimeout to avoid immediate collapse on the same click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [expandedTaskId])

  // Handle Escape key to collapse
  useEffect(() => {
    if (!expandedTaskId) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedTaskId(null)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [expandedTaskId])

  const handleTaskExpand = (taskId: string) => {
    setExpandedTaskId(taskId)
  }

  const handleTaskCollapse = () => {
    setExpandedTaskId(null)
  }

  const handleTaskUpdate = (taskId: string, updates: Partial<TaskWithRelations>) => {
    onTaskUpdate?.(taskId, updates)
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      {showQuickAdd && <TaskQuickAdd onAdd={onQuickAdd} />}

      {tasks.length === 0 ? (
        <div className="py-8 text-center text-[var(--text-secondary)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isExpanded = expandedTaskId === task.id

            const taskItem = (
              <TaskItem
                task={task}
                isExpanded={isExpanded}
                onExpand={() => handleTaskExpand(task.id)}
                onCollapse={handleTaskCollapse}
                onClick={() => {
                  if (!enableInlineEdit) {
                    onTaskClick?.(task)
                  }
                }}
                onComplete={(completed) => onTaskComplete(task.id, completed)}
                onUpdate={(updates) => handleTaskUpdate(task.id, updates)}
                onDelete={onTaskDelete ? () => onTaskDelete(task.id) : undefined}
                enableInlineEdit={enableInlineEdit}
              />
            )

            return enableDrag && !isExpanded ? (
              <DraggableTask key={task.id} task={task}>
                {taskItem}
              </DraggableTask>
            ) : (
              <div key={task.id}>{taskItem}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
