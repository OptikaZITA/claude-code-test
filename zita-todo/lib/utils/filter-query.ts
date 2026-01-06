import { TaskFilters, DueDateFilter } from '@/types'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'

/**
 * Applies TaskFilters to a Supabase query builder
 * @param query - Supabase query builder
 * @param filters - TaskFilters object
 * @returns Modified query with filters applied
 */
export function applyTaskFilters<T extends { eq: Function; in: Function; gte: Function; lte: Function; lt: Function; is: Function; ilike: Function; or: Function }>(
  query: T,
  filters: TaskFilters
): T {
  let q = query

  // Status filter
  if (filters.status !== null) {
    q = q.eq('status', filters.status)
  }

  // Assignee filter (multiple)
  if (filters.assigneeIds.length > 0) {
    q = q.in('assignee_id', filters.assigneeIds)
  }

  // Priority filter
  if (filters.priority !== null) {
    q = q.eq('priority', filters.priority)
  }

  // Project filter
  if (filters.projectId !== null) {
    q = q.eq('project_id', filters.projectId)
  }

  // When type filter
  if (filters.when !== null) {
    q = q.eq('when_type', filters.when)
  }

  // Tag filter (requires join, handled separately)
  // Note: Tag filtering needs to be done with a more complex query
  // This is a simplified version

  // Due date filter
  if (filters.dueDate !== null) {
    q = applyDueDateFilter(q, filters.dueDate)
  }

  // Search filter
  if (filters.search && filters.search.trim().length > 0) {
    q = q.ilike('title', `%${filters.search.trim()}%`)
  }

  return q
}

/**
 * Applies due date filter to query
 */
function applyDueDateFilter<T extends { gte: Function; lte: Function; lt: Function; is: Function }>(
  query: T,
  dueDate: DueDateFilter
): T {
  const now = new Date()
  const today = startOfDay(now)

  switch (dueDate) {
    case 'today':
      return query
        .gte('due_date', today.toISOString())
        .lte('due_date', endOfDay(now).toISOString())

    case 'this_week':
      return query
        .gte('due_date', startOfWeek(now, { weekStartsOn: 1 }).toISOString())
        .lte('due_date', endOfWeek(now, { weekStartsOn: 1 }).toISOString())

    case 'this_month':
      return query
        .gte('due_date', startOfMonth(now).toISOString())
        .lte('due_date', endOfMonth(now).toISOString())

    case 'overdue':
      return query.lt('due_date', today.toISOString())

    case 'no_date':
      return query.is('due_date', null)

    default:
      return query
  }
}

/**
 * Builds a filter object for URL query params
 */
export function filtersToQueryParams(filters: TaskFilters): Record<string, string> {
  const params: Record<string, string> = {}

  if (filters.status !== null) {
    params.status = filters.status
  }
  if (filters.assigneeIds.length > 0) {
    params.assignees = filters.assigneeIds.join(',')
  }
  if (filters.dueDate !== null) {
    params.dueDate = filters.dueDate
  }
  if (filters.priority !== null) {
    params.priority = filters.priority
  }
  if (filters.tagIds.length > 0) {
    params.tags = filters.tagIds.join(',')
  }
  if (filters.projectId !== null) {
    params.project = filters.projectId
  }
  if (filters.when !== null) {
    params.when = filters.when
  }
  if (filters.search && filters.search.length > 0) {
    params.search = filters.search
  }

  return params
}

/**
 * Parses URL query params back to TaskFilters
 */
export function queryParamsToFilters(params: URLSearchParams): Partial<TaskFilters> {
  const filters: Partial<TaskFilters> = {}

  const status = params.get('status')
  if (status) {
    filters.status = status as TaskFilters['status']
  }

  const assignees = params.get('assignees')
  if (assignees) {
    filters.assigneeIds = assignees.split(',')
  }

  const dueDate = params.get('dueDate')
  if (dueDate) {
    filters.dueDate = dueDate as DueDateFilter
  }

  const priority = params.get('priority')
  if (priority) {
    filters.priority = priority as TaskFilters['priority']
  }

  const tags = params.get('tags')
  if (tags) {
    filters.tagIds = tags.split(',')
  }

  const project = params.get('project')
  if (project) {
    filters.projectId = project
  }

  const when = params.get('when')
  if (when) {
    filters.when = when as TaskFilters['when']
  }

  const search = params.get('search')
  if (search) {
    filters.search = search
  }

  return filters
}
