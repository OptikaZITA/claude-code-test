'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Tag, FolderOpen, Layers, Flag, User, X, Trash2 } from 'lucide-react'
import { TaskWithRelations, WhenType } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar } from '@/components/ui/avatar'
import { TagChipList } from '@/components/tags'
import { cn } from '@/lib/utils/cn'
import { InlineWhenPicker } from './inline-when-picker'
import { InlineDeadlinePicker } from './inline-deadline-picker'
import { InlineTagSelector } from './inline-tag-selector'
import { InlineLocationSelector } from './inline-location-selector'

interface TaskItemExpandedProps {
  task: TaskWithRelations
  onUpdate: (updates: Partial<TaskWithRelations>) => void
  onComplete: (completed: boolean) => void
  onCollapse: () => void
  onDelete?: () => void
}

export function TaskItemExpanded({
  task,
  onUpdate,
  onComplete,
  onCollapse,
  onDelete,
}: TaskItemExpandedProps) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const isCompleted = task.status === 'done'

  // Focus title on mount
  useEffect(() => {
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (notesRef.current) {
      notesRef.current.style.height = 'auto'
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`
    }
  }, [notes])

  // Auto-save title on blur
  const handleTitleBlur = useCallback(() => {
    if (title !== task.title && title.trim()) {
      onUpdate({ title: title.trim() })
    }
  }, [title, task.title, onUpdate])

  // Auto-save notes on blur
  const handleNotesBlur = useCallback(() => {
    if (notes !== (task.notes || '')) {
      onUpdate({ notes: notes || null })
    }
  }, [notes, task.notes, onUpdate])

  // Handle Enter key on title
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleBlur()
      notesRef.current?.focus()
    }
    if (e.key === 'Escape') {
      setTitle(task.title)
      onCollapse()
    }
  }

  // Handle Escape on notes
  const handleNotesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleNotesBlur()
      onCollapse()
    }
  }

  // When picker change
  const handleWhenChange = (whenType: WhenType, whenDate?: string | null) => {
    onUpdate({ when_type: whenType, when_date: whenDate })
  }

  // Deadline change
  const handleDeadlineChange = (deadline: string | null) => {
    onUpdate({ deadline })
  }

  // Location (area/project) change
  const handleLocationChange = (areaId: string | null, projectId: string | null) => {
    onUpdate({ area_id: areaId, project_id: projectId })
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4 shadow-lg transition-all',
        isCompleted && 'opacity-60'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Row 1: Checkbox + Title */}
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isCompleted}
            onChange={(checked) => onComplete(checked)}
          />
        </div>

        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          placeholder="Nazov ulohy"
          className={cn(
            'flex-1 bg-transparent text-base font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]',
            isCompleted && 'line-through text-[var(--text-secondary)]'
          )}
        />
      </div>

      {/* Row 2: Notes */}
      <div className="mt-3 pl-8">
        <textarea
          ref={notesRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          onKeyDown={handleNotesKeyDown}
          placeholder="Poznamky..."
          rows={1}
          className="w-full resize-none bg-transparent text-sm text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-secondary)]/50"
        />
      </div>

      {/* Row 3: When badge + Toolbar */}
      <div className="mt-4 pl-8 flex items-center justify-between gap-4">
        {/* When badge (left side) */}
        <div className="flex items-center gap-2">
          <InlineWhenPicker
            value={task.when_type}
            whenDate={task.when_date}
            onChange={handleWhenChange}
          />
        </div>

        {/* Toolbar icons (right side) */}
        <div className="flex items-center gap-1">
          {/* Tags */}
          <InlineTagSelector
            taskId={task.id}
            selectedTags={task.tags || []}
          />

          {/* Location (Area/Project) */}
          <InlineLocationSelector
            value={{ area: task.area, project: task.project }}
            onChange={handleLocationChange}
          />

          {/* Deadline */}
          <InlineDeadlinePicker
            value={task.deadline}
            onChange={handleDeadlineChange}
          />

          {/* Divider */}
          <div className="w-px h-5 bg-[var(--border-primary)] mx-1" />

          {/* Delete */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
              title="Vymazat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Row 4: Metadata (right aligned) */}
      <div className="mt-3 pl-8 flex items-center justify-end gap-3 text-xs text-[var(--text-secondary)]">
        {task.project ? (
          <span className="flex items-center gap-1">
            <FolderOpen className="h-3 w-3" />
            {task.project.name}
          </span>
        ) : task.area && (
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {task.area.name}
          </span>
        )}

        {task.assignee && (
          <div className="flex items-center gap-1">
            <Avatar
              src={task.assignee.avatar_url}
              name={task.assignee.full_name}
              size="xs"
            />
            <span>{task.assignee.full_name?.split(' ')[0]}</span>
          </div>
        )}

        {task.tags && task.tags.length > 0 && (
          <TagChipList tags={task.tags.slice(0, 3)} size="sm" />
        )}
      </div>
    </div>
  )
}
