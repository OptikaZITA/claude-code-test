'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LayoutList, LayoutGrid, FolderKanban } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { TaskList } from '@/components/tasks/task-list'
import { Button } from '@/components/ui/button'
import { useProject, useProjectTasks } from '@/lib/hooks/use-projects'
import { useTasks } from '@/lib/hooks/use-tasks'
import { TaskWithRelations } from '@/types'

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { project, loading: projectLoading } = useProject(projectId)
  const { tasks, loading: tasksLoading, refetch } = useProjectTasks(projectId)
  const { createTask, completeTask } = useTasks()

  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  const handleQuickAdd = async (title: string) => {
    try {
      await createTask({
        title,
        project_id: projectId,
        kanban_column: 'backlog',
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

  if (projectLoading || tasksLoading) {
    return (
      <div className="h-full">
        <Header title="Načítavam..." />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#007AFF] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-full">
        <Header title="Projekt nenájdený" />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderKanban className="mb-4 h-12 w-12 text-[#86868B]" />
          <p className="text-[#86868B]">Tento projekt neexistuje</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <Header title={project.name} />

      {/* View Toggle */}
      <div className="border-b border-[#E5E5E5] bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#86868B]">
            {project.description || 'Žiadny popis'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <LayoutList className="mr-1 h-4 w-4" />
              Zoznam
            </Button>
            <Link href={`/projects/${projectId}/kanban`}>
              <Button variant="ghost" size="sm">
                <LayoutGrid className="mr-1 h-4 w-4" />
                Kanban
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="mb-4 h-12 w-12 text-[#86868B]" />
            <p className="mb-2 text-lg font-medium text-[#1D1D1F]">Projekt je prázdny</p>
            <p className="mb-6 text-[#86868B]">
              Pridajte prvú úlohu pomocou formulára nižšie
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
