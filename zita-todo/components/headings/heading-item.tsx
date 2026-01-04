'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Heading } from '@/types'
import { Dropdown } from '@/components/ui/dropdown'

interface HeadingItemProps {
  heading: Heading
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (title: string) => Promise<void>
  onDelete: () => Promise<void>
  children?: React.ReactNode
}

export function HeadingItem({
  heading,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  children,
}: HeadingItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(heading.title)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!editTitle.trim() || editTitle === heading.title) {
      setIsEditing(false)
      setEditTitle(heading.title)
      return
    }

    setIsLoading(true)
    try {
      await onUpdate(editTitle.trim())
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update heading:', error)
      setEditTitle(heading.title)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Naozaj chcete odstrániť túto sekciu? Úlohy v nej zostanú, ale budú bez sekcie.')) {
      return
    }

    setIsLoading(true)
    try {
      await onDelete()
    } catch (error) {
      console.error('Failed to delete heading:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditTitle(heading.title)
    }
  }

  return (
    <div className="mb-2">
      <div className="group flex items-center gap-2 py-2 px-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 transition-colors">
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label={isExpanded ? 'Zbaliť sekciu' : 'Rozbaliť sekciu'}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
        </button>

        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none font-semibold text-[var(--text-primary)]"
            autoFocus
            disabled={isLoading}
          />
        ) : (
          <span
            className="flex-1 font-semibold text-[var(--text-primary)] cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            {heading.title}
          </span>
        )}

        <Dropdown
          trigger={
            <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all">
              <MoreHorizontal className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          }
          align="right"
        >
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Premenovať
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-[var(--color-error)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Odstrániť
          </button>
        </Dropdown>
      </div>

      {isExpanded && children && (
        <div className="ml-6 mt-1 border-l-2 border-[var(--bg-secondary)] pl-3">
          {children}
        </div>
      )}
    </div>
  )
}
