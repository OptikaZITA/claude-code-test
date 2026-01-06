'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { TimeEntry, SummaryItem } from '@/lib/hooks/use-time-report'

interface TimeDashboardTableProps {
  summary: SummaryItem[]
  entries: TimeEntry[]
  mode: 'summary' | 'detailed'
  onModeChange: (mode: 'summary' | 'detailed') => void
  onUserClick?: (userId: string) => void
  totalSeconds: number
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

function DetailedTable({ entries }: { entries: TimeEntry[] }) {
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
              Tagy
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium uppercase text-[var(--text-secondary)]">
              Trvanie
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr
              key={entry.id}
              className="border-b border-[var(--border-primary)] last:border-0 hover:bg-[var(--bg-hover)]"
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
              <td className="py-3 px-4">
                {entry.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                      >
                        {tag}
                      </span>
                    ))}
                    {entry.tags.length > 2 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                        +{entry.tags.length - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[var(--text-secondary)]">-</span>
                )}
              </td>
              <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)] text-right">
                {formatDuration(entry.durationSeconds)}
              </td>
            </tr>
          ))}
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
}: TimeDashboardTableProps) {
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
          <DetailedTable entries={entries} />
        )}
      </div>
    </div>
  )
}
