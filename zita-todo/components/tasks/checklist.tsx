'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, CheckSquare } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ChecklistItem as ChecklistItemType } from '@/types'
import { ChecklistItem } from './checklist-item'
import { cn } from '@/lib/utils/cn'

interface ChecklistProps {
  items: ChecklistItemType[]
  onChange: (items: ChecklistItemType[]) => void
  className?: string
}

export function Checklist({ items, onChange, className }: ChecklistProps) {
  const [newItemText, setNewItemText] = useState('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (isAddingItem && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingItem])

  const handleAddItem = useCallback(() => {
    if (newItemText.trim()) {
      const newItem: ChecklistItemType = {
        id: crypto.randomUUID(),
        text: newItemText.trim(),
        completed: false,
      }
      onChange([...items, newItem])
      setNewItemText('')
    }
    setIsAddingItem(false)
  }, [newItemText, items, onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (newItemText.trim()) {
        const newItem: ChecklistItemType = {
          id: crypto.randomUUID(),
          text: newItemText.trim(),
          completed: false,
        }
        onChange([...items, newItem])
        setNewItemText('')
        // Keep input focused for adding more items
      }
    } else if (e.key === 'Escape') {
      setNewItemText('')
      setIsAddingItem(false)
    }
  }

  const handleToggle = useCallback((id: string, completed: boolean) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, completed } : item
      )
    )
  }, [items, onChange])

  const handleUpdate = useCallback((id: string, text: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, text } : item
      )
    )
  }, [items, onChange])

  const handleDelete = useCallback((id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }, [items, onChange])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      onChange(arrayMove(items, oldIndex, newIndex))
    }
  }

  const completedCount = items.filter((item) => item.completed).length
  const totalCount = items.length

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Checklist
          </span>
          {totalCount > 0 && (
            <span className="text-xs text-[var(--text-secondary)]">
              ({completedCount}/{totalCount})
            </span>
          )}
        </div>
        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="w-20 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-success)] transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {items.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add item input */}
      {isAddingItem ? (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-6" /> {/* Spacer for alignment */}
          <div className="w-5" /> {/* Checkbox spacer */}
          <input
            ref={inputRef}
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAddItem}
            placeholder="Nová položka..."
            className={cn(
              'flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none',
              'placeholder:text-[var(--text-secondary)]'
            )}
          />
        </div>
      ) : (
        <button
          onClick={() => setIsAddingItem(true)}
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg',
            'text-sm text-[var(--text-secondary)]',
            'hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]',
            'transition-colors'
          )}
        >
          <div className="w-6" /> {/* Spacer for alignment */}
          <Plus className="h-4 w-4" />
          <span>Pridať položku</span>
        </button>
      )}
    </div>
  )
}
