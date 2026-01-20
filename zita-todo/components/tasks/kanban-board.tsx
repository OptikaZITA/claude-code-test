'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { TaskWithRelations, TaskStatus, DEFAULT_KANBAN_COLUMNS } from '@/types'
import { KanbanColumn as KanbanColumnComponent } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'

interface KanbanBoardProps {
  tasks: TaskWithRelations[]
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void
  onTaskClick: (task: TaskWithRelations) => void
  onQuickAdd: (title: string, status: TaskStatus) => void
  /** Hide "Dnes" badge (use on Today page where it's redundant) */
  hideToday?: boolean
}

export function KanbanBoard({
  tasks,
  onTaskMove,
  onTaskClick,
  onQuickAdd,
  hideToday,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)
  const { dropTarget, handleDrop: handleSidebarDrop, setDropTarget } = useSidebarDrop()

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
    setActiveTask(null)

    // Check if there's a sidebar drop target (trash, when, project, area)
    // This has priority over Kanban column drops
    if (dropTarget) {
      handleSidebarDrop(dropTarget)
      setDropTarget(null)
      return
    }

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column (status)
    const isColumn = DEFAULT_KANBAN_COLUMNS.some((col) => col.id === overId)

    if (isColumn) {
      const newStatus = overId as TaskStatus
      const task = tasks.find((t) => t.id === taskId)

      if (task && task.status !== newStatus) {
        onTaskMove(taskId, newStatus)
      }
    } else {
      // Dropped on another task - find its status
      const targetTask = tasks.find((t) => t.id === overId)
      if (targetTask) {
        const newStatus = targetTask.status as TaskStatus
        const task = tasks.find((t) => t.id === taskId)

        if (task && task.status !== newStatus) {
          onTaskMove(taskId, newStatus)
        }
      }
    }
  }, [tasks, onTaskMove, dropTarget, handleSidebarDrop, setDropTarget])

  const handleDragCancel = useCallback(() => {
    setActiveTask(null)
    setDropTarget(null)
  }, [setDropTarget])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
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
            onQuickAdd={(title) => onQuickAdd(title, column.id)}
            hideToday={hideToday}
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
