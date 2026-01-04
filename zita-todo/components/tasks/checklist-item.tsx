'use client'

import { useState, useRef, useEffect } from 'react'
import { GripVertical, X } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChecklistItem as ChecklistItemType } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils/cn'

interface ChecklistItemProps {
  item: ChecklistItemType
  onToggle: (id: string, completed: boolean) => void
  onUpdate: (id: string, text: string) => void
  onDelete: (id: string) => void
}

export function ChecklistItem({
  item,
  onToggle,
  onUpdate,
  onDelete,
}: ChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(item.text)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    if (text.trim() !== item.text) {
      if (text.trim() === '') {
        onDelete(item.id)
      } else {
        onUpdate(item.id, text.trim())
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setText(item.text)
      setIsEditing(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
        'hover:bg-[var(--bg-secondary)]',
        isDragging && 'opacity-50 bg-[var(--bg-secondary)]'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-[var(--text-secondary)]" />
      </button>

      {/* Checkbox */}
      <Checkbox
        checked={item.completed}
        onChange={(checked) => onToggle(item.id, checked)}
      />

      {/* Text */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none',
            'border-b border-[var(--color-primary)]'
          )}
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={cn(
            'flex-1 text-sm cursor-text',
            item.completed
              ? 'text-[var(--text-secondary)] line-through'
              : 'text-[var(--text-primary)]'
          )}
        >
          {item.text}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={() => onDelete(item.id)}
        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-tertiary)] rounded"
      >
        <X className="h-4 w-4 text-[var(--text-secondary)]" />
      </button>
    </div>
  )
}
