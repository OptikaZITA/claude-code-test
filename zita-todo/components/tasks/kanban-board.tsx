'use client'

import { useCallback, useEffect } from 'react'
import { TaskWithRelations, TaskStatus, DEFAULT_KANBAN_COLUMNS } from '@/types'
import { KanbanColumn as KanbanColumnComponent } from './kanban-column'
import { useMultiSelectContext } from '@/lib/contexts/multi-select-context'

interface KanbanBoardProps {
  tasks: TaskWithRelations[]
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void
  onTaskReorder?: (taskId: string, newIndex: number, tasksInColumn: TaskWithRelations[]) => void
  onTaskDelete?: (taskId: string) => void
  onTaskUpdate?: (taskId: string, updates: Partial<TaskWithRelations>) => void
  onTaskClick: (task: TaskWithRelations) => void
  onQuickAdd: (title: string, status: TaskStatus) => void
  /** Hide "Dnes" badge (use on Today page where it's redundant) */
  hideToday?: boolean
}

export function KanbanBoard({
  tasks,
  onTaskMove,
  onTaskReorder,
  onTaskDelete,
  onTaskUpdate,
  onTaskClick,
  onQuickAdd,
  hideToday,
}: KanbanBoardProps) {
  // Multi-select context
  const {
    isSelected,
    handleTaskClick: handleMultiSelectClick,
    setCurrentTasks,
  } = useMultiSelectContext()

  // Update current tasks in context when tasks change
  useEffect(() => {
    setCurrentTasks(tasks)
  }, [tasks, setCurrentTasks])

  // Handle modifier click for multi-select
  const handleModifierClick = useCallback((taskId: string, event: React.MouseEvent) => {
    handleMultiSelectClick(taskId, event)
  }, [handleMultiSelectClick])

  const getTasksByStatus = useCallback((status: TaskStatus) => {
    return tasks
      .filter((task) => task.status === status)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [tasks])

  // Listen for reorder events from GlobalDndContext
  useEffect(() => {
    const handleReorder = (e: CustomEvent<{ activeId: string; overId: string }>) => {
      const { activeId, overId } = e.detail

      // Skip if same position
      if (activeId === overId) return

      // Check if the activeId is a task in our list
      const activeTask = tasks.find((t) => t.id === activeId)
      if (!activeTask) return

      // Check if dropped on a column (status)
      const isColumn = DEFAULT_KANBAN_COLUMNS.some((col) => col.id === overId)

      if (isColumn) {
        const newStatus = overId as TaskStatus
        if (activeTask.status !== newStatus) {
          try {
            onTaskMove(activeId, newStatus)
          } catch (err) {
            console.error('[KanbanBoard] onTaskMove threw error:', err)
          }
        }
      } else {
        // Dropped on another task
        const overTask = tasks.find((t) => t.id === overId)

        if (overTask) {
          if (activeTask.status === overTask.status) {
            // SAME COLUMN → REORDER
            const columnTasks = tasks
              .filter(t => t.status === activeTask.status)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            const newIndex = columnTasks.findIndex(t => t.id === overId)
            if (newIndex !== -1 && onTaskReorder) {
              onTaskReorder(activeId, newIndex, columnTasks)
            }
          } else {
            // DIFFERENT COLUMN → change status
            onTaskMove(activeId, overTask.status as TaskStatus)
          }
        }
      }
    }

    window.addEventListener('dnd:reorder', handleReorder as EventListener)
    return () => window.removeEventListener('dnd:reorder', handleReorder as EventListener)
  }, [tasks, onTaskMove, onTaskReorder])

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-6 bg-background">
      {DEFAULT_KANBAN_COLUMNS.map((column) => (
        <KanbanColumnComponent
          key={column.id}
          column={column}
          tasks={getTasksByStatus(column.id)}
          onTaskClick={onTaskClick}
          onTaskDelete={onTaskDelete}
          onTaskUpdate={onTaskUpdate}
          onQuickAdd={(title) => onQuickAdd(title, column.id)}
          hideToday={hideToday}
          isTaskSelected={isSelected}
          onModifierClick={handleModifierClick}
        />
      ))}
    </div>
  )
}
