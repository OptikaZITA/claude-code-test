'use client'

import { useState, useMemo } from 'react'
import { TaskWithRelations, Heading } from '@/types'
import { TaskItem } from './task-item'
import { TaskQuickAdd } from './task-quick-add'
import { HeadingItem, HeadingForm } from '@/components/headings'

interface ProjectTaskListProps {
  tasks: TaskWithRelations[]
  headings: Heading[]
  onTaskClick: (task: TaskWithRelations) => void
  onTaskComplete: (taskId: string, completed: boolean) => void
  onQuickAdd: (title: string, headingId?: string) => void
  onHeadingCreate: (title: string) => Promise<void>
  onHeadingUpdate: (headingId: string, title: string) => Promise<void>
  onHeadingDelete: (headingId: string) => Promise<void>
  emptyMessage?: string
}

export function ProjectTaskList({
  tasks,
  headings,
  onTaskClick,
  onTaskComplete,
  onQuickAdd,
  onHeadingCreate,
  onHeadingUpdate,
  onHeadingDelete,
  emptyMessage = 'Žiadne úlohy',
}: ProjectTaskListProps) {
  const [expandedHeadings, setExpandedHeadings] = useState<Set<string>>(
    new Set(headings.map((h) => h.id))
  )
  const [addingTaskToHeading, setAddingTaskToHeading] = useState<string | null>(null)

  // Group tasks by heading
  const { tasksWithoutHeading, tasksByHeading } = useMemo(() => {
    const withoutHeading: TaskWithRelations[] = []
    const byHeading: Map<string, TaskWithRelations[]> = new Map()

    // Initialize all headings with empty arrays
    headings.forEach((h) => byHeading.set(h.id, []))

    tasks.forEach((task) => {
      if (task.heading_id && byHeading.has(task.heading_id)) {
        byHeading.get(task.heading_id)!.push(task)
      } else {
        withoutHeading.push(task)
      }
    })

    return { tasksWithoutHeading: withoutHeading, tasksByHeading: byHeading }
  }, [tasks, headings])

  const toggleHeading = (headingId: string) => {
    setExpandedHeadings((prev) => {
      const next = new Set(prev)
      if (next.has(headingId)) {
        next.delete(headingId)
      } else {
        next.add(headingId)
      }
      return next
    })
  }

  const handleQuickAddToHeading = (title: string, headingId: string) => {
    onQuickAdd(title, headingId)
    setAddingTaskToHeading(null)
  }

  const isEmpty = tasks.length === 0 && headings.length === 0

  return (
    <div className="space-y-4">
      {/* Quick add for tasks without heading */}
      <TaskQuickAdd onAdd={(title) => onQuickAdd(title)} />

      {/* Tasks without heading */}
      {tasksWithoutHeading.length > 0 && (
        <div className="space-y-2">
          {tasksWithoutHeading.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onComplete={(completed) => onTaskComplete(task.id, completed)}
            />
          ))}
        </div>
      )}

      {/* Headings with their tasks */}
      {headings.map((heading) => {
        const headingTasks = tasksByHeading.get(heading.id) || []
        const isExpanded = expandedHeadings.has(heading.id)

        return (
          <HeadingItem
            key={heading.id}
            heading={heading}
            isExpanded={isExpanded}
            onToggle={() => toggleHeading(heading.id)}
            onUpdate={(title) => onHeadingUpdate(heading.id, title)}
            onDelete={() => onHeadingDelete(heading.id)}
          >
            {/* Tasks in this heading */}
            {headingTasks.length > 0 ? (
              <div className="space-y-2">
                {headingTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    onComplete={(completed) => onTaskComplete(task.id, completed)}
                  />
                ))}
              </div>
            ) : (
              <p className="py-2 text-sm text-[var(--text-secondary)]">
                Žiadne úlohy v tejto sekcii
              </p>
            )}

            {/* Quick add within heading */}
            {addingTaskToHeading === heading.id ? (
              <div className="mt-2">
                <TaskQuickAdd
                  onAdd={(title) => handleQuickAddToHeading(title, heading.id)}
                  placeholder="Pridať úlohu do sekcie..."
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingTaskToHeading(heading.id)}
                className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
              >
                + Pridať úlohu
              </button>
            )}
          </HeadingItem>
        )
      })}

      {/* Add new heading */}
      <HeadingForm onSubmit={onHeadingCreate} />

      {/* Empty state */}
      {isEmpty && (
        <div className="py-8 text-center text-[var(--text-secondary)]">
          {emptyMessage}
        </div>
      )}
    </div>
  )
}
