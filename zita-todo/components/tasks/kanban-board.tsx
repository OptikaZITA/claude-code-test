'use client'

import { useState } from 'react'
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
import { TaskWithRelations, KanbanColumn, DEFAULT_KANBAN_COLUMNS } from '@/types'
import { KanbanColumn as KanbanColumnComponent } from './kanban-column'
import { KanbanCard } from './kanban-card'

interface KanbanBoardProps {
  tasks: TaskWithRelations[]
  onTaskMove: (taskId: string, newColumn: KanbanColumn) => void
  onTaskClick: (task: TaskWithRelations) => void
  onQuickAdd: (title: string, column: KanbanColumn) => void
}

export function KanbanBoard({
  tasks,
  onTaskMove,
  onTaskClick,
  onQuickAdd,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const getTasksByColumn = (column: KanbanColumn) => {
    return tasks.filter((task) => task.kanban_column === column)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column
    const isColumn = DEFAULT_KANBAN_COLUMNS.some((col) => col.id === overId)

    if (isColumn) {
      const newColumn = overId as KanbanColumn
      const task = tasks.find((t) => t.id === taskId)

      if (task && task.kanban_column !== newColumn) {
        onTaskMove(taskId, newColumn)
      }
    } else {
      // Dropped on another task - find its column
      const targetTask = tasks.find((t) => t.id === overId)
      if (targetTask) {
        const newColumn = targetTask.kanban_column as KanbanColumn
        const task = tasks.find((t) => t.id === taskId)

        if (task && task.kanban_column !== newColumn) {
          onTaskMove(taskId, newColumn)
        }
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-6">
        {DEFAULT_KANBAN_COLUMNS.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            tasks={getTasksByColumn(column.id)}
            onTaskClick={onTaskClick}
            onQuickAdd={(title) => onQuickAdd(title, column.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            onClick={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
