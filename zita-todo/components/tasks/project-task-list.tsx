'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ChevronRight } from 'lucide-react'
import { TaskWithRelations } from '@/types'
import { TaskItem } from './task-item'
import { SortableTaskItem } from './sortable-task-item'
import { useMultiSelectContext } from '@/lib/contexts/multi-select-context'
import { cn } from '@/lib/utils/cn'

interface ProjectTaskListProps {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onTaskComplete: (taskId: string, completed: boolean) => void
  onTaskUpdate?: (taskId: string, updates: Partial<TaskWithRelations>) => void
  onTaskDelete?: (taskId: string) => void
  onReorder?: (taskId: string, newIndex: number, tasks: TaskWithRelations[]) => void
  emptyMessage?: string
  /** Zobrazit hviezdicku pre tasky v "Dnes" */
  showTodayStar?: boolean
  /** Enable inline editing */
  enableInlineEdit?: boolean
}

export function ProjectTaskList({
  tasks,
  onTaskClick,
  onTaskComplete,
  onTaskUpdate,
  onTaskDelete,
  onReorder,
  emptyMessage = 'Žiadne úlohy',
  showTodayStar = false,
  enableInlineEdit = true,
}: ProjectTaskListProps) {
  const [showCompleted, setShowCompleted] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  // Multi-select context
  const {
    isSelected,
    handleTaskClick: handleMultiSelectClick,
    setCurrentTasks,
    selectTask,
  } = useMultiSelectContext()

  // Update current tasks in context when tasks change
  useEffect(() => {
    setCurrentTasks(tasks)
  }, [tasks, setCurrentTasks])

  // Handle modifier click for multi-select
  const handleModifierClick = useCallback((taskId: string, event: React.MouseEvent) => {
    handleMultiSelectClick(taskId, event)
  }, [handleMultiSelectClick])

  // Handle single click selection
  const handleSelect = useCallback((taskId: string) => {
    selectTask(taskId)
  }, [selectTask])

  // Split into active and completed tasks
  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks])
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks])

  const isEmpty = tasks.length === 0

  // Listen for reorder events from GlobalDndContext
  useEffect(() => {
    const handleReorder = (e: CustomEvent<{ activeId: string; overId: string }>) => {
      const { activeId, overId } = e.detail

      // Only handle if both IDs are tasks in our active list
      const oldIndex = activeTasks.findIndex((t) => t.id === activeId)
      const newIndex = activeTasks.findIndex((t) => t.id === overId)

      if (oldIndex !== -1 && newIndex !== -1 && onReorder) {
        onReorder(activeId, newIndex, activeTasks)
      }
    }

    window.addEventListener('dnd:reorder', handleReorder as EventListener)
    return () => window.removeEventListener('dnd:reorder', handleReorder as EventListener)
  }, [activeTasks, onReorder])

  const handleTaskExpand = (taskId: string) => {
    setExpandedTaskId(taskId)
  }

  const handleTaskCollapse = () => {
    setExpandedTaskId(null)
  }

  const handleTaskUpdate = (taskId: string, updates: Partial<TaskWithRelations>) => {
    onTaskUpdate?.(taskId, updates)
  }

  const shouldUseSortable = onReorder && activeTasks.length > 1

  const renderActiveTaskItem = (task: TaskWithRelations) => {
    const isExpanded = expandedTaskId === task.id
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
              onTaskClick(task)
            }
          }}
          onComplete={(completed) => onTaskComplete(task.id, completed)}
          onUpdate={(updates) => handleTaskUpdate(task.id, updates)}
          onDelete={onTaskDelete ? () => onTaskDelete(task.id) : undefined}
          enableInlineEdit={enableInlineEdit}
          showTodayStar={showTodayStar}
          isSelected={taskIsSelected}
          onModifierClick={(e) => handleModifierClick(task.id, e)}
          onSelect={() => handleSelect(task.id)}
        />
      )
    }

    return (
      <TaskItem
        key={task.id}
        task={task}
        isExpanded={isExpanded}
        onExpand={() => handleTaskExpand(task.id)}
        onCollapse={handleTaskCollapse}
        onClick={() => {
          if (!enableInlineEdit) {
            onTaskClick(task)
          }
        }}
        onComplete={(completed) => onTaskComplete(task.id, completed)}
        onUpdate={(updates) => handleTaskUpdate(task.id, updates)}
        onDelete={onTaskDelete ? () => onTaskDelete(task.id) : undefined}
        enableInlineEdit={enableInlineEdit}
        showTodayStar={showTodayStar}
        isSelected={taskIsSelected}
        onModifierClick={(e) => handleModifierClick(task.id, e)}
        onSelect={() => handleSelect(task.id)}
      />
    )
  }

  const activeTaskList = (
    <div className="space-y-1">
      {activeTasks.map((task) => renderActiveTaskItem(task))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Active tasks with drag & drop */}
      {activeTasks.length > 0 && (
        shouldUseSortable ? (
          <SortableContext
            items={activeTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {activeTaskList}
          </SortableContext>
        ) : (
          activeTaskList
        )
      )}

      {/* Completed tasks - collapsible section */}
      {completedTasks.length > 0 && (
        <div className="mt-4 border-t border-[var(--border-primary)] pt-4">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform duration-200",
              showCompleted && "rotate-90"
            )} />
            <span className="text-sm font-medium">Dokončené ({completedTasks.length})</span>
          </button>

          {showCompleted && (
            <div className="mt-2 ml-6 space-y-1">
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onComplete={(completed) => onTaskComplete(task.id, completed)}
                  showTodayStar={showTodayStar}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="py-8 text-center text-[var(--text-secondary)]">
          {emptyMessage}
        </div>
      )}
    </div>
  )
}
