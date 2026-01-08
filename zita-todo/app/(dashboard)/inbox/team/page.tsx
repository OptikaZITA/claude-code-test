'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { TaskList } from '@/components/tasks/task-list'
import { TaskQuickAdd } from '@/components/tasks/task-quick-add'
import { ExportMenu } from '@/components/export/export-menu'
import { ErrorDisplay } from '@/components/layout/error-display'
import { TaskFiltersBar, ColleagueFilterBar, filterTasksByColleague } from '@/components/filters'
import { TagFilterBar } from '@/components/tasks/tag-filter-bar'
import { useInboxTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { TaskWithRelations } from '@/types'
import { Users, Filter } from 'lucide-react'

export default function TeamInboxPage() {
  const { tasks, loading, error, refetch } = useInboxTasks('team')
  const { createTask, updateTask, completeTask, softDelete, reorderTasks } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const { filters, setFilter, clearFilters, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedColleague, setSelectedColleague] = useState<string | null>(null)

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

  // Apply colleague filter (Strážci vesmíru)
  const colleagueFilteredTasks = useMemo(() => {
    return filterTasksByColleague(tagFilteredTasks, selectedColleague)
  }, [tagFilteredTasks, selectedColleague])

  // Listen for task:moved events to refresh the list
  useTaskMoved(refetch)

  const handleQuickAdd = async (title: string) => {
    try {
      await createTask({
        title,
        inbox_type: 'team',
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
        <Header title="Tímový Inbox" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full">
        <Header title="Tímový Inbox" />
        <div className="p-6">
          <ErrorDisplay error={error} onRetry={refetch} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Header title="Tímový Inbox">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-[var(--radius-sm)] transition-colors ${
            hasActiveFilters
              ? 'bg-primary text-white'
              : 'hover:bg-accent/50'
          }`}
          title="Filtre"
        >
          <Filter className="h-4 w-4" />
        </button>
        <ExportMenu tasks={filteredTasks} title="Tímový Inbox" filename="timovy-inbox" />
      </Header>

      {/* Filter Bar */}
      {showFilters && (
        <div className="px-6 py-3 border-b border-[var(--border)] bg-muted">
          <TaskFiltersBar
            filters={filters}
            onFilterChange={setFilter}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        {/* Title row with button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-heading font-semibold text-foreground">Tímový Inbox</h2>
          <TaskQuickAdd onAdd={handleQuickAdd} />
        </div>

        {/* Tag Filter Bar */}
        <TagFilterBar
          tasks={filteredTasks}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />

        {/* Colleague Filter Bar (Strážci vesmíru) */}
        <ColleagueFilterBar
          tasks={tagFilteredTasks}
          selectedColleague={selectedColleague}
          onSelectColleague={setSelectedColleague}
        />

        {colleagueFilteredTasks.length === 0 && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium text-foreground">Tímový inbox je prázdny</p>
            <p className="mb-6 text-muted-foreground">
              Úlohy pridané sem uvidia všetci členovia tímu
            </p>
          </div>
        ) : colleagueFilteredTasks.length === 0 && (hasActiveFilters || selectedTag || selectedColleague) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Filter className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium text-foreground">Žiadne úlohy nezodpovedajú filtrom</p>
            <button
              onClick={() => { clearFilters(); setSelectedTag(null); setSelectedColleague(null); }}
              className="text-primary hover:underline"
            >
              Zrušiť filtre
            </button>
          </div>
        ) : null}

        <TaskList
          tasks={colleagueFilteredTasks}
          onTaskClick={setSelectedTask}
          onTaskComplete={handleTaskComplete}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onQuickAdd={handleQuickAdd}
          onReorder={handleReorder}
          showQuickAdd={false}
          emptyMessage=""
        />
      </div>
    </div>
  )
}
