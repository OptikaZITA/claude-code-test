'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { FilterTriggerButton } from './filter-trigger-button'
import { FilterDropdownPanel } from './filter-dropdown-panel'
import { FilterBottomSheet } from './filter-bottom-sheet'
import { ActiveFiltersChips, ActiveFiltersBanner } from './active-filters-chips'
import { TaskFilters, TaskWithRelations, Tag, User } from '@/types'

interface UnifiedFilterBarProps {
  tasks: TaskWithRelations[]
  filters: TaskFilters
  onFilterChange: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void
  onClearFilters: () => void
  onClearFilter: (key: keyof TaskFilters) => void
  hasActiveFilters: boolean
  // Tag filter props
  selectedTag: string | null
  onSelectTag: (tagId: string | null) => void
  className?: string
}

interface ColleagueOption {
  id: string
  name: string
  avatar_url: string | null
  taskCount: number
}

export function UnifiedFilterBar({
  tasks,
  filters,
  onFilterChange,
  onClearFilters,
  onClearFilter,
  hasActiveFilters,
  selectedTag,
  onSelectTag,
  className,
}: UnifiedFilterBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  // Extract unique tags from tasks
  const uniqueTags = useMemo(() => {
    const tagMap = new Map<string, Tag>()
    tasks.forEach(task => {
      task.tags?.forEach(tag => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag)
        }
      })
    })
    return Array.from(tagMap.values())
  }, [tasks])

  // Extract colleagues from tasks
  const { colleagues, unassignedCount } = useMemo(() => {
    const colleagueMap = new Map<string, ColleagueOption>()
    let unassigned = 0

    tasks.forEach(task => {
      if (task.assignee && task.assignee_id) {
        const existing = colleagueMap.get(task.assignee_id)
        if (existing) {
          existing.taskCount++
        } else {
          colleagueMap.set(task.assignee_id, {
            id: task.assignee_id,
            name: task.assignee.nickname || task.assignee.full_name || task.assignee.email || 'Neznámy',
            avatar_url: task.assignee.avatar_url,
            taskCount: 1,
          })
        }
      } else {
        unassigned++
      }
    })

    return {
      colleagues: Array.from(colleagueMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'sk')
      ),
      unassignedCount: unassigned,
    }
  }, [tasks])

  // Get assignee name for chips
  const getAssigneeName = (id: string) => {
    if (id === 'unassigned') return 'Nepriradené'
    const colleague = colleagues.find(c => c.id === id)
    return colleague?.name || 'Kolega'
  }

  // Check if any non-default filter is active (excluding tags which are separate)
  const hasNonTagFilters = filters.status !== null ||
    filters.assigneeIds.length > 0 ||
    filters.dueDate !== null ||
    filters.priority !== null ||
    filters.sortBy !== 'default'

  // Combined has active filters
  const combinedHasActiveFilters = hasNonTagFilters || selectedTag !== null

  // Handle tag toggle for mobile multi-select
  const [mobileSelectedTags, setMobileSelectedTags] = useState<string[]>([])
  const handleMobileTagToggle = (tagId: string) => {
    setMobileSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  // Clear all including tags
  const handleClearAll = () => {
    onClearFilters()
    onSelectTag(null)
    setMobileSelectedTags([])
  }

  // Get selected tag names for banner
  const selectedTagNames = useMemo(() => {
    if (selectedTag) {
      const tag = uniqueTags.find(t => t.id === selectedTag)
      return tag ? [tag.name] : []
    }
    return mobileSelectedTags.map(id => {
      const tag = uniqueTags.find(t => t.id === id)
      return tag?.name || ''
    }).filter(Boolean)
  }, [selectedTag, mobileSelectedTags, uniqueTags])

  return (
    <>
      {/* Desktop View */}
      <div className={cn('hidden lg:block', className)}>
        <div className="flex items-center gap-2 py-2">
          {/* Filter trigger button */}
          <div className="relative">
            <FilterTriggerButton
              hasActiveFilters={hasNonTagFilters}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            />
            <FilterDropdownPanel
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              filters={filters}
              onFilterChange={onFilterChange}
              onClearFilters={onClearFilters}
              hasActiveFilters={hasNonTagFilters}
              colleagues={colleagues}
              unassignedCount={unassignedCount}
            />
          </div>

          {/* Tag pills - always visible on desktop */}
          {uniqueTags.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
              <button
                onClick={() => onSelectTag(null)}
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                  selectedTag === null
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Všetky
              </button>
              {uniqueTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => onSelectTag(tag.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                    selectedTag === tag.id
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* Active filter chips - desktop */}
          {hasNonTagFilters && (
            <ActiveFiltersChips
              filters={filters}
              onClearFilter={onClearFilter}
              onClearAll={onClearFilters}
              getAssigneeName={getAssigneeName}
              className="ml-auto"
            />
          )}
        </div>
      </div>

      {/* Mobile View - Filter button + active filters banner */}
      <div className={cn('lg:hidden', className)}>
        {/* Mobile filter trigger row */}
        <div className="flex items-center gap-2 py-2">
          <FilterTriggerButton
            hasActiveFilters={combinedHasActiveFilters}
            onClick={() => setIsBottomSheetOpen(true)}
          />

          {/* Show active tag as pill if selected */}
          {selectedTag && (
            <button
              onClick={() => onSelectTag(null)}
              className="px-3 py-1 rounded-full text-sm font-medium bg-primary text-white flex items-center gap-1"
            >
              {uniqueTags.find(t => t.id === selectedTag)?.name}
              <span className="ml-1">×</span>
            </button>
          )}
        </div>

        {/* Active filters banner - only show when non-tag filters are active */}
        {hasNonTagFilters && (
          <ActiveFiltersBanner
            filters={filters}
            selectedTagNames={[]}
            onClear={onClearFilters}
            getAssigneeName={getAssigneeName}
          />
        )}

        {/* Bottom sheet */}
        <FilterBottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => setIsBottomSheetOpen(false)}
          filters={filters}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
          hasActiveFilters={hasNonTagFilters}
          colleagues={colleagues}
          unassignedCount={unassignedCount}
          tags={uniqueTags}
          selectedTagIds={selectedTag ? [selectedTag] : mobileSelectedTags}
          onTagToggle={(tagId) => {
            // On mobile, use multi-select
            if (selectedTag === tagId) {
              onSelectTag(null)
            } else {
              onSelectTag(tagId)
            }
          }}
          onClearTags={() => {
            onSelectTag(null)
            setMobileSelectedTags([])
          }}
        />
      </div>
    </>
  )
}

// Export a simpler hook-based approach
export function useUnifiedFilters(tasks: TaskWithRelations[]) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Extract unique tags
  const uniqueTags = useMemo(() => {
    const tagMap = new Map<string, Tag>()
    tasks.forEach(task => {
      task.tags?.forEach(tag => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag)
        }
      })
    })
    return Array.from(tagMap.values())
  }, [tasks])

  // Extract colleagues
  const { colleagues, unassignedCount } = useMemo(() => {
    const colleagueMap = new Map<string, ColleagueOption>()
    let unassigned = 0

    tasks.forEach(task => {
      if (task.assignee && task.assignee_id) {
        const existing = colleagueMap.get(task.assignee_id)
        if (existing) {
          existing.taskCount++
        } else {
          colleagueMap.set(task.assignee_id, {
            id: task.assignee_id,
            name: task.assignee.nickname || task.assignee.full_name || task.assignee.email || 'Neznámy',
            avatar_url: task.assignee.avatar_url,
            taskCount: 1,
          })
        }
      } else {
        unassigned++
      }
    })

    return {
      colleagues: Array.from(colleagueMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'sk')
      ),
      unassignedCount: unassigned,
    }
  }, [tasks])

  // Filter tasks by selected tag
  const tagFilteredTasks = useMemo(() => {
    if (!selectedTag) return tasks
    return tasks.filter(task =>
      task.tags?.some(tag => tag.id === selectedTag)
    )
  }, [tasks, selectedTag])

  return {
    selectedTag,
    setSelectedTag,
    uniqueTags,
    colleagues,
    unassignedCount,
    tagFilteredTasks,
  }
}
