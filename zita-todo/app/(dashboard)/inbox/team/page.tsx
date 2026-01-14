'use client'

import { useState, useMemo, useRef } from 'react'
import { Plus, Users } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { TaskList } from '@/components/tasks/task-list'
import { TaskQuickAdd, TaskQuickAddData, TaskQuickAddHandle } from '@/components/tasks/task-quick-add'
import { TaskQuickAddMobile } from '@/components/tasks/task-quick-add-mobile'
import { ExportMenu } from '@/components/export/export-menu'
import { ErrorDisplay } from '@/components/layout/error-display'
import { UnifiedFilterBar, CascadingFilterBar } from '@/components/filters'
import { QuickTimeModal } from '@/components/time-tracking/quick-time-modal'
import { useInboxTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useTaskHasTime } from '@/lib/hooks/use-task-has-time'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { useAreas } from '@/lib/hooks/use-areas'
import { useTags } from '@/lib/hooks/use-tags'
import { TaskWithRelations } from '@/types'

export default function TeamInboxPage() {
  const { tasks, loading, error, refetch } = useInboxTasks('team')
  const { createTask, updateTask, completeTask, softDelete, reorderTasks } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const { filters, setFilter, clearFilters, clearFilter, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const inlineFormRef = useRef<TaskQuickAddHandle>(null)
  const { areas } = useAreas()
  const { tags: allTags } = useTags()
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
      await createTask({
        title: taskData.title,
        notes: taskData.notes,
        when_type: taskData.when_type || 'inbox',
        when_date: taskData.when_date,
        area_id: taskData.area_id,
        project_id: taskData.project_id,
        assignee_id: taskData.assignee_id,
        deadline: taskData.deadline,
        inbox_type: 'team',
        is_inbox: true,
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

  const handleTaskUpdate = async (taskId: string, updates: Partial<TaskWithRelations>) => {
    try {
      await updateTask(taskId, updates)
      refetch()
    } catch (error: any) {
      console.error('Error updating task:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        taskId,
        updates,
      })
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

  if (loading) {
    return (
      <div className="h-full">
        <Header title="Timovy Inbox" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full">
        <Header title="Timovy Inbox" />
        <div className="p-6">
          <ErrorDisplay error={error} onRetry={refetch} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Header title="Timovy Inbox">
        <ExportMenu tasks={filteredTasks} title="Timovy Inbox" filename="timovy-inbox" />
      </Header>

      <div className="flex-1 overflow-auto p-6">
        {/* Title row with button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-heading font-semibold text-foreground">Timovy Inbox</h2>
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
          context={{ defaultWhenType: 'inbox' }}
        />

        {tagFilteredTasks.length === 0 && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium text-foreground">Timovy inbox je prazdny</p>
            <p className="mb-6 text-muted-foreground">
              Ulohy pridane sem uvidia vsetci clenovia timu
            </p>
          </div>
        ) : tagFilteredTasks.length === 0 && (hasActiveFilters || selectedTag) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium text-foreground">Ziadne ulohy nezodpovedaju filtrom</p>
            <button
              onClick={() => { clearFilters(); setSelectedTag(null); }}
              className="text-primary hover:underline"
            >
              Zrusit filtre
            </button>
          </div>
        ) : null}

        <TaskList
          tasks={tagFilteredTasks}
          onTaskClick={setSelectedTask}
          onTaskComplete={handleTaskComplete}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onQuickAdd={handleSimpleQuickAdd}
          onReorder={handleReorder}
          showQuickAdd={false}
          emptyMessage=""
        />

        {/* Mobile FAB + Bottom Sheet */}
        <TaskQuickAddMobile
          onAdd={handleQuickAdd}
          context={{ defaultWhenType: 'inbox' }}
        />
      </div>

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
