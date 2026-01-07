'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Tag as TagIcon, Plus, Check } from 'lucide-react'
import { Tag } from '@/types'
import { useTags, useTaskTags } from '@/lib/hooks/use-tags'
import { cn } from '@/lib/utils/cn'

const TAG_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE',
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#8E8E93',
]

interface InlineTagSelectorProps {
  taskId: string
  selectedTags: Tag[]
  onTagsChange?: (tags: Tag[]) => void
}

export function InlineTagSelector({
  taskId,
  selectedTags: initialTags,
  onTagsChange,
}: InlineTagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5])
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update dropdown position when opened
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const dropdownWidth = 256 // w-64 = 16rem = 256px

      // Position below the trigger, aligned to the right
      let left = rect.right - dropdownWidth
      const top = rect.bottom + 8

      // Ensure dropdown doesn't go off-screen left
      if (left < 8) left = 8

      setDropdownPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  const { tags: allTags, loading, createTag } = useTags()
  const { tags: taskTags, addTag, removeTag } = useTaskTags(taskId)

  const selectedTags = initialTags.length > 0 ? initialTags : taskTags
  const hasSelectedTags = selectedTags.length > 0

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node

      // Check if clicked on trigger
      if (triggerRef.current?.contains(target)) {
        return
      }

      // Check if clicked inside dropdown (if it exists)
      if (dropdownRef.current?.contains(target)) {
        return
      }

      // Clicked outside - close dropdown
      setIsOpen(false)
      setIsCreating(false)
      setDropdownPosition(null)
    }

    // Small delay to prevent immediate closing on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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
      setSearch('')
    } catch (error) {
      console.error('Error creating tag:', error)
    }
  }

  return (
    <>
      {/* Icon trigger */}
      <button
        ref={triggerRef}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false)
            setDropdownPosition(null)
          } else {
            setIsOpen(true)
          }
        }}
        className={cn(
          'p-2 rounded-lg transition-colors relative',
          hasSelectedTags
            ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
        )}
        title={hasSelectedTags ? `${selectedTags.length} tagov` : 'Pridať tagy'}
      >
        <TagIcon className="w-4 h-4" />
        {hasSelectedTags && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[var(--color-primary)] text-white text-[10px] flex items-center justify-center">
            {selectedTags.length}
          </span>
        )}
      </button>

      {/* Dropdown via Portal */}
      {isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-64 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-xl z-[9999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-[var(--border-primary)]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať alebo vytvoriť..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Tags list */}
          <div className="max-h-48 overflow-y-auto p-2">
            {loading ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                Načítavam...
              </div>
            ) : filteredTags.length === 0 && !search ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                Žiadne tagy
              </div>
            ) : (
              <>
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--bg-secondary)] transition-colors"
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

                {/* Create new tag option */}
                {search && !filteredTags.some((t) => t.name.toLowerCase() === search.toLowerCase()) && (
                  <button
                    onClick={() => {
                      setNewTagName(search)
                      setIsCreating(true)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[var(--color-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
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
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
                  className="flex-1 px-3 py-2 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  Zrušiť
                </button>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Vytvoriť
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
