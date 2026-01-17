'use client'

import { Calendar, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'
import { GoogleCalendarEvent } from '@/app/api/google/events/route'
import { cn } from '@/lib/utils/cn'

interface GoogleCalendarEventItemProps {
  event: GoogleCalendarEvent
  compact?: boolean
  onClick?: () => void
}

export function GoogleCalendarEventItem({
  event,
  compact = false,
  onClick,
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

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault()
      onClick()
    }
  }

  // Week view - show time + name clearly
  if (!compact) {
    return (
      <a
        href={onClick ? undefined : event.htmlLink}
        target={onClick ? undefined : '_blank'}
        rel={onClick ? undefined : 'noopener noreferrer'}
        onClick={handleClick}
        className={cn(
          'group flex items-start gap-2 rounded-lg transition-colors cursor-pointer',
          'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'px-3 py-2'
        )}
      >
        <Calendar className="flex-shrink-0 h-4 w-4 text-gray-400 mt-0.5" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {time && (
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                {time}
              </span>
            )}
            {isAllDay && (
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex-shrink-0">
                Celý deň
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mt-0.5">
            {event.summary || '(Bez názvu)'}
          </p>
        </div>

        {!onClick && (
          <ExternalLink className="flex-shrink-0 h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
        )}
      </a>
    )
  }

  // Compact view (month view) - minimal display
  return (
    <a
      href={onClick ? undefined : event.htmlLink}
      target={onClick ? undefined : '_blank'}
      rel={onClick ? undefined : 'noopener noreferrer'}
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-2 rounded-lg transition-colors cursor-pointer',
        'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        'px-2 py-1'
      )}
    >
      <Calendar className="flex-shrink-0 h-3 w-3 text-gray-400" />

      <span className="flex-1 truncate italic text-xs text-gray-600 dark:text-gray-400">
        {event.summary || '(Bez názvu)'}
      </span>

      {!onClick && (
        <ExternalLink className="flex-shrink-0 h-2.5 w-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </a>
  )
}

// Compact version for month view cells
export function GoogleCalendarEventDot({
  event,
  onClick,
}: {
  event: GoogleCalendarEvent
  onClick?: () => void
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    }
  }

  return (
    <a
      href={onClick ? undefined : event.htmlLink}
      target={onClick ? undefined : '_blank'}
      rel={onClick ? undefined : 'noopener noreferrer'}
      onClick={handleClick}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      title={event.summary || '(Bez názvu)'}
    >
      <Calendar className="h-3 w-3 text-gray-400" />
      <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[60px]">
        {event.summary || '(Bez názvu)'}
      </span>
    </a>
  )
}
