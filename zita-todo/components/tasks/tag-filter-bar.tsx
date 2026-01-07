'use client'

import { useMemo } from 'react'
import { Tag, TaskWithRelations } from '@/types'
import { cn } from '@/lib/utils/cn'

interface TagFilterBarProps {
  tasks: TaskWithRelations[]
  selectedTag: string | null
  onSelectTag: (tagId: string | null) => void
}

export function TagFilterBar({ tasks, selectedTag, onSelectTag }: TagFilterBarProps) {
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

  // Don't render if no tags
  if (uniqueTags.length === 0) return null

  return (
    <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
      {/* All button */}
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

      {/* Tag buttons */}
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
  )
}
