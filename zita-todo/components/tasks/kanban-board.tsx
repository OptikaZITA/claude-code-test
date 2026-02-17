'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core'
import { TaskWithRelations, TaskStatus, DEFAULT_KANBAN_COLUMNS } from '@/types'
import { KanbanColumn as KanbanColumnComponent } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
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
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)
  const { dropTarget, handleDrop: handleSidebarDrop, setDropTarget } = useSidebarDrop()

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const getTasksByStatus = useCallback((status: TaskStatus) => {
    return tasks.filter((task) => task.status === status)
  }, [tasks])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task || null)
  }, [tasks])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    console.log('=== KANBAN DRAG END ===', { activeId: active.id, overId: over?.id })
    setActiveTask(null)

    // Always clear dropTarget at the end of drag
    const currentDropTarget = dropTarget
    setDropTarget(null)

    // Check if there's a sidebar drop target (trash, when, project, area)
    // This has priority over Kanban column drops
    if (currentDropTarget) {
      handleSidebarDrop(currentDropTarget)
      return
    }

    if (!over) {
      return
    }

    const taskId = active.id as string
    const overId = over.id as string

    // Skip if same position
    if (taskId === overId) return

    // Check if dropped on a column (status)
    const isColumn = DEFAULT_KANBAN_COLUMNS.some((col) => col.id === overId)

    if (isColumn) {
      const newStatus = overId as TaskStatus
      const task = tasks.find((t) => t.id === taskId)

      if (task && task.status !== newStatus) {
        try {
          onTaskMove(taskId, newStatus)
        } catch (err) {
          console.error('[KanbanBoard] onTaskMove threw error:', err)
        }
      }
    } else {
      // Dropped on another task
      const activeTask = tasks.find((t) => t.id === taskId)
      const overTask = tasks.find((t) => t.id === overId)

      if (activeTask && overTask) {
        if (activeTask.status === overTask.status) {
          // SAME COLUMN → REORDER
          const columnTasks = tasks.filter(t => t.status === activeTask.status)
          const oldIndex = columnTasks.findIndex(t => t.id === taskId)
          const newIndex = columnTasks.findIndex(t => t.id === overId)
          console.log('=== REORDER DETECTED ===', { taskId, oldIndex, newIndex, columnTasksCount: columnTasks.length, hasHandler: !!onTaskReorder })
          if (newIndex !== -1 && onTaskReorder) {
            onTaskReorder(taskId, newIndex, columnTasks)
          }
        } else {
          // DIFFERENT COLUMN → change status
          onTaskMove(taskId, overTask.status as TaskStatus)
        }
      }
    }
  }, [tasks, onTaskMove, onTaskReorder, dropTarget, handleSidebarDrop, setDropTarget])

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Kept for potential future use
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveTask(null)
    setDropTarget(null)
  }, [setDropTarget])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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

      <DragOverlay>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            onClick={() => {}}
            isDragging
            hideToday={hideToday}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
