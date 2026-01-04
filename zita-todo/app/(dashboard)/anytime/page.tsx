'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { TaskList } from '@/components/tasks/task-list'
import { TaskDetail } from '@/components/tasks/task-detail'
import { useAnytimeTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { TaskWithRelations } from '@/types'

export default function AnytimePage() {
  const { tasks, loading, refetch } = useAnytimeTasks()
  const { createTask, updateTask, completeTask } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // Listen for task:moved events to refresh the list
  useTaskMoved(refetch)

  const handleQuickAdd = async (title: string) => {
    try {
      await createTask({
        title,
        when_type: 'anytime',
        is_inbox: false,
        inbox_type: 'personal',
      })
      refetch()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      await completeTask(taskId, completed)
      refetch()
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const handleTaskUpdate = async (updates: Partial<TaskWithRelations>) => {
    if (!selectedTask) return
    try {
      await updateTask(selectedTask.id, updates)
      refetch()
      setSelectedTask(null)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleInlineTaskUpdate = async (taskId: string, updates: Partial<TaskWithRelations>) => {
    try {
      await updateTask(taskId, updates)
      refetch()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  if (loading) {
    return (
      <div className="h-full">
        <Header title="Kedykoľvek" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <Header title="Kedykoľvek" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Clock className="h-8 w-8 text-[var(--color-primary)]" />
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Kedykoľvek
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Úlohy bez konkrétneho termínu
            </p>
          </div>
        </div>

        {/* Tasks */}
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
            <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">
              Žiadne úlohy
            </p>
            <p className="mb-6 text-[var(--text-secondary)]">
              Úlohy ktoré môžete urobiť kedykoľvek
            </p>
          </div>
        ) : null}

        <TaskList
          tasks={tasks}
          onTaskClick={setSelectedTask}
          onTaskComplete={handleTaskComplete}
          onTaskUpdate={handleInlineTaskUpdate}
          onQuickAdd={handleQuickAdd}
          emptyMessage=""
        />
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  )
}
