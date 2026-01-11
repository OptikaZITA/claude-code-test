'use client'

import { useState, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { FolderKanban, Plus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ProjectTaskList } from '@/components/tasks/project-task-list'
import { TaskQuickAdd, TaskQuickAddData, TaskQuickAddHandle } from '@/components/tasks/task-quick-add'
import { TaskQuickAddMobile } from '@/components/tasks/task-quick-add-mobile'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { CalendarView } from '@/components/calendar/calendar-view'
import { TaskDetail } from '@/components/tasks/task-detail'
import { UnifiedFilterBar, CascadingFilterBar } from '@/components/filters'
import { useProject, useProjectTasks } from '@/lib/hooks/use-projects'
import { useAreas } from '@/lib/hooks/use-areas'
import { useTags } from '@/lib/hooks/use-tags'
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
  const { filters, setFilter, clearFilters, clearFilter, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const inlineFormRef = useRef<TaskQuickAddHandle>(null)
  const { areas } = useAreas()
  const { tags: allTags } = useTags()

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return filterTasks(tasks, filters)
  }, [tasks, filters])

  // Apply tag filter
  const tagFilteredTasks = useMemo(() => {
    if (!selectedTag) return filteredTasks
    return filteredTasks.filter(task =>
      task.tags?.some(tag => tag.id === selectedTag)
    )
  }, [filteredTasks, selectedTag])

  // Listen for task:moved events to refresh the list
  useTaskMoved(refetchTasks)

  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  const handleQuickAdd = async (taskData: TaskQuickAddData) => {
    try {
      await createTask({
        title: taskData.title,
        notes: taskData.notes,
        project_id: taskData.project_id || projectId,
        area_id: taskData.area_id,
        assignee_id: taskData.assignee_id,
        deadline: taskData.deadline,
        when_type: taskData.when_type || 'anytime',
        when_date: taskData.when_date,
        status: 'backlog', // Nové úlohy v projekte začínajú v Backlog
        is_inbox: false,
      })
      refetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  // For ProjectTaskList which passes headingId
  const handleQuickAddWithHeading = async (title: string, headingId?: string) => {
    try {
      await createTask({
        title,
        project_id: projectId,
        heading_id: headingId || null,
        status: 'backlog',
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
    await handleQuickAdd({ title })
  }

  // Calendar handlers
  const handleCalendarTaskMove = async (taskId: string, newDate: Date) => {
    try {
      await updateTask(taskId, {
        due_date: newDate.toISOString().split('T')[0],
      })
      refetchTasks()
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  const handleCalendarDateClick = (date: Date) => {
    // Could open quick add for that date
    console.log('Date clicked:', date)
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
      />

      {viewMode === 'calendar' ? (
        <div className="flex-1 overflow-hidden">
          <CalendarView
            tasks={tagFilteredTasks}
            onTaskClick={setSelectedTask}
            onDateClick={handleCalendarDateClick}
            onTaskMove={handleCalendarTaskMove}
          />
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            tasks={tagFilteredTasks}
            onTaskMove={handleKanbanTaskMove}
            onTaskClick={setSelectedTask}
            onQuickAdd={handleKanbanQuickAdd}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          {/* Title row with button */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-heading font-semibold text-foreground">{project.name}</h2>
            <Button
              onClick={() => inlineFormRef.current?.activate()}
              className="bg-primary text-white hover:bg-primary/90 hidden lg:flex"
            >
              <Plus className="h-4 w-4 mr-2" />
              Pridať úlohu
            </Button>
          </div>

          {/* Cascading Filter Bar - Desktop only */}
          <CascadingFilterBar
            tasks={tasks}
            filters={filters}
            onFilterChange={setFilter}
            onClearFilters={clearFilters}
            onClearFilter={clearFilter}
            hasActiveFilters={hasActiveFilters}
            areas={areas}
            allTags={allTags}
            className="mb-4"
          />

          {/* Unified Filter Bar - Mobile only */}
          <div className="lg:hidden">
            <UnifiedFilterBar
              tasks={filteredTasks}
              filters={filters}
              onFilterChange={setFilter}
              onClearFilters={clearFilters}
              onClearFilter={clearFilter}
              hasActiveFilters={hasActiveFilters}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
              className="mb-4"
            />
          </div>

          {/* Inline Task Quick Add Form */}
          <TaskQuickAdd
            ref={inlineFormRef}
            variant="inline"
            onAdd={handleQuickAdd}
            context={{ defaultWhenType: 'anytime', defaultProjectId: projectId }}
          />

          {tagFilteredTasks.length === 0 && tasks.length === 0 && headings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
              <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">Projekt je prázdny</p>
              <p className="mb-6 text-[var(--text-secondary)]">
                Pridajte prvú úlohu alebo sekciu
              </p>
            </div>
          ) : tagFilteredTasks.length === 0 && (hasActiveFilters || selectedTag) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
              <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">Žiadne úlohy nezodpovedajú filtrom</p>
              <button
                onClick={() => { clearFilters(); setSelectedTag(null); }}
                className="text-[var(--color-primary)] hover:underline"
              >
                Zrušiť filtre
              </button>
            </div>
          ) : null}

          <ProjectTaskList
            tasks={tagFilteredTasks}
            headings={headings}
            onTaskClick={setSelectedTask}
            onTaskComplete={handleTaskComplete}
            onQuickAdd={handleQuickAddWithHeading}
            onHeadingCreate={handleHeadingCreate}
            onHeadingUpdate={handleHeadingUpdate}
            onHeadingDelete={handleHeadingDelete}
            emptyMessage=""
            showTodayStar={true}
          />

          {/* Mobile FAB + Bottom Sheet */}
          <TaskQuickAddMobile
            onAdd={handleQuickAdd}
            context={{ defaultWhenType: 'anytime', defaultProjectId: projectId }}
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
