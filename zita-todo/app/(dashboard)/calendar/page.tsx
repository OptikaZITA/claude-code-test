'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { TaskWithRelations } from '@/types'
import { FullCalendarView } from '@/components/calendar/full-calendar-view'
import { TaskDetail } from '@/components/tasks/task-detail'
import { Header } from '@/components/layout/header'
import { ExportMenu } from '@/components/export/export-menu'
import { UnifiedFilterBar, CascadingFilterBar } from '@/components/filters'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { useAreas } from '@/lib/hooks/use-areas'
import { useTags } from '@/lib/hooks/use-tags'
import { useCurrentUser } from '@/lib/hooks/use-user-departments'

export default function CalendarPage() {
  const { user } = useCurrentUser()
  // Database-level assignee filter - undefined (default = current user), 'all', 'unassigned', or UUID
  const [dbAssigneeFilter, setDbAssigneeFilter] = useState<string | undefined>(undefined)
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const supabase = createClient()

  // Filters
  const { filters, setFilter, clearFilters, clearFilter, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
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

  useEffect(() => {
    fetchTasks()
  }, [currentMonth, dbAssigneeFilter, user?.id])

  const fetchTasks = async () => {
    setLoading(true)

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      setLoading(false)
      return
    }

    // Default = prihlásený používateľ
    const effectiveFilter = dbAssigneeFilter || currentUser.id

    // Fetch tasks with deadlines in the visible range (current month +/- 1 month)
    const rangeStart = format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd')
    const rangeEnd = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd')

    let query = supabase
      .from('tasks')
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
        project:projects(id, name, color),
        area:areas(id, name, color),
        tags:task_tags(tag:tags(*))
      `)
      .gte('deadline', rangeStart)
      .lte('deadline', rangeEnd)
      .is('archived_at', null)
      .is('deleted_at', null)

    // Aplikuj filter podľa assignee_id
    if (effectiveFilter === 'all') {
      // Všetky úlohy v organizácii - žiadny assignee filter, RLS zabezpečí organizáciu
    } else if (effectiveFilter === 'unassigned') {
      // Nepriradené úlohy
      query = query.is('assignee_id', null)
    } else {
      // Konkrétny používateľ (UUID) - default je prihlásený user
      query = query.eq('assignee_id', effectiveFilter)
    }

    const { data, error } = await query.order('deadline', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else if (data) {
      // Transform tags from nested structure
      const transformedTasks = data.map((task: any) => ({
        ...task,
        tags: task.tags?.map((t: any) => t.tag) || [],
      }))
      setTasks(transformedTasks as TaskWithRelations[])
    }

    setLoading(false)
  }

  const handleTaskClick = (task: TaskWithRelations) => {
    setSelectedTask(task)
  }

  const handleDateChange = async (taskId: string, newDate: Date) => {
    // Update task deadline
    const { error } = await supabase
      .from('tasks')
      .update({ deadline: format(newDate, 'yyyy-MM-dd') })
      .eq('id', taskId)

    if (error) {
      console.error('Error updating task:', error)
    } else {
      // Refresh tasks
      fetchTasks()
    }
  }

  const handleTaskUpdate = async (updates: Partial<TaskWithRelations>) => {
    if (!selectedTask) return

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', selectedTask.id)

    if (error) {
      console.error('Error updating task:', error)
    } else {
      fetchTasks()
      setSelectedTask(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Kalendár" />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Header title="Kalendár">
        <ExportMenu tasks={tagFilteredTasks} title="Kalendár" filename="kalendar" />
      </Header>

      {/* Filters */}
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

      <div className="flex-1 overflow-hidden">
        <FullCalendarView
          tasks={tagFilteredTasks}
          onTaskClick={handleTaskClick}
          onDateChange={handleDateChange}
        />
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
