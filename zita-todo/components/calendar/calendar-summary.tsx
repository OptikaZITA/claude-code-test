'use client'

import { useMemo } from 'react'
import { isToday, isPast, startOfDay, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { AlertCircle, Calendar, Clock } from 'lucide-react'
import { TaskWithRelations } from '@/types'
import { cn } from '@/lib/utils/cn'

interface CalendarSummaryProps {
  tasks: TaskWithRelations[]
  className?: string
}

export function CalendarSummary({ tasks, className }: CalendarSummaryProps) {
  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

    let overdue = 0
    let todayCount = 0
    let thisWeek = 0

    tasks.forEach((task) => {
      if (!task.deadline || task.status === 'done' || task.status === 'canceled') return

      const deadlineDate = startOfDay(parseISO(task.deadline))

      if (isPast(deadlineDate) && !isToday(deadlineDate)) {
        overdue++
      } else if (isToday(deadlineDate)) {
        todayCount++
      }

      if (isWithinInterval(deadlineDate, { start: weekStart, end: weekEnd })) {
        thisWeek++
      }
    })

    return {
      total: tasks.filter(t => t.status !== 'done' && t.status !== 'canceled').length,
      overdue,
      today: todayCount,
      thisWeek,
    }
  }, [tasks])

  return (
    <div className={cn(
      'rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-4',
      className
    )}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        Prehľad
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Calendar className="h-4 w-4" />
            <span>Celkom úloh</span>
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {stats.total}
          </span>
        </div>

        {stats.overdue > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>Po termíne</span>
            </div>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              {stats.overdue}
            </span>
          </div>
        )}

        {stats.today > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              <span>Dnes</span>
            </div>
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {stats.today}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-primary)]">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span>Tento týždeň</span>
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {stats.thisWeek}
          </span>
        </div>
      </div>
    </div>
  )
}
