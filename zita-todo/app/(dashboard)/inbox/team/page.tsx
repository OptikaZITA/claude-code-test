'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { TaskList } from '@/components/tasks/task-list'
import { ExportMenu } from '@/components/export/export-menu'
import { ErrorDisplay } from '@/components/layout/error-display'
import { useInboxTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { TaskWithRelations } from '@/types'
import { Users } from 'lucide-react'

export default function TeamInboxPage() {
  const { tasks, loading, error, refetch } = useInboxTasks('team')
  const { createTask, updateTask, completeTask, softDelete } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // Listen for task:moved events to refresh the list
  useTaskMoved(refetch)

  const handleQuickAdd = async (title: string) => {
    try {
      await createTask({
        title,
        inbox_type: 'team',
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

  const handleTaskUpdate = async (taskId: string, updates: Partial<TaskWithRelations>) => {
    try {
      await updateTask(taskId, updates)
      refetch()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await softDelete(taskId)
      refetch()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  if (loading) {
    return (
      <div className="h-full">
        <Header title="Tímový Inbox" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full">
        <Header title="Tímový Inbox" />
        <div className="p-6">
          <ErrorDisplay error={error} onRetry={refetch} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <Header title="Tímový Inbox">
        <ExportMenu tasks={tasks} title="Tímový Inbox" filename="timovy-inbox" />
      </Header>

      <div className="p-6">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
            <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">Tímový inbox je prázdny</p>
            <p className="mb-6 text-[var(--text-secondary)]">
              Úlohy pridané sem uvidia všetci členovia tímu
            </p>
          </div>
        ) : null}

        <TaskList
          tasks={tasks}
          onTaskClick={setSelectedTask}
          onTaskComplete={handleTaskComplete}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onQuickAdd={handleQuickAdd}
          emptyMessage=""
        />
      </div>
    </div>
  )
}
