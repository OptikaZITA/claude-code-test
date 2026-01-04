'use client'

import { X } from 'lucide-react'
import { Tag } from '@/types'
import { cn } from '@/lib/utils/cn'

interface TagChipProps {
  tag: Tag
  size?: 'sm' | 'md'
  removable?: boolean
  onClick?: () => void
  onRemove?: () => void
  className?: string
}

export function TagChip({
  tag,
  size = 'sm',
  removable = false,
  onClick,
  onRemove,
  className,
}: TagChipProps) {
  const baseColor = tag.color || '#007AFF'

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      style={{
        backgroundColor: `${baseColor}20`,
        color: baseColor,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: baseColor }}
      />
      <span>{tag.name}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

interface TagChipListProps {
  tags: Tag[]
  size?: 'sm' | 'md'
  removable?: boolean
  onTagClick?: (tag: Tag) => void
  onTagRemove?: (tag: Tag) => void
  className?: string
}

export function TagChipList({
  tags,
  size = 'sm',
  removable = false,
  onTagClick,
  onTagRemove,
  className,
}: TagChipListProps) {
  if (tags.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {tags.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          size={size}
          removable={removable}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
          onRemove={onTagRemove ? () => onTagRemove(tag) : undefined}
        />
      ))}
    </div>
  )
}
