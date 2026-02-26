'use client'

import { format, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { TimeEntry } from '@/types'
import { useDeleteTimeEntry } from '@/lib/hooks/use-time-entries'
import { AlertTriangle } from 'lucide-react'

interface DeleteTimeEntryDialogProps {
  isOpen: boolean
  onClose: () => void
  entry: TimeEntry | null
  taskTitle?: string
  onSuccess?: () => void | Promise<void>
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours === 0 && minutes === 0) {
    return `${secs}s`
  }

  if (hours === 0) {
    return `${minutes}m`
  }
  return `${hours}h ${minutes}m`
}

export function DeleteTimeEntryDialog({
  isOpen,
  onClose,
  entry,
  taskTitle,
  onSuccess,
}: DeleteTimeEntryDialogProps) {
  const { deleteTimeEntry, loading } = useDeleteTimeEntry()

  if (!entry) return null

  const startedAt = parseISO(entry.started_at)
  const endedAt = entry.ended_at ? parseISO(entry.ended_at) : null

  const handleDelete = async () => {
    const success = await deleteTimeEntry(entry.id)
    if (success) {
      // Close dialog and reload to show updated data
      onClose()
      window.location.reload()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vymazať záznam?"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Naozaj chcete vymazať tento časový záznam?
          </p>
        </div>

        <div className="space-y-2 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          {taskTitle && (
            <p className="text-sm font-medium text-[var(--text-primary)]">
              • {taskTitle}
            </p>
          )}
          <p className="text-sm text-[var(--text-secondary)]">
            • {format(startedAt, 'HH:mm', { locale: sk })}
            {endedAt && ` – ${format(endedAt, 'HH:mm', { locale: sk })}`}
            {entry.duration_seconds && ` (${formatDuration(entry.duration_seconds)})`}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            • {format(startedAt, 'd. MMMM yyyy', { locale: sk })}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Zrušiť
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Mažem...' : 'Vymazať'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
