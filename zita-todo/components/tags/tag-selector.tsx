'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Check, Tag as TagIcon } from 'lucide-react'
import { Tag } from '@/types'
import { TagChip, TagChipList } from './tag-chip'
import { useTags, useTaskTags } from '@/lib/hooks/use-tags'
import { cn } from '@/lib/utils/cn'

const TAG_COLORS = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#00C7BE', // Teal
  '#007AFF', // Blue
  '#5856D6', // Indigo
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#8E8E93', // Gray
]

interface TagSelectorProps {
  taskId: string
  selectedTags: Tag[]
  onTagsChange?: (tags: Tag[]) => void
  className?: string
}

export function TagSelector({
  taskId,
  selectedTags: initialTags,
  onTagsChange,
  className,
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5]) // Default blue
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { tags: allTags, loading: allTagsLoading, createTag } = useTags()
  const { tags: taskTags, addTag, removeTag } = useTaskTags(taskId)

  // Use task tags if no initial tags provided
  const selectedTags = initialTags.length > 0 ? initialTags : taskTags

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const filteredTags = allTags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  )

  const isTagSelected = (tagId: string) =>
    selectedTags.some((t) => t.id === tagId)

  const handleToggleTag = async (tag: Tag) => {
    try {
      if (isTagSelected(tag.id)) {
        await removeTag(tag.id)
        onTagsChange?.(selectedTags.filter((t) => t.id !== tag.id))
      } else {
        await addTag(tag.id)
        onTagsChange?.([...selectedTags, tag])
      }
    } catch (error) {
      console.error('Error toggling tag:', error)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      const newTag = await createTag(newTagName.trim(), newTagColor)
      await addTag(newTag.id)
      onTagsChange?.([...selectedTags, newTag])
      setNewTagName('')
      setIsCreating(false)
    } catch (error) {
      console.error('Error creating tag:', error)
    }
  }

  // Quick create with default gray color (Enter key shortcut)
  const handleQuickCreate = async () => {
    if (!search.trim()) return

    try {
      const newTag = await createTag(search.trim(), '#6B7280') // Default gray
      await addTag(newTag.id)
      onTagsChange?.([...selectedTags, newTag])
      setSearch('')
    } catch (error) {
      console.error('Error creating tag:', error)
    }
  }

  const handleRemoveTag = async (tag: Tag) => {
    try {
      await removeTag(tag.id)
      onTagsChange?.(selectedTags.filter((t) => t.id !== tag.id))
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Selected tags display */}
      <div className="flex flex-wrap items-center gap-2">
        <TagChipList
          tags={selectedTags}
          removable
          onTagRemove={handleRemoveTag}
        />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-1',
            'text-xs text-[var(--text-secondary)]',
            'border border-dashed border-[var(--border-primary)]',
            'hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
            'transition-colors'
          )}
        >
          <Plus className="h-3 w-3" />
          <span>Tag</span>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-[var(--border-primary)]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať alebo vytvoriť tag..."
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg',
                'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                'placeholder:text-[var(--text-secondary)]',
                'outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
              )}
              onKeyDown={(e) => {
                // Enter key creates tag directly with default color
                if (e.key === 'Enter' && search.trim() && !filteredTags.some((t) => t.name.toLowerCase() === search.toLowerCase())) {
                  e.preventDefault()
                  handleQuickCreate()
                }
              }}
            />
          </div>

          {/* Tags list */}
          <div className="max-h-48 overflow-y-auto p-2">
            {allTagsLoading ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                Načítavam...
              </div>
            ) : filteredTags.length === 0 && !search ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                Žiadne tagy
              </div>
            ) : (
              <>
                {filteredTags.length === 0 && search && (
                  <div className="py-3 text-center text-sm text-[var(--text-secondary)]">
                    Žiadne výsledky
                  </div>
                )}
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2',
                      'hover:bg-[var(--bg-secondary)] transition-colors'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color || '#007AFF' }}
                      />
                      <span className="text-sm text-[var(--text-primary)]">
                        {tag.name}
                      </span>
                    </div>
                    {isTagSelected(tag.id) && (
                      <Check className="h-4 w-4 text-[var(--color-primary)]" />
                    )}
                  </button>
                ))}

                {/* Create new tag option - shows when search text doesn't exactly match any tag */}
                {search && !filteredTags.some((t) => t.name.toLowerCase() === search.toLowerCase()) && (
                  <button
                    onClick={() => {
                      setNewTagName(search)
                      setIsCreating(true)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2',
                      'text-[var(--color-primary)]',
                      'hover:bg-[var(--bg-secondary)] transition-colors'
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">Vytvoriť "{search}"</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Create new tag form */}
          {isCreating && (
            <div className="border-t border-[var(--border-primary)] p-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Názov tagu
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className={cn(
                    'w-full mt-1 px-3 py-2 text-sm rounded-lg',
                    'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                    'outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
                  )}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Farba
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={cn(
                        'h-6 w-6 rounded-full transition-transform',
                        newTagColor === color && 'ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCreating(false)
                    setNewTagName('')
                  }}
                  className={cn(
                    'flex-1 px-3 py-2 text-sm rounded-lg',
                    'text-[var(--text-secondary)]',
                    'hover:bg-[var(--bg-secondary)] transition-colors'
                  )}
                >
                  Zrušiť
                </button>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className={cn(
                    'flex-1 px-3 py-2 text-sm rounded-lg',
                    'bg-[var(--color-primary)] text-white',
                    'hover:opacity-90 transition-opacity',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  Vytvoriť
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
