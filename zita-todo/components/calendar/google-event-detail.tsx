'use client'

import { format, isSameDay, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'
import { Calendar, Clock, MapPin, FileText, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoogleCalendarEvent } from '@/app/api/google/events/route'

interface GoogleEventDetailProps {
  event: GoogleCalendarEvent
  onClose: () => void
}

export function GoogleEventDetail({ event, onClose }: GoogleEventDetailProps) {
  const isAllDay = !event.start.dateTime && !!event.start.date

  const startDate = event.start.dateTime
    ? parseISO(event.start.dateTime)
    : event.start.date
      ? parseISO(event.start.date)
      : new Date()

  const endDate = event.end.dateTime
    ? parseISO(event.end.dateTime)
    : event.end.date
      ? parseISO(event.end.date)
      : null

  // Format date - e.g. "Streda, 14. januára 2026"
  const formatEventDate = () => {
    const dateStr = format(startDate, 'EEEE, d. MMMM yyyy', { locale: sk })
    // Capitalize first letter
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  }

  // Format time range - e.g. "09:00 - 10:00"
  const formatTimeRange = () => {
    if (isAllDay) return 'Celý deň'

    const startTime = format(startDate, 'HH:mm', { locale: sk })
    const endTime = endDate ? format(endDate, 'HH:mm', { locale: sk }) : null

    return endTime ? `${startTime} - ${endTime}` : startTime
  }

  // Check if multi-day event
  const isMultiDay = () => {
    if (!endDate) return false
    // For all-day events, end date is exclusive (next day)
    if (isAllDay) {
      const adjustedEnd = new Date(endDate)
      adjustedEnd.setDate(adjustedEnd.getDate() - 1)
      return !isSameDay(startDate, adjustedEnd)
    }
    return !isSameDay(startDate, endDate)
  }

  // Format multi-day range - e.g. "14. - 16. januára 2026"
  const formatMultiDayRange = () => {
    if (!endDate) return formatEventDate()

    let adjustedEnd = endDate
    if (isAllDay) {
      // For all-day events, end date is exclusive
      adjustedEnd = new Date(endDate)
      adjustedEnd.setDate(adjustedEnd.getDate() - 1)
    }

    const sameMonth = startDate.getMonth() === adjustedEnd.getMonth()
    const sameYear = startDate.getFullYear() === adjustedEnd.getFullYear()

    if (sameMonth && sameYear) {
      return `${format(startDate, 'd.', { locale: sk })} - ${format(adjustedEnd, 'd. MMMM yyyy', { locale: sk })}`
    } else if (sameYear) {
      return `${format(startDate, 'd. MMMM', { locale: sk })} - ${format(adjustedEnd, 'd. MMMM yyyy', { locale: sk })}`
    } else {
      return `${format(startDate, 'd. MMMM yyyy', { locale: sk })} - ${format(adjustedEnd, 'd. MMMM yyyy', { locale: sk })}`
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-start gap-2 min-w-0">
          <Calendar className="h-5 w-5 text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
          <h3 className="font-semibold text-[var(--text-primary)] break-words">
            {event.summary || '(Bez názvu)'}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">
        {/* Date */}
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
          <span className="text-sm text-[var(--text-primary)]">
            {isMultiDay() ? formatMultiDayRange() : formatEventDate()}
          </span>
        </div>

        {/* Time */}
        <div className="flex items-start gap-3">
          <Clock className="h-4 w-4 text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
          <span className="text-sm text-[var(--text-primary)]">
            {formatTimeRange()}
          </span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[var(--text-primary)] break-words">
              {event.location}
            </span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-[var(--text-secondary)] flex-shrink-0" />
              <span className="text-sm text-[var(--text-secondary)]">Popis</span>
            </div>
            <p className="text-sm text-[var(--text-primary)] pl-7 line-clamp-4 whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}

        {/* Calendar name */}
        {event.calendarName && (
          <div className="flex items-start gap-3 pt-2 border-t border-[var(--border-primary)]">
            <Calendar className="h-4 w-4 text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
            <span className="text-sm text-[var(--text-secondary)]">
              {event.calendarName}
            </span>
          </div>
        )}
      </div>

      {/* Open in Google button */}
      <Button
        variant="secondary"
        className="w-full mt-4"
        onClick={() => window.open(event.htmlLink, '_blank')}
      >
        Otvoriť v Google
        <ExternalLink className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )
}
