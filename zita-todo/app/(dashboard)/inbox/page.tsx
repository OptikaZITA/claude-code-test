'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { Plus, Inbox } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { TaskList } from '@/components/tasks/task-list'
import { TaskQuickAdd, TaskQuickAddData, TaskQuickAddHandle } from '@/components/tasks/task-quick-add'
import { TaskQuickAddMobile } from '@/components/tasks/task-quick-add-mobile'
import { TaskDetail } from '@/components/tasks/task-detail'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { FullCalendarView } from '@/components/calendar/full-calendar-view'
import { format } from 'date-fns'
import { ExportMenu } from '@/components/export/export-menu'
import { ErrorDisplay } from '@/components/layout/error-display'
import { UnifiedFilterBar, CascadingFilterBar } from '@/components/filters'
import { QuickTimeModal } from '@/components/time-tracking/quick-time-modal'
import { useInboxTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useTaskHasTime } from '@/lib/hooks/use-task-has-time'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useViewPreference } from '@/lib/hooks/use-view-preference'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { useAreas } from '@/lib/hooks/use-areas'
import { useTags } from '@/lib/hooks/use-tags'
import { useCurrentUser } from '@/lib/hooks/use-user-departments'
import { useOrganizationUsers } from '@/lib/hooks/use-organization-users'
import { createClient } from '@/lib/supabase/client'
import { arrayMove } from '@dnd-kit/sortable'
import { TaskWithRelations, TaskStatus } from '@/types'

export default function InboxPage() {
  const { user } = useCurrentUser()
  const supabase = createClient()
  // Database-level assignee filter - undefined (default = current user), 'all', 'unassigned', or UUID
  const [dbAssigneeFilter, setDbAssigneeFilter] = useState<string | undefined>(undefined)
  const { tasks, setTasks, loading, error, refetch } = useInboxTasks(dbAssigneeFilter)
  const { createTask, updateTask, completeTask, softDelete, reorderTasks } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const { viewMode, setViewMode, isLoaded } = useViewPreference('inbox')
  const { filters, setFilter, clearFilters, clearFilter, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const inlineFormRef = useRef<TaskQuickAddHandle>(null)
  const { areas } = useAreas()
  const { tags: allTags } = useTags()
  const { users: organizationUsers } = useOrganizationUsers()
  const { checkTaskHasTime } = useTaskHasTime()

  // State for QuickTimeModal
  const [pendingCompleteTask, setPendingCompleteTask] = useState<TaskWithRelations | null>(null)

  // Apply filters to tasks (includes sorting)
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
  useTaskMoved(refetch)

  const handleQuickAdd = async (taskData: TaskQuickAddData) => {
    try {
      // Inbox task: no project, no deadline (will be auto-assigned to current user)
      await createTask({
        title: taskData.title,
        notes: taskData.notes,
        area_id: taskData.area_id,
        project_id: null, // Inbox = no project
        assignee_id: taskData.assignee_id,
        deadline: null, // Inbox = no deadline
      })
      refetch()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleSimpleQuickAdd = async (title: string) => {
    await handleQuickAdd({ title })
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
        // No refetch() - optimistic update is already done
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
        // No refetch() - optimistic update is already done
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
      // No refetch() - optimistic update is already done
    } catch (error) {
      console.error('Error completing task:', error)
      // Rollback on error
      setTasks(prev => prev.map(t => t.id === taskId ? task : t))
    }
    setPendingCompleteTask(null)
  }

  const handleInlineTaskUpdate = async (taskId: string, updates: Partial<TaskWithRelations>) => {
    try {
      await updateTask(taskId, updates)
      refetch()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await softDelete(taskId)
      refetch()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleReorder = async (taskId: string, newIndex: number, currentTasks: TaskWithRelations[]) => {
    // currentTasks môže byť filtrovaný subset, potrebujeme pracovať s plným zoznamom
    const oldIndex = currentTasks.findIndex(t => t.id === taskId)
    if (oldIndex === -1 || oldIndex === newIndex) return

    // Vytvor nové poradie pre filtrované úlohy
    const reorderedFiltered = [...currentTasks]
    const [moved] = reorderedFiltered.splice(oldIndex, 1)
    reorderedFiltered.splice(newIndex, 0, moved)

    // OPTIMISTIC UPDATE: Aktualizuj sort_order v plnom zozname úloh
    const newSortOrders = new Map(reorderedFiltered.map((t, i) => [t.id, i]))
    const updatedTasks = tasks.map(t => ({
      ...t,
      sort_order: newSortOrders.has(t.id) ? newSortOrders.get(t.id)! : t.sort_order
    })).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    setTasks(updatedTasks)

    try {
      await reorderTasks(taskId, newIndex, currentTasks)
      // Nie je potrebný refetch - optimistic update je už urobený
    } catch (error) {
      console.error('Error reordering tasks:', error)
      // ROLLBACK: Vráť pôvodné poradie pri chybe
      refetch()
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

  // Kanban handlers (status-based)
  const handleKanbanTaskMove = async (taskId: string, newStatus: TaskStatus) => {
    console.log('[handleKanbanTaskMove] START:', { taskId, newStatus })

    // Find the task for optimistic update
    const task = tasks.find(t => t.id === taskId)
    if (!task) {
      console.error('[handleKanbanTaskMove] Task not found:', taskId)
      return
    }

    // Prepare updates
    const updates: Partial<TaskWithRelations> = { status: newStatus }
    if (newStatus === 'done') {
      updates.completed_at = new Date().toISOString()
      updates.when_type = null
    } else {
      updates.completed_at = null
    }

    // OPTIMISTIC UPDATE: Update local state immediately
    console.log('[handleKanbanTaskMove] Applying optimistic update:', updates)
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    ))

    try {
      console.log('[handleKanbanTaskMove] Calling updateTask...')
      await updateTask(taskId, updates)
      console.log('[handleKanbanTaskMove] updateTask SUCCESS')
      // No refetch() needed - optimistic update is already done
    } catch (error) {
      console.error('[handleKanbanTaskMove] ERROR:', error)
      // ROLLBACK: Revert to original state on error
      setTasks(prev => prev.map(t => t.id === taskId ? task : t))
    }
  }

  const handleKanbanQuickAdd = async (title: string, status: TaskStatus) => {
    await handleQuickAdd({ title })
  }

  // Task reorder handler for Kanban drag & drop within same column
  const handleTaskReorder = useCallback(async (taskId: string, newIndex: number, currentTasks: TaskWithRelations[]) => {
    const oldIndex = currentTasks.findIndex(t => t.id === taskId)
    if (oldIndex === -1 || oldIndex === newIndex) return

    const reordered = arrayMove(currentTasks, oldIndex, newIndex)

    // Create a map of taskId -> new sort_order
    const sortOrderMap = new Map<string, number>()
    reordered.forEach((task, index) => {
      sortOrderMap.set(task.id, index)
    })

    // OPTIMISTIC UPDATE: Update local state immediately
    setTasks(prev => prev.map(task => {
      const newSortOrder = sortOrderMap.get(task.id)
      if (newSortOrder !== undefined) {
        return { ...task, sort_order: newSortOrder }
      }
      return task
    }))

    // Save to DB in background
    try {
      await Promise.all(
        reordered.map((task, index) =>
          supabase
            .from('tasks')
            .update({ sort_order: index })
            .eq('id', task.id)
        )
      )
      // No refetch() - optimistic update is already done
    } catch (error) {
      console.error('Error reordering tasks:', error)
      refetch() // Rollback: refresh to get correct order on error
    }
  }, [supabase, setTasks, refetch])

  // Calendar handlers
  const handleCalendarDateChange = async (taskId: string, newDate: Date) => {
    try {
      await updateTask(taskId, {
        deadline: format(newDate, 'yyyy-MM-dd'),
      })
      refetch()
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  if (loading || !isLoaded) {
    return (
      <div className="h-full">
        <Header title="Inbox" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full">
        <Header title="Inbox" />
        <div className="p-6">
          <ErrorDisplay error={error} onRetry={refetch} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Inbox"
        showViewToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      >
        <ExportMenu tasks={filteredTasks} title="Inbox" filename="inbox" />
      </Header>

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
            onTaskReorder={handleTaskReorder}
            onTaskDelete={handleTaskDelete}
            onTaskUpdate={(taskId, updates) => updateTask(taskId, updates)}
            onTaskClick={setSelectedTask}
            onQuickAdd={handleKanbanQuickAdd}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          {/* Title row with button */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-heading font-semibold text-foreground">Inbox</h2>
            <Button
              onClick={() => inlineFormRef.current?.activate()}
              className="bg-primary text-white hover:bg-primary/90 hidden lg:flex"
            >
              <Plus className="h-4 w-4 mr-2" />
              Pridať úlohu
            </Button>
          </div>

          {/* Inline Task Quick Add Form */}
          <TaskQuickAdd
            ref={inlineFormRef}
            variant="inline"
            onAdd={handleQuickAdd}
          />

          {tagFilteredTasks.length === 0 && tasks.length === 0 && dbAssigneeFilter === undefined ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium text-foreground">Váš inbox je prázdny</p>
              <p className="mb-6 text-muted-foreground">
                Pridajte úlohy pomocou formulára vyššie
              </p>
            </div>
          ) : tagFilteredTasks.length === 0 && (hasActiveFilters || selectedTag || dbAssigneeFilter !== undefined) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium text-foreground">Žiadne úlohy nezodpovedajú filtrom</p>
              <button
                onClick={() => { clearFilters(); setSelectedTag(null); setDbAssigneeFilter(undefined); }}
                className="text-primary hover:underline"
              >
                Zrušiť filtre
              </button>
            </div>
          ) : null}

          <TaskList
            tasks={tagFilteredTasks}
            onTaskClick={setSelectedTask}
            onTaskComplete={handleTaskComplete}
            onTaskUpdate={handleInlineTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onQuickAdd={handleSimpleQuickAdd}
            onReorder={handleReorder}
            showQuickAdd={false}
            emptyMessage=""
          />

          {/* Mobile FAB + Bottom Sheet */}
          <TaskQuickAddMobile
            onAdd={handleQuickAdd}
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
    </div>
  )
}
