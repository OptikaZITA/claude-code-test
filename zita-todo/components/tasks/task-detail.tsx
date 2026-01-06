'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  X,
  Tag,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react'
import { TaskWithRelations, ChecklistItem, User, Project, WhenType, Tag as TagType } from '@/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Timer } from '@/components/time-tracking/timer'
import { TimeEntriesList } from '@/components/time-tracking/time-entries-list'
import { Checklist } from '@/components/tasks/checklist'
import { TagSelector } from '@/components/tags'
import { WhenPicker } from '@/components/tasks/when-picker'
import { DeadlinePicker } from '@/components/tasks/deadline-picker'
import { ProjectSelector } from '@/components/tasks/project-selector'
import { AssigneeSelector } from '@/components/tasks/assignee-selector'
import { useTimeTracking } from '@/lib/hooks/use-time-tracking'
import { formatDurationShort } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

interface TaskDetailProps {
  task: TaskWithRelations
  isOpen: boolean
  onClose: () => void
  onUpdate?: (updates: Partial<TaskWithRelations>) => void
  onDelete?: () => void
  onComplete?: (completed: boolean) => void
}

export function TaskDetail({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailProps) {
  // Local state for editing
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes || task.description || '')
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    task.checklist_items || []
  )
  const [whenType, setWhenType] = useState<WhenType | null>(task.when_type)
  const [whenDate, setWhenDate] = useState<string | null>(task.when_date)
  const [deadline, setDeadline] = useState<string | null>(task.deadline)
  const [project, setProject] = useState<Project | null>(task.project || null)
  const [assignee, setAssignee] = useState<User | null>(task.assignee || null)
  const [showTimeEntries, setShowTimeEntries] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  const {
    timeEntries,
    elapsedSeconds,
    totalTime,
    isRunning,
    startTimer,
    stopTimer,
    deleteTimeEntry,
  } = useTimeTracking(task.id)

  const isCompleted = task.status === 'done'

  // Sync state when task changes
  useEffect(() => {
    setTitle(task.title)
    setNotes(task.notes || task.description || '')
    setChecklistItems(task.checklist_items || [])
    setWhenType(task.when_type)
    setWhenDate(task.when_date)
    setDeadline(task.deadline)
    setProject(task.project || null)
    setAssignee(task.assignee || null)
  }, [task])

  // Auto-save handlers
  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false)
    if (title !== task.title && onUpdate) {
      onUpdate({ title })
    }
  }, [title, task.title, onUpdate])

  const handleNotesBlur = useCallback(() => {
    if (notes !== (task.notes || task.description || '') && onUpdate) {
      onUpdate({ notes, description: notes })
    }
  }, [notes, task.notes, task.description, onUpdate])

  const handleChecklistChange = useCallback((items: ChecklistItem[]) => {
    setChecklistItems(items)
    if (onUpdate) {
      onUpdate({ checklist_items: items })
    }
  }, [onUpdate])

  const handleWhenChange = useCallback((type: WhenType, date?: string | null) => {
    setWhenType(type)
    setWhenDate(date || null)
    if (onUpdate) {
      onUpdate({ when_type: type, when_date: date || null })
    }
  }, [onUpdate])

  const handleDeadlineChange = useCallback((date: string | null) => {
    setDeadline(date)
    if (onUpdate) {
      onUpdate({ deadline: date })
    }
  }, [onUpdate])

  const handleProjectChange = useCallback((proj: Project | null) => {
    setProject(proj)
    if (onUpdate) {
      onUpdate({ project_id: proj?.id || null, project: proj })
    }
  }, [onUpdate])

  const handleAssigneeChange = useCallback((user: User | null) => {
    setAssignee(user)
    if (onUpdate) {
      onUpdate({ assignee_id: user?.id || null, assignee: user })
    }
  }, [onUpdate])

  const handleComplete = useCallback((completed: boolean) => {
    if (onUpdate) {
      onUpdate({
        status: completed ? 'done' : 'todo',
        completed_at: completed ? new Date().toISOString() : null,
      })
    }
  }, [onUpdate])

  const handleTagsChange = useCallback((tags: TagType[]) => {
    if (onUpdate) {
      onUpdate({ tags })
    }
  }, [onUpdate])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex h-full flex-col">
        {/* Header - Title with checkbox */}
        <div className="flex items-start gap-3 border-b border-[var(--border-primary)] p-4">
          <div className="pt-1">
            <Checkbox
              checked={isCompleted}
              onChange={(checked) => handleComplete(checked)}
            />
          </div>

          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleBlur()
                  if (e.key === 'Escape') {
                    setTitle(task.title)
                    setIsEditingTitle(false)
                  }
                }}
                className={cn(
                  'w-full text-lg font-semibold bg-transparent outline-none',
                  'text-[var(--text-primary)]',
                  'border-b-2 border-[var(--color-primary)]'
                )}
                autoFocus
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className={cn(
                  'text-lg font-semibold cursor-text hover:bg-[var(--bg-secondary)] rounded px-1 -mx-1',
                  'text-[var(--text-primary)]',
                  isCompleted && 'line-through text-[var(--text-secondary)]'
                )}
              >
                {title}
              </h2>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Tags Row */}
          <div className="flex items-start gap-3">
            <Tag className="h-4 w-4 text-[var(--text-secondary)] mt-2 shrink-0" />
            <TagSelector
              taskId={task.id}
              selectedTags={task.tags || []}
              onTagsChange={handleTagsChange}
              className="flex-1"
            />
          </div>

          {/* When Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)] w-20">Kedy:</span>
            <WhenPicker
              value={whenType}
              whenDate={whenDate}
              onChange={handleWhenChange}
            />
          </div>

          {/* Deadline Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)] w-20">Deadline:</span>
            <DeadlinePicker
              value={deadline}
              onChange={handleDeadlineChange}
            />
          </div>

          {/* Project Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)] w-20">Projekt:</span>
            <ProjectSelector
              value={project}
              onChange={handleProjectChange}
            />
          </div>

          {/* Assignee Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-secondary)] w-20">Pridelene:</span>
            <AssigneeSelector
              value={assignee}
              onChange={handleAssigneeChange}
            />
          </div>

          {/* Notes Section */}
          <div className="pt-2">
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Poznamky
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Pridať poznámky..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Checklist Section */}
          <div className="rounded-xl bg-[var(--bg-secondary)] p-4">
            <Checklist
              items={checklistItems}
              onChange={handleChecklistChange}
            />
          </div>

          {/* Time Tracking Section */}
          <div className="rounded-xl bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
                  Sledovanie casu
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Clock className="h-3 w-3" />
                  <span>Celkovo: {formatDurationShort(task.total_time_seconds || totalTime)}</span>
                </div>
              </div>
              <Timer
                elapsedSeconds={elapsedSeconds}
                totalSeconds={totalTime}
                isRunning={isRunning}
                onStart={startTimer}
                onStop={stopTimer}
                size="lg"
              />
            </div>

            {/* Time entries toggle */}
            <button
              onClick={() => setShowTimeEntries(!showTimeEntries)}
              className="mt-3 flex w-full items-center justify-between text-sm text-[var(--color-primary)]"
            >
              <span>Zobrazit zaznamy ({timeEntries.length})</span>
              {showTimeEntries ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showTimeEntries && (
              <div className="mt-3">
                <TimeEntriesList
                  entries={timeEntries}
                  onDelete={deleteTimeEntry}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-primary)] p-4">
          {onDelete && (
            <Button
              variant="ghost"
              onClick={onDelete}
              className="text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Odstranit
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
