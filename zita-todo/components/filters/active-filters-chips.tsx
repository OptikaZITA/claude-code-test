'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  TaskFilters,
  TaskStatus,
  TaskPriority,
  DueDateFilter,
  SortOption,
} from '@/types'

interface ActiveFiltersChipsProps {
  filters: TaskFilters
  onClearFilter: (key: keyof TaskFilters) => void
  onClearAll: () => void
  // For assignee display
  getAssigneeName?: (id: string) => string
  className?: string
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  canceled: 'Zrušené',
}

const DUE_DATE_LABELS: Record<DueDateFilter, string> = {
  today: 'Dnes',
  this_week: 'Tento týždeň',
  this_month: 'Tento mesiac',
  overdue: 'Po termíne',
  no_date: 'Bez dátumu',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'Vysoká priorita',
  low: 'Nízka priorita',
}

const SORT_LABELS: Record<SortOption, string> = {
  default: '',
  deadline_asc: 'Deadline ↑',
  deadline_desc: 'Deadline ↓',
  created_asc: 'Vytvorené ↑',
  created_desc: 'Vytvorené ↓',
}

export function ActiveFiltersChips({
  filters,
  onClearFilter,
  onClearAll,
  getAssigneeName,
  className,
}: ActiveFiltersChipsProps) {
  const chips: { key: keyof TaskFilters; label: string }[] = []

  // Build chips array
  if (filters.status !== null) {
    chips.push({ key: 'status', label: STATUS_LABELS[filters.status] })
  }

  if (filters.assigneeIds.length > 0) {
    const assigneeId = filters.assigneeIds[0]
    const name = assigneeId === 'unassigned'
      ? 'Nepriradené'
      : getAssigneeName?.(assigneeId) || 'Kolega'
    chips.push({ key: 'assigneeIds', label: name })
  }

  if (filters.dueDate !== null) {
    chips.push({ key: 'dueDate', label: DUE_DATE_LABELS[filters.dueDate] })
  }

  if (filters.priority !== null) {
    chips.push({ key: 'priority', label: PRIORITY_LABELS[filters.priority] })
  }

  if (filters.sortBy !== 'default') {
    chips.push({ key: 'sortBy', label: SORT_LABELS[filters.sortBy] })
  }

  // Don't render if no active filters
  if (chips.length === 0) return null

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-md"
        >
          {chip.label}
          <button
            onClick={() => onClearFilter(chip.key)}
            className="hover:bg-primary/20 rounded p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Zrušiť všetky
        </button>
      )}
    </div>
  )
}

// Mobile version - banner style
interface ActiveFiltersBannerProps {
  filters: TaskFilters
  selectedTagNames: string[]
  onClear: () => void
  getAssigneeName?: (id: string) => string
  className?: string
}

export function ActiveFiltersBanner({
  filters,
  selectedTagNames,
  onClear,
  getAssigneeName,
  className,
}: ActiveFiltersBannerProps) {
  const labels: string[] = []

  // Build labels array
  if (selectedTagNames.length > 0) {
    labels.push(...selectedTagNames)
  }

  if (filters.status !== null) {
    labels.push(STATUS_LABELS[filters.status])
  }

  if (filters.assigneeIds.length > 0) {
    const assigneeId = filters.assigneeIds[0]
    const name = assigneeId === 'unassigned'
      ? 'Nepriradené'
      : getAssigneeName?.(assigneeId) || 'Kolega'
    labels.push(name)
  }

  if (filters.dueDate !== null) {
    labels.push(DUE_DATE_LABELS[filters.dueDate])
  }

  if (filters.priority !== null) {
    labels.push(PRIORITY_LABELS[filters.priority])
  }

  if (filters.sortBy !== 'default') {
    labels.push(SORT_LABELS[filters.sortBy])
  }

  // Don't render if no active filters
  if (labels.length === 0) return null

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-4 py-2 bg-primary/10 text-sm',
        className
      )}
    >
      <span className="text-foreground truncate">
        {labels.join(', ')}
      </span>
      <button
        onClick={onClear}
        className="p-1 hover:bg-primary/20 rounded"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}
