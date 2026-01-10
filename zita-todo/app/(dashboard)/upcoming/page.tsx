'use client'

import { useState, useMemo, useRef } from 'react'
import { CalendarDays, Filter, Plus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { TaskList } from '@/components/tasks/task-list'
import { TaskQuickAdd, TaskQuickAddData, TaskQuickAddHandle } from '@/components/tasks/task-quick-add'
import { TaskQuickAddMobile } from '@/components/tasks/task-quick-add-mobile'
import { TaskDetail } from '@/components/tasks/task-detail'
import { MiniCalendar } from '@/components/calendar/mini-calendar'
import { TaskFiltersBar, ColleagueFilterBar, filterTasksByColleague } from '@/components/filters'
import { TagFilterBar } from '@/components/tasks/tag-filter-bar'
import { useUpcomingTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { TaskWithRelations } from '@/types'
import { format, parseISO, startOfDay, addDays, isSameDay } from 'date-fns'
import { sk } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'

export default function UpcomingPage() {
  const { tasks, loading, refetch } = useUpcomingTasks()
  const { createTask, updateTask, completeTask, softDelete, reorderTasks } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [showFilters, setShowFilters] = useState(false)
  const { filters, setFilter, clearFilters, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedColleague, setSelectedColleague] = useState<string | null>(null)
  const inlineFormRef = useRef<TaskQuickAddHandle>(null)

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

  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const groups: Map<string, TaskWithRelations[]> = new Map()

    colleagueFilteredTasks.forEach(task => {
      if (task.when_date) {
        const dateKey = startOfDay(parseISO(task.when_date)).toISOString()
        if (!groups.has(dateKey)) {
          groups.set(dateKey, [])
        }
        groups.get(dateKey)!.push(task)
      }
    })

    // Sort by date
    return Array.from(groups.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
  }, [colleagueFilteredTasks])

  // Handle date selection from mini calendar
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)

    // Find and scroll to the date section
    const dateKey = startOfDay(date).toISOString()
    const element = dateRefs.current.get(dateKey)

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Add highlight effect
      element.classList.add('ring-2', 'ring-primary', 'rounded-xl')
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary', 'rounded-xl')
      }, 2000)
    }
  }

  const handleQuickAdd = async (taskData: TaskQuickAddData) => {
    try {
      // If when_date is provided use it, otherwise use selectedDate or tomorrow
      let whenDate = taskData.when_date
      if (!whenDate) {
        if (selectedDate) {
          whenDate = format(selectedDate, 'yyyy-MM-dd')
        } else {
          whenDate = format(addDays(new Date(), 1), 'yyyy-MM-dd') // Default to tomorrow
        }
      }

      await createTask({
        title: taskData.title,
        notes: taskData.notes,
        when_type: taskData.when_type || 'scheduled',
        when_date: whenDate,
        area_id: taskData.area_id,
        project_id: taskData.project_id,
        assignee_id: taskData.assignee_id,
        deadline: taskData.deadline,
        is_inbox: false,
        inbox_type: 'personal',
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

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr)
    const today = startOfDay(new Date())
    const tomorrow = addDays(today, 1)

    if (isSameDay(date, tomorrow)) {
      return 'Zajtra'
    }

    return format(date, "EEEE, d. MMMM", { locale: sk })
  }

  if (loading) {
    return (
      <div className="h-full">
        <Header title="Nadchadzajuce" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Header title="Nadchadzajuce">
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
          <h2 className="text-2xl font-heading font-semibold text-foreground">Nadchádzajúce</h2>
          <Button
            onClick={() => inlineFormRef.current?.activate()}
            className="bg-primary text-white hover:bg-primary/90 hidden lg:flex"
          >
            <Plus className="h-4 w-4 mr-2" />
            Pridať úlohu
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mini Calendar - Sidebar on desktop, top on mobile */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <MiniCalendar
                tasks={colleagueFilteredTasks}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />

              {/* Quick stats */}
              <div className="mt-4 rounded-[var(--radius-lg)] bg-card p-4 shadow-sm border border-[var(--border)]">
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Prehlad
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Celkom úloh</span>
                    <span className="font-medium text-foreground">{colleagueFilteredTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Dni s úlohami</span>
                    <span className="font-medium text-foreground">{groupedTasks.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks list */}
          <div className="flex-1 min-w-0">
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

            {/* Inline Task Quick Add Form */}
            <TaskQuickAdd
              ref={inlineFormRef}
              variant="inline"
              onAdd={handleQuickAdd}
              context={{ defaultWhenType: 'scheduled' }}
            />

            {/* Selected date indicator */}
            {selectedDate && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-primary/10 border border-primary/20">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary capitalize">
                  {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: sk })}
                </span>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  Zrušiť výber
                </button>
              </div>
            )}

            {/* Tasks grouped by date */}
            {groupedTasks.length === 0 && tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-lg font-medium text-foreground">
                  Žiadne naplánované úlohy
                </p>
                <p className="text-muted-foreground">
                  Naplánujte úlohy na konkrétny dátum
                </p>
              </div>
            ) : groupedTasks.length === 0 && (hasActiveFilters || selectedTag || selectedColleague) ? (
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
            ) : (
              <div className="space-y-6">
                {groupedTasks.map(([dateKey, dateTasks]) => {
                  const isSelectedDateGroup = selectedDate && isSameDay(parseISO(dateKey), selectedDate)

                  return (
                    <div
                      key={dateKey}
                      ref={(el) => {
                        if (el) dateRefs.current.set(dateKey, el)
                      }}
                      className={cn(
                        'transition-all duration-300',
                        isSelectedDateGroup && 'bg-primary/5 -mx-4 px-4 py-2 rounded-[var(--radius-lg)]'
                      )}
                    >
                      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide capitalize">
                        {formatDateHeader(dateKey)}
                      </h3>
                      <TaskList
                        tasks={dateTasks}
                        onTaskClick={setSelectedTask}
                        onTaskComplete={handleTaskComplete}
                        onTaskUpdate={handleInlineTaskUpdate}
                        onTaskDelete={handleTaskDelete}
                        onQuickAdd={handleSimpleQuickAdd}
                        onReorder={handleReorder}
                        showQuickAdd={!!isSelectedDateGroup}
                        emptyMessage=""
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Mobile FAB + Bottom Sheet */}
            <TaskQuickAddMobile
              onAdd={handleQuickAdd}
              context={{ defaultWhenType: 'scheduled' }}
            />
          </div>
        </div>
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
