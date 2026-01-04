'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Layers, FolderKanban, Plus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { TaskList } from '@/components/tasks/task-list'
import { TaskDetail } from '@/components/tasks/task-detail'
import { Button } from '@/components/ui/button'
import { useArea, useAreaProjects, useAreaTasks } from '@/lib/hooks/use-areas'
import { useTasks } from '@/lib/hooks/use-tasks'
import { TaskWithRelations, Project } from '@/types'
import { cn } from '@/lib/utils/cn'

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-xl border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-4 transition-all hover:border-[var(--color-primary)] hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: project.color || 'var(--color-primary)' }}
        />
        <h3 className="font-medium text-[var(--text-primary)]">{project.name}</h3>
      </div>
      {project.description && (
        <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2">
          {project.description}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs',
            project.status === 'active' && 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
            project.status === 'completed' && 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]',
            project.status === 'archived' && 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]',
            project.status === 'someday' && 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
          )}
        >
          {project.status === 'active' ? 'Aktívny' :
           project.status === 'completed' ? 'Dokončený' :
           project.status === 'archived' ? 'Archivovaný' :
           project.status === 'someday' ? 'Niekedy' : project.status}
        </span>
      </div>
    </Link>
  )
}

export default function AreaDetailPage() {
  const params = useParams()
  const areaId = params.areaId as string

  const { area, loading: areaLoading } = useArea(areaId)
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useAreaProjects(areaId)
  const { tasks, loading: tasksLoading, refetch: refetchTasks } = useAreaTasks(areaId)
  const { createTask, updateTask, completeTask } = useTasks()

  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  const handleQuickAdd = async (title: string) => {
    try {
      await createTask({
        title,
        area_id: areaId,
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

  if (areaLoading || projectsLoading || tasksLoading) {
    return (
      <div className="h-full">
        <Header title="Načítavam..." />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!area) {
    return (
      <div className="h-full">
        <Header title="Oblasť nenájdená" />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
          <p className="text-[var(--text-secondary)]">Táto oblasť neexistuje</p>
        </div>
      </div>
    )
  }

  const activeProjects = projects.filter(p => p.status === 'active')
  const somedayProjects = projects.filter(p => p.status === 'someday')
  const completedProjects = projects.filter(p => p.status === 'completed' || p.status === 'archived')

  return (
    <div className="h-full">
      <Header title={area.name} />

      <div className="p-6">
        {/* Area Header */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: area.color ? `${area.color}20` : 'var(--bg-secondary)' }}
          >
            <Layers
              className="h-5 w-5"
              style={{ color: area.color || 'var(--text-secondary)' }}
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {area.name}
            </h2>
            {area.description && (
              <p className="text-sm text-[var(--text-secondary)]">
                {area.description}
              </p>
            )}
          </div>
        </div>

        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                Aktívne projekty ({activeProjects.length})
              </h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}

        {/* Someday Projects */}
        {somedayProjects.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Niekedy ({somedayProjects.length})
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {somedayProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}

        {/* Tasks without project (directly in area) */}
        {(tasks.length > 0 || projects.length === 0) && (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Úlohy v oblasti
            </h3>
            <TaskList
              tasks={tasks}
              onTaskClick={setSelectedTask}
              onTaskComplete={handleTaskComplete}
              onQuickAdd={handleQuickAdd}
              emptyMessage="Žiadne voľné úlohy v tejto oblasti"
            />
          </div>
        )}

        {/* Completed Projects (collapsed) */}
        {completedProjects.length > 0 && (
          <div className="mb-8">
            <details className="group">
              <summary className="mb-3 cursor-pointer text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide list-none">
                <span className="flex items-center gap-2">
                  Dokončené projekty ({completedProjects.length})
                  <span className="text-xs">▼</span>
                </span>
              </summary>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                {completedProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </details>
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
            <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">
              Táto oblasť je prázdna
            </p>
            <p className="mb-6 text-[var(--text-secondary)]">
              Pridajte projekty alebo úlohy do tejto oblasti
            </p>
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
