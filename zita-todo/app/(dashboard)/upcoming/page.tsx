'use client'

import { useState, useMemo, useRef } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { TaskList } from '@/components/tasks/task-list'
import { TaskQuickAdd, TaskQuickAddData, TaskQuickAddHandle } from '@/components/tasks/task-quick-add'
import { TaskQuickAddMobile } from '@/components/tasks/task-quick-add-mobile'
import { TaskDetail } from '@/components/tasks/task-detail'
import { MiniCalendar } from '@/components/calendar/mini-calendar'
import { UnifiedFilterBar, CascadingFilterBar } from '@/components/filters'
import { useUpcomingTasks, useTasks } from '@/lib/hooks/use-tasks'
import { useCurrentUser } from '@/lib/hooks/use-user-departments'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { useAreas } from '@/lib/hooks/use-areas'
import { useTags } from '@/lib/hooks/use-tags'
import { useOrganizationUsers } from '@/lib/hooks/use-organization-users'
import { TaskWithRelations } from '@/types'
import { format, parseISO, startOfDay, addDays, isSameDay } from 'date-fns'
import { sk } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'

export default function UpcomingPage() {
  const { user } = useCurrentUser()
  // Database-level assignee filter - undefined (default = current user), 'all', 'unassigned', or UUID
  const [dbAssigneeFilter, setDbAssigneeFilter] = useState<string | undefined>(undefined)
  const { tasks, setTasks, loading, refetch } = useUpcomingTasks(dbAssigneeFilter)
  const { createTask, updateTask, completeTask, softDelete, reorderTasks } = useTasks()
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const dateRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const { filters, setFilter, clearFilters, clearFilter, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const inlineFormRef = useRef<TaskQuickAddHandle>(null)
  const { areas } = useAreas()
  const { tags: allTags } = useTags()
  const { users: organizationUsers } = useOrganizationUsers()

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
  useTaskMoved(refetch)

  // Group tasks by deadline date
  const groupedTasks = useMemo(() => {
    const groups: Map<string, TaskWithRelations[]> = new Map()

    tagFilteredTasks.forEach(task => {
      if (task.deadline) {
        const dateKey = startOfDay(parseISO(task.deadline)).toISOString()
        if (!groups.has(dateKey)) {
          groups.set(dateKey, [])
        }
        groups.get(dateKey)!.push(task)
      }
    })

    // Sort by date
    return Array.from(groups.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
  }, [tagFilteredTasks])

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
      // Use deadline from task data, selectedDate, or default to tomorrow
      let deadline = taskData.deadline
      if (!deadline) {
        if (selectedDate) {
          deadline = format(selectedDate, 'yyyy-MM-dd')
        } else {
          deadline = format(addDays(new Date(), 1), 'yyyy-MM-dd') // Default to tomorrow
        }
      }

      await createTask({
        title: taskData.title,
        notes: taskData.notes,
        area_id: taskData.area_id,
        project_id: taskData.project_id,
        assignee_id: taskData.assignee_id,
        deadline: deadline,
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
    // Find the task for rollback
    const task = tasks.find(t => t.id === taskId)

    // OPTIMISTIC UPDATE: Update local state immediately
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? {
            ...t,
            status: completed ? 'done' as const : 'todo' as const,
            completed_at: completed ? new Date().toISOString() : null,
            when_type: completed ? null : 'inbox',
          }
        : t
    ))

    try {
      await completeTask(taskId, completed)
      // No refetch() - optimistic update is already done
    } catch (error) {
      console.error('Error completing task:', error)
      // Rollback on error
      if (task) {
        setTasks(prev => prev.map(t => t.id === taskId ? task : t))
      }
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
      <Header title="Nadchadzajuce" />

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
                tasks={tagFilteredTasks}
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
                    <span className="font-medium text-foreground">{tagFilteredTasks.length}</span>
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
            ) : groupedTasks.length === 0 && (hasActiveFilters || selectedTag) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-lg font-medium text-foreground">Žiadne úlohy nezodpovedajú filtrom</p>
                <button
                  onClick={() => { clearFilters(); setSelectedTag(null); }}
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
