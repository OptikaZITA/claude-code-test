'use client'

import { useState, useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { TaskList } from '@/components/tasks/task-list'
import { TaskDetail } from '@/components/tasks/task-detail'
import { useUpcomingTasks, useTasks } from '@/lib/hooks/use-tasks'
import { TaskWithRelations } from '@/types'
import { format, parseISO, startOfDay, addDays, isSameDay } from 'date-fns'
import { sk } from 'date-fns/locale'

export default function UpcomingPage() {
  const { tasks, loading, refetch } = useUpcomingTasks()
  const { updateTask, completeTask } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const groups: Map<string, TaskWithRelations[]> = new Map()

    tasks.forEach(task => {
      if (task.when_date) {
        const dateKey = startOfDay(parseISO(task.when_date)).toISOString()
        if (!groups.has(dateKey)) {
          groups.set(dateKey, [])
        }
        groups.get(dateKey)!.push(task)
      }
    })

    // Sort by date
    return Array.from(groups.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
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

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr)
    const today = startOfDay(new Date())
    const tomorrow = addDays(today, 1)

    if (isSameDay(date, tomorrow)) {
      return 'Zajtra'
    }

    return format(date, "EEEE, d. MMMM", { locale: sk })
  }

  if (loading) {
    return (
      <div className="h-full">
        <Header title="Nadchádzajúce" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <Header title="Nadchádzajúce" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-[var(--color-success)]" />
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Nadchádzajúce
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {tasks.length} naplánovaných {tasks.length === 1 ? 'úloha' : tasks.length < 5 ? 'úlohy' : 'úloh'}
            </p>
          </div>
        </div>

        {/* Tasks grouped by date */}
        {groupedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
            <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">
              Žiadne naplánované úlohy
            </p>
            <p className="text-[var(--text-secondary)]">
              Naplánujte úlohy na konkrétny dátum
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTasks.map(([dateKey, dateTasks]) => (
              <div key={dateKey}>
                <h3 className="mb-3 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide capitalize">
                  {formatDateHeader(dateKey)}
                </h3>
                <TaskList
                  tasks={dateTasks}
                  onTaskClick={setSelectedTask}
                  onTaskComplete={handleTaskComplete}
                  onQuickAdd={() => {}}
                  showQuickAdd={false}
                  emptyMessage=""
                />
              </div>
            ))}
          </div>
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
