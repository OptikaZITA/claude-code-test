'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'
import { Pencil, Trash2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { TimeEntry, SummaryItem } from '@/lib/hooks/use-time-report'
import { TimeEntry as TimeEntryType, TaskWithRelations } from '@/types'
import { EditTimeEntryModal } from './edit-time-entry-modal'
import { DeleteTimeEntryDialog } from './delete-time-entry-dialog'

interface TimeDashboardTableProps {
  summary: SummaryItem[]
  entries: TimeEntry[]
  mode: 'summary' | 'detailed'
  onModeChange: (mode: 'summary' | 'detailed') => void
  onUserClick?: (userId: string) => void
  totalSeconds: number
  currentUserId?: string
  isAdmin?: boolean
  tasks?: TaskWithRelations[]
  onRefresh?: () => void
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

function SummaryTable({
  summary,
  totalSeconds,
  onUserClick,
}: {
  summary: SummaryItem[]
  totalSeconds: number
  onUserClick?: (userId: string) => void
}) {
  if (summary.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-secondary)]">
        Žiadne dáta pre vybrané obdobie
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-primary)]">
            <th className="text-left py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)]">
              Meno
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)]">
              Celkový čas
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)] w-1/3">
              % z celku
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.map(item => (
            <tr
              key={item.id}
              onClick={() => item.type === 'user' && onUserClick?.(item.id)}
              className={cn(
                'border-b border-[var(--border-primary)] last:border-0',
                item.type === 'user' && onUserClick
                  ? 'cursor-pointer hover:bg-[var(--bg-hover)]'
                  : ''
              )}
            >
              <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                {item.label}
              </td>
              <td className="py-3 px-4 text-sm text-[var(--text-primary)] text-right font-medium">
                {formatDuration(item.totalSeconds)}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)] rounded-full"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span className="text-sm text-[var(--text-secondary)] w-12 text-right">
                    {item.percent.toFixed(1)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[var(--bg-tertiary)]">
            <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)]">
              Celkom
            </td>
            <td className="py-3 px-4 text-sm font-bold text-[var(--text-primary)] text-right">
              {formatDuration(totalSeconds)}
            </td>
            <td className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-[var(--color-primary)] rounded-full" />
                <span className="text-sm text-[var(--text-secondary)] w-12 text-right">
                  100%
                </span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function DetailedTable({
  entries,
  currentUserId,
  isAdmin,
  tasks,
  onEdit,
  onDelete,
}: {
  entries: TimeEntry[]
  currentUserId?: string
  isAdmin?: boolean
  tasks?: TaskWithRelations[]
  onEdit: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-secondary)]">
        Žiadne záznamy pre vybrané obdobie
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border-primary)]">
            <th className="text-left py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)]">
              Dátum
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)]">
              Používateľ
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)]">
              Úloha
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)]">
              Projekt
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)]">
              Čas
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)]">
              Trvanie
            </th>
            <th className="text-center py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)]">
              Akcie
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => {
            const canEdit = isAdmin || entry.userId === currentUserId
            const startTime = entry.date ? format(parseISO(entry.date), 'HH:mm', { locale: sk }) : ''

            return (
              <tr
                key={entry.id}
                className="border-b border-[var(--border-primary)] last:border-0 hover:bg-[var(--bg-hover)] group"
              >
                <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                  {format(parseISO(entry.date), 'd.M.yyyy', { locale: sk })}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                  {entry.userNickname}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--text-primary)] max-w-xs truncate">
                  {entry.taskTitle}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                  {entry.projectName || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                  {startTime}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)] text-right">
                  {formatDuration(entry.durationSeconds)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    {canEdit ? (
                      <>
                        <button
                          onClick={() => onEdit(entry)}
                          className="rounded p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                          title="Upraviť"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(entry)}
                          className="rounded p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                          title="Vymazať"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        className="rounded p-1.5 text-[var(--text-secondary)] cursor-default"
                        title="Len náhľad"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function TimeDashboardTable({
  summary,
  entries,
  mode,
  onModeChange,
  onUserClick,
  totalSeconds,
  currentUserId,
  isAdmin = false,
  tasks = [],
  onRefresh,
}: TimeDashboardTableProps) {
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<TimeEntry | null>(null)

  // Listen for time entry events to refresh
  useEffect(() => {
    const handleRefresh = () => onRefresh?.()

    window.addEventListener('time-entry:updated', handleRefresh)
    window.addEventListener('time-entry:deleted', handleRefresh)
    window.addEventListener('time-entry:created', handleRefresh)

    return () => {
      window.removeEventListener('time-entry:updated', handleRefresh)
      window.removeEventListener('time-entry:deleted', handleRefresh)
      window.removeEventListener('time-entry:created', handleRefresh)
    }
  }, [onRefresh])

  // Convert report TimeEntry to component TimeEntry format for modal
  const convertToTimeEntryType = (entry: TimeEntry): TimeEntryType => ({
    id: entry.id,
    organization_id: null,
    task_id: entry.taskId,
    user_id: entry.userId,
    started_at: entry.date,
    ended_at: null, // Will need to calculate from duration
    duration_seconds: entry.durationSeconds,
    note: null,
    description: entry.description,
    entry_type: 'task',
    deleted_at: null,
    created_at: entry.date,
  })

  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {mode === 'summary' ? 'Súhrn' : 'Detailné záznamy'}
        </h3>

        <div className="flex rounded-lg bg-[var(--bg-tertiary)] p-0.5">
          <button
            onClick={() => onModeChange('summary')}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              mode === 'summary'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Súhrn
          </button>
          <button
            onClick={() => onModeChange('detailed')}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              mode === 'detailed'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Detaily
          </button>
        </div>
      </div>

      {/* Table content */}
      <div className="p-4">
        {mode === 'summary' ? (
          <SummaryTable
            summary={summary}
            totalSeconds={totalSeconds}
            onUserClick={onUserClick}
          />
        ) : (
          <DetailedTable
            entries={entries}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            tasks={tasks}
            onEdit={setEditingEntry}
            onDelete={setDeletingEntry}
          />
        )}
      </div>

      {/* Edit modal */}
      {editingEntry && (
        <EditTimeEntryModal
          isOpen={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          entry={convertToTimeEntryType(editingEntry)}
          tasks={tasks}
          onSuccess={() => {
            setEditingEntry(null)
            onRefresh?.()
          }}
        />
      )}

      {/* Delete dialog */}
      {deletingEntry && (
        <DeleteTimeEntryDialog
          isOpen={!!deletingEntry}
          onClose={() => setDeletingEntry(null)}
          entry={convertToTimeEntryType(deletingEntry)}
          taskTitle={deletingEntry.taskTitle}
          onSuccess={() => {
            setDeletingEntry(null)
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}
