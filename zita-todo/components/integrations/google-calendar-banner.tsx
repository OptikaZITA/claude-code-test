'use client'

import { Calendar, ExternalLink } from 'lucide-react'
import { useTodayGoogleEvents, useGoogleCalendarConnection } from '@/lib/hooks/use-google-calendar'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'

const MAX_VISIBLE_EVENTS = 5

export function GoogleCalendarBanner() {
  const { connected, loading: connectionLoading } = useGoogleCalendarConnection()
  const { events, loading: eventsLoading } = useTodayGoogleEvents()

  // Don't show anything if not connected or loading
  if (connectionLoading || eventsLoading || !connected || events.length === 0) {
    return null
  }

  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS)
  const remainingCount = events.length - MAX_VISIBLE_EVENTS

  const formatEventTime = (event: typeof events[0]) => {
    // All-day event
    if (event.start.date && !event.start.dateTime) {
      return null
    }

    // Timed event
    if (event.start.dateTime) {
      return format(new Date(event.start.dateTime), 'HH:mm', { locale: sk })
    }

    return null
  }

  return (
    <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] mb-4 overflow-hidden">
      <div className="px-4 py-3 space-y-1">
        {visibleEvents.map((event) => {
          const time = formatEventTime(event)
          const isAllDay = !event.start.dateTime

          return (
            <div
              key={event.id}
              className="flex items-center gap-3 py-1.5 group"
            >
              <Calendar className="h-4 w-4 text-[var(--text-secondary)] flex-shrink-0" />
              <span className="text-sm text-[var(--text-secondary)] w-12 flex-shrink-0">
                {time || ''}
              </span>
              <span className={`text-sm flex-1 truncate ${isAllDay ? 'text-[var(--text-secondary)] italic' : 'text-[var(--text-primary)]'}`}>
                {event.summary || '(Bez nazvu)'}
                {isAllDay && ' (celodenny)'}
              </span>
              {event.htmlLink && (
                <a
                  href={event.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Otvorit v Google Calendar"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--text-secondary)] hover:text-[var(--color-primary)]" />
                </a>
              )}
            </div>
          )
        })}

        {remainingCount > 0 && (
          <div className="text-xs text-[var(--text-secondary)] pt-1 pl-7">
            +{remainingCount} dalsich
          </div>
        )}
      </div>
    </div>
  )
}
