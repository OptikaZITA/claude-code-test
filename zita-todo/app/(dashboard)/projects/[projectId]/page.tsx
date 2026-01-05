'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { FolderKanban, Filter } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { ProjectTaskList } from '@/components/tasks/project-task-list'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { TaskDetail } from '@/components/tasks/task-detail'
import { TaskFiltersBar } from '@/components/filters/task-filters-bar'
import { useProject, useProjectTasks } from '@/lib/hooks/use-projects'
import { useTasks } from '@/lib/hooks/use-tasks'
import { useHeadings } from '@/lib/hooks/use-headings'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useViewPreference } from '@/lib/hooks/use-view-preference'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { TaskWithRelations, TaskStatus } from '@/types'

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { project, loading: projectLoading } = useProject(projectId)
  const { tasks, loading: tasksLoading, refetch: refetchTasks } = useProjectTasks(projectId)
  const { headings, loading: headingsLoading, createHeading, updateHeading, deleteHeading } = useHeadings(projectId)
  const { createTask, updateTask, completeTask } = useTasks()
  const { viewMode, setViewMode, isLoaded } = useViewPreference('project')
  const [showFilters, setShowFilters] = useState(false)
  const { filters, setFilter, clearFilters, hasActiveFilters } = useTaskFilters()

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return filterTasks(tasks, filters)
  }, [tasks, filters])

  // Listen for task:moved events to refresh the list
  useTaskMoved(refetchTasks)

  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  const handleQuickAdd = async (title: string, headingId?: string) => {
    try {
      await createTask({
        title,
        project_id: projectId,
        heading_id: headingId || null,
        status: 'backlog', // Nové úlohy v projekte začínajú v Backlog
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

  // Kanban handlers
  const handleKanbanTaskMove = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updates: Partial<TaskWithRelations> = { status: newStatus }
      if (newStatus === 'done') {
        updates.completed_at = new Date().toISOString()
        updates.when_type = null
      } else {
        updates.completed_at = null
      }
      await updateTask(taskId, updates)
      refetchTasks()
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  const handleKanbanQuickAdd = async (title: string, status: TaskStatus) => {
    try {
      await createTask({
        title,
        project_id: projectId,
        status,
        when_type: 'anytime',
        is_inbox: false,
      })
      refetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  if (projectLoading || tasksLoading || headingsLoading || !isLoaded) {
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
    <div className="h-full flex flex-col">
      <Header
        title={project.name}
        showViewToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      >
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg transition-colors ${
            hasActiveFilters
              ? 'bg-[var(--color-primary)] text-white'
              : 'hover:bg-[var(--bg-hover)]'
          }`}
          title="Filtre"
        >
          <Filter className="h-4 w-4" />
        </button>
      </Header>

      {/* Filter Bar */}
      {showFilters && (
        <div className="px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <TaskFiltersBar
            filters={filters}
            onFilterChange={setFilter}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      )}

      {viewMode === 'kanban' ? (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            tasks={filteredTasks}
            onTaskMove={handleKanbanTaskMove}
            onTaskClick={setSelectedTask}
            onQuickAdd={handleKanbanQuickAdd}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          {filteredTasks.length === 0 && tasks.length === 0 && headings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
              <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">Projekt je prázdny</p>
              <p className="mb-6 text-[var(--text-secondary)]">
                Pridajte prvú úlohu alebo sekciu
              </p>
            </div>
          ) : filteredTasks.length === 0 && hasActiveFilters ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
              <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">Žiadne úlohy nezodpovedajú filtrom</p>
              <button
                onClick={clearFilters}
                className="text-[var(--color-primary)] hover:underline"
              >
                Zrušiť filtre
              </button>
            </div>
          ) : null}

          <ProjectTaskList
            tasks={filteredTasks}
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
      )}

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
