'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { TaskWithRelations, Project } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface SidebarDropContextValue {
  // Dragged task
  draggedTask: TaskWithRelations | null
  setDraggedTask: (task: TaskWithRelations | null) => void

  // Dragged project
  draggedProject: { id: string; name: string } | null
  setDraggedProject: (project: { id: string; name: string } | null) => void

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
  handleCalendarDateSelect: (date: Date) => Promise<void>
  handleCalendarCancel: () => void
}

export type DropTarget =
  | { type: 'inbox' }
  | { type: 'today' }
  | { type: 'upcoming' }
  | { type: 'project'; projectId: string }
  | { type: 'area'; areaId: string }
  | { type: 'trash' }
  | { type: 'calendar' }

const SidebarDropContext = createContext<SidebarDropContextValue | null>(null)

export function SidebarDropProvider({ children }: { children: ReactNode }) {
  const [draggedTask, setDraggedTask] = useState<TaskWithRelations | null>(null)
  const [draggedProject, setDraggedProject] = useState<{ id: string; name: string } | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const [pendingCalendarTask, setPendingCalendarTask] = useState<TaskWithRelations | null>(null)
  // Use ref to avoid stale closure in handleCalendarDateSelect
  const pendingCalendarTaskRef = useRef<TaskWithRelations | null>(null)
  const supabase = createClient()

  const handleCalendarDateSelect = useCallback(async (date: Date) => {
    // Use ref to get the current task (avoids stale closure)
    const task = pendingCalendarTaskRef.current

    if (!task) {
      console.error('No pending calendar task in ref!')
      return
    }

    // Use local date to avoid timezone issues (toISOString converts to UTC)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          deadline: dateStr,
        })
        .eq('id', task.id)

      if (error) {
        console.error('Supabase error setting task date:', error)
        return
      }

      // Dispatch event to refresh task lists
      window.dispatchEvent(new CustomEvent('task:moved', {
        detail: {
          taskId: task.id,
          target: { type: 'upcoming', date: dateStr }
        }
      }))
    } catch (error) {
      console.error('Error setting task date:', error)
    } finally {
      pendingCalendarTaskRef.current = null
      setPendingCalendarTask(null)
      setShowCalendarPicker(false)
    }
  }, [supabase])

  const handleCalendarCancel = useCallback(() => {
    pendingCalendarTaskRef.current = null
    setPendingCalendarTask(null)
    setShowCalendarPicker(false)
  }, [])

  const handleDrop = useCallback(async (target: DropTarget) => {
    // Handle project drop on trash
    if (draggedProject && target.type === 'trash') {
      try {
        const response = await fetch(`/api/projects/${draggedProject.id}`, { method: 'DELETE' })
        if (!response.ok) {
          console.error('Error deleting project')
          return
        }
        window.dispatchEvent(new CustomEvent('task:moved', {
          detail: { target: { type: 'trash' } }
        }))
      } catch (error) {
        console.error('Error deleting project:', error)
      } finally {
        setDraggedProject(null)
        setDropTarget(null)
      }
      return
    }

    if (!draggedTask) return

    try {
      let updateError: any = null

      if (target.type === 'inbox') {
        // Move to inbox: remove deadline and project
        const { error } = await supabase
          .from('tasks')
          .update({
            deadline: null,
            project_id: null,
          })
          .eq('id', draggedTask.id)
        updateError = error

      } else if (target.type === 'today') {
        // Move to today: set deadline to today
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        const todayStr = `${year}-${month}-${day}`

        const { error } = await supabase
          .from('tasks')
          .update({
            deadline: todayStr,
          })
          .eq('id', draggedTask.id)
        updateError = error

      } else if (target.type === 'upcoming') {
        // Move to upcoming: show calendar picker to select future date
        pendingCalendarTaskRef.current = draggedTask
        setPendingCalendarTask(draggedTask)
        setShowCalendarPicker(true)
        setDraggedTask(null)
        setDropTarget(null)
        return // Wait for date selection

      } else if (target.type === 'project') {
        // Move task to project - get project's area_id first
        const { data: project } = await supabase
          .from('projects')
          .select('area_id')
          .eq('id', target.projectId)
          .single()

        const { error } = await supabase
          .from('tasks')
          .update({
            project_id: target.projectId,
            area_id: project?.area_id || null,
          })
          .eq('id', draggedTask.id)
        updateError = error

      } else if (target.type === 'area') {
        // Move task to area
        const { error } = await supabase
          .from('tasks')
          .update({
            area_id: target.areaId,
          })
          .eq('id', draggedTask.id)
        updateError = error

      } else if (target.type === 'trash') {
        // Soft delete the task
        const { error } = await supabase
          .from('tasks')
          .update({
            deleted_at: new Date().toISOString(),
          })
          .eq('id', draggedTask.id)
        updateError = error

      } else if (target.type === 'calendar') {
        // Show calendar picker modal
        // Set both ref and state - ref for immediate access in callback
        pendingCalendarTaskRef.current = draggedTask
        setPendingCalendarTask(draggedTask)
        setShowCalendarPicker(true)
        setDraggedTask(null)
        setDropTarget(null)
        return // Don't dispatch event yet, wait for date selection
      }

      if (updateError) {
        console.error('Supabase error moving task:', updateError)
        return
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
  }, [draggedTask, draggedProject, supabase])

  return (
    <SidebarDropContext.Provider
      value={{
        draggedTask,
        setDraggedTask,
        draggedProject,
        setDraggedProject,
        dropTarget,
        setDropTarget,
        handleDrop,
        isDragging: !!draggedTask || !!draggedProject,
        showCalendarPicker,
        setShowCalendarPicker,
        pendingCalendarTask,
        handleCalendarDateSelect,
        handleCalendarCancel,
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
