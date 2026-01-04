import { TaskWithRelations } from '@/types'
import { isToday, parseISO } from 'date-fns'

/**
 * Check if a task is marked as "today"
 * - when_type === 'today'
 * - when_type === 'scheduled' with when_date === today
 */
export function isTaskToday(task: TaskWithRelations): boolean {
  if (task.when_type === 'today') return true
  if (task.when_type === 'scheduled' && task.when_date) {
    try {
      return isToday(parseISO(task.when_date))
    } catch {
      return false
    }
  }
  return false
}

/**
 * Sort tasks with "today" tasks first, then by sort_order
 * This sorting should be applied to ALL task lists in the system
 */
export function sortTasksTodayFirst(tasks: TaskWithRelations[]): TaskWithRelations[] {
  return [...tasks].sort((a, b) => {
    const aIsToday = isTaskToday(a)
    const bIsToday = isTaskToday(b)

    // Today tasks come first
    if (aIsToday && !bIsToday) return -1
    if (!aIsToday && bIsToday) return 1

    // Within same group, sort by sort_order
    return (a.sort_order || 0) - (b.sort_order || 0)
  })
}

/**
 * Sort tasks by sort_order only (without today-first logic)
 */
export function sortTasksBySortOrder(tasks: TaskWithRelations[]): TaskWithRelations[] {
  return [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}
