'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskWithRelations } from '@/types'
import { TaskItem } from './task-item'
import { TaskQuickAdd, TaskQuickAddData } from './task-quick-add'
import { SortableTaskItem } from './sortable-task-item'
import { DraggableTask } from './draggable-task'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { useMultiSelectContext } from '@/lib/contexts/multi-select-context'

interface TaskListProps {
  tasks: TaskWithRelations[]
  onTaskClick?: (task: TaskWithRelations) => void
  onTaskComplete: (taskId: string, completed: boolean) => void
  onTaskUpdate?: (taskId: string, updates: Partial<TaskWithRelations>) => void
  onTaskDelete?: (taskId: string) => void
  onQuickAdd: (title: string) => void
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
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { dropTarget, handleDrop: handleSidebarDrop, setDropTarget } = useSidebarDrop()

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

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle click outside to collapse
  useEffect(() => {
    if (!expandedTaskId) return

    const handleClickOutside = (e: MouseEvent) => {
      // Don't collapse if clicking inside a dropdown/popover
      const target = e.target as HTMLElement
      if (target.closest('[data-radix-popper-content-wrapper]') ||
          target.closest('[role="dialog"]') ||
          target.closest('[role="listbox"]')) {
        return
      }

      if (containerRef.current && !containerRef.current.contains(target)) {
        // Use click event (not mousedown) so blur fires first and saves data
        setExpandedTaskId(null)
      }
    }

    // Use setTimeout to avoid immediate collapse on the same click
    // Use 'click' instead of 'mousedown' - click fires AFTER blur
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
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

  // Drag handlers for sortable
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    // Always clear dropTarget at the end of drag
    const currentDropTarget = dropTarget
    setDropTarget(null)

    // Check if there's a sidebar drop target (trash, when, project, area)
    if (currentDropTarget) {
      handleSidebarDrop(currentDropTarget)
      return
    }

    if (!over) {
      return
    }

    if (active.id === over.id) {
      return
    }

    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1 && onReorder) {
      onReorder(active.id as string, newIndex, tasks)
    }
  }

  const handleDragCancel = () => {
    setActiveTask(null)
    setDropTarget(null)
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
      {showQuickAdd && <TaskQuickAdd onAdd={(taskData: TaskQuickAddData) => onQuickAdd(taskData.title)} />}

      {tasks.length === 0 ? (
        emptyMessage ? (
          <div className="py-8 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : null
      ) : shouldUseSortable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {taskList}
          </SortableContext>

          <DragOverlay>
            {activeTask && (
              <div className="opacity-90 shadow-lg rounded-lg">
                <TaskItem
                  task={activeTask}
                  isExpanded={false}
                  onComplete={() => {}}
                  enableInlineEdit={false}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        taskList
      )}
    </div>
  )
}
