'use client'

import { useState, useMemo } from 'react'
import { Clock, Filter } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { TaskList } from '@/components/tasks/task-list'
import { TaskQuickAdd } from '@/components/tasks/task-quick-add'
import { TaskDetail } from '@/components/tasks/task-detail'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { CalendarView } from '@/components/calendar/calendar-view'
import { TaskFiltersBar, ColleagueFilterBar, filterTasksByColleague } from '@/components/filters'
import { TagFilterBar } from '@/components/tasks/tag-filter-bar'
import { useAnytimeTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useViewPreference } from '@/lib/hooks/use-view-preference'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { TaskWithRelations, TaskStatus } from '@/types'

export default function AnytimePage() {
  const { tasks, loading, refetch } = useAnytimeTasks()
  const { createTask, updateTask, completeTask, softDelete, reorderTasks } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const { viewMode, setViewMode, isLoaded } = useViewPreference('anytime')
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
        when_type: 'anytime',
        is_inbox: false,
        inbox_type: 'personal',
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
        updates.when_type = null
      }
      await updateTask(taskId, updates)
      refetch()
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  const handleKanbanQuickAdd = async (title: string, status: TaskStatus) => {
    try {
      await createTask({
        title,
        status,
        when_type: 'anytime',
        is_inbox: false,
        inbox_type: 'personal',
      })
      refetch()
    } catch (error) {
      console.error('Error creating task:', error)
    }
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
        <Header title="Kedykoľvek" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Kedykoľvek"
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

      {viewMode === 'calendar' ? (
        <div className="flex-1 overflow-hidden">
          <CalendarView
            tasks={colleagueFilteredTasks}
            onTaskClick={setSelectedTask}
            onDateClick={handleCalendarDateClick}
            onTaskMove={handleCalendarTaskMove}
          />
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            tasks={colleagueFilteredTasks}
            onTaskMove={handleKanbanTaskMove}
            onTaskClick={setSelectedTask}
            onQuickAdd={handleKanbanQuickAdd}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          {/* Title row with button */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-heading font-semibold text-foreground">Kedykoľvek</h2>
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
              <Clock className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
              <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">
                Žiadne úlohy
              </p>
              <p className="mb-6 text-[var(--text-secondary)]">
                Úlohy ktoré môžete urobiť kedykoľvek
              </p>
            </div>
          ) : colleagueFilteredTasks.length === 0 && (hasActiveFilters || selectedTag || selectedColleague) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="mb-4 h-12 w-12 text-[var(--text-secondary)]" />
              <p className="mb-2 text-lg font-medium text-[var(--text-primary)]">Žiadne úlohy nezodpovedajú filtrom</p>
              <button
                onClick={() => { clearFilters(); setSelectedTag(null); setSelectedColleague(null); }}
                className="text-[var(--color-primary)] hover:underline"
              >
                Zrušiť filtre
              </button>
            </div>
          ) : null}

          <TaskList
            tasks={colleagueFilteredTasks}
            onTaskClick={setSelectedTask}
            onTaskComplete={handleTaskComplete}
            onTaskUpdate={handleInlineTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onQuickAdd={handleQuickAdd}
            onReorder={handleReorder}
            showQuickAdd={false}
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
