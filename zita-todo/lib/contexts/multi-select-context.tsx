'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { TaskWithRelations } from '@/types'

interface MultiSelectContextType {
  /** Currently selected task IDs */
  selectedIds: Set<string>
  /** Last clicked task ID (for shift-click range) */
  lastClickedId: string | null
  /** Current tasks in view (for range selection) */
  currentTasks: TaskWithRelations[]
  /** Number of selected items */
  selectedCount: number
  /** Whether any items are selected */
  hasSelection: boolean
  /** Check if a specific task is selected */
  isSelected: (id: string) => boolean
  /** Handle click on a task (with modifier key support) */
  handleTaskClick: (id: string, event: React.MouseEvent | { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void
  /** Toggle selection of a single task */
  toggleTask: (id: string) => void
  /** Select a single task (clears others) */
  selectTask: (id: string) => void
  /** Select multiple tasks */
  selectTasks: (ids: string[]) => void
  /** Select all tasks in current view */
  selectAll: () => void
  /** Clear all selection */
  clearSelection: () => void
  /** Set current tasks (called by TaskList/KanbanBoard) */
  setCurrentTasks: (tasks: TaskWithRelations[]) => void
  /** Get selected tasks as array */
  getSelectedTasks: () => TaskWithRelations[]
  /** Multi-select mode active (for mobile long-press) */
  isMultiSelectMode: boolean
  /** Enable multi-select mode */
  enableMultiSelectMode: () => void
  /** Disable multi-select mode */
  disableMultiSelectMode: () => void
}

const MultiSelectContext = createContext<MultiSelectContextType | undefined>(undefined)

export function MultiSelectProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)
  const [currentTasks, setCurrentTasksState] = useState<TaskWithRelations[]>([])
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)

  // Clean up selection when tasks change
  useEffect(() => {
    const taskIds = new Set(currentTasks.map(t => t.id))
    setSelectedIds(prev => {
      const next = new Set<string>()
      prev.forEach(id => {
        if (taskIds.has(id)) {
          next.add(id)
        }
      })
      if (next.size !== prev.size) {
        return next
      }
      return prev
    })
  }, [currentTasks])

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id)
  }, [selectedIds])

  const toggleTask = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setLastClickedId(id)
  }, [])

  const selectTask = useCallback((id: string) => {
    setSelectedIds(new Set([id]))
    setLastClickedId(id)
  }, [])

  const selectTasks = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
    if (ids.length > 0) {
      setLastClickedId(ids[ids.length - 1])
    }
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(currentTasks.map(t => t.id)))
    if (currentTasks.length > 0) {
      setLastClickedId(currentTasks[currentTasks.length - 1].id)
    }
  }, [currentTasks])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastClickedId(null)
    setIsMultiSelectMode(false)
  }, [])

  const selectRange = useCallback((toId: string) => {
    if (!lastClickedId) {
      selectTask(toId)
      return
    }

    const taskIds = currentTasks.map(t => t.id)
    const fromIndex = taskIds.indexOf(lastClickedId)
    const toIndex = taskIds.indexOf(toId)

    if (fromIndex === -1 || toIndex === -1) {
      selectTask(toId)
      return
    }

    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    const rangeIds = taskIds.slice(start, end + 1)

    setSelectedIds(prev => {
      const next = new Set(prev)
      rangeIds.forEach(id => next.add(id))
      return next
    })
  }, [currentTasks, lastClickedId, selectTask])

  const handleTaskClick = useCallback((
    id: string,
    event: React.MouseEvent | { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }
  ) => {
    const isShift = event.shiftKey
    const isMeta = 'metaKey' in event ? event.metaKey : false
    const isCtrl = 'ctrlKey' in event ? event.ctrlKey : false
    const isModifier = isMeta || isCtrl

    if (isShift && lastClickedId) {
      // Shift + click: select range
      selectRange(id)
    } else if (isModifier || isMultiSelectMode) {
      // Cmd/Ctrl + click or multi-select mode: toggle individual
      toggleTask(id)
    } else {
      // Plain click: just update lastClickedId, let parent handle navigation
      setLastClickedId(id)
    }
  }, [lastClickedId, selectRange, toggleTask, isMultiSelectMode])

  const setCurrentTasks = useCallback((tasks: TaskWithRelations[]) => {
    setCurrentTasksState(tasks)
  }, [])

  const getSelectedTasks = useCallback(() => {
    return currentTasks.filter(t => selectedIds.has(t.id))
  }, [currentTasks, selectedIds])

  const enableMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(true)
  }, [])

  const disableMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false)
    clearSelection()
  }, [clearSelection])

  return (
    <MultiSelectContext.Provider
      value={{
        selectedIds,
        lastClickedId,
        currentTasks,
        selectedCount: selectedIds.size,
        hasSelection: selectedIds.size > 0,
        isSelected,
        handleTaskClick,
        toggleTask,
        selectTask,
        selectTasks,
        selectAll,
        clearSelection,
        setCurrentTasks,
        getSelectedTasks,
        isMultiSelectMode,
        enableMultiSelectMode,
        disableMultiSelectMode,
      }}
    >
      {children}
    </MultiSelectContext.Provider>
  )
}

export function useMultiSelectContext() {
  const context = useContext(MultiSelectContext)
  if (!context) {
    throw new Error('useMultiSelectContext must be used within a MultiSelectProvider')
  }
  return context
}
