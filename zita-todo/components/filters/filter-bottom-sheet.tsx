'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'
import {
  TaskFilters,
  TaskStatus,
  TaskPriority,
  DueDateFilter,
  SortOption,
  Tag,
} from '@/types'

interface ColleagueOption {
  id: string
  name: string
  avatar_url: string | null
  taskCount: number
}

interface FilterBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  filters: TaskFilters
  onFilterChange: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  colleagues: ColleagueOption[]
  unassignedCount: number
  tags: Tag[]
  selectedTagIds: string[]
  onTagToggle: (tagId: string) => void
  onClearTags: () => void
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

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'Vysoká' },
  { value: 'low', label: 'Nízka' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'default', label: 'Predvolené' },
  { value: 'deadline_asc', label: 'Termín (najbližší)' },
  { value: 'deadline_desc', label: 'Termín (najďalší)' },
]

export function FilterBottomSheet({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  colleagues,
  unassignedCount,
  tags,
  selectedTagIds,
  onTagToggle,
  onClearTags,
}: FilterBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Handle swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const diff = e.touches[0].clientY - startY
    if (diff > 0) {
      setCurrentY(diff)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (currentY > 100) {
      onClose()
    }
    setCurrentY(0)
  }

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const selectedAssignee = filters.assigneeIds[0] || null
  const hasTagFilters = selectedTagIds.length > 0

  const handleClearAll = () => {
    onClearFilters()
    onClearTags()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-card rounded-t-2xl shadow-lg',
          'animate-in slide-in-from-bottom duration-300',
          'max-h-[85vh] flex flex-col'
        )}
        style={{
          transform: isDragging ? `translateY(${currentY}px)` : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <h3 className="text-lg font-semibold">Filtre</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent/50 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* TAGY - Multi-select checkboxes */}
          {tags.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tagy
              </h4>
              <div className="space-y-1">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={() => onTagToggle(tag.id)}
                      className="text-primary rounded"
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color || '#888' }}
                    />
                    <span className="text-sm">{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && <hr className="border-border my-3" />}

          {/* KTO - Assignee */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Kto
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFilterChange('assigneeIds', [])}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-colors',
                  selectedAssignee === null
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                Všetci
              </button>
              {colleagues.map((colleague) => (
                <button
                  key={colleague.id}
                  onClick={() => onFilterChange('assigneeIds', [colleague.id])}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1',
                    selectedAssignee === colleague.id
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {colleague.name}
                </button>
              ))}
              {unassignedCount > 0 && (
                <button
                  onClick={() => onFilterChange('assigneeIds', ['unassigned'])}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-colors',
                    selectedAssignee === 'unassigned'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  Nepriradené
                </button>
              )}
            </div>
          </div>

          <hr className="border-border my-3" />

          {/* STATUS */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Status
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFilterChange('status', null)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-colors',
                  filters.status === null
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                Všetky
              </button>
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFilterChange('status', option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-colors',
                    filters.status === option.value
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-border my-3" />

          {/* TERMÍN */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Termín
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFilterChange('dueDate', null)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-colors',
                  filters.dueDate === null
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                Všetky
              </button>
              {DUE_DATE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFilterChange('dueDate', option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-colors',
                    filters.dueDate === option.value
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-border my-3" />

          {/* PRIORITA */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Priorita
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onFilterChange('priority', null)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-colors',
                  filters.priority === null
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                Všetky
              </button>
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFilterChange('priority', option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-colors',
                    filters.priority === option.value
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-border my-3" />

          {/* ZORADIŤ */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Zoradiť
            </h4>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFilterChange('sortBy', option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-colors',
                    filters.sortBy === option.value
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {option.label}
                  {option.value === 'deadline_asc' && ' \u2191'}
                  {option.value === 'deadline_desc' && ' \u2193'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-primary text-white rounded-lg font-medium"
          >
            Použiť
          </button>
          {(hasActiveFilters || hasTagFilters) && (
            <button
              onClick={handleClearAll}
              className="py-3 px-4 text-primary font-medium"
            >
              Zrušiť
            </button>
          )}
        </div>
      </div>
    </>
  )
}
