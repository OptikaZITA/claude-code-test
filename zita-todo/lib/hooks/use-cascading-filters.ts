'use client'

import { useMemo } from 'react'
import {
  TaskWithRelations,
  TaskFilters,
  TaskStatus,
  TaskPriority,
  DueDateFilter,
  SortOption,
  Tag,
  Area,
  User,
} from '@/types'
import { isToday, isThisWeek, isThisMonth, isPast, parseISO } from 'date-fns'

// Types for filter options
export interface FilterOption<T = string> {
  value: T
  label: string
  count: number
}

export interface AssigneeOption extends FilterOption {
  avatarUrl: string | null
}

export interface TagOption extends FilterOption {
  color: string | null
}

export interface AreaOption extends FilterOption {
  color: string | null
}

export interface CascadingFilterOptions {
  assignees: AssigneeOption[]
  statuses: FilterOption<TaskStatus>[]
  areas: AreaOption[]
  priorities: FilterOption<TaskPriority>[]
  dueDates: FilterOption<DueDateFilter>[]
  tags: TagOption[]
  sortOptions: FilterOption<SortOption>[]
}

// Filter tasks excluding one category (for cascading)
function filterTasksExcluding(
  tasks: TaskWithRelations[],
  filters: TaskFilters,
  excludeCategory: keyof TaskFilters
): TaskWithRelations[] {
  return tasks.filter(task => {
    // Status filter
    if (excludeCategory !== 'status' && filters.status !== null) {
      if (task.status !== filters.status) return false
    }

    // Assignee filter
    if (excludeCategory !== 'assigneeIds' && filters.assigneeIds.length > 0) {
      const assigneeId = filters.assigneeIds[0]
      if (assigneeId === 'unassigned') {
        if (task.assignee_id) return false
      } else {
        if (!task.assignee_id || !filters.assigneeIds.includes(task.assignee_id)) {
          return false
        }
      }
    }

    // Area filter
    if (excludeCategory !== 'areaId' && filters.areaId !== null) {
      if (task.area_id !== filters.areaId) return false
    }

    // Priority filter
    if (excludeCategory !== 'priority' && filters.priority !== null) {
      if (task.priority !== filters.priority) return false
    }

    // Due date filter
    if (excludeCategory !== 'dueDate' && filters.dueDate !== null) {
      const dueDate = task.due_date || task.deadline
      if (!dueDate) {
        if (filters.dueDate !== 'no_date') return false
      } else {
        const date = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
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
            return false
        }
      }
    }

    // Tag filter
    if (excludeCategory !== 'tagIds' && filters.tagIds.length > 0) {
      const taskTagIds = task.tags?.map(t => t.id) || []
      const hasMatchingTag = filters.tagIds.some(tagId => taskTagIds.includes(tagId))
      if (!hasMatchingTag) return false
    }

    return true
  })
}

// Check if task matches due date filter
function matchesDueDateFilter(task: TaskWithRelations, filter: DueDateFilter): boolean {
  const dueDate = task.due_date || task.deadline
  if (!dueDate) {
    return filter === 'no_date'
  }
  const date = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  switch (filter) {
    case 'today':
      return isToday(date)
    case 'this_week':
      return isThisWeek(date, { weekStartsOn: 1 })
    case 'this_month':
      return isThisMonth(date)
    case 'overdue':
      return isPast(date) && !isToday(date)
    case 'no_date':
      return false
  }
}

export function useCascadingFilters(
  tasks: TaskWithRelations[],
  filters: TaskFilters,
  areas: Area[] = [],
  allTags: Tag[] = []
): CascadingFilterOptions {
  return useMemo(() => {
    // Get available assignees
    const assigneesFiltered = filterTasksExcluding(tasks, filters, 'assigneeIds')
    const assigneeMap = new Map<string, { user: User; count: number }>()
    let unassignedCount = 0

    assigneesFiltered.forEach(task => {
      if (task.assignee && task.assignee_id) {
        const existing = assigneeMap.get(task.assignee_id)
        if (existing) {
          existing.count++
        } else {
          assigneeMap.set(task.assignee_id, { user: task.assignee, count: 1 })
        }
      } else {
        unassignedCount++
      }
    })

    const assignees: AssigneeOption[] = Array.from(assigneeMap.entries())
      .map(([id, { user, count }]) => ({
        value: id,
        label: user.nickname || user.full_name || user.email || 'Neznámy',
        count,
        avatarUrl: user.avatar_url,
      }))
      .filter(a => a.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label, 'sk'))

    if (unassignedCount > 0) {
      assignees.push({
        value: 'unassigned',
        label: 'Nepriradené',
        count: unassignedCount,
        avatarUrl: null,
      })
    }

    // Get available statuses
    const statusesFiltered = filterTasksExcluding(tasks, filters, 'status')
    const statusCounts = new Map<TaskStatus, number>()
    statusesFiltered.forEach(task => {
      const current = statusCounts.get(task.status) || 0
      statusCounts.set(task.status, current + 1)
    })

    const statusLabels: Record<TaskStatus, string> = {
      backlog: 'Backlog',
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      done: 'Done',
      canceled: 'Zrušené',
    }

    const statuses: FilterOption<TaskStatus>[] = (
      ['backlog', 'todo', 'in_progress', 'review', 'done'] as TaskStatus[]
    )
      .map(status => ({
        value: status,
        label: statusLabels[status],
        count: statusCounts.get(status) || 0,
      }))
      .filter(s => s.count > 0)

    // Get available areas (Oddelenia)
    const areasFiltered = filterTasksExcluding(tasks, filters, 'areaId')
    const areaCounts = new Map<string, number>()
    areasFiltered.forEach(task => {
      if (task.area_id) {
        const current = areaCounts.get(task.area_id) || 0
        areaCounts.set(task.area_id, current + 1)
      }
    })

    const areaOptions: AreaOption[] = areas
      .map(area => ({
        value: area.id,
        label: area.name,
        count: areaCounts.get(area.id) || 0,
        color: area.color,
      }))
      .filter(a => a.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label, 'sk'))

    // Get available priorities
    const prioritiesFiltered = filterTasksExcluding(tasks, filters, 'priority')
    const priorityCounts = new Map<TaskPriority, number>()
    prioritiesFiltered.forEach(task => {
      if (task.priority) {
        const current = priorityCounts.get(task.priority) || 0
        priorityCounts.set(task.priority, current + 1)
      }
    })

    const priorityLabels: Record<TaskPriority, string> = {
      high: 'Vysoká',
      low: 'Nízka',
    }

    const priorities: FilterOption<TaskPriority>[] = (['high', 'low'] as TaskPriority[])
      .map(priority => ({
        value: priority,
        label: priorityLabels[priority],
        count: priorityCounts.get(priority) || 0,
      }))
      .filter(p => p.count > 0)

    // Get available due date filters
    const dueDatesFiltered = filterTasksExcluding(tasks, filters, 'dueDate')
    const dueDateOptions: DueDateFilter[] = ['today', 'this_week', 'this_month', 'overdue', 'no_date']
    const dueDateLabels: Record<DueDateFilter, string> = {
      today: 'Dnes',
      this_week: 'Tento týždeň',
      this_month: 'Tento mesiac',
      overdue: 'Po termíne',
      no_date: 'Bez dátumu',
    }

    const dueDates: FilterOption<DueDateFilter>[] = dueDateOptions
      .map(filter => ({
        value: filter,
        label: dueDateLabels[filter],
        count: dueDatesFiltered.filter(task => matchesDueDateFilter(task, filter)).length,
      }))
      .filter(d => d.count > 0)

    // Get available tags
    const tagsFiltered = filterTasksExcluding(tasks, filters, 'tagIds')
    const tagCounts = new Map<string, number>()
    tagsFiltered.forEach(task => {
      task.tags?.forEach(tag => {
        const current = tagCounts.get(tag.id) || 0
        tagCounts.set(tag.id, current + 1)
      })
    })

    // Use allTags to get all available tags, then filter by count
    const tagSet = new Map<string, Tag>()
    tagsFiltered.forEach(task => {
      task.tags?.forEach(tag => {
        if (!tagSet.has(tag.id)) {
          tagSet.set(tag.id, tag)
        }
      })
    })

    const tags: TagOption[] = Array.from(tagSet.values())
      .map(tag => ({
        value: tag.id,
        label: tag.name,
        count: tagCounts.get(tag.id) || 0,
        color: tag.color,
      }))
      .filter(t => t.count > 0)
      .sort((a, b) => a.label.localeCompare(b.label, 'sk'))

    // Sort options (always available)
    const sortOptions: FilterOption<SortOption>[] = [
      { value: 'default', label: 'Predvolené', count: tasks.length },
      { value: 'deadline_asc', label: 'Deadline ↑', count: tasks.length },
      { value: 'deadline_desc', label: 'Deadline ↓', count: tasks.length },
    ]

    return {
      assignees,
      statuses,
      areas: areaOptions,
      priorities,
      dueDates,
      tags,
      sortOptions,
    }
  }, [tasks, filters, areas, allTags])
}

// Get label for active filter value
export function getFilterLabel(
  category: keyof TaskFilters,
  value: unknown,
  options: CascadingFilterOptions
): string {
  switch (category) {
    case 'assigneeIds': {
      const ids = value as string[]
      if (ids.length === 0) return ''
      const id = ids[0]
      const option = options.assignees.find(a => a.value === id)
      return option?.label || id
    }
    case 'status': {
      const option = options.statuses.find(s => s.value === value)
      return option?.label || String(value)
    }
    case 'areaId': {
      const option = options.areas.find(a => a.value === value)
      return option?.label || String(value)
    }
    case 'priority': {
      const option = options.priorities.find(p => p.value === value)
      return option?.label || String(value)
    }
    case 'dueDate': {
      const option = options.dueDates.find(d => d.value === value)
      return option?.label || String(value)
    }
    case 'tagIds': {
      const ids = value as string[]
      if (ids.length === 0) return ''
      if (ids.length === 1) {
        const option = options.tags.find(t => t.value === ids[0])
        return option?.label || ids[0]
      }
      return `${ids.length} tagov`
    }
    case 'sortBy': {
      const option = options.sortOptions.find(s => s.value === value)
      return option?.label || String(value)
    }
    default:
      return String(value)
  }
}
