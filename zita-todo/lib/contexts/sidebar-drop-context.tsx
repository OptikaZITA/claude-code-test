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

  // Calendar date picker
  showCalendarPicker: boolean
  setShowCalendarPicker: (show: boolean) => void
  pendingCalendarTask: TaskWithRelations | null
  handleCalendarDateSelect: (date: string) => Promise<void>
}

export type DropTarget =
  | { type: 'when'; value: WhenType }
  | { type: 'project'; projectId: string }
  | { type: 'area'; areaId: string }
  | { type: 'trash' }
  | { type: 'calendar' }

const SidebarDropContext = createContext<SidebarDropContextValue | null>(null)

export function SidebarDropProvider({ children }: { children: ReactNode }) {
  const [draggedTask, setDraggedTask] = useState<TaskWithRelations | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const [pendingCalendarTask, setPendingCalendarTask] = useState<TaskWithRelations | null>(null)
  const supabase = createClient()

  const handleCalendarDateSelect = useCallback(async (date: string) => {
    if (!pendingCalendarTask) return

    try {
      await supabase
        .from('tasks')
        .update({
          deadline: date,
          when_type: 'scheduled',
          when_date: date,
        })
        .eq('id', pendingCalendarTask.id)

      // Dispatch event to refresh task lists
      window.dispatchEvent(new CustomEvent('task:moved', {
        detail: {
          taskId: pendingCalendarTask.id,
          target: { type: 'calendar', date }
        }
      }))
    } catch (error) {
      console.error('Error setting task deadline:', error)
    } finally {
      setPendingCalendarTask(null)
      setShowCalendarPicker(false)
    }
  }, [pendingCalendarTask, supabase])

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
        // Move task to project - get project's area_id first
        const { data: project } = await supabase
          .from('projects')
          .select('area_id')
          .eq('id', target.projectId)
          .single()

        await supabase
          .from('tasks')
          .update({
            project_id: target.projectId,
            area_id: project?.area_id || null,
            is_inbox: false,
            when_type: 'anytime',
          })
          .eq('id', draggedTask.id)

      } else if (target.type === 'area') {
        // Move task to area (without project)
        await supabase
          .from('tasks')
          .update({
            area_id: target.areaId,
            project_id: null,
            is_inbox: false,
            when_type: 'anytime',
          })
          .eq('id', draggedTask.id)

      } else if (target.type === 'trash') {
        // Soft delete the task
        await supabase
          .from('tasks')
          .update({
            deleted_at: new Date().toISOString(),
          })
          .eq('id', draggedTask.id)

      } else if (target.type === 'calendar') {
        // Show calendar picker modal
        setPendingCalendarTask(draggedTask)
        setShowCalendarPicker(true)
        setDraggedTask(null)
        setDropTarget(null)
        return // Don't dispatch event yet, wait for date selection
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
        showCalendarPicker,
        setShowCalendarPicker,
        pendingCalendarTask,
        handleCalendarDateSelect,
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
