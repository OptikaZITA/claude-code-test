'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'
import {
  TaskFilters,
  TaskStatus,
  TaskPriority,
  DueDateFilter,
  SortOption,
  User,
} from '@/types'

interface ColleagueOption {
  id: string
  name: string
  avatar_url: string | null
  taskCount: number
}

interface FilterDropdownPanelProps {
  isOpen: boolean
  onClose: () => void
  filters: TaskFilters
  onFilterChange: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  colleagues: ColleagueOption[]
  unassignedCount: number
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
]

const DUE_DATE_OPTIONS: { value: DueDateFilter; label: string }[] = [
  { value: 'today', label: 'Dnes' },
  { value: 'this_week', label: 'Tento týždeň' },
  { value: 'this_month', label: 'Tento mesiac' },
  { value: 'overdue', label: 'Po termíne' },
  { value: 'no_date', label: 'Bez dátumu' },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high', label: 'Vysoká', color: 'text-red-500' },
  { value: 'low', label: 'Nízka', color: 'text-yellow-500' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'default', label: 'Predvolené' },
  { value: 'deadline_asc', label: 'Termín (najbližší)' },
  { value: 'deadline_desc', label: 'Termín (najďalší)' },
]

export function FilterDropdownPanel({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  colleagues,
  unassignedCount,
}: FilterDropdownPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const selectedAssignee = filters.assigneeIds[0] || null

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute top-full left-0 mt-2 z-50',
        'w-72 bg-card border border-border rounded-lg shadow-lg',
        'animate-in fade-in slide-in-from-top-2 duration-200'
      )}
    >
      <div className="p-4 max-h-[70vh] overflow-y-auto">
        {/* KTO - Assignee */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Kto
          </h4>
          <div className="space-y-1">
            <label className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer">
              <input
                type="radio"
                name="assignee"
                checked={selectedAssignee === null}
                onChange={() => onFilterChange('assigneeIds', [])}
                className="text-primary"
              />
              <span className="text-sm">Všetci</span>
            </label>
            {colleagues.map((colleague) => (
              <label
                key={colleague.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="assignee"
                  checked={selectedAssignee === colleague.id}
                  onChange={() => onFilterChange('assigneeIds', [colleague.id])}
                  className="text-primary"
                />
                <Avatar
                  src={colleague.avatar_url}
                  name={colleague.name}
                  size="xs"
                />
                <span className="text-sm flex-1">{colleague.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({colleague.taskCount})
                </span>
              </label>
            ))}
            {unassignedCount > 0 && (
              <label className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer">
                <input
                  type="radio"
                  name="assignee"
                  checked={selectedAssignee === 'unassigned'}
                  onChange={() => onFilterChange('assigneeIds', ['unassigned'])}
                  className="text-primary"
                />
                <span className="text-sm flex-1">Nepriradené</span>
                <span className="text-xs text-muted-foreground">
                  ({unassignedCount})
                </span>
              </label>
            )}
          </div>
        </div>

        <hr className="border-border my-3" />

        {/* STATUS */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Status
          </h4>
          <div className="space-y-1">
            <label className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer">
              <input
                type="radio"
                name="status"
                checked={filters.status === null}
                onChange={() => onFilterChange('status', null)}
                className="text-primary"
              />
              <span className="text-sm">Všetky</span>
            </label>
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="status"
                  checked={filters.status === option.value}
                  onChange={() => onFilterChange('status', option.value)}
                  className="text-primary"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <hr className="border-border my-3" />

        {/* TERMIN - Due Date */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Termín
          </h4>
          <div className="space-y-1">
            <label className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer">
              <input
                type="radio"
                name="dueDate"
                checked={filters.dueDate === null}
                onChange={() => onFilterChange('dueDate', null)}
                className="text-primary"
              />
              <span className="text-sm">Všetky</span>
            </label>
            {DUE_DATE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="dueDate"
                  checked={filters.dueDate === option.value}
                  onChange={() => onFilterChange('dueDate', option.value)}
                  className="text-primary"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <hr className="border-border my-3" />

        {/* PRIORITA */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Priorita
          </h4>
          <div className="space-y-1">
            <label className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer">
              <input
                type="radio"
                name="priority"
                checked={filters.priority === null}
                onChange={() => onFilterChange('priority', null)}
                className="text-primary"
              />
              <span className="text-sm">Všetky</span>
            </label>
            {PRIORITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="priority"
                  checked={filters.priority === option.value}
                  onChange={() => onFilterChange('priority', option.value)}
                  className="text-primary"
                />
                <span className={cn('text-sm', option.color)}>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <hr className="border-border my-3" />

        {/* ZORADIT PODLA */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Zoradiť podľa
          </h4>
          <div className="space-y-1">
            {SORT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="sortBy"
                  checked={filters.sortBy === option.value}
                  onChange={() => onFilterChange('sortBy', option.value)}
                  className="text-primary"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Clear all button */}
        {hasActiveFilters && (
          <>
            <hr className="border-border my-3" />
            <button
              onClick={() => {
                onClearFilters()
                onClose()
              }}
              className="w-full py-2 text-sm text-primary hover:text-primary/80 font-medium"
            >
              Zrušiť všetky filtre
            </button>
          </>
        )}
      </div>
    </div>
  )
}
