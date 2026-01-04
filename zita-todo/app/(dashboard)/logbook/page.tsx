'use client'

import { useState, useMemo } from 'react'
import { BookOpen, CheckCircle2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { TaskDetail } from '@/components/tasks/task-detail'
import { TaskItem } from '@/components/tasks/task-item'
import { useLogbookTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { TaskWithRelations } from '@/types'
import { format, parseISO, startOfDay, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns'
import { sk } from 'date-fns/locale'

export default function LogbookPage() {
  const { tasks, loading, refetch } = useLogbookTasks()
  const { updateTask, completeTask } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // Listen for task:moved events to refresh the list
  useTaskMoved(refetch)

  // Group tasks by time period
  const groupedTasks = useMemo(() => {
    const groups: {
      today: TaskWithRelations[]
      yesterday: TaskWithRelations[]
      thisWeek: TaskWithRelations[]
      thisMonth: TaskWithRelations[]
      older: TaskWithRelations[]
    } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    }

    tasks.forEach(task => {
      if (!task.completed_at) {
        groups.older.push(task)
        return
      }

      const completedDate = parseISO(task.completed_at)

      if (isToday(completedDate)) {
        groups.today.push(task)
      } else if (isYesterday(completedDate)) {
        groups.yesterday.push(task)
      } else if (isThisWeek(completedDate)) {
        groups.thisWeek.push(task)
      } else if (isThisMonth(completedDate)) {
        groups.thisMonth.push(task)
      } else {
        groups.older.push(task)
      }
    })

    return groups
  }, [tasks])

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

  if (loading) {
    return (
      <div className="h-full">
        <Header title="Logbook" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  const renderGroup = (title: string, groupTasks: TaskWithRelations[]) => {
    if (groupTasks.length === 0) return null

    return (
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          {title}
        </h3>
        <div className="space-y-2">
          {groupTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => setSelectedTask(task)}
              onComplete={(completed) => handleTaskComplete(task.id, completed)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <Header title="Logbook" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-[var(--color-success)]" />
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Logbook
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {tasks.length} dokončených úloh
            </p>
          </div>
        </div>

        {/* Tasks grouped by time period */}
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
            <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">
              Žiadne dokončené úlohy
            </p>
            <p className="text-[var(--text-secondary)]">
              Dokončené úlohy sa zobrazia tu
            </p>
          </div>
        ) : (
          <>
            {renderGroup('Dnes', groupedTasks.today)}
            {renderGroup('Včera', groupedTasks.yesterday)}
            {renderGroup('Tento týždeň', groupedTasks.thisWeek)}
            {renderGroup('Tento mesiac', groupedTasks.thisMonth)}
            {renderGroup('Staršie', groupedTasks.older)}
          </>
        )}
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
