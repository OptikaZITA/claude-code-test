'use client'

import { Trash2, Clock } from 'lucide-react'
import { TimeEntry } from '@/types'
import { formatDateTime, formatDurationShort } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

interface TimeEntriesListProps {
  entries: TimeEntry[]
  onDelete?: (entryId: string) => void
  className?: string
}

export function TimeEntriesList({
  entries,
  onDelete,
  className,
}: TimeEntriesListProps) {
  if (entries.length === 0) {
    return (
      <div className={cn('py-4 text-center text-sm text-[#86868B]', className)}>
        Zatiaľ žiadne záznamy
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between rounded-lg bg-[#F5F5F7] p-3"
        >
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-[#86868B]" />
            <div>
              <p className="text-sm font-medium text-[#1D1D1F]">
                {entry.duration_seconds
                  ? formatDurationShort(entry.duration_seconds)
                  : 'Prebieha...'}
              </p>
              <p className="text-xs text-[#86868B]">
                {formatDateTime(entry.started_at)}
              </p>
            </div>
          </div>

          {onDelete && entry.duration_seconds && (
            <button
              onClick={() => onDelete(entry.id)}
              className="rounded p-1 text-[#86868B] transition-colors hover:bg-[#E5E5E5] hover:text-[#FF3B30]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
