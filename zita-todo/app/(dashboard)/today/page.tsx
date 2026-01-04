'use client'

import { useState } from 'react'
import { Sun, AlertCircle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { TaskList } from '@/components/tasks/task-list'
import { TaskDetail } from '@/components/tasks/task-detail'
import { useTodayTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { TaskWithRelations } from '@/types'
import { format, isToday, isPast, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'

export default function TodayPage() {
  const { tasks, loading, error, refetch } = useTodayTasks()
  const { createTask, updateTask, completeTask, softDelete } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // Listen for task:moved events to refresh the list
  useTaskMoved(refetch)

  // Separate overdue tasks from today's tasks
  const overdueTasks = tasks.filter(task => {
    if (!task.due_date) return false
    const dueDate = parseISO(task.due_date)
    return isPast(dueDate) && !isToday(dueDate)
  })

  const todayTasks = tasks.filter(task => {
    if (task.when_type === 'today') return true
    if (task.when_type === 'scheduled' && task.when_date) {
      return isToday(parseISO(task.when_date))
    }
    return false
  })

  const handleQuickAdd = async (title: string) => {
    try {
      await createTask({
        title,
        when_type: 'today',
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
        <Header title="Dnes" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  const todayDate = format(new Date(), "EEEE, d. MMMM", { locale: sk })

  return (
    <div className="h-full">
      <Header title="Dnes" />

      <div className="p-6">
        {/* Today's date */}
        <div className="mb-6 flex items-center gap-3">
          <Sun className="h-8 w-8 text-[var(--color-warning)]" />
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] capitalize">
              {todayDate}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {tasks.length} {tasks.length === 1 ? 'úloha' : tasks.length < 5 ? 'úlohy' : 'úloh'}
            </p>
          </div>
        </div>

        {/* Overdue section */}
        {overdueTasks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-[var(--color-error)]" />
              <h3 className="text-sm font-semibold text-[var(--color-error)]">
                Po termíne ({overdueTasks.length})
              </h3>
            </div>
            <div className="rounded-xl border border-[var(--color-error)]/20 bg-[var(--color-error)]/5 p-4">
              <TaskList
                tasks={overdueTasks}
                onTaskClick={setSelectedTask}
                onTaskComplete={handleTaskComplete}
                onTaskUpdate={handleInlineTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onQuickAdd={() => {}}
                showQuickAdd={false}
                emptyMessage=""
              />
            </div>
          </div>
        )}

        {/* Today's tasks */}
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sun className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
            <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">
              Žiadne úlohy na dnes
            </p>
            <p className="mb-6 text-[var(--text-secondary)]">
              Pridajte úlohy alebo ich presuňte na dnes
            </p>
          </div>
        ) : null}

        <TaskList
          tasks={todayTasks}
          onTaskClick={setSelectedTask}
          onTaskComplete={handleTaskComplete}
          onTaskUpdate={handleInlineTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onQuickAdd={handleQuickAdd}
          emptyMessage={overdueTasks.length > 0 ? '' : 'Žiadne úlohy na dnes'}
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
