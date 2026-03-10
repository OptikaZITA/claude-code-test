'use client'

import { ReactNode, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { TaskItem } from '@/components/tasks/task-item'

interface GlobalDndContextProps {
  children: ReactNode
}

/**
 * Global DndContext that wraps the entire app (sidebar + content).
 * This enables drag & drop from tasks to sidebar sections using @dnd-kit.
 *
 * Sidebar sections register as droppables with IDs like:
 * - sidebar-inbox
 * - sidebar-today
 * - sidebar-upcoming
 * - sidebar-logbook
 * - sidebar-trash
 * - sidebar-area-{areaId}
 * - sidebar-project-{projectId}
 */
export function GlobalDndContext({ children }: GlobalDndContextProps) {
  const {
    draggedTask,
    setDraggedTask,
    handleDrop,
    setDropTarget,
  } = useSidebarDrop()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  )

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    // The actual task is set by the component that's being dragged
    // via useSidebarDrop().setDraggedTask in its useEffect
    // We don't need to do anything here - draggedTask will be set
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event

    if (!over) {
      setDropTarget(null)
      return
    }

    const overId = String(over.id)

    // Check if hovering over a sidebar drop target
    if (overId.startsWith('sidebar-')) {
      // Parse the drop target from the ID
      if (overId === 'sidebar-inbox') {
        setDropTarget({ type: 'inbox' })
      } else if (overId === 'sidebar-today') {
        setDropTarget({ type: 'today' })
      } else if (overId === 'sidebar-upcoming') {
        setDropTarget({ type: 'upcoming' })
      } else if (overId === 'sidebar-logbook') {
        setDropTarget({ type: 'logbook' })
      } else if (overId === 'sidebar-trash') {
        setDropTarget({ type: 'trash' })
      } else if (overId.startsWith('sidebar-area-')) {
        const areaId = overId.replace('sidebar-area-', '')
        setDropTarget({ type: 'area', areaId })
      } else if (overId.startsWith('sidebar-project-')) {
        const projectId = overId.replace('sidebar-project-', '')
        setDropTarget({ type: 'project', projectId })
      }
    } else {
      // Not over sidebar - clear the sidebar drop target
      // (but keep drag active for kanban/list reordering)
      setDropTarget(null)
    }
  }, [setDropTarget])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setDropTarget(null)
      setDraggedTask(null)
      return
    }

    const overId = String(over.id)
    const activeId = String(active.id)

    // Check if dropped on a sidebar target
    if (overId.startsWith('sidebar-')) {
      if (overId === 'sidebar-inbox') {
        handleDrop({ type: 'inbox' })
      } else if (overId === 'sidebar-today') {
        handleDrop({ type: 'today' })
      } else if (overId === 'sidebar-upcoming') {
        handleDrop({ type: 'upcoming' })
      } else if (overId === 'sidebar-logbook') {
        handleDrop({ type: 'logbook' })
      } else if (overId === 'sidebar-trash') {
        handleDrop({ type: 'trash' })
      } else if (overId.startsWith('sidebar-area-')) {
        const areaId = overId.replace('sidebar-area-', '')
        handleDrop({ type: 'area', areaId })
      } else if (overId.startsWith('sidebar-project-')) {
        const projectId = overId.replace('sidebar-project-', '')
        handleDrop({ type: 'project', projectId })
      }
    } else {
      // Not a sidebar drop - this could be a sortable reorder
      // Dispatch a custom event for TaskList/KanbanBoard to handle
      if (activeId !== overId) {
        window.dispatchEvent(new CustomEvent('dnd:reorder', {
          detail: { activeId, overId }
        }))
      }
      setDropTarget(null)
      setDraggedTask(null)
    }
  }, [handleDrop, setDropTarget, setDraggedTask])

  const handleDragCancel = useCallback(() => {
    setDropTarget(null)
    setDraggedTask(null)
  }, [setDropTarget, setDraggedTask])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Global drag overlay for sidebar drops */}
      <DragOverlay>
        {draggedTask && (
          <div className="opacity-90 shadow-lg rounded-lg max-w-sm">
            <TaskItem
              task={draggedTask}
              isExpanded={false}
              onComplete={() => {}}
              enableInlineEdit={false}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
