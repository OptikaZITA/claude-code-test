'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FolderKanban, Plus, Calendar, AlertTriangle, Trash2, X } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ProjectTaskList } from '@/components/tasks/project-task-list'
import { TaskQuickAdd, TaskQuickAddData, TaskQuickAddHandle } from '@/components/tasks/task-quick-add'
import { TaskQuickAddMobile } from '@/components/tasks/task-quick-add-mobile'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { FullCalendarView } from '@/components/calendar/full-calendar-view'
import { format, isPast, formatDistanceToNow, startOfDay } from 'date-fns'
import { sk } from 'date-fns/locale'
import { TaskDetail } from '@/components/tasks/task-detail'
import { UnifiedFilterBar, CascadingFilterBar } from '@/components/filters'
import { QuickTimeModal } from '@/components/time-tracking/quick-time-modal'
import { DeleteProjectModal } from '@/components/projects/delete-project-modal'
import { useProject, useProjectTasks } from '@/lib/hooks/use-projects'
import { useAreas } from '@/lib/hooks/use-areas'
import { useTags } from '@/lib/hooks/use-tags'
import { useTasks } from '@/lib/hooks/use-tasks'
import { useTaskHasTime } from '@/lib/hooks/use-task-has-time'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useViewPreference } from '@/lib/hooks/use-view-preference'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { useCurrentUser } from '@/lib/hooks/use-user-departments'
import { useOrganizationUsers } from '@/lib/hooks/use-organization-users'
import { createClient } from '@/lib/supabase/client'
import { TaskWithRelations, TaskStatus } from '@/types'
import { cn } from '@/lib/utils/cn'

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const { user } = useCurrentUser()
  // Database-level assignee filter - 'all' (default for projects), 'unassigned', or UUID
  // Projects default to 'all' to show Slack-created tasks and team tasks
  const [dbAssigneeFilter, setDbAssigneeFilter] = useState<string | undefined>('all')
  const { project, setProject, loading: projectLoading } = useProject(projectId)
  const supabase = createClient()
  const [editingDeadline, setEditingDeadline] = useState(false)
  const deadlineInputRef = useRef<HTMLInputElement>(null)
  const { tasks, setTasks, loading: tasksLoading, refetch: refetchTasks } = useProjectTasks(projectId, dbAssigneeFilter)
  const { createTask, updateTask, completeTask } = useTasks()
  const { viewMode, setViewMode, isLoaded } = useViewPreference('project')
  const { filters, setFilter, clearFilters, clearFilter, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const inlineFormRef = useRef<TaskQuickAddHandle>(null)
  const { areas } = useAreas()
  const { tags: allTags } = useTags()
  const { users: organizationUsers } = useOrganizationUsers()
  const { checkTaskHasTime } = useTaskHasTime()

  // State for modals
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pendingCompleteTask, setPendingCompleteTask] = useState<TaskWithRelations | null>(null)

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

  const handleDeadlineChange = useCallback(async (newDeadline: string | null) => {
    if (!project) return
    try {
      const { error } = await supabase
        .from('projects')
        .update({ deadline: newDeadline, updated_at: new Date().toISOString() })
        .eq('id', project.id)
      if (error) throw error
      setProject(prev => prev ? { ...prev, deadline: newDeadline } : prev)
    } catch (error) {
      console.error('Error updating project deadline:', error)
    }
    setEditingDeadline(false)
  }, [project, supabase, setProject])

  if (projectLoading || tasksLoading || !isLoaded) {
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
          {/* Title row with button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-heading font-semibold text-foreground">{project.name}</h2>
                {tagFilteredTasks.length > 0 && (() => {
                  const total = tagFilteredTasks.length
                  const completed = tagFilteredTasks.filter(t => t.status === 'done').length
                  const percentage = Math.round((completed / total) * 100)
                  return (
                    <span className="text-sm font-normal text-[var(--text-secondary)]">
                      • {completed}/{total} ({percentage}%)
                    </span>
                  )
                })()}
                <button
                  onClick={() => inlineFormRef.current?.activate()}
                  className="p-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  title="Pridať úlohu"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {editingDeadline ? (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  <input
                    ref={deadlineInputRef}
                    type="date"
                    defaultValue={project.deadline || ''}
                    autoFocus
                    onChange={(e) => handleDeadlineChange(e.target.value || null)}
                    onBlur={() => setEditingDeadline(false)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingDeadline(false) }}
                    className="text-sm border border-border rounded px-2 py-0.5 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  />
                  {project.deadline && (
                    <button
                      onMouseDown={(e) => { e.preventDefault(); handleDeadlineChange(null) }}
                      className="p-0.5 rounded hover:bg-[var(--color-error)]/10 text-[var(--text-secondary)] hover:text-[var(--color-error)] transition-colors"
                      title="Odstrániť deadline"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ) : project.deadline ? (() => {
                const deadlineDate = startOfDay(new Date(project.deadline + 'T00:00:00'))
                const isOverdue = isPast(deadlineDate) && tagFilteredTasks.some(t => t.status !== 'done')
                return (
                  <button
                    onClick={() => setEditingDeadline(true)}
                    className={cn(
                      "flex items-center gap-1 text-sm hover:underline cursor-pointer",
                      isOverdue ? "text-[var(--color-error)]" : "text-[var(--text-secondary)]"
                    )}
                    title="Klikni pre zmenu deadline"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Deadline: {format(deadlineDate, 'd.M.yyyy')}
                    {isOverdue && (
                      <span className="flex items-center gap-1 text-[var(--color-error)]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        ({formatDistanceToNow(deadlineDate, { addSuffix: true, locale: sk })})
                      </span>
                    )}
                  </button>
                )
              })() : (
                <button
                  onClick={() => setEditingDeadline(true)}
                  className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--color-primary)] hover:underline cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Pridať deadline
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                title="Zmazať projekt"
              >
                <Trash2 className="h-4 w-4" />
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
            context={{ defaultWhenType: 'anytime', defaultProjectId: projectId }}
          />

          {tagFilteredTasks.length === 0 && tasks.length === 0 && dbAssigneeFilter === 'all' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
              <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">Projekt je prázdny</p>
              <p className="mb-6 text-[var(--text-secondary)]">
                Pridajte prvú úlohu alebo sekciu
              </p>
            </div>
          ) : tagFilteredTasks.length === 0 && (hasActiveFilters || selectedTag || dbAssigneeFilter !== 'all') ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
              <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">Žiadne úlohy nezodpovedajú filtrom</p>
              <button
                onClick={() => { clearFilters(); setSelectedTag(null); setDbAssigneeFilter('all'); }}
                className="text-[var(--color-primary)] hover:underline"
              >
                Zrušiť filtre
              </button>
            </div>
          ) : null}

          <ProjectTaskList
            tasks={tagFilteredTasks}
            onTaskClick={setSelectedTask}
            onTaskComplete={handleTaskComplete}
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

      {/* Delete Project Modal */}
      {project && (
        <DeleteProjectModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => {
            const areaId = project.area_id
            router.push(areaId ? `/areas/${areaId}` : '/today')
          }}
          project={{ id: project.id, name: project.name }}
        />
      )}
    </div>
  )
}
