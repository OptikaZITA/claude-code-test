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
  User,
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
  /** Všetci používatelia organizácie - pre Strážci vesmíru dropdown */
  allOrganizationUsers?: User[]
  className?: string
  /** Hide specific filter categories */
  hideFilters?: Array<'assignee' | 'status' | 'area' | 'priority' | 'dueDate' | 'tags' | 'sort'>
  /** Callback for database-level assignee filter change ('all' | 'unassigned' | user_id | undefined) */
  onDbAssigneeChange?: (value: string | undefined) => void
  /** Current database-level assignee filter (undefined = default = current user) */
  dbAssigneeFilter?: string
  /** Current user ID - for marking "(ja)" in dropdown */
  currentUserId?: string
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
  allOrganizationUsers = [],
  className,
  hideFilters = [],
  onDbAssigneeChange,
  dbAssigneeFilter,
  currentUserId,
}: CascadingFilterBarProps) {
  // Get cascading filter options - pass all organization users for full dropdown
  const options = useCascadingFilters(tasks, filters, areas, allTags, allOrganizationUsers)

  // Build active filters for chips
  const activeFilters = useMemo(() => {
    const chips: Array<{
      key: keyof TaskFilters | 'dbAssignee'
      label: string
      value: unknown
    }> = []

    // Database-level assignee filter
    // undefined = default (žiadny filter, sivý button, žiadny chip)
    // 'unassigned' | userId = aktívny filter (modrý button, chip)
    // NOTE: 'all' option was removed - no longer supported
    if (dbAssigneeFilter === 'unassigned') {
      chips.push({
        key: 'dbAssignee',
        label: 'Nepriradené',
        value: 'unassigned',
      })
    } else if (dbAssigneeFilter) {
      // Konkrétny používateľ - aktívny filter
      const option = options.assignees.find(a => a.value === dbAssigneeFilter)
      const label = option?.label || dbAssigneeFilter
      chips.push({
        key: 'dbAssignee',
        label: label,
        value: dbAssigneeFilter,
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
  }, [filters, options, dbAssigneeFilter, currentUserId])

  // Handler pre zrušenie filtra - podporuje aj dbAssignee
  const handleClearFilter = (key: keyof TaskFilters | string) => {
    if (key === 'dbAssignee') {
      // Reset na default (aktuálny používateľ)
      onDbAssigneeChange?.(undefined)
    } else {
      onClearFilter(key as keyof TaskFilters)
    }
  }

  // Či sú aktívne filtre vrátane dbAssigneeFilter
  // Filter je aktívny ak niečo vybraté (vrátane seba) - undefined = default, žiadny filter
  const hasDbAssigneeFilter = dbAssigneeFilter !== undefined
  const hasAnyActiveFilters = hasActiveFilters || hasDbAssigneeFilter

  return (
    <div className={cn('space-y-2', className)}>
      {/* Filter dropdowns row - DESKTOP ONLY */}
      <div className="hidden lg:flex items-center gap-2 flex-wrap py-2">
        {/* Strážci vesmíru (Assignees) - Database-level filter */}
        {!hideFilters.includes('assignee') && (() => {
          // Filtrovať "unassigned" z hlavného zoznamu - bude ako specialOption
          const userOptions = options.assignees.filter(a => a.value !== 'unassigned')
          const unassignedOption = options.assignees.find(a => a.value === 'unassigned')

          // Vybrané meno pre tlačidlo (ak je filter aktívny)
          const getSelectedLabel = () => {
            if (!dbAssigneeFilter) return null
            if (dbAssigneeFilter === 'unassigned') return 'Nepriradené'
            const option = userOptions.find(a => a.value === dbAssigneeFilter)
            return option?.label || null
          }

          return (
            <FilterDropdown
              label="Strážci vesmíru"
              options={userOptions.map(a => ({
                value: a.value,
                label: a.label,
                count: a.count,
                avatarUrl: a.avatarUrl,
              }))}
              value={dbAssigneeFilter || null}
              onChange={(value) => {
                if (value === 'unassigned') {
                  // "Nepriradené" - ukáž úlohy bez assignee
                  onDbAssigneeChange?.('unassigned')
                } else if (value) {
                  // Konkrétny používateľ - aktívny filter
                  onDbAssigneeChange?.(value as string)
                }
              }}
              hideAllOption={true}
              showSelectedLabelOnButton={true}
              onClear={() => onDbAssigneeChange?.(undefined)}
              specialOption={unassignedOption ? {
                value: 'unassigned',
                label: 'Nepriradené',
                count: unassignedOption.count,
                avatarUrl: null,
              } : undefined}
            />
          )
        })()}

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
      {hasAnyActiveFilters && activeFilters.length > 0 && (
        <div className="hidden lg:block">
          <FilterChips
            filters={activeFilters}
            onClearFilter={handleClearFilter}
            onClearAll={() => {
              onClearFilters()
              onDbAssigneeChange?.(undefined)
            }}
          />
        </div>
      )}
    </div>
  )
}
