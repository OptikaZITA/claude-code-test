'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskWithRelations } from '@/types'
import { TaskItem } from './task-item'
import { TaskQuickAdd, TaskQuickAddData } from './task-quick-add'
import { SortableTaskItem } from './sortable-task-item'
import { DraggableTask } from './draggable-task'
import { useMultiSelectContext } from '@/lib/contexts/multi-select-context'

interface TaskListProps {
  tasks: TaskWithRelations[]
  onTaskClick?: (task: TaskWithRelations) => void
  onTaskComplete: (taskId: string, completed: boolean) => void
  onTaskUpdate?: (taskId: string, updates: Partial<TaskWithRelations>) => void
  onTaskDelete?: (taskId: string) => void
  onQuickAdd: (taskData: TaskQuickAddData) => void
  onReorder?: (taskId: string, newIndex: number, tasks: TaskWithRelations[]) => void
  emptyMessage?: string
  showQuickAdd?: boolean
  enableDrag?: boolean
  enableReorder?: boolean
  enableInlineEdit?: boolean
  /** Callback pre zistenie ci je task novy (zlta bodka) */
  isTaskNew?: (task: TaskWithRelations) => boolean
  /** Zobrazit hviezdicku pre tasky v "Dnes" (pouziva sa na strankach projektov/oddeleni) */
  showTodayStar?: boolean
}

export function TaskList({
  tasks,
  onTaskClick,
  onTaskComplete,
  onTaskUpdate,
  onTaskDelete,
  onQuickAdd,
  onReorder,
  emptyMessage = 'Žiadne úlohy',
  showQuickAdd = true,
  enableDrag = true,
  enableReorder = true,
  enableInlineEdit = true,
  isTaskNew,
  showTodayStar = false,
}: TaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Multi-select context
  const {
    isSelected,
    handleTaskClick: handleMultiSelectClick,
    setCurrentTasks,
    selectAll,
    selectTask,
    clearSelection,
    hasSelection,
  } = useMultiSelectContext()

  // Update current tasks in context when tasks change
  useEffect(() => {
    setCurrentTasks(tasks)
  }, [tasks, setCurrentTasks])

  // Keyboard shortcut: Cmd/Ctrl + A to select all
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element).tagName)) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        selectAll()
      }

      if (e.key === 'Escape' && hasSelection) {
        clearSelection()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectAll, clearSelection, hasSelection])

  // Handle modifier click for multi-select
  const handleModifierClick = useCallback((taskId: string, event: React.MouseEvent) => {
    handleMultiSelectClick(taskId, event)
  }, [handleMultiSelectClick])

  // Handle single click selection (Things 3 style - selects one task, replaces previous selection)
  const handleSelect = useCallback((taskId: string) => {
    selectTask(taskId)
  }, [selectTask])

  // Listen for reorder events from GlobalDndContext
  useEffect(() => {
    const handleReorder = (e: CustomEvent<{ activeId: string; overId: string }>) => {
      const { activeId, overId } = e.detail

      // Only handle if both IDs are tasks in our list
      const oldIndex = tasks.findIndex((t) => t.id === activeId)
      const newIndex = tasks.findIndex((t) => t.id === overId)

      if (oldIndex !== -1 && newIndex !== -1 && onReorder) {
        onReorder(activeId, newIndex, tasks)
      }
    }

    window.addEventListener('dnd:reorder', handleReorder as EventListener)
    return () => window.removeEventListener('dnd:reorder', handleReorder as EventListener)
  }, [tasks, onReorder])

  // Click outside detection with portal-aware handling
  useEffect(() => {
    if (!expandedTaskId) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if click is on a portal element (should not close)
      const isPortal =
        // Radix UI portals (shadcn/ui uses these)
        target.closest('[data-radix-portal]') ||
        target.closest('[data-radix-popper-content-wrapper]') ||
        // Dialog/Modal
        target.closest('[role="dialog"]') ||
        // Listbox (Select, Combobox)
        target.closest('[role="listbox"]') ||
        // Menu (DropdownMenu)
        target.closest('[role="menu"]') ||
        // React Day Picker (calendar)
        target.closest('.rdp') ||
        target.closest('[data-rdp]') ||
        // Floating UI portals
        target.closest('[data-floating-ui-portal]') ||
        // Toast notifications
        target.closest('[data-sonner-toast]') ||
        target.closest('[data-toaster]')

      if (isPortal) {
        return
      }

      if (containerRef.current && !containerRef.current.contains(target)) {
        // Click fires AFTER blur, so autosave happens first
        setExpandedTaskId(null)
      }
    }

    // Use setTimeout to avoid immediate collapse on the same click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClick)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClick)
    }
  }, [expandedTaskId])

  // Handle Escape key to collapse and Backspace/Delete to delete
  useEffect(() => {
    if (!expandedTaskId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.isContentEditable

      if (e.key === 'Escape') {
        setExpandedTaskId(null)
        return
      }

      // Backspace or Delete to delete task (only when not typing)
      if ((e.key === 'Backspace' || e.key === 'Delete') && !isTyping) {
        e.preventDefault()
        if (onTaskDelete) {
          onTaskDelete(expandedTaskId)
          setExpandedTaskId(null)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [expandedTaskId, onTaskDelete])

  const handleTaskExpand = (taskId: string) => {
    setExpandedTaskId(taskId)
  }

  const handleTaskCollapse = () => {
    setExpandedTaskId(null)
  }

  const handleTaskUpdate = (taskId: string, updates: Partial<TaskWithRelations>) => {
    onTaskUpdate?.(taskId, updates)
  }

  // Render with sortable context if reorder is enabled
  const shouldUseSortable = enableReorder && onReorder && tasks.length > 1

  const renderTaskItem = (task: TaskWithRelations) => {
    const isExpanded = expandedTaskId === task.id
    const taskIsNew = isTaskNew ? isTaskNew(task) : false
    const taskIsSelected = isSelected(task.id)

    if (shouldUseSortable) {
      return (
        <SortableTaskItem
          key={task.id}
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
          isNew={taskIsNew}
          showTodayStar={showTodayStar}
          isSelected={taskIsSelected}
          onModifierClick={(e) => handleModifierClick(task.id, e)}
          onSelect={() => handleSelect(task.id)}
        />
      )
    }

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
        isNew={taskIsNew}
        showTodayStar={showTodayStar}
        isSelected={taskIsSelected}
        onModifierClick={(e) => handleModifierClick(task.id, e)}
        onSelect={() => handleSelect(task.id)}
      />
    )

    return enableDrag && !isExpanded ? (
      <DraggableTask key={task.id} task={task}>
        {taskItem}
      </DraggableTask>
    ) : (
      <div key={task.id}>{taskItem}</div>
    )
  }

  const taskList = (
    <div className="space-y-1">
      {tasks.map((task) => renderTaskItem(task))}
    </div>
  )

  // Handle click on empty space within container to close expanded task
  const handleContainerClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on container background (not on a child element)
    if (e.target === e.currentTarget && expandedTaskId) {
      setExpandedTaskId(null)
    }
  }

  return (
    <div className="space-y-1" ref={containerRef} onClick={handleContainerClick}>
      {showQuickAdd && <TaskQuickAdd onAdd={(taskData: TaskQuickAddData) => onQuickAdd(taskData)} />}

      {tasks.length === 0 ? (
        emptyMessage ? (
          <div className="py-8 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : null
      ) : shouldUseSortable ? (
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {taskList}
        </SortableContext>
      ) : (
        taskList
      )}
    </div>
  )
}
