'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LayoutList, LayoutGrid, FolderKanban } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { ProjectTaskList } from '@/components/tasks/project-task-list'
import { TaskDetail } from '@/components/tasks/task-detail'
import { Button } from '@/components/ui/button'
import { useProject, useProjectTasks } from '@/lib/hooks/use-projects'
import { useTasks } from '@/lib/hooks/use-tasks'
import { useHeadings } from '@/lib/hooks/use-headings'
import { TaskWithRelations } from '@/types'

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { project, loading: projectLoading } = useProject(projectId)
  const { tasks, loading: tasksLoading, refetch: refetchTasks } = useProjectTasks(projectId)
  const { headings, loading: headingsLoading, createHeading, updateHeading, deleteHeading } = useHeadings(projectId)
  const { createTask, updateTask, completeTask } = useTasks()

  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  const handleQuickAdd = async (title: string, headingId?: string) => {
    try {
      await createTask({
        title,
        project_id: projectId,
        heading_id: headingId || null,
        kanban_column: 'backlog',
        when_type: 'anytime',
        is_inbox: false,
      })
      refetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      await completeTask(taskId, completed)
      refetchTasks()
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const handleHeadingCreate = async (title: string) => {
    await createHeading(title)
  }

  const handleHeadingUpdate = async (headingId: string, title: string) => {
    await updateHeading(headingId, { title })
  }

  const handleHeadingDelete = async (headingId: string) => {
    await deleteHeading(headingId)
    refetchTasks() // Refresh tasks since some may have lost their heading
  }

  const handleTaskUpdate = async (updates: Partial<TaskWithRelations>) => {
    if (!selectedTask) return
    try {
      await updateTask(selectedTask.id, updates)
      refetchTasks()
      setSelectedTask(null)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  if (projectLoading || tasksLoading || headingsLoading) {
    return (
      <div className="h-full">
        <Header title="Načítavam..." />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-full">
        <Header title="Projekt nenájdený" />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderKanban className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
          <p className="text-[var(--text-secondary)]">Tento projekt neexistuje</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <Header title={project.name} />

      {/* View Toggle */}
      <div className="border-b border-[var(--bg-secondary)] bg-[var(--bg-primary)] px-6 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
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
        {tasks.length === 0 && headings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
            <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">Projekt je prázdny</p>
            <p className="mb-6 text-[var(--text-secondary)]">
              Pridajte prvú úlohu alebo sekciu
            </p>
          </div>
        ) : null}

        <ProjectTaskList
          tasks={tasks}
          headings={headings}
          onTaskClick={setSelectedTask}
          onTaskComplete={handleTaskComplete}
          onQuickAdd={handleQuickAdd}
          onHeadingCreate={handleHeadingCreate}
          onHeadingUpdate={handleHeadingUpdate}
          onHeadingDelete={handleHeadingDelete}
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
