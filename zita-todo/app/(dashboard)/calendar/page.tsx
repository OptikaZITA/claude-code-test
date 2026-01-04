'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { TaskWithRelations } from '@/types'
import { CalendarView } from '@/components/calendar/calendar-view'
import { TaskDetail } from '@/components/tasks/task-detail'
import { Header } from '@/components/layout/header'
import { ExportMenu } from '@/components/export/export-menu'

export default function CalendarPage() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const supabase = createClient()

  useEffect(() => {
    fetchTasks()
  }, [currentMonth])

  const fetchTasks = async () => {
    setLoading(true)

    // Fetch tasks with due dates in the visible range (current month +/- 1 month)
    const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd')
    const rangeEnd = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
        project:projects(id, name, color),
        tags:task_tags(tag:tags(*))
      `)
      .gte('due_date', rangeStart)
      .lte('due_date', rangeEnd)
      .is('archived_at', null)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else if (data) {
      // Transform tags from nested structure
      const transformedTasks = data.map((task: any) => ({
        ...task,
        tags: task.tags?.map((t: any) => t.tag) || [],
      }))
      setTasks(transformedTasks as TaskWithRelations[])
    }

    setLoading(false)
  }

  const handleTaskClick = (task: TaskWithRelations) => {
    setSelectedTask(task)
  }

  const handleDateClick = (date: Date) => {
    // Could open a modal to create a new task on this date
    console.log('Date clicked:', format(date, 'yyyy-MM-dd'))
  }

  const handleTaskMove = async (taskId: string, newDate: Date) => {
    // Update task due date
    const { error } = await supabase
      .from('tasks')
      .update({ due_date: format(newDate, 'yyyy-MM-dd') })
      .eq('id', taskId)

    if (error) {
      console.error('Error updating task:', error)
    } else {
      // Refresh tasks
      fetchTasks()
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<TaskWithRelations>) => {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)

    if (error) {
      console.error('Error updating task:', error)
    } else {
      fetchTasks()
      if (selectedTask?.id === taskId) {
        setSelectedTask({ ...selectedTask, ...updates })
      }
    }
  }

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    await handleTaskUpdate(taskId, {
      status: completed ? 'done' : 'todo',
      completed_at: completed ? new Date().toISOString() : null,
    })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Kalendár">
        <ExportMenu tasks={tasks} title="Kalendár" filename="kalendar" />
      </Header>

      <div className="flex-1 overflow-hidden">
        <CalendarView
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onDateClick={handleDateClick}
          onTaskMove={handleTaskMove}
        />
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updates) => handleTaskUpdate(selectedTask.id, updates)}
          onComplete={(completed) => handleTaskComplete(selectedTask.id, completed)}
        />
      )}
    </div>
  )
}
