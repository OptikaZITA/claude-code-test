'use client'

import { useState } from 'react'
import { X, Filter, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import {
  TaskFilters,
  TaskStatus,
  TaskPriority,
  DueDateFilter,
  WhenType,
  User,
  Tag,
  Project,
} from '@/types'
import {
  getStatusLabel,
  getPriorityLabel,
  getDueDateLabel,
  getWhenLabel,
} from '@/lib/hooks/use-task-filters'

interface TaskFiltersBarProps {
  filters: TaskFilters
  onFilterChange: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  users?: User[]
  tags?: Tag[]
  projects?: Project[]
  showWhenFilter?: boolean
  showProjectFilter?: boolean
}

const STATUS_OPTIONS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done']
const PRIORITY_OPTIONS: TaskPriority[] = ['urgent', 'high', 'medium', 'low']
const DUE_DATE_OPTIONS: DueDateFilter[] = ['today', 'this_week', 'this_month', 'overdue', 'no_date']
const WHEN_OPTIONS: WhenType[] = ['today', 'anytime', 'someday', 'scheduled']

export function TaskFiltersBar({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  users = [],
  tags = [],
  projects = [],
  showWhenFilter = false,
  showProjectFilter = false,
}: TaskFiltersBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name)
  }

  const closeDropdowns = () => setOpenDropdown(null)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status Filter */}
      <FilterDropdown
        label="Status"
        isOpen={openDropdown === 'status'}
        onToggle={() => toggleDropdown('status')}
        onClose={closeDropdowns}
        hasValue={filters.status !== null}
        displayValue={filters.status ? getStatusLabel(filters.status) : undefined}
      >
        <div className="p-1">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => {
                onFilterChange('status', filters.status === status ? null : status)
                closeDropdowns()
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                filters.status === status
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'hover:bg-[var(--bg-hover)]'
              )}
            >
              {getStatusLabel(status)}
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Assignee Filter */}
      {users.length > 0 && (
        <FilterDropdown
          label="Priradený"
          isOpen={openDropdown === 'assignee'}
          onToggle={() => toggleDropdown('assignee')}
          onClose={closeDropdowns}
          hasValue={filters.assigneeIds.length > 0}
          displayValue={
            filters.assigneeIds.length > 0
              ? `${filters.assigneeIds.length} vybraných`
              : undefined
          }
        >
          <div className="p-1 max-h-60 overflow-y-auto">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  const newIds = filters.assigneeIds.includes(user.id)
                    ? filters.assigneeIds.filter((id) => id !== user.id)
                    : [...filters.assigneeIds, user.id]
                  onFilterChange('assigneeIds', newIds)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2',
                  filters.assigneeIds.includes(user.id)
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'hover:bg-[var(--bg-hover)]'
                )}
              >
                <span className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-xs">
                  {(user.nickname || user.full_name || user.email)?.[0]?.toUpperCase()}
                </span>
                <span>{user.nickname || user.full_name || user.email}</span>
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* Due Date Filter */}
      <FilterDropdown
        label="Termín"
        isOpen={openDropdown === 'dueDate'}
        onToggle={() => toggleDropdown('dueDate')}
        onClose={closeDropdowns}
        hasValue={filters.dueDate !== null}
        displayValue={filters.dueDate ? getDueDateLabel(filters.dueDate) : undefined}
      >
        <div className="p-1">
          {DUE_DATE_OPTIONS.map((dueDate) => (
            <button
              key={dueDate}
              onClick={() => {
                onFilterChange('dueDate', filters.dueDate === dueDate ? null : dueDate)
                closeDropdowns()
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                filters.dueDate === dueDate
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'hover:bg-[var(--bg-hover)]'
              )}
            >
              {getDueDateLabel(dueDate)}
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Priority Filter */}
      <FilterDropdown
        label="Priorita"
        isOpen={openDropdown === 'priority'}
        onToggle={() => toggleDropdown('priority')}
        onClose={closeDropdowns}
        hasValue={filters.priority !== null}
        displayValue={filters.priority ? getPriorityLabel(filters.priority) : undefined}
      >
        <div className="p-1">
          {PRIORITY_OPTIONS.map((priority) => (
            <button
              key={priority}
              onClick={() => {
                onFilterChange('priority', filters.priority === priority ? null : priority)
                closeDropdowns()
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                filters.priority === priority
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'hover:bg-[var(--bg-hover)]'
              )}
            >
              {getPriorityLabel(priority)}
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Tags Filter */}
      {tags.length > 0 && (
        <FilterDropdown
          label="Tagy"
          isOpen={openDropdown === 'tags'}
          onToggle={() => toggleDropdown('tags')}
          onClose={closeDropdowns}
          hasValue={filters.tagIds.length > 0}
          displayValue={
            filters.tagIds.length > 0 ? `${filters.tagIds.length} tagov` : undefined
          }
        >
          <div className="p-1 max-h-60 overflow-y-auto">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => {
                  const newIds = filters.tagIds.includes(tag.id)
                    ? filters.tagIds.filter((id) => id !== tag.id)
                    : [...filters.tagIds, tag.id]
                  onFilterChange('tagIds', newIds)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2',
                  filters.tagIds.includes(tag.id)
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'hover:bg-[var(--bg-hover)]'
                )}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color || '#888' }}
                />
                <span>{tag.name}</span>
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* When Filter */}
      {showWhenFilter && (
        <FilterDropdown
          label="Kedy"
          isOpen={openDropdown === 'when'}
          onToggle={() => toggleDropdown('when')}
          onClose={closeDropdowns}
          hasValue={filters.when !== null}
          displayValue={filters.when ? getWhenLabel(filters.when) : undefined}
        >
          <div className="p-1">
            {WHEN_OPTIONS.map((when) => (
              <button
                key={when}
                onClick={() => {
                  onFilterChange('when', filters.when === when ? null : when)
                  closeDropdowns()
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                  filters.when === when
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'hover:bg-[var(--bg-hover)]'
                )}
              >
                {getWhenLabel(when)}
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* Project Filter */}
      {showProjectFilter && projects.length > 0 && (
        <FilterDropdown
          label="Projekt"
          isOpen={openDropdown === 'project'}
          onToggle={() => toggleDropdown('project')}
          onClose={closeDropdowns}
          hasValue={filters.projectId !== null}
          displayValue={
            filters.projectId
              ? projects.find((p) => p.id === filters.projectId)?.name
              : undefined
          }
        >
          <div className="p-1 max-h-60 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  onFilterChange(
                    'projectId',
                    filters.projectId === project.id ? null : project.id
                  )
                  closeDropdowns()
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                  filters.projectId === project.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'hover:bg-[var(--bg-hover)]'
                )}
              >
                {project.name}
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4 mr-1" />
          Zrušiť filtre
        </Button>
      )}
    </div>
  )
}

// Reusable dropdown component
interface FilterDropdownProps {
  label: string
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  hasValue: boolean
  displayValue?: string
  children: React.ReactNode
}

function FilterDropdown({
  label,
  isOpen,
  onToggle,
  onClose,
  hasValue,
  displayValue,
  children,
}: FilterDropdownProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors',
          hasValue
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
            : 'border-[var(--border-primary)] hover:bg-[var(--bg-hover)]'
        )}
      >
        <span>{displayValue || label}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-lg z-50">
            {children}
          </div>
        </>
      )}
    </div>
  )
}
