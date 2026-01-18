'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  setHours,
  setMinutes,
  addHours,
  parseISO,
} from 'date-fns'
import { sk } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core'
import { TaskWithRelations } from '@/types'
import { Button } from '@/components/ui/button'
import { MonthView } from './month-view'
import { WeekView } from './week-view'
import { WeekTimeGrid } from './week-time-grid'
import { UnscheduledTasksPanel } from './unscheduled-tasks-panel'
import { ScheduleTaskModal } from './schedule-task-modal'
import { CalendarSummary } from './calendar-summary'
import { GoogleEventDetail } from './google-event-detail'
import { cn } from '@/lib/utils/cn'
import { useGoogleCalendarEvents, useGoogleCalendarConnection } from '@/lib/hooks/use-google-calendar'
import { useTimeBlocks, useUnscheduledTasks, useTimeBlockActions } from '@/lib/hooks/use-time-blocks'
import { GoogleCalendarEvent } from '@/app/api/google/events/route'

type CalendarViewMode = 'month' | 'week' | 'timeblock'

interface FullCalendarViewProps {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onDateChange: (taskId: string, newDate: Date) => void
}

export function FullCalendarView({
  tasks,
  onTaskClick,
  onDateChange,
}: FullCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [isMobile, setIsMobile] = useState(false)
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<GoogleCalendarEvent | null>(null)
  const [scheduleModalTask, setScheduleModalTask] = useState<TaskWithRelations | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // Google Calendar integration
  const { connected: googleConnected } = useGoogleCalendarConnection()

  // Time blocking hooks
  const { scheduleTask, unscheduleTask, moveTimeBlock } = useTimeBlockActions()
  const { tasks: unscheduledTasks, loading: unscheduledLoading, refetch: refetchUnscheduled } = useUnscheduledTasks()

  // Calculate date range for fetching Google events and time blocks
  const { startDate, endDate } = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      // Include surrounding weeks for month view
      return {
        startDate: startOfWeek(monthStart, { weekStartsOn: 1 }),
        endDate: endOfWeek(monthEnd, { weekStartsOn: 1 }),
      }
    } else {
      // Week view and timeblock view use same date range
      return {
        startDate: startOfWeek(currentDate, { weekStartsOn: 1 }),
        endDate: endOfWeek(currentDate, { weekStartsOn: 1 }),
      }
    }
  }, [currentDate, viewMode])

  // Fetch time blocks for the current date range
  const { timeBlocks, loading: timeBlocksLoading, refetch: refetchTimeBlocks } = useTimeBlocks(startDate, endDate)

  const { events: googleEvents } = useGoogleCalendarEvents(startDate, endDate, googleConnected)

  // Detect mobile and force week view
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile && viewMode === 'month') {
        setViewMode('week')
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [viewMode])

  // Navigation handlers
  const goToPrev = useCallback(() => {
    if (viewMode === 'month') {
      setCurrentDate(prev => subMonths(prev, 1))
    } else {
      // Week and timeblock views use week navigation
      setCurrentDate(prev => subWeeks(prev, 1))
    }
  }, [viewMode])

  const goToNext = useCallback(() => {
    if (viewMode === 'month') {
      setCurrentDate(prev => addMonths(prev, 1))
    } else {
      // Week and timeblock views use week navigation
      setCurrentDate(prev => addWeeks(prev, 1))
    }
  }, [viewMode])

  // Time blocking handlers
  const handleScheduleTask = useCallback(async (taskId: string, start: Date, end: Date) => {
    const success = await scheduleTask(taskId, start, end)
    if (success) {
      refetchTimeBlocks()
      refetchUnscheduled()
    }
  }, [scheduleTask, refetchTimeBlocks, refetchUnscheduled])

  const handleMoveTimeBlock = useCallback(async (taskId: string, newStart: Date, newEnd: Date) => {
    const success = await moveTimeBlock(taskId, newStart, newEnd)
    if (success) {
      refetchTimeBlocks()
    }
  }, [moveTimeBlock, refetchTimeBlocks])

  const handleUnscheduleTask = useCallback(async (taskId: string) => {
    const success = await unscheduleTask(taskId)
    if (success) {
      refetchTimeBlocks()
      refetchUnscheduled()
    }
  }, [unscheduleTask, refetchTimeBlocks, refetchUnscheduled])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  // Handle day click from month view - switch to week view of that day
  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date)
    setViewMode('week')
  }, [])

  // Handle task deadline change via drag & drop
  const handleTaskMove = useCallback((taskId: string, newDate: Date) => {
    const formattedDate = format(newDate, 'yyyy-MM-dd')
    onDateChange(taskId, newDate)
  }, [onDateChange])

  // Handle Google event click - show detail in sidebar
  const handleGoogleEventClick = useCallback((event: GoogleCalendarEvent) => {
    setSelectedGoogleEvent(event)
  }, [])

  // Drag & Drop handlers for time blocking
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragId(null)

    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as { task: TaskWithRelations; type: string } | undefined
    const overData = over.data.current as { day: Date; hour: number; type: string } | undefined

    if (!activeData || !overData) return

    // Dropping a time block onto a time slot
    if (activeData.type === 'time-block' && overData.type === 'time-slot') {
      const task = activeData.task
      const newStartDate = setMinutes(setHours(overData.day, overData.hour), 0)

      // Vypočítať pôvodné trvanie
      let durationHours = 1
      if (task.scheduled_start && task.scheduled_end) {
        const oldStart = parseISO(task.scheduled_start)
        const oldEnd = parseISO(task.scheduled_end)
        durationHours = (oldEnd.getTime() - oldStart.getTime()) / (1000 * 60 * 60)
      }

      const newEndDate = addHours(newStartDate, durationHours)
      await handleMoveTimeBlock(task.id, newStartDate, newEndDate)
    }

    // Dropping an unscheduled task onto a time slot
    if (activeData.type === 'unscheduled-task' && overData.type === 'time-slot') {
      const task = activeData.task
      const newStartDate = setMinutes(setHours(overData.day, overData.hour), 0)
      const newEndDate = addHours(newStartDate, 1) // Default 1 hour duration
      await handleScheduleTask(task.id, newStartDate, newEndDate)
    }
  }, [handleMoveTimeBlock, handleScheduleTask])

  // Header title based on view mode
  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return format(currentDate, 'LLLL yyyy', { locale: sk })
    } else {
      // Week and timeblock views show week range
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(weekStart, 'd.', { locale: sk })} - ${format(weekEnd, 'd. MMMM yyyy', { locale: sk })}`
    }
  }, [currentDate, viewMode])

  // Wrap content with DndContext when in timeblock mode
  const calendarContent = (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Main calendar area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Navigation */}
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrev}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Title */}
            <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] capitalize">
              {headerTitle}
            </h2>

            {/* Today button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={goToToday}
              className="hidden sm:flex"
            >
              Dnes
            </Button>
          </div>

          {/* View mode toggle - hidden on mobile */}
          {!isMobile && (
            <div className="flex items-center rounded-lg bg-[var(--bg-secondary)] p-0.5">
              <button
                onClick={() => setViewMode('month')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'month'
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                Mesiac
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'week'
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                Týždeň
              </button>
              <button
                onClick={() => setViewMode('timeblock')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1',
                  viewMode === 'timeblock'
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Plánovanie
              </button>
            </div>
          )}

          {/* Mobile: Today button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={goToToday}
            className="sm:hidden"
          >
            Dnes
          </Button>
        </div>

        {/* Calendar content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'month' ? (
            <MonthView
              currentDate={currentDate}
              tasks={tasks}
              googleEvents={googleEvents}
              onDayClick={handleDayClick}
              onTaskClick={onTaskClick}
              onTaskMove={handleTaskMove}
              onGoogleEventClick={handleGoogleEventClick}
            />
          ) : viewMode === 'week' ? (
            <WeekView
              currentDate={currentDate}
              tasks={tasks}
              googleEvents={googleEvents}
              onTaskClick={onTaskClick}
              onTaskMove={handleTaskMove}
              onGoogleEventClick={handleGoogleEventClick}
            />
          ) : (
            <WeekTimeGrid
              currentDate={currentDate}
              timeBlocks={timeBlocks}
              googleEvents={googleEvents}
              onTimeBlockClick={onTaskClick}
              onScheduleTask={handleScheduleTask}
              onMoveTimeBlock={handleMoveTimeBlock}
              onGoogleEventClick={handleGoogleEventClick}
              activeDragId={activeDragId}
            />
          )}
        </div>
      </div>

      {/* Sidebar - changes based on view mode */}
      <div className="hidden lg:block w-72 border-l border-[var(--border-primary)] bg-[var(--bg-primary)]">
        {viewMode === 'timeblock' ? (
          // Time blocking mode: show unscheduled tasks panel
          <UnscheduledTasksPanel
            tasks={unscheduledTasks}
            loading={unscheduledLoading}
            onTaskClick={onTaskClick}
            onScheduleClick={(task) => setScheduleModalTask(task)}
          />
        ) : selectedGoogleEvent ? (
          <div className="p-4">
            <GoogleEventDetail
              event={selectedGoogleEvent}
              onClose={() => setSelectedGoogleEvent(null)}
            />
          </div>
        ) : (
          <div className="p-4">
            <CalendarSummary tasks={tasks} />

            {/* Legend */}
            <div className="mt-6 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Legenda
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-[var(--text-secondary)]">Po termíne</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs text-[var(--text-secondary)]">Dnes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs text-[var(--text-secondary)]">V budúcnosti</span>
                </div>
                {googleConnected && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-2.5 w-2.5 text-gray-400" />
                    <span className="text-xs text-[var(--text-secondary)]">Google Calendar</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tip */}
            <div className="mt-4 text-xs text-[var(--text-secondary)]">
              <p className="mb-1">💡 Tip:</p>
              <p>Presuňte úlohu na iný deň pre zmenu termínu.</p>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Task Modal */}
      <ScheduleTaskModal
        isOpen={!!scheduleModalTask}
        onClose={() => setScheduleModalTask(null)}
        task={scheduleModalTask}
        onSchedule={handleScheduleTask}
        onUnschedule={handleUnscheduleTask}
      />
    </div>
  )

  // Wrap with DndContext only in timeblock mode (for drag & drop between panel and grid)
  if (viewMode === 'timeblock') {
    return (
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {calendarContent}
        {/* Drag overlay */}
        <DragOverlay>
          {activeDragId && (
            <div className="bg-[var(--bg-primary)] shadow-lg rounded-lg p-2 border border-[var(--border-primary)] opacity-80">
              <span className="text-sm font-medium">Presúvam...</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    )
  }

  return calendarContent
}
