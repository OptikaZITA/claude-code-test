'use client'

import { Calendar, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'
import { GoogleCalendarEvent } from '@/app/api/google/events/route'
import { cn } from '@/lib/utils/cn'

interface GoogleCalendarEventItemProps {
  event: GoogleCalendarEvent
  compact?: boolean
}

export function GoogleCalendarEventItem({
  event,
  compact = false,
}: GoogleCalendarEventItemProps) {
  const isAllDay = !event.start.dateTime && !!event.start.date

  const formatTime = () => {
    if (isAllDay) return null
    if (event.start.dateTime) {
      return format(new Date(event.start.dateTime), 'HH:mm', { locale: sk })
    }
    return null
  }

  const time = formatTime()

  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex items-center gap-2 rounded-lg transition-colors',
        'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        compact ? 'px-2 py-1' : 'px-3 py-2'
      )}
    >
      <Calendar className={cn(
        'flex-shrink-0 text-gray-400',
        compact ? 'h-3 w-3' : 'h-4 w-4'
      )} />

      {time && !compact && (
        <span className="text-xs text-gray-500 flex-shrink-0 w-10">
          {time}
        </span>
      )}

      <span className={cn(
        'flex-1 truncate italic',
        compact ? 'text-xs' : 'text-sm',
        'text-gray-600 dark:text-gray-400'
      )}>
        {event.summary || '(Bez nazvu)'}
      </span>

      <ExternalLink className={cn(
        'flex-shrink-0 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity',
        compact ? 'h-2.5 w-2.5' : 'h-3 w-3'
      )} />
    </a>
  )
}

// Compact version for month view cells
export function GoogleCalendarEventDot({ event }: { event: GoogleCalendarEvent }) {
  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title={event.summary || '(Bez nazvu)'}
    >
      <Calendar className="h-3 w-3 text-gray-400" />
      <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[60px]">
        {event.summary || '(Bez nazvu)'}
      </span>
    </a>
  )
}
