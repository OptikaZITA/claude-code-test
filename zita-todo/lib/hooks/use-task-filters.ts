'use client'

import { useState, useCallback, useMemo } from 'react'
import { TaskFilters, DEFAULT_TASK_FILTERS, TaskStatus, TaskPriority, DueDateFilter, WhenType, TaskWithRelations, SortOption } from '@/types'
import { isToday, isThisWeek, isThisMonth, isPast, parseISO, compareAsc, compareDesc } from 'date-fns'

interface UseTaskFiltersResult {
  filters: TaskFilters
  setFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void
  setFilters: (filters: Partial<TaskFilters>) => void
  clearFilters: () => void
  clearFilter: (key: keyof TaskFilters) => void
  hasActiveFilters: boolean
  activeFilterCount: number
}

export function useTaskFilters(initialFilters?: Partial<TaskFilters>): UseTaskFiltersResult {
  const [filters, setFiltersState] = useState<TaskFilters>({
    ...DEFAULT_TASK_FILTERS,
    ...initialFilters,
  })

  const setFilter = useCallback(<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const setFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_TASK_FILTERS)
  }, [])

  const clearFilter = useCallback((key: keyof TaskFilters) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: DEFAULT_TASK_FILTERS[key],
    }))
  }, [])

  const { hasActiveFilters, activeFilterCount } = useMemo(() => {
    let count = 0

    if (filters.status !== null) count++
    if (filters.assigneeIds.length > 0) count++
    if (filters.dueDate !== null) count++
    if (filters.priority !== null) count++
    if (filters.tagIds.length > 0) count++
    if (filters.projectId !== null) count++
    if (filters.areaId !== null) count++
    if (filters.when !== null) count++
    if (filters.search && filters.search.length > 0) count++
    if (filters.sortBy !== 'default') count++

    return {
      hasActiveFilters: count > 0,
      activeFilterCount: count,
    }
  }, [filters])

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
  }
}

// Utility for getting filter labels
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    backlog: 'Backlog',
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    canceled: 'Canceled',
  }
  return labels[status]
}

export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    high: 'Vysoká',
    low: 'Nízka',
  }
  return labels[priority]
}

export function getDueDateLabel(dueDate: DueDateFilter): string {
  const labels: Record<DueDateFilter, string> = {
    today: 'Dnes',
    this_week: 'Tento týždeň',
    this_month: 'Tento mesiac',
    overdue: 'Po termíne',
    no_date: 'Bez dátumu',
  }
  return labels[dueDate]
}

export function getWhenLabel(when: WhenType): string {
  const labels: Record<WhenType, string> = {
    inbox: 'Inbox',
    today: 'Dnes',
    anytime: 'Kedykoľvek',
    someday: 'Niekedy',
    scheduled: 'Naplánované',
  }
  return labels[when]
}

// Filter tasks based on active filters
export function filterTasks(tasks: TaskWithRelations[], filters: TaskFilters): TaskWithRelations[] {
  let filtered = tasks.filter(task => {
    // Status filter
    if (filters.status !== null && task.status !== filters.status) {
      return false
    }

    // Priority filter
    if (filters.priority !== null && task.priority !== filters.priority) {
      return false
    }

    // Assignee filter
    if (filters.assigneeIds.length > 0) {
      const assigneeId = filters.assigneeIds[0]
      if (assigneeId === 'unassigned') {
        if (task.assignee_id) return false
      } else {
        if (!task.assignee_id || !filters.assigneeIds.includes(task.assignee_id)) {
          return false
        }
      }
    }

    // Tag filter
    if (filters.tagIds.length > 0) {
      const taskTagIds = task.tags?.map(t => t.id) || []
      const hasMatchingTag = filters.tagIds.some(tagId => taskTagIds.includes(tagId))
      if (!hasMatchingTag) {
        return false
      }
    }

    // Project filter
    if (filters.projectId !== null && task.project_id !== filters.projectId) {
      return false
    }

    // Area filter (Oddelenie)
    if (filters.areaId !== null && task.area_id !== filters.areaId) {
      return false
    }

    // When filter
    if (filters.when !== null && task.when_type !== filters.when) {
      return false
    }

    // Due date filter
    if (filters.dueDate !== null) {
      const dueDate = task.due_date || task.deadline
      if (!dueDate) {
        if (filters.dueDate !== 'no_date') {
          return false
        }
      } else {
        const date = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        switch (filters.dueDate) {
          case 'today':
            if (!isToday(date)) return false
            break
          case 'this_week':
            if (!isThisWeek(date, { weekStartsOn: 1 })) return false
            break
          case 'this_month':
            if (!isThisMonth(date)) return false
            break
          case 'overdue':
            if (!isPast(date) || isToday(date)) return false
            break
          case 'no_date':
            return false // Task has a date, but we're filtering for no date
        }
      }
    }

    // Search filter
    if (filters.search && filters.search.length > 0) {
      const searchLower = filters.search.toLowerCase()
      const titleMatch = task.title?.toLowerCase().includes(searchLower)
      const notesMatch = task.notes?.toLowerCase().includes(searchLower)
      if (!titleMatch && !notesMatch) {
        return false
      }
    }

    return true
  })

  // Apply sorting
  if (filters.sortBy && filters.sortBy !== 'default') {
    filtered = sortTasks(filtered, filters.sortBy)
  }

  return filtered
}

// Sort tasks by deadline or created_at
export function sortTasks(tasks: TaskWithRelations[], sortBy: SortOption): TaskWithRelations[] {
  if (sortBy === 'default') return tasks

  return [...tasks].sort((a, b) => {
    // Handle created_at sorting
    if (sortBy === 'created_asc' || sortBy === 'created_desc') {
      const dateA = a.created_at
      const dateB = b.created_at

      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1

      const parsedA = parseISO(dateA)
      const parsedB = parseISO(dateB)

      return sortBy === 'created_asc'
        ? compareAsc(parsedA, parsedB)
        : compareDesc(parsedA, parsedB)
    }

    // Handle deadline sorting
    const dateA = a.deadline || a.due_date
    const dateB = b.deadline || b.due_date

    // Tasks without dates go to the end
    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1

    const parsedA = parseISO(dateA)
    const parsedB = parseISO(dateB)

    if (sortBy === 'deadline_asc') {
      return compareAsc(parsedA, parsedB)
    } else {
      return compareDesc(parsedA, parsedB)
    }
  })
}
