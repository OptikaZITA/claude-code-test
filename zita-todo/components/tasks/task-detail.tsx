'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  X,
  Tag,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Flag,
  Calendar,
  Pencil,
  Repeat,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'
import { TaskWithRelations, ChecklistItem, User, Project, WhenType, Tag as TagType, TaskPriority, formatRecurrenceRule, RecurrenceRule } from '@/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { TimeEntriesList } from '@/components/time-tracking/time-entries-list'
import { Checklist } from '@/components/tasks/checklist'
import { TagSelector } from '@/components/tags'
import { WhenPicker } from '@/components/tasks/when-picker'
import { DeadlinePicker } from '@/components/tasks/deadline-picker'
import { ProjectSelector } from '@/components/tasks/project-selector'
import { AssigneeSelector } from '@/components/tasks/assignee-selector'
import { InlineTimeTracker } from '@/components/tasks/inline-time-tracker'
import { ScheduleTaskModal } from '@/components/calendar/schedule-task-modal'
import { RecurrenceConfigModal } from '@/components/tasks/recurrence-config-modal'
import { useGlobalTimerContext } from '@/lib/contexts/global-timer-context'
import { useTaskTimeTotal } from '@/lib/hooks/use-task-time-total'
import { useTimeTracking } from '@/lib/hooks/use-time-tracking'
import { useTimeBlockActions } from '@/lib/hooks/use-time-blocks'
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
  const [priority, setPriority] = useState<TaskPriority | null>(task.priority)
  const [showTimeEntries, setShowTimeEntries] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false)

  const { timeEntries, deleteTimeEntry } = useTimeTracking(task.id)
  const { totalSeconds } = useTaskTimeTotal(task.id)
  const { isRunning, currentTaskId, elapsedSeconds } = useGlobalTimerContext()
  const { scheduleTask, unscheduleTask } = useTimeBlockActions()

  const isThisTaskRunning = isRunning && currentTaskId === task.id
  const displayTotalSeconds = isThisTaskRunning ? totalSeconds + elapsedSeconds : totalSeconds

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
    setPriority(task.priority)
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

  const handlePriorityChange = useCallback((newPriority: TaskPriority | null) => {
    setPriority(newPriority)
    if (onUpdate) {
      onUpdate({ priority: newPriority })
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

  const handleRecurrenceChange = useCallback((rule: RecurrenceRule | null) => {
    if (onUpdate) {
      onUpdate({ recurrence_rule: rule })
    }
  }, [onUpdate])

  // Time block handlers
  const handleSchedule = useCallback(async (taskId: string, start: Date, end: Date) => {
    const success = await scheduleTask(taskId, start, end)
    if (success && onUpdate) {
      onUpdate({
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
      })
    }
    setShowScheduleModal(false)
  }, [scheduleTask, onUpdate])

  const handleUnschedule = useCallback(async (taskId: string) => {
    const success = await unscheduleTask(taskId)
    if (success && onUpdate) {
      onUpdate({
        scheduled_start: null,
        scheduled_end: null,
      })
    }
    setShowScheduleModal(false)
  }, [unscheduleTask, onUpdate])

  // Format scheduled time for display
  const formattedSchedule = task.scheduled_start && task.scheduled_end
    ? `${format(parseISO(task.scheduled_start), 'EEEE d. MMMM, HH:mm', { locale: sk })} - ${format(parseISO(task.scheduled_end), 'HH:mm', { locale: sk })}`
    : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" className="p-0">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 sticky top-0 bg-card z-10 border-b border-[var(--border)]">
        {/* Close button row */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isCompleted}
              onChange={(checked) => handleComplete(checked)}
            />
            <span className="text-sm text-muted-foreground">
              {isCompleted ? 'Dokončené' : 'Označiť ako dokončené'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Task Title - always visible */}
        <div className="px-4 pb-4">
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
              className="w-full text-xl font-bold bg-transparent outline-none text-foreground border-b-2 border-primary"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className={cn(
                'text-xl font-bold cursor-text hover:bg-muted rounded px-1 -mx-1',
                'text-foreground',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {title || task.title || 'Bez názvu'}
            </h1>
          )}
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="p-4 space-y-4">

          {/* Tags Row */}
          <div className="flex items-start gap-3">
            <Tag className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
            <TagSelector
              taskId={task.id}
              selectedTags={task.tags || []}
              onTagsChange={handleTagsChange}
              className="flex-1"
            />
          </div>

          {/* When Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20">Kedy:</span>
            <WhenPicker
              value={whenType}
              whenDate={whenDate}
              onChange={handleWhenChange}
            />
          </div>

          {/* Deadline Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20">Deadline:</span>
            <DeadlinePicker
              value={deadline}
              onChange={handleDeadlineChange}
            />
          </div>

          {/* Time Block Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20">Čas práce:</span>
            {formattedSchedule ? (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{formattedSchedule}</span>
                </div>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Upraviť naplánovaný čas"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border border-dashed border-border transition-colors"
              >
                <Clock className="h-4 w-4" />
                <span>Naplánovať čas na prácu</span>
              </button>
            )}
          </div>

          {/* Project Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20">Projekt:</span>
            <ProjectSelector
              value={project}
              onChange={handleProjectChange}
            />
          </div>

          {/* Assignee Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20">Pridelene:</span>
            <AssigneeSelector
              value={assignee}
              onChange={handleAssigneeChange}
            />
          </div>

          {/* Priority Row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20">Priorita:</span>
            <div className="flex items-center gap-2">
              {/* None */}
              <button
                onClick={() => handlePriorityChange(null)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                  priority === null
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >
                Žiadna
              </button>
              {/* High - red flag */}
              <button
                onClick={() => handlePriorityChange('high')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors',
                  priority === 'high'
                    ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >
                <Flag className="h-4 w-4 text-red-500" fill="currentColor" />
                Vysoká
              </button>
              {/* Low - yellow flag */}
              <button
                onClick={() => handlePriorityChange('low')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors',
                  priority === 'low'
                    ? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900/30'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >
                <Flag className="h-4 w-4 text-yellow-500" fill="currentColor" />
                Nízka
              </button>
            </div>
          </div>

          {/* Notes Section */}
          <div className="pt-2">
            <label className="mb-2 block text-sm font-medium text-foreground">
              Poznámky
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Pridať poznámky..."
              rows={6}
              className="min-h-32 resize-y"
            />
          </div>

          {/* Checklist Section */}
          <div className="rounded-[var(--radius-lg)] bg-muted p-4">
            <Checklist
              items={checklistItems}
              onChange={handleChecklistChange}
            />
          </div>

          {/* Recurrence Section */}
          <div className="rounded-[var(--radius-lg)] bg-muted p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className={cn(
                  "h-4 w-4",
                  task.recurrence_rule ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-sm font-medium text-foreground">Opakovanie</span>
                {task.recurrence_rule && (
                  <span className="text-xs text-muted-foreground">
                    • {formatRecurrenceRule(task.recurrence_rule)}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecurrenceModal(true)}
                className="text-sm"
              >
                {task.recurrence_rule ? 'Upraviť' : 'Nastaviť'}
              </Button>
            </div>
          </div>

          {/* Time Tracking Section */}
          <div className="rounded-[var(--radius-lg)] bg-muted p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-foreground">
                  Sledovanie casu
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Celkovo: {formatDurationShort(displayTotalSeconds)}</span>
                </div>
              </div>
              <InlineTimeTracker taskId={task.id} />
            </div>

            {/* Time entries toggle */}
            <button
              onClick={() => setShowTimeEntries(!showTimeEntries)}
              className="mt-3 flex w-full items-center justify-between text-sm text-primary"
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
        <div className="flex-shrink-0 flex items-center justify-end gap-2 border-t border-[var(--border)] p-4 bg-card">
          {onDelete && (
            <Button
              variant="ghost"
              onClick={onDelete}
              className="text-error hover:bg-error/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Odstrániť
            </Button>
          )}
        </div>

      {/* Schedule Task Modal */}
      <ScheduleTaskModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        task={task}
        onSchedule={handleSchedule}
        onUnschedule={handleUnschedule}
      />

      {/* Recurrence Config Modal */}
      <RecurrenceConfigModal
        isOpen={showRecurrenceModal}
        onClose={() => setShowRecurrenceModal(false)}
        task={task}
        onSave={handleRecurrenceChange}
      />
    </Modal>
  )
}
