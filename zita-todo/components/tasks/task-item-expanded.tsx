'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Tag, FolderOpen, Layers, Flag, User, X, Trash2, Clock, Repeat, Lock, LockOpen, Calendar } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { sk } from 'date-fns/locale'
import { TaskWithRelations, RecurrenceRule, TaskPriority } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar } from '@/components/ui/avatar'
import { TagChipList } from '@/components/tags'
import { cn } from '@/lib/utils/cn'
import { InlineDeadlinePicker } from './inline-deadline-picker'
import { InlineTagSelector } from './inline-tag-selector'
import { InlineLocationSelector } from './inline-location-selector'
import { InlineTimeTracker } from './inline-time-tracker'
import { RecurrenceConfigModal } from './recurrence-config-modal'

const FADE_OUT_DURATION = 300 // ms - animation duration

interface TaskItemExpandedProps {
  task: TaskWithRelations
  onUpdate: (updates: Partial<TaskWithRelations>) => void
  onComplete: (completed: boolean) => void
  onCollapse: () => void
  onDelete?: () => void
  /** Skip fade-out animation (e.g. in Kanban where task moves to Done column) */
  skipFadeOut?: boolean
}

export function TaskItemExpanded({
  task,
  onUpdate,
  onComplete,
  onCollapse,
  onDelete,
  skipFadeOut = false,
}: TaskItemExpandedProps) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || '')
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const priorityButtonRef = useRef<HTMLButtonElement>(null)

  const isCompleted = task.status === 'done'
  const hasRecurrence = !!task.recurrence_rule

  // Handler for completing task with fade-out animation
  const handleCompleteWithAnimation = useCallback((checked: boolean) => {
    // If uncompleting, no animation needed
    if (!checked) {
      onComplete(false)
      return
    }

    // If already completed or skipFadeOut is true, complete immediately
    if (isCompleted || skipFadeOut) {
      onComplete(true)
      return
    }

    // Start fade-out animation
    setIsAnimatingOut(true)

    // After animation, call onComplete
    setTimeout(() => {
      onComplete(true)
    }, FADE_OUT_DURATION)
  }, [isCompleted, onComplete, skipFadeOut])

  // Sync local state with task prop when task changes
  useEffect(() => {
    setTitle(task.title)
    setNotes(task.notes || '')
  }, [task.id, task.title, task.notes])

  // Focus title on mount
  useEffect(() => {
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }, [])

  // Close priority dropdown on click outside
  useEffect(() => {
    if (!showPriorityDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityButtonRef.current && !priorityButtonRef.current.contains(e.target as Node)) {
        setShowPriorityDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showPriorityDropdown])

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

  // Handle keyboard on notes: Cmd/Ctrl+Enter to save, Escape to cancel
  const handleNotesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setNotes(task.notes || '') // Reset to original
      onCollapse()
    }
    // Cmd/Ctrl + Enter or Cmd/Ctrl + S to save
    if ((e.key === 'Enter' || e.key === 's') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      const currentNotes = notes.trim()
      const originalNotes = (task.notes || '').trim()
      if (currentNotes !== originalNotes) {
        onUpdate({ notes: currentNotes || null })
      }
      notesRef.current?.blur()
    }
  }

  // Deadline change
  const handleDeadlineChange = (deadline: string | null) => {
    onUpdate({ deadline })
  }

  // Location (area/project) change
  const handleLocationChange = (areaId: string | null, projectId: string | null) => {
    onUpdate({ area_id: areaId, project_id: projectId })
  }

  // Recurrence change
  const handleRecurrenceSave = (rule: RecurrenceRule | null) => {
    onUpdate({ recurrence_rule: rule })
  }

  // Priority change
  const handlePriorityChange = (priority: TaskPriority | null) => {
    onUpdate({ priority })
    setShowPriorityDropdown(false)
  }

  // Priority flag colors: red (high), yellow (low)
  const priorityFlagColors: Record<TaskPriority, string> = {
    high: 'text-red-500',     // Červená
    low: 'text-yellow-500',   // Žltá
  }

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--border)] p-4 transition-all duration-300',
        'bg-card',
        isCompleted && !isAnimatingOut && 'opacity-60',
        // Fade-out animation
        isAnimatingOut && 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Row 1: Checkbox + Title */}
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isCompleted || isAnimatingOut}
            onChange={handleCompleteWithAnimation}
            disabled={isAnimatingOut}
          />
        </div>

        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          placeholder="Názov úlohy"
          className={cn(
            'flex-1 bg-transparent text-base font-medium outline-none',
            'text-foreground placeholder:text-muted-foreground',
            (isCompleted || isAnimatingOut) && 'line-through text-muted-foreground'
          )}
        />
      </div>

      {/* Row 2: Notes */}
      <div className="mt-3 pl-8">
        <textarea
          ref={notesRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={(e) => {
            const currentNotes = e.target.value.trim()
            const originalNotes = (task.notes || '').trim()
            if (currentNotes !== originalNotes) {
              onUpdate({ notes: currentNotes || null })
            }
          }}
          onKeyDown={handleNotesKeyDown}
          placeholder="Poznámky..."
          rows={1}
          className="w-full resize-none bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Row 3: Toolbar */}
      <div className="mt-4 pl-8 flex items-center justify-end">
        {/* Toolbar icons */}
        <div className="flex items-center gap-1">
          {/* Time Tracker */}
          <InlineTimeTracker taskId={task.id} />

          {/* Divider */}
          <div className="w-px h-5 bg-[var(--border)] mx-1" />

          {/* Priority */}
          <div className="relative">
            <button
              ref={priorityButtonRef}
              onClick={(e) => {
                e.stopPropagation()
                setShowPriorityDropdown(!showPriorityDropdown)
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                task.priority && ['high', 'low'].includes(task.priority)
                  ? priorityFlagColors[task.priority]
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              title="Priorita"
            >
              <Flag className="h-4 w-4" fill={task.priority && ['high', 'low'].includes(task.priority) ? 'currentColor' : 'none'} />
            </button>

            {/* Priority Dropdown - len 2 úrovne: Vysoká (červená) a Nízka (žltá) */}
            {showPriorityDropdown && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={() => handlePriorityChange(null)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2',
                    task.priority === null && 'bg-accent'
                  )}
                >
                  <span className="w-4 h-4" />
                  Žiadna
                </button>
                <button
                  onClick={() => handlePriorityChange('high')}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2',
                    task.priority === 'high' && 'bg-accent'
                  )}
                >
                  <Flag className="h-4 w-4 text-red-500" fill="currentColor" />
                  Vysoká
                </button>
                <button
                  onClick={() => handlePriorityChange('low')}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2',
                    task.priority === 'low' && 'bg-accent'
                  )}
                >
                  <Flag className="h-4 w-4 text-yellow-500" fill="currentColor" />
                  Nízka
                </button>
              </div>
            )}
          </div>

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

          {/* Recurrence */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowRecurrenceModal(true)
            }}
            className={cn(
              'p-2 rounded-lg transition-colors',
              hasRecurrence
                ? 'text-primary hover:bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            title={hasRecurrence ? 'Upraviť opakovanie' : 'Nastaviť opakovanie'}
          >
            <Repeat className="h-4 w-4" />
          </button>

          {/* Private toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onUpdate({ is_private: !task.is_private })
            }}
            className={cn(
              'p-2 rounded-lg transition-colors',
              task.is_private
                ? 'text-primary hover:bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
            title={task.is_private ? 'Zrušiť súkromie' : 'Označiť ako súkromné'}
          >
            {task.is_private ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-[var(--border)] mx-1" />

          {/* Delete */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-2 rounded-lg text-muted-foreground hover:text-error hover:bg-error/10 transition-colors"
              title="Vymazať"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Row 4: Metadata (right aligned) */}
      <div className="mt-3 pl-8 flex items-center justify-end gap-3 text-xs text-muted-foreground">
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
          <div className={cn(
            "flex items-center gap-1",
            task.assignee.status === 'inactive' && "opacity-60"
          )}>
            <Avatar
              src={task.assignee.avatar_url}
              name={task.assignee.full_name}
              size="xs"
            />
            <span>{task.assignee.nickname || task.assignee.full_name?.split(' ')[0]}</span>
            {task.assignee.status === 'inactive' && (
              <span className="text-[10px] text-[var(--text-secondary)]">(neakt.)</span>
            )}
          </div>
        )}

        {task.tags && task.tags.length > 0 && (
          <TagChipList tags={task.tags.slice(0, 3)} size="sm" />
        )}
      </div>

      {/* Row 5: Creation date */}
      {task.created_at && (
        <div className="mt-2 pl-8 flex items-center justify-end text-[11px] text-muted-foreground/70">
          <Calendar className="h-3 w-3 mr-1" />
          <span>
            Vytvorené: {format(new Date(task.created_at), 'd.M.yyyy', { locale: sk })}
            {' '}
            <span className="opacity-70">
              ({formatDistanceToNow(new Date(task.created_at), { locale: sk, addSuffix: true })})
            </span>
          </span>
        </div>
      )}

      {/* Recurrence Modal */}
      <RecurrenceConfigModal
        isOpen={showRecurrenceModal}
        onClose={() => setShowRecurrenceModal(false)}
        task={task}
        onSave={handleRecurrenceSave}
      />
    </div>
  )
}
