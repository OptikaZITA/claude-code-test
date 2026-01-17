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
} from 'date-fns'
import { sk } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { TaskWithRelations } from '@/types'
import { Button } from '@/components/ui/button'
import { MonthView } from './month-view'
import { WeekView } from './week-view'
import { CalendarSummary } from './calendar-summary'
import { GoogleEventDetail } from './google-event-detail'
import { cn } from '@/lib/utils/cn'
import { useGoogleCalendarEvents, useGoogleCalendarConnection } from '@/lib/hooks/use-google-calendar'
import { GoogleCalendarEvent } from '@/app/api/google/events/route'

type CalendarViewMode = 'month' | 'week'

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

  // Google Calendar integration
  const { connected: googleConnected } = useGoogleCalendarConnection()

  // Calculate date range for fetching Google events
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
      return {
        startDate: startOfWeek(currentDate, { weekStartsOn: 1 }),
        endDate: endOfWeek(currentDate, { weekStartsOn: 1 }),
      }
    }
  }, [currentDate, viewMode])

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
      setCurrentDate(prev => subWeeks(prev, 1))
    }
  }, [viewMode])

  const goToNext = useCallback(() => {
    if (viewMode === 'month') {
      setCurrentDate(prev => addMonths(prev, 1))
    } else {
      setCurrentDate(prev => addWeeks(prev, 1))
    }
  }, [viewMode])

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

  // Header title based on view mode
  const headerTitle = useMemo(() => {
    if (viewMode === 'month') {
      return format(currentDate, 'LLLL yyyy', { locale: sk })
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(weekStart, 'd.', { locale: sk })} - ${format(weekEnd, 'd. MMMM yyyy', { locale: sk })}`
    }
  }, [currentDate, viewMode])

  return (
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
          ) : (
            <WeekView
              currentDate={currentDate}
              tasks={tasks}
              googleEvents={googleEvents}
              onTaskClick={onTaskClick}
              onTaskMove={handleTaskMove}
              onGoogleEventClick={handleGoogleEventClick}
            />
          )}
        </div>
      </div>

      {/* Summary sidebar - hidden on mobile */}
      <div className="hidden lg:block w-64 border-l border-[var(--border-primary)] p-4 bg-[var(--bg-primary)]">
        {selectedGoogleEvent ? (
          <GoogleEventDetail
            event={selectedGoogleEvent}
            onClose={() => setSelectedGoogleEvent(null)}
          />
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
