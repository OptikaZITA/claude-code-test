'use client'

import { useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isWeekend,
} from 'date-fns'
import { sk } from 'date-fns/locale'
import { TaskWithRelations } from '@/types'
import { CalendarTaskItem } from './calendar-task-item'
import { cn } from '@/lib/utils/cn'

interface WeekViewProps {
  currentDate: Date
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onTaskMove?: (taskId: string, newDate: Date) => void
}

const MAX_VISIBLE_TASKS = 8

export function WeekView({
  currentDate,
  tasks,
  onTaskClick,
  onTaskMove,
}: WeekViewProps) {
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  // Group tasks by deadline date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>()

    tasks.forEach((task) => {
      if (task.deadline) {
        const dateKey = task.deadline
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, task])
      }
    })

    return map
  }, [tasks])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('ring-2', 'ring-[var(--color-primary)]', 'ring-inset')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-[var(--color-primary)]', 'ring-inset')
  }

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    e.currentTarget.classList.remove('ring-2', 'ring-[var(--color-primary)]', 'ring-inset')
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId && onTaskMove) {
      onTaskMove(taskId, date)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        {weekDays.map((day) => {
          const dayTasks = tasksByDate.get(format(day, 'yyyy-MM-dd')) || []
          const pendingCount = dayTasks.filter(t => t.status !== 'done' && t.status !== 'canceled').length

          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={cn(
                'py-3 px-2 text-center border-r border-[var(--border-primary)] last:border-r-0',
                isWeekend(day) && 'bg-[var(--bg-tertiary)]/30'
              )}
            >
              <div className={cn(
                'text-xs font-medium uppercase tracking-wide mb-1',
                isWeekend(day) ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
              )}>
                {format(day, 'EEEEEE', { locale: sk })}
              </div>
              <div className="flex items-center justify-center gap-1">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                    isToday(day)
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--text-primary)]'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {pendingCount > 0 && !isToday(day) && (
                  <span className="text-xs text-[var(--text-secondary)]">
                    ({pendingCount})
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task columns */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 h-full min-h-[400px]">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDate.get(dateKey) || []
            const pendingTasks = dayTasks.filter(t => t.status !== 'done' && t.status !== 'canceled')
            const visibleTasks = pendingTasks.slice(0, MAX_VISIBLE_TASKS)
            const hiddenCount = pendingTasks.length - MAX_VISIBLE_TASKS

            return (
              <div
                key={dateKey}
                className={cn(
                  'border-r border-[var(--border-primary)] last:border-r-0 p-2 transition-colors',
                  isWeekend(day) && 'bg-[var(--bg-tertiary)]/20',
                  isToday(day) && 'bg-[var(--color-primary)]/5'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className="space-y-2">
                  {visibleTasks.map((task) => (
                    <CalendarTaskItem
                      key={task.id}
                      task={task}
                      compact={false}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTaskClick(task)
                      }}
                    />
                  ))}
                  {hiddenCount > 0 && (
                    <div className="text-center py-2 text-xs text-[var(--text-secondary)]">
                      +{hiddenCount} ďalších
                    </div>
                  )}
                  {pendingTasks.length === 0 && (
                    <div className="text-center py-4 text-xs text-[var(--text-secondary)]/50">
                      Žiadne úlohy
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
