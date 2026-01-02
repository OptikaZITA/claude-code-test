'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { TaskList } from '@/components/tasks/task-list'
import { useInboxTasks, useTasks } from '@/lib/hooks/use-tasks'
import { TaskWithRelations } from '@/types'
import { Inbox } from 'lucide-react'

export default function InboxPage() {
  const { tasks, loading, refetch } = useInboxTasks('personal')
  const { createTask, completeTask } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  const handleQuickAdd = async (title: string) => {
    try {
      const { data: { user } } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()
      await createTask({
        title,
        inbox_type: 'personal',
        inbox_user_id: user?.id,
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

  if (loading) {
    return (
      <div className="h-full">
        <Header title="Inbox" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#007AFF] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <Header title="Inbox" />

      <div className="p-6">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="mb-4 h-12 w-12 text-[#86868B]" />
            <p className="mb-2 text-lg font-medium text-[#1D1D1F]">Váš inbox je prázdny</p>
            <p className="mb-6 text-[#86868B]">
              Pridajte úlohy pomocou formulára nižšie
            </p>
          </div>
        ) : null}

        <TaskList
          tasks={tasks}
          onTaskClick={setSelectedTask}
          onTaskComplete={handleTaskComplete}
          onQuickAdd={handleQuickAdd}
          emptyMessage=""
        />
      </div>
    </div>
  )
}
