'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { TaskWithRelations, WhenType, Project } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface SidebarDropContextValue {
  // Dragged task
  draggedTask: TaskWithRelations | null
  setDraggedTask: (task: TaskWithRelations | null) => void

  // Drop target
  dropTarget: DropTarget | null
  setDropTarget: (target: DropTarget | null) => void

  // Handle drop
  handleDrop: (target: DropTarget) => Promise<void>

  // Is dragging
  isDragging: boolean
}

export type DropTarget =
  | { type: 'when'; value: WhenType }
  | { type: 'project'; projectId: string }

const SidebarDropContext = createContext<SidebarDropContextValue | null>(null)

export function SidebarDropProvider({ children }: { children: ReactNode }) {
  const [draggedTask, setDraggedTask] = useState<TaskWithRelations | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const supabase = createClient()

  const handleDrop = useCallback(async (target: DropTarget) => {
    if (!draggedTask) return

    try {
      if (target.type === 'when') {
        // Update when_type
        const updates: Record<string, any> = {
          when_type: target.value,
          when_date: null,
        }

        // If moving to inbox, mark as inbox task
        if (target.value === 'inbox') {
          updates.is_inbox = true
          updates.project_id = null
        } else {
          updates.is_inbox = false
        }

        await supabase
          .from('tasks')
          .update(updates)
          .eq('id', draggedTask.id)

      } else if (target.type === 'project') {
        // Move task to project
        await supabase
          .from('tasks')
          .update({
            project_id: target.projectId,
            is_inbox: false,
            when_type: 'anytime',
          })
          .eq('id', draggedTask.id)
      }

      // Dispatch event to refresh task lists
      window.dispatchEvent(new CustomEvent('task:moved', {
        detail: {
          taskId: draggedTask.id,
          target
        }
      }))

    } catch (error) {
      console.error('Error moving task:', error)
    } finally {
      setDraggedTask(null)
      setDropTarget(null)
    }
  }, [draggedTask, supabase])

  return (
    <SidebarDropContext.Provider
      value={{
        draggedTask,
        setDraggedTask,
        dropTarget,
        setDropTarget,
        handleDrop,
        isDragging: !!draggedTask,
      }}
    >
      {children}
    </SidebarDropContext.Provider>
  )
}

export function useSidebarDrop() {
  const context = useContext(SidebarDropContext)
  if (!context) {
    throw new Error('useSidebarDrop must be used within a SidebarDropProvider')
  }
  return context
}
