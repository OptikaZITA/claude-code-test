'use client'

import { useState, useMemo, useRef } from 'react'
import { Star, AlertCircle, Plus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { TaskList } from '@/components/tasks/task-list'
import { TaskQuickAdd, TaskQuickAddData, TaskQuickAddHandle } from '@/components/tasks/task-quick-add'
import { TaskQuickAddMobile } from '@/components/tasks/task-quick-add-mobile'
import { TaskDetail } from '@/components/tasks/task-detail'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { CalendarView } from '@/components/calendar/calendar-view'
import { UnifiedFilterBar, CascadingFilterBar } from '@/components/filters'
import { TimeSummaryCard } from '@/components/time-tracking/time-summary-card'
import { NewTasksBanner } from '@/components/indicators'
import { QuickTimeModal } from '@/components/time-tracking/quick-time-modal'
import { useTodayTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useCurrentUser } from '@/lib/hooks/use-user-departments'
import { useTaskHasTime } from '@/lib/hooks/use-task-has-time'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useViewPreference } from '@/lib/hooks/use-view-preference'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { useNewTasks } from '@/lib/hooks/use-new-tasks'
import { useAreas } from '@/lib/hooks/use-areas'
import { useTags } from '@/lib/hooks/use-tags'
import { TaskWithRelations, TaskStatus } from '@/types'
import { isToday, isPast, parseISO, format } from 'date-fns'

export default function TodayPage() {
  const { user } = useCurrentUser()
  // Database-level assignee filter - undefined (default = current user), 'all', 'unassigned', or UUID
  const [dbAssigneeFilter, setDbAssigneeFilter] = useState<string | undefined>(undefined)
  const { tasks, loading, refetch } = useTodayTasks(dbAssigneeFilter)
  const { createTask, updateTask, completeTask, softDelete, reorderTasks } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const { viewMode, setViewMode, isLoaded } = useViewPreference('today')
  const { filters, setFilter, clearFilters, clearFilter, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const inlineFormRef = useRef<TaskQuickAddHandle>(null)
  const { areas } = useAreas()
  const { tags: allTags } = useTags()
  const { checkTaskHasTime } = useTaskHasTime()

  // State for QuickTimeModal
  const [pendingCompleteTask, setPendingCompleteTask] = useState<TaskWithRelations | null>(null)

  // New tasks tracking (zlta bodka + banner)
  const { newTasksCount, acknowledge, acknowledging, isTaskNew, refetch: refetchNewTasks } = useNewTasks()

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

  // Separate overdue tasks from today's tasks based on deadline
  const today = new Date().toISOString().split('T')[0]

  const overdueTasks = tagFilteredTasks.filter(task => {
    if (!task.deadline) return false
    return task.deadline < today
  })

  const todayTasks = tagFilteredTasks.filter(task => {
    if (!task.deadline) return false
    return task.deadline === today
  })

  // Calculate time summary from all today's tasks (including overdue)
  const timeSummary = useMemo(() => {
    const allTasks = [...overdueTasks, ...todayTasks]
    const tasksWithTime = allTasks.filter(t => (t.total_time_seconds || 0) > 0)
    const totalSeconds = allTasks.reduce((sum, t) => sum + (t.total_time_seconds || 0), 0)
    return {
      totalSeconds,
      taskCount: tasksWithTime.length,
    }
  }, [overdueTasks, todayTasks])

  const handleQuickAdd = async (taskData: TaskQuickAddData) => {
    try {
      // Today task: deadline = today
      const todayDate = format(new Date(), 'yyyy-MM-dd')
      await createTask({
        title: taskData.title,
        notes: taskData.notes,
        area_id: taskData.area_id,
        project_id: taskData.project_id,
        assignee_id: taskData.assignee_id,
        deadline: taskData.deadline || todayDate, // Default to today
      })
      refetch()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  // Simple handler for backward compatibility with components that only pass title
  const handleSimpleQuickAdd = async (title: string) => {
    await handleQuickAdd({ title })
  }

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    // If uncompleting a task, just do it directly
    if (!completed) {
      try {
        await completeTask(taskId, completed)
        refetch()
      } catch (error) {
        console.error('Error completing task:', error)
      }
      return
    }

    // Find the task
    const task = tasks.find(t => t.id === taskId)
    if (!task) {
      console.error('Task not found:', taskId)
      return
    }

    // Check if task has any time entries
    const hasTime = await checkTaskHasTime(taskId)

    if (hasTime) {
      // Task has time entries - complete directly
      try {
        await completeTask(taskId, completed)
        refetch()
      } catch (error) {
        console.error('Error completing task:', error)
      }
    } else {
      // No time entries - show QuickTimeModal
      setPendingCompleteTask(task)
    }
  }

  // Handler for completing task after QuickTimeModal
  const handleQuickTimeComplete = async () => {
    if (!pendingCompleteTask) return
    try {
      await completeTask(pendingCompleteTask.id, true)
      refetch()
    } catch (error) {
      console.error('Error completing task:', error)
    }
    setPendingCompleteTask(null)
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
    try {
      await reorderTasks(taskId, newIndex, currentTasks)
      refetch()
    } catch (error) {
      console.error('Error reordering tasks:', error)
    }
  }

  // Kanban handlers (status-based)
  const handleKanbanTaskMove = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updates: Partial<TaskWithRelations> = { status: newStatus }
      if (newStatus === 'done') {
        updates.completed_at = new Date().toISOString()
      }
      await updateTask(taskId, updates)
      refetch()
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
      refetch()
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  const handleCalendarDateClick = (date: Date) => {
    console.log('Date clicked:', date)
  }

  if (loading || !isLoaded) {
    return (
      <div className="h-full">
        <Header title="Dnes" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Dnes"
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-heading font-semibold text-foreground">Dnes</h2>
            <Button
              onClick={() => inlineFormRef.current?.activate()}
              className="bg-primary text-white hover:bg-primary/90 hidden lg:flex"
            >
              <Plus className="h-4 w-4 mr-2" />
              Pridať úlohu
            </Button>
          </div>

          {/* New Tasks Banner */}
          <NewTasksBanner
            count={newTasksCount}
            onAcknowledge={async () => {
              await acknowledge()
              refetchNewTasks()
            }}
            loading={acknowledging}
          />

          {/* Time Summary */}
          {(timeSummary.totalSeconds > 0 || timeSummary.taskCount > 0) && (
            <TimeSummaryCard
              totalSeconds={timeSummary.totalSeconds}
              taskCount={timeSummary.taskCount}
              label="Dnes"
              className="mb-4"
            />
          )}

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
              className="mb-4"
            />
          </div>

          {/* Inline Task Quick Add Form */}
          <TaskQuickAdd
            ref={inlineFormRef}
            variant="inline"
            onAdd={handleQuickAdd}
          />

          {/* Overdue section */}
          {overdueTasks.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-error" />
                <h3 className="text-xs font-semibold text-error uppercase tracking-wide">
                  Po termíne ({overdueTasks.length})
                </h3>
              </div>
              <TaskList
                tasks={overdueTasks}
                onTaskClick={setSelectedTask}
                onTaskComplete={handleTaskComplete}
                onTaskUpdate={handleInlineTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onQuickAdd={handleSimpleQuickAdd}
                onReorder={handleReorder}
                showQuickAdd={false}
                emptyMessage=""
              />
            </div>
          )}

          {/* Today's tasks */}
          {tagFilteredTasks.length === 0 && tasks.length === 0 && dbAssigneeFilter === undefined ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium text-foreground">
                Žiadne úlohy na dnes
              </p>
              <p className="mb-6 text-muted-foreground">
                Pridajte úlohy alebo ich presuňte na dnes
              </p>
            </div>
          ) : tagFilteredTasks.length === 0 && (hasActiveFilters || selectedTag || dbAssigneeFilter !== undefined) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="mb-4 h-12 w-12 text-muted-foreground" />
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
            tasks={todayTasks}
            onTaskClick={setSelectedTask}
            onTaskComplete={handleTaskComplete}
            onTaskUpdate={handleInlineTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onQuickAdd={handleSimpleQuickAdd}
            onReorder={handleReorder}
            showQuickAdd={false}
            emptyMessage={overdueTasks.length > 0 ? '' : ''}
            isTaskNew={(task) => isTaskNew(task.added_to_today_at)}
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
