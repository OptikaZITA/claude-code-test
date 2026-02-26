'use client'

import { useState, useMemo } from 'react'
import { format, parseISO, isToday, isYesterday, startOfDay } from 'date-fns'
import { sk } from 'date-fns/locale'
import { Pencil, Trash2, Clock, Plus } from 'lucide-react'
import { TimeEntry, TaskWithRelations } from '@/types'
import { formatDurationShort } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import { EditTimeEntryModal } from './edit-time-entry-modal'
import { DeleteTimeEntryDialog } from './delete-time-entry-dialog'
import { Button } from '@/components/ui/button'

interface TimeEntriesListProps {
  entries: TimeEntry[]
  tasks?: TaskWithRelations[]
  taskId?: string // Current task ID for preselection
  taskTitle?: string // Current task title for delete dialog
  onDelete?: (entryId: string) => void
  onRefresh?: () => void
  className?: string
  showManualAdd?: boolean
  canEdit?: boolean // Default true
}

interface GroupedEntries {
  label: string
  date: Date
  entries: TimeEntry[]
}

function groupEntriesByDate(entries: TimeEntry[]): GroupedEntries[] {
  const groups = new Map<string, TimeEntry[]>()

  entries.forEach((entry) => {
    const dateKey = startOfDay(parseISO(entry.started_at)).toISOString()
    const existing = groups.get(dateKey) || []
    groups.set(dateKey, [...existing, entry])
  })

  return Array.from(groups.entries())
    .map(([dateKey, groupEntries]) => {
      const date = parseISO(dateKey)
      let label: string

      if (isToday(date)) {
        label = 'Dnes'
      } else if (isYesterday(date)) {
        label = 'Včera'
      } else {
        label = format(date, 'd. MMMM', { locale: sk })
      }

      return { label, date, entries: groupEntries }
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

export function TimeEntriesList({
  entries,
  tasks = [],
  taskId,
  taskTitle,
  onDelete,
  onRefresh,
  className,
  showManualAdd = true,
  canEdit = true,
}: TimeEntriesListProps) {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<TimeEntry | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const groupedEntries = useMemo(() => groupEntriesByDate(entries), [entries])

  const totalTime = useMemo(() => {
    return entries.reduce((acc, entry) => acc + (entry.duration_seconds || 0), 0)
  }, [entries])

  if (entries.length === 0 && !showManualAdd) {
    return (
      <div className={cn('py-4 text-center text-sm text-muted-foreground', className)}>
        Zatiaľ žiadne záznamy
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Total time */}
      {entries.length > 0 && (
        <div className="text-sm">
          <span className="text-muted-foreground">Celkom: </span>
          <span className="font-medium text-foreground">
            {formatDurationShort(totalTime)}
          </span>
        </div>
      )}

      {/* Grouped entries */}
      {groupedEntries.map((group) => (
        <div key={group.date.toISOString()} className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            📅 {group.label}
          </h4>

          {group.entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-3 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(entry.started_at), 'HH:mm', { locale: sk })}
                      {entry.ended_at && (
                        <> – {format(parseISO(entry.ended_at), 'HH:mm', { locale: sk })}</>
                      )}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {entry.duration_seconds
                        ? formatDurationShort(entry.duration_seconds)
                        : 'Prebieha...'}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {canEdit && entry.duration_seconds && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingEntry(entry)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Upraviť"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingEntry(entry)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Vymazať"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Manual add button */}
      {showManualAdd && (
        <button
          onClick={() => setShowAddModal(true)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 px-3',
            'text-sm text-muted-foreground hover:text-foreground',
            'border border-dashed border-border rounded-lg',
            'hover:border-primary hover:bg-accent/50 transition-colors'
          )}
        >
          <Plus className="h-4 w-4" />
          Pridať čas manuálne
        </button>
      )}

      {/* Edit modal */}
      <EditTimeEntryModal
        isOpen={!!editingEntry || showAddModal}
        onClose={() => {
          setEditingEntry(null)
          setShowAddModal(false)
        }}
        entry={editingEntry}
        tasks={tasks}
        preselectedTaskId={taskId}
      />

      {/* Delete dialog */}
      <DeleteTimeEntryDialog
        isOpen={!!deletingEntry}
        onClose={() => setDeletingEntry(null)}
        entry={deletingEntry}
        taskTitle={taskTitle}
      />
    </div>
  )
}
