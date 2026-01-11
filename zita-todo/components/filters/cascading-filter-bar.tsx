'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { FilterDropdown } from './filter-dropdown'
import { FilterChips } from './filter-chips'
import {
  TaskWithRelations,
  TaskFilters,
  TaskStatus,
  TaskPriority,
  DueDateFilter,
  SortOption,
  Area,
  Tag,
} from '@/types'
import {
  useCascadingFilters,
  CascadingFilterOptions,
} from '@/lib/hooks/use-cascading-filters'

interface CascadingFilterBarProps {
  tasks: TaskWithRelations[]
  filters: TaskFilters
  onFilterChange: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void
  onClearFilters: () => void
  onClearFilter: (key: keyof TaskFilters) => void
  hasActiveFilters: boolean
  areas?: Area[]
  allTags?: Tag[]
  className?: string
  /** Hide specific filter categories */
  hideFilters?: Array<'assignee' | 'status' | 'area' | 'priority' | 'dueDate' | 'tags' | 'sort'>
}

export function CascadingFilterBar({
  tasks,
  filters,
  onFilterChange,
  onClearFilters,
  onClearFilter,
  hasActiveFilters,
  areas = [],
  allTags = [],
  className,
  hideFilters = [],
}: CascadingFilterBarProps) {
  // Get cascading filter options
  const options = useCascadingFilters(tasks, filters, areas, allTags)

  // Build active filters for chips
  const activeFilters = useMemo(() => {
    const chips: Array<{
      key: keyof TaskFilters
      label: string
      value: unknown
    }> = []

    if (filters.assigneeIds.length > 0) {
      const id = filters.assigneeIds[0]
      const option = options.assignees.find(a => a.value === id)
      chips.push({
        key: 'assigneeIds',
        label: option?.label || id,
        value: filters.assigneeIds,
      })
    }

    if (filters.status !== null) {
      const option = options.statuses.find(s => s.value === filters.status)
      chips.push({
        key: 'status',
        label: option?.label || filters.status,
        value: filters.status,
      })
    }

    if (filters.areaId !== null) {
      const option = options.areas.find(a => a.value === filters.areaId)
      chips.push({
        key: 'areaId',
        label: option?.label || filters.areaId,
        value: filters.areaId,
      })
    }

    if (filters.priority !== null) {
      const option = options.priorities.find(p => p.value === filters.priority)
      chips.push({
        key: 'priority',
        label: option?.label || filters.priority,
        value: filters.priority,
      })
    }

    if (filters.dueDate !== null) {
      const option = options.dueDates.find(d => d.value === filters.dueDate)
      chips.push({
        key: 'dueDate',
        label: option?.label || filters.dueDate,
        value: filters.dueDate,
      })
    }

    if (filters.tagIds.length > 0) {
      const tagLabels = filters.tagIds
        .map(id => options.tags.find(t => t.value === id)?.label || id)
        .join(', ')
      chips.push({
        key: 'tagIds',
        label: filters.tagIds.length === 1 ? tagLabels : `${filters.tagIds.length} tagov`,
        value: filters.tagIds,
      })
    }

    if (filters.sortBy !== 'default') {
      const option = options.sortOptions.find(s => s.value === filters.sortBy)
      chips.push({
        key: 'sortBy',
        label: option?.label || filters.sortBy,
        value: filters.sortBy,
      })
    }

    return chips
  }, [filters, options])

  return (
    <div className={cn('space-y-2', className)}>
      {/* Filter dropdowns row - DESKTOP ONLY */}
      <div className="hidden lg:flex items-center gap-2 flex-wrap py-2">
        {/* Strážci vesmíru (Assignees) */}
        {!hideFilters.includes('assignee') && (
          <FilterDropdown
            label="Strážci vesmíru"
            options={options.assignees.map(a => ({
              value: a.value,
              label: a.label,
              count: a.count,
              avatarUrl: a.avatarUrl,
            }))}
            value={filters.assigneeIds.length > 0 ? filters.assigneeIds[0] : null}
            onChange={(value) => {
              if (value === null) {
                onFilterChange('assigneeIds', [])
              } else {
                onFilterChange('assigneeIds', [value as string])
              }
            }}
            allLabel="Všetci"
          />
        )}

        {/* Status */}
        {!hideFilters.includes('status') && (
          <FilterDropdown
            label="Status"
            options={options.statuses.map(s => ({
              value: s.value,
              label: s.label,
              count: s.count,
            }))}
            value={filters.status}
            onChange={(value) => onFilterChange('status', value as TaskStatus | null)}
            allLabel="Všetky"
          />
        )}

        {/* Oddelenie (Area) */}
        {!hideFilters.includes('area') && areas.length > 0 && (
          <FilterDropdown
            label="Oddelenie"
            options={options.areas.map(a => ({
              value: a.value,
              label: a.label,
              count: a.count,
              color: a.color,
            }))}
            value={filters.areaId}
            onChange={(value) => onFilterChange('areaId', value as string | null)}
            allLabel="Všetky"
          />
        )}

        {/* Priorita */}
        {!hideFilters.includes('priority') && (
          <FilterDropdown
            label="Priorita"
            options={options.priorities.map(p => ({
              value: p.value,
              label: p.label,
              count: p.count,
            }))}
            value={filters.priority}
            onChange={(value) => onFilterChange('priority', value as TaskPriority | null)}
            allLabel="Všetky"
          />
        )}

        {/* Termín (Due Date) */}
        {!hideFilters.includes('dueDate') && (
          <FilterDropdown
            label="Termín"
            options={options.dueDates.map(d => ({
              value: d.value,
              label: d.label,
              count: d.count,
            }))}
            value={filters.dueDate}
            onChange={(value) => onFilterChange('dueDate', value as DueDateFilter | null)}
            allLabel="Všetky"
          />
        )}

        {/* Tagy (multi-select) */}
        {!hideFilters.includes('tags') && (
          <FilterDropdown
            label="Tagy"
            options={options.tags.map(t => ({
              value: t.value,
              label: t.label,
              count: t.count,
              color: t.color,
            }))}
            value={filters.tagIds.length > 0 ? filters.tagIds : null}
            onChange={(value) => {
              if (value === null) {
                onFilterChange('tagIds', [])
              } else if (Array.isArray(value)) {
                onFilterChange('tagIds', value)
              } else {
                onFilterChange('tagIds', [value])
              }
            }}
            multiSelect
            allLabel="Všetky"
          />
        )}

        {/* Zoradiť (Sort) */}
        {!hideFilters.includes('sort') && (
          <FilterDropdown
            label="Zoradiť"
            options={options.sortOptions.filter(s => s.value !== 'default').map(s => ({
              value: s.value,
              label: s.label,
              count: s.count,
            }))}
            value={filters.sortBy !== 'default' ? filters.sortBy : null}
            onChange={(value) => onFilterChange('sortBy', (value as SortOption) || 'default')}
            showCounts={false}
            allLabel="Predvolené"
          />
        )}
      </div>

      {/* Active filter chips - DESKTOP ONLY */}
      {hasActiveFilters && activeFilters.length > 0 && (
        <div className="hidden lg:block">
          <FilterChips
            filters={activeFilters}
            onClearFilter={onClearFilter}
            onClearAll={onClearFilters}
          />
        </div>
      )}
    </div>
  )
}
