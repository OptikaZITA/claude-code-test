'use client'

import { useState, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Layers, FolderKanban, Star, FolderPlus, Plus, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { TaskList } from '@/components/tasks/task-list'
import { TaskQuickAdd, TaskQuickAddData, TaskQuickAddHandle } from '@/components/tasks/task-quick-add'
import { TaskQuickAddMobile } from '@/components/tasks/task-quick-add-mobile'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { FullCalendarView } from '@/components/calendar/full-calendar-view'
import { format } from 'date-fns'
import { TaskDetail } from '@/components/tasks/task-detail'
import { UnifiedFilterBar, CascadingFilterBar } from '@/components/filters'
import { ProjectFormModal } from '@/components/projects/project-form-modal'
import { QuickTimeModal } from '@/components/time-tracking/quick-time-modal'
import { useArea, useAreaProjects, useAllAreaTasks, useAreas } from '@/lib/hooks/use-areas'
import { useTasks } from '@/lib/hooks/use-tasks'
import { useTaskHasTime } from '@/lib/hooks/use-task-has-time'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useViewPreference } from '@/lib/hooks/use-view-preference'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { useTags } from '@/lib/hooks/use-tags'
import { useCurrentUser } from '@/lib/hooks/use-user-departments'
import { useOrganizationUsers } from '@/lib/hooks/use-organization-users'
import { TaskWithRelations, Project, TaskStatus } from '@/types'
import { cn } from '@/lib/utils/cn'
import { sortTasksTodayFirst } from '@/lib/utils/task-sorting'

interface ProjectSectionProps {
  project: Project
  tasks: TaskWithRelations[]
  areaColor: string | null
  isExpanded: boolean
  onToggle: () => void
  onTaskComplete: (taskId: string, completed: boolean) => void
  onTaskUpdate: (taskId: string, updates: Partial<TaskWithRelations>) => void
  onTaskDelete: (taskId: string) => void
  onQuickAdd: (title: string, projectId: string) => void
}

function ProjectSection({
  project,
  tasks,
  areaColor,
  isExpanded,
  onToggle,
  onTaskComplete,
  onTaskUpdate,
  onTaskDelete,
  onQuickAdd,
}: ProjectSectionProps) {
  const sortedTasks = sortTasksTodayFirst(tasks)
  const quickAddRef = useRef<TaskQuickAddHandle>(null)

  const handleQuickAdd = (taskData: TaskQuickAddData) => {
    onQuickAdd(taskData.title, project.id)
  }

  return (
    <div className={cn("mb-6", !isExpanded && "mb-1")}>
      {/* Project Header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onToggle}
          className="p-0.5 rounded hover:bg-accent transition-colors"
          title={isExpanded ? 'Zrolovať projekt' : 'Rozbaliť projekt'}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 text-[var(--text-secondary)] transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
          />
        </button>
        <Link
          href={`/projects/${project.id}`}
          className="group flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <FolderKanban
            className="h-4 w-4"
            style={{ color: areaColor || 'var(--color-primary)' }}
          />
          <h3
            className="font-bold text-[var(--text-primary)]"
            style={{ color: areaColor || 'var(--text-primary)' }}
          >
            {project.name}
          </h3>
          <span className="text-xs text-[var(--text-secondary)]">
            ({tasks.length})
          </span>
        </Link>
        {/* Small add task button */}
        <button
          onClick={() => quickAddRef.current?.activate()}
          className="p-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title="Pridať úlohu"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Project Tasks - only when expanded */}
      {isExpanded && (
        <div className="pl-4 ml-2">
          <TaskQuickAdd
            ref={quickAddRef}
            onAdd={handleQuickAdd}
            variant="inline"
            context={{ defaultProjectId: project.id }}
          />
          <TaskList
            tasks={sortedTasks}
            onTaskComplete={onTaskComplete}
            onTaskUpdate={onTaskUpdate}
            onTaskDelete={onTaskDelete}
            onQuickAdd={(title) => onQuickAdd(title, project.id)}
            emptyMessage="Žiadne úlohy v projekte"
            showQuickAdd={false}
            showTodayStar={true}
          />
        </div>
      )}
    </div>
  )
}

export default function AreaDetailPage() {
  const params = useParams()
  const areaId = params.areaId as string

  const { user } = useCurrentUser()
  // Database-level assignee filter - 'all' (default for areas), 'unassigned', or UUID
  // Areas default to 'all' to show Slack-created tasks and team tasks
  const [dbAssigneeFilter, setDbAssigneeFilter] = useState<string | undefined>('all')
  const { area, loading: areaLoading } = useArea(areaId)
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useAreaProjects(areaId)
  const { tasks, setTasks, loading: tasksLoading, refetch: refetchTasks } = useAllAreaTasks(areaId, dbAssigneeFilter)
  const { createTask, updateTask, completeTask, softDelete } = useTasks()
  const { viewMode, setViewMode, isLoaded } = useViewPreference('area')
  const { filters, setFilter, clearFilters, clearFilter, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const inlineFormRef = useRef<TaskQuickAddHandle>(null)
  const looseTasksQuickAddRef = useRef<TaskQuickAddHandle>(null)
  const { areas } = useAreas()
  const { tags: allTags } = useTags()
  const { users: organizationUsers } = useOrganizationUsers()
  const { checkTaskHasTime } = useTaskHasTime()

  // State for QuickTimeModal
  const [pendingCompleteTask, setPendingCompleteTask] = useState<TaskWithRelations | null>(null)
  // State for TaskDetail
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // State for project expand/collapse
  const [expandedProjects, setExpandedProjects] = useState<Set<string> | null>(null)

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

  // Group tasks by project
  const { projectTasks, looseTasks } = useMemo(() => {
    const projectTasksMap = new Map<string, TaskWithRelations[]>()
    const loose: TaskWithRelations[] = []

    tagFilteredTasks.forEach(task => {
      if (task.project_id) {
        const existing = projectTasksMap.get(task.project_id) || []
        projectTasksMap.set(task.project_id, [...existing, task])
      } else {
        loose.push(task)
      }
    })

    return {
      projectTasks: projectTasksMap,
      looseTasks: sortTasksTodayFirst(loose)
    }
  }, [tagFilteredTasks])

  // Active projects (must be before early returns)
  const activeProjects = useMemo(() => {
    return projects.filter(p => p.status === 'active')
  }, [projects])

  // Initialize expanded projects: expand only those with tasks
  const resolvedExpandedProjects = useMemo(() => {
    if (expandedProjects !== null) return expandedProjects
    const withTasks = new Set<string>()
    activeProjects.forEach(p => {
      if ((projectTasks.get(p.id) || []).length > 0) {
        withTasks.add(p.id)
      }
    })
    return withTasks
  }, [expandedProjects, activeProjects, projectTasks])

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const current = prev !== null ? prev : resolvedExpandedProjects
      const next = new Set(current)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  // Filter projects to only show those with tasks matching the tag filter
  const visibleProjects = useMemo(() => {
    if (!selectedTag) {
      // No tag filter - show all projects
      return activeProjects
    }
    // Only show projects that have at least one task with the selected tag
    return activeProjects.filter(project => {
      const projectTaskList = projectTasks.get(project.id) || []
      return projectTaskList.length > 0
    })
  }, [activeProjects, selectedTag, projectTasks])

  // Get selected tag name for empty state message
  const selectedTagName = useMemo(() => {
    if (!selectedTag) return null
    const task = tasks.find(t => t.tags?.some(tag => tag.id === selectedTag))
    return task?.tags?.find(tag => tag.id === selectedTag)?.name || null
  }, [selectedTag, tasks])

  const handleQuickAdd = async (taskData: TaskQuickAddData) => {
    try {
      await createTask({
        title: taskData.title,
        notes: taskData.notes,
        area_id: taskData.area_id || areaId,
        project_id: taskData.project_id,
        assignee_id: taskData.assignee_id,
        deadline: taskData.deadline,
        when_type: taskData.when_type || 'anytime',
        when_date: taskData.when_date,
        is_inbox: false,
      })
      refetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  // For ProjectSection and TaskList which pass only title (and optionally projectId)
  const handleSimpleQuickAdd = async (title: string, projectId?: string) => {
    try {
      await createTask({
        title,
        area_id: areaId,
        project_id: projectId || null,
        is_inbox: false,
      })
      refetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    // Find the task
    const task = tasks.find(t => t.id === taskId)
    if (!task) {
      console.error('Task not found:', taskId)
      return
    }

    // If uncompleting a task, do optimistic update and complete directly
    if (!completed) {
      // OPTIMISTIC UPDATE: Update local state immediately
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, status: 'todo' as const, completed_at: null, when_type: 'inbox' }
          : t
      ))

      try {
        await completeTask(taskId, completed)
        // No refetchTasks() - optimistic update is already done
      } catch (error) {
        console.error('Error completing task:', error)
        // Rollback on error
        setTasks(prev => prev.map(t => t.id === taskId ? task : t))
      }
      return
    }

    // Check if task has any time entries
    const hasTime = await checkTaskHasTime(taskId)

    if (hasTime) {
      // Task has time entries - complete directly with optimistic update
      // OPTIMISTIC UPDATE: Update local state immediately
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, status: 'done' as const, completed_at: new Date().toISOString(), when_type: null }
          : t
      ))

      try {
        await completeTask(taskId, completed)
        // No refetchTasks() - optimistic update is already done
      } catch (error) {
        console.error('Error completing task:', error)
        // Rollback on error
        setTasks(prev => prev.map(t => t.id === taskId ? task : t))
      }
    } else {
      // No time entries - show QuickTimeModal
      setPendingCompleteTask(task)
    }
  }

  // Handler for completing task after QuickTimeModal
  const handleQuickTimeComplete = async () => {
    if (!pendingCompleteTask) return
    const task = pendingCompleteTask
    const taskId = task.id

    // OPTIMISTIC UPDATE: Update local state immediately
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: 'done' as const, completed_at: new Date().toISOString(), when_type: null }
        : t
    ))

    try {
      await completeTask(taskId, true)
      // No refetchTasks() - optimistic update is already done
    } catch (error) {
      console.error('Error completing task:', error)
      // Rollback on error
      setTasks(prev => prev.map(t => t.id === taskId ? task : t))
    }
    setPendingCompleteTask(null)
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<TaskWithRelations>) => {
    try {
      await updateTask(taskId, updates)
      refetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await softDelete(taskId)
      refetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
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
  const handleCalendarDateChange = async (taskId: string, newDate: Date) => {
    try {
      await updateTask(taskId, {
        deadline: format(newDate, 'yyyy-MM-dd'),
      })
      refetchTasks()
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  // Task detail update handler
  const handleTaskDetailUpdate = async (updates: Partial<TaskWithRelations>) => {
    if (!selectedTask) return
    try {
      await updateTask(selectedTask.id, updates)
      refetchTasks()
      setSelectedTask(null)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  if (areaLoading || projectsLoading || tasksLoading || !isLoaded) {
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
        <Header title="Oddelenie nenájdené" />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
          <p className="text-[var(--text-secondary)]">Toto oddelenie neexistuje</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        title={area.name}
        showViewToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Filters - shown for all view modes */}
      <div className="px-6 pt-4 pb-2 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]">
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
          allOrganizationUsers={organizationUsers}
          hideFilters={['area']}
          className="mb-0"
          dbAssigneeFilter={dbAssigneeFilter}
          onDbAssigneeChange={setDbAssigneeFilter}
          currentUserId={user?.id}
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
            className="mb-0"
          />
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="flex-1 overflow-hidden">
          <FullCalendarView
            tasks={tagFilteredTasks}
            onTaskClick={setSelectedTask}
            onDateChange={handleCalendarDateChange}
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
          {/* Title row with buttons */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-heading font-semibold text-foreground">{area.name}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProjectModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
              >
                <FolderPlus className="h-4 w-4" />
                Pridať projekt
              </button>
              <Button
                onClick={() => inlineFormRef.current?.activate()}
                className="bg-primary text-white hover:bg-primary/90 hidden lg:flex"
              >
                <Plus className="h-4 w-4 mr-2" />
                Pridať úlohu
              </Button>
            </div>
          </div>

          {/* Inline Task Quick Add Form */}
          <TaskQuickAdd
            ref={inlineFormRef}
            variant="inline"
            onAdd={handleQuickAdd}
            context={{ defaultWhenType: 'anytime', defaultAreaId: areaId }}
          />

          {/* Projects with their tasks */}
          {visibleProjects.map(project => {
            const projectTaskList = projectTasks.get(project.id) || []
            return (
              <ProjectSection
                key={project.id}
                project={project}
                tasks={projectTaskList}
                areaColor={area.color}
                isExpanded={resolvedExpandedProjects.has(project.id)}
                onToggle={() => toggleProject(project.id)}
                onTaskComplete={handleTaskComplete}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onQuickAdd={handleSimpleQuickAdd}
              />
            )
          })}

          {/* Loose tasks (directly in area, no project) */}
          {looseTasks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-[var(--text-secondary)]" />
                <h3 className="font-bold text-[var(--text-secondary)]">
                  Voľné úlohy
                </h3>
                <span className="text-xs text-[var(--text-secondary)]">
                  ({looseTasks.length})
                </span>
                {/* Small add task button - same as projects */}
                <button
                  onClick={() => looseTasksQuickAddRef.current?.activate()}
                  className="p-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  title="Pridať úlohu"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <TaskQuickAdd
                ref={looseTasksQuickAddRef}
                onAdd={handleQuickAdd}
                variant="inline"
                context={{ defaultWhenType: 'anytime', defaultAreaId: areaId }}
              />
              <TaskList
                tasks={looseTasks}
                onTaskComplete={handleTaskComplete}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onQuickAdd={(title) => handleSimpleQuickAdd(title)}
                emptyMessage=""
                showQuickAdd={false}
                showTodayStar={true}
              />
            </div>
          )}

          {/* Empty state */}
          {projects.length === 0 && tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
              <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">
                Toto oddelenie je prázdne
              </p>
              <p className="mb-6 text-[var(--text-secondary)]">
                Pridajte projekty alebo úlohy do tohto oddelenia
              </p>
            </div>
          )}

          {/* Filter empty state */}
          {tagFilteredTasks.length === 0 && tasks.length > 0 && (hasActiveFilters || selectedTag || dbAssigneeFilter !== 'all') && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
              <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">
                {selectedTag && selectedTagName
                  ? `Žiadne úlohy s tagom "${selectedTagName}"`
                  : 'Žiadne úlohy nezodpovedajú filtrom'}
              </p>
              <button
                onClick={() => { clearFilters(); setSelectedTag(null); setDbAssigneeFilter('all'); }}
                className="text-[var(--color-primary)] hover:underline"
              >
                Zrušiť filtre
              </button>
            </div>
          )}

          {/* Quick add for area when no loose tasks */}
          {looseTasks.length === 0 && (projects.length > 0 || tasks.length > 0) && !hasActiveFilters && !selectedTag && (
            <div className="mt-6 pt-4 border-t border-[var(--border-primary)]">
              <TaskList
                tasks={[]}
                onTaskComplete={() => {}}
                onTaskUpdate={() => {}}
                onTaskDelete={() => {}}
                onQuickAdd={(title) => handleSimpleQuickAdd(title)}
                emptyMessage=""
                showQuickAdd={true}
              />
            </div>
          )}

          {/* Mobile FAB + Bottom Sheet */}
          <TaskQuickAddMobile
            onAdd={handleQuickAdd}
            context={{ defaultWhenType: 'anytime', defaultAreaId: areaId }}
          />
        </div>
      )}

      {/* Modal pre vytvorenie projektu */}
      <ProjectFormModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSuccess={() => {
          refetchProjects()
          refetchTasks()
        }}
        preselectedAreaId={areaId}
      />

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskDetailUpdate}
        />
      )}

      {/* Quick Time Modal - shown when completing task without time entries */}
      {pendingCompleteTask && (
        <QuickTimeModal
          isOpen={!!pendingCompleteTask}
          onClose={() => setPendingCompleteTask(null)}
          taskId={pendingCompleteTask.id}
          taskTitle={pendingCompleteTask.title}
          onComplete={handleQuickTimeComplete}
        />
      )}
    </div>
  )
}
