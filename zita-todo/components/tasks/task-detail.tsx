'use client'

import { useState, useCallback } from 'react'
import {
  X,
  Calendar,
  User,
  FolderKanban,
  Tag,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { TaskWithRelations, TaskPriority, ChecklistItem, Tag as TagType } from '@/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Timer, TimerDisplay } from '@/components/time-tracking/timer'
import { TimeEntriesList } from '@/components/time-tracking/time-entries-list'
import { Checklist } from '@/components/tasks/checklist'
import { TagSelector } from '@/components/tags'
import { useTimeTracking } from '@/lib/hooks/use-time-tracking'
import { formatDate, formatDurationShort } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

interface TaskDetailProps {
  task: TaskWithRelations
  isOpen: boolean
  onClose: () => void
  onUpdate?: (updates: Partial<TaskWithRelations>) => void
  onDelete?: () => void
  onComplete?: (completed: boolean) => void
}

const priorityLabels: Record<TaskPriority, string> = {
  urgent: 'Urgentná',
  high: 'Vysoká',
  medium: 'Stredná',
  low: 'Nízka',
}

const priorityColors: Record<TaskPriority, string> = {
  urgent: 'bg-[#FF3B30]',
  high: 'bg-[#FF9500]',
  medium: 'bg-[#007AFF]',
  low: 'bg-[#86868B]',
}

export function TaskDetail({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    task.checklist_items || []
  )
  const [showTimeEntries, setShowTimeEntries] = useState(false)

  const {
    timeEntries,
    elapsedSeconds,
    totalTime,
    isRunning,
    startTimer,
    stopTimer,
    deleteTimeEntry,
  } = useTimeTracking(task.id)

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ title, description, checklist_items: checklistItems })
    }
    setIsEditing(false)
  }

  const handleChecklistChange = useCallback((items: ChecklistItem[]) => {
    setChecklistItems(items)
    // Auto-save checklist changes
    if (onUpdate) {
      onUpdate({ checklist_items: items })
    }
  }, [onUpdate])

  const handleCancel = () => {
    setTitle(task.title)
    setDescription(task.description || '')
    setIsEditing(false)
  }

  const isCompleted = task.status === 'done'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E5E5E5] p-4">
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold"
                autoFocus
              />
            ) : (
              <h2
                className={cn(
                  'text-lg font-semibold text-[#1D1D1F]',
                  isCompleted && 'line-through text-[#86868B]'
                )}
              >
                {task.title}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded p-1 text-[#86868B] transition-colors hover:bg-[#F5F5F7]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Timer Section */}
          <div className="mb-6 rounded-xl bg-[#F5F5F7] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-[#1D1D1F]">
                  Sledovanie času
                </p>
                <p className="text-xs text-[#86868B]">
                  Celkový čas: {formatDurationShort(task.total_time_seconds || totalTime)}
                </p>
              </div>
              <Timer
                elapsedSeconds={elapsedSeconds}
                isRunning={isRunning}
                onStart={startTimer}
                onStop={stopTimer}
                size="lg"
              />
            </div>

            {/* Time entries toggle */}
            <button
              onClick={() => setShowTimeEntries(!showTimeEntries)}
              className="mt-3 flex w-full items-center justify-between text-sm text-[#007AFF]"
            >
              <span>Zobraziť záznamy ({timeEntries.length})</span>
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

          {/* Description */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Popis
            </label>
            {isEditing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pridať popis..."
                rows={4}
              />
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                {task.description || 'Žiadny popis'}
              </p>
            )}
          </div>

          {/* Checklist */}
          <div className="mb-6 rounded-xl bg-[var(--bg-secondary)] p-4">
            <Checklist
              items={checklistItems}
              onChange={handleChecklistChange}
            />
          </div>

          {/* Meta information */}
          <div className="space-y-4">
            {/* Priority */}
            <div className="flex items-center gap-3">
              <div
                className={cn('h-3 w-3 rounded-full', priorityColors[task.priority])}
              />
              <span className="text-sm text-[#1D1D1F]">
                {priorityLabels[task.priority]} priorita
              </span>
            </div>

            {/* Due date */}
            {task.due_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-[#86868B]" />
                <span className="text-sm text-[#1D1D1F]">
                  {formatDate(task.due_date)}
                </span>
              </div>
            )}

            {/* Assignee */}
            {task.assignee && (
              <div className="flex items-center gap-3">
                <Avatar
                  src={task.assignee.avatar_url}
                  name={task.assignee.full_name}
                  size="sm"
                />
                <span className="text-sm text-[#1D1D1F]">
                  {task.assignee.full_name}
                </span>
              </div>
            )}

            {/* Project */}
            {task.project && (
              <div className="flex items-center gap-3">
                <FolderKanban className="h-4 w-4 text-[#86868B]" />
                <span className="text-sm text-[#1D1D1F]">{task.project.name}</span>
              </div>
            )}

            {/* Tags */}
            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 text-[var(--text-secondary)] mt-1" />
              <TagSelector
                taskId={task.id}
                selectedTags={task.tags || []}
              />
            </div>

            {/* Total time */}
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-[#86868B]" />
              <span className="text-sm text-[#1D1D1F]">
                {formatDurationShort(task.total_time_seconds || 0)} celkovo
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E5E5E5] p-4">
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={handleCancel}>
                Zrušiť
              </Button>
              <Button onClick={handleSave}>Uložiť</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setIsEditing(true)}>
                Upraviť
              </Button>
              {onDelete && (
                <Button variant="danger" onClick={onDelete}>
                  Odstrániť
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
