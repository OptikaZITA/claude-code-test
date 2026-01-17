'use client'

import { useState, useMemo } from 'react'
import { format, parseISO, isPast, isToday } from 'date-fns'
import { sk } from 'date-fns/locale'
import { Clock, Calendar, ChevronDown, ChevronUp, GripVertical, Search } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { TaskWithRelations, TaskStatus } from '@/types'
import { cn } from '@/lib/utils/cn'

interface UnscheduledTasksPanelProps {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onScheduleClick?: (task: TaskWithRelations) => void
  loading?: boolean
}

/**
 * Draggable task item pre bočný panel
 */
function DraggableTaskItem({
  task,
  onClick,
  onScheduleClick,
}: {
  task: TaskWithRelations
  onClick: () => void
  onScheduleClick?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `unscheduled-${task.id}`,
    data: { task, type: 'unscheduled-task' },
  })

  const isOverdue = task.deadline && isPast(parseISO(task.deadline)) && !isToday(parseISO(task.deadline))
  const isDueToday = task.deadline && isToday(parseISO(task.deadline))

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-start gap-2 p-2 rounded-lg border transition-all',
        'bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)]',
        'border-[var(--border-primary)] hover:border-[var(--color-primary)]/30',
        isDragging && 'opacity-50 shadow-lg z-50'
      )}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing p-0.5 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-[var(--text-secondary)]" />
      </div>

      {/* Task content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        {/* Title */}
        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
          {task.title}
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Deadline */}
          {task.deadline && (
            <span className={cn(
              'inline-flex items-center gap-1 text-xs',
              isOverdue && 'text-red-600 dark:text-red-400',
              isDueToday && 'text-amber-600 dark:text-amber-400',
              !isOverdue && !isDueToday && 'text-[var(--text-secondary)]'
            )}>
              <Calendar className="h-3 w-3" />
              {format(parseISO(task.deadline), 'd. MMM', { locale: sk })}
            </span>
          )}

          {/* Project */}
          {task.project && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: task.project.color || 'var(--color-primary)' }}
              />
              <span className="truncate max-w-[80px]">{task.project.name}</span>
            </span>
          )}

          {/* Priority flag */}
          {task.priority === 'high' && (
            <span className="text-red-500 text-xs">🚩</span>
          )}
          {task.priority === 'low' && (
            <span className="text-yellow-500 text-xs">🏳️</span>
          )}
        </div>
      </div>

      {/* Schedule button */}
      {onScheduleClick && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onScheduleClick()
          }}
          className="flex-shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
          title="Naplánovať čas"
        >
          <Clock className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/**
 * Bočný panel s nenaplánovanými úlohami
 */
export function UnscheduledTasksPanel({
  tasks,
  onTaskClick,
  onScheduleClick,
  loading = false,
}: UnscheduledTasksPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overdue', 'today', 'upcoming']))

  // Rozdeliť úlohy do sekcií
  const sections = useMemo(() => {
    const filtered = tasks.filter(task =>
      !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const overdue: TaskWithRelations[] = []
    const today: TaskWithRelations[] = []
    const upcoming: TaskWithRelations[] = []
    const noDeadline: TaskWithRelations[] = []

    filtered.forEach(task => {
      if (!task.deadline) {
        noDeadline.push(task)
      } else {
        const deadlineDate = parseISO(task.deadline)
        if (isPast(deadlineDate) && !isToday(deadlineDate)) {
          overdue.push(task)
        } else if (isToday(deadlineDate)) {
          today.push(task)
        } else {
          upcoming.push(task)
        }
      }
    })

    return [
      { id: 'overdue', title: 'Po termíne', tasks: overdue, color: 'text-red-600 dark:text-red-400' },
      { id: 'today', title: 'Dnes', tasks: today, color: 'text-amber-600 dark:text-amber-400' },
      { id: 'upcoming', title: 'Nadchádzajúce', tasks: upcoming, color: 'text-blue-600 dark:text-blue-400' },
      { id: 'no-deadline', title: 'Bez termínu', tasks: noDeadline, color: 'text-[var(--text-secondary)]' },
    ].filter(section => section.tasks.length > 0)
  }, [tasks, searchQuery])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-[var(--bg-secondary)] rounded" />
          <div className="h-16 bg-[var(--bg-secondary)] rounded" />
          <div className="h-16 bg-[var(--bg-secondary)] rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-primary)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Nenaplánované úlohy
        </h3>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Hľadať úlohy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
          />
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {sections.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Žiadne nenaplánované úlohy</p>
            <p className="text-xs mt-1">
              Presuňte úlohu na kalendár pre naplánovanie
            </p>
          </div>
        ) : (
          sections.map(section => (
            <div key={section.id}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="flex items-center justify-between w-full mb-2 group"
              >
                <span className={cn('text-xs font-semibold uppercase tracking-wide', section.color)}>
                  {section.title} ({section.tasks.length})
                </span>
                {expandedSections.has(section.id) ? (
                  <ChevronUp className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                )}
              </button>

              {/* Section tasks */}
              {expandedSections.has(section.id) && (
                <div className="space-y-2">
                  {section.tasks.map(task => (
                    <DraggableTaskItem
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                      onScheduleClick={onScheduleClick ? () => onScheduleClick(task) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer tip */}
      <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <p className="text-xs text-[var(--text-secondary)]">
          💡 Potiahni úlohu na kalendár pre naplánovanie času
        </p>
      </div>
    </div>
  )
}
