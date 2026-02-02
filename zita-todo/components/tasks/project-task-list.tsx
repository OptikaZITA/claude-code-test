'use client'

import { useState, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { TaskWithRelations } from '@/types'
import { TaskItem } from './task-item'
import { TaskQuickAdd, TaskQuickAddData } from './task-quick-add'
import { cn } from '@/lib/utils/cn'

interface ProjectTaskListProps {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onTaskComplete: (taskId: string, completed: boolean) => void
  onQuickAdd: (title: string) => void
  emptyMessage?: string
  /** Zobrazit hviezdicku pre tasky v "Dnes" */
  showTodayStar?: boolean
}

export function ProjectTaskList({
  tasks,
  onTaskClick,
  onTaskComplete,
  onQuickAdd,
  emptyMessage = 'Žiadne úlohy',
  showTodayStar = false,
}: ProjectTaskListProps) {
  const [showCompleted, setShowCompleted] = useState(false)

  // Split into active and completed tasks
  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks])
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks])

  const isEmpty = tasks.length === 0

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <TaskQuickAdd onAdd={(taskData: TaskQuickAddData) => onQuickAdd(taskData.title)} />

      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-1">
          {activeTasks.map((task) => (
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
