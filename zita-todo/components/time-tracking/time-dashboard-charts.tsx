'use client'

import { useState } from 'react'
import { ChevronDown, Users, Building2, FolderKanban, BarChart3, PieChartIcon } from 'lucide-react'
import { format, parseISO, isWeekend } from 'date-fns'
import { sk } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import { TimePieChart } from './time-pie-chart'

interface DayEntry {
  date: string
  totalSeconds: number
}

interface SummaryItem {
  id: string
  label: string
  type: 'user' | 'area' | 'project'
  totalSeconds: number
  percent: number
}

interface TimeDashboardChartsProps {
  byDay: DayEntry[]
  summary: SummaryItem[]
  groupBy: 'user' | 'area' | 'project'
  onGroupByChange: (groupBy: 'user' | 'area' | 'project') => void
  onDrilldown?: (id: string, type: string) => void
}

type ChartView = 'pie' | 'bar'

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

function DayChart({ byDay }: { byDay: DayEntry[] }) {
  if (byDay.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--text-secondary)]">
        Žiadne dáta pre vybrané obdobie
      </div>
    )
  }

  const maxSeconds = Math.max(...byDay.map(d => d.totalSeconds), 1)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-40">
        {byDay.map(day => {
          const height = (day.totalSeconds / maxSeconds) * 100
          const date = parseISO(day.date)
          const isWeekendDay = isWeekend(date)

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className={cn(
                  'w-full rounded-t transition-all',
                  isWeekendDay
                    ? 'bg-[var(--color-warning)]/60'
                    : 'bg-[var(--color-primary)]'
                )}
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${format(date, 'd.M.', { locale: sk })}: ${formatDuration(day.totalSeconds)}`}
              />
            </div>
          )
        })}
      </div>

      <div className="flex gap-1">
        {byDay.map(day => {
          const date = parseISO(day.date)
          return (
            <div
              key={day.date}
              className="flex-1 text-center text-[10px] text-[var(--text-secondary)] truncate"
            >
              {format(date, 'EE', { locale: sk })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GroupByChart({
  summary,
  groupBy,
  onGroupByChange,
  onDrilldown,
}: {
  summary: SummaryItem[]
  groupBy: 'user' | 'area' | 'project'
  onGroupByChange: (groupBy: 'user' | 'area' | 'project') => void
  onDrilldown?: (id: string, type: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [chartView, setChartView] = useState<ChartView>('pie')

  const groupByOptions = [
    { value: 'user', label: 'Používateľ', icon: Users },
    { value: 'area', label: 'Oddelenie', icon: Building2 },
    { value: 'project', label: 'Projekt', icon: FolderKanban },
  ] as const

  const currentOption = groupByOptions.find(o => o.value === groupBy) || groupByOptions[0]
  const Icon = currentOption.icon

  // Calculate total seconds for pie chart
  const totalSeconds = summary.reduce((sum, item) => sum + item.totalSeconds, 0)

  // Convert summary to pie chart format
  const pieData = summary.slice(0, 10).map(item => ({
    id: item.id,
    name: item.label,
    value: item.totalSeconds,
    percent: item.percent,
  }))

  // Show top 5 for bar chart
  const topItems = summary.slice(0, 5)
  const maxPercent = Math.max(...topItems.map(s => s.percent), 1)

  return (
    <div className="space-y-3">
      {/* Header with group by selector and chart view toggle */}
      <div className="flex items-center justify-between">
        {/* Group by selector */}
        <div className="relative inline-block">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-2 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Icon className="h-4 w-4" />
            <span>{currentOption.label}</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-40 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg">
              {groupByOptions.map(option => {
                const OptionIcon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onGroupByChange(option.value)
                      setIsOpen(false)
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[var(--bg-hover)]',
                      groupBy === option.value
                        ? 'text-[var(--color-primary)] font-medium'
                        : 'text-[var(--text-primary)]'
                    )}
                  >
                    <OptionIcon className="h-4 w-4" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Chart view toggle */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-tertiary)] rounded-lg">
          <button
            onClick={() => setChartView('pie')}
            className={cn(
              'p-1.5 rounded transition-colors',
              chartView === 'pie'
                ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
            title="Koláčový graf"
          >
            <PieChartIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartView('bar')}
            className={cn(
              'p-1.5 rounded transition-colors',
              chartView === 'bar'
                ? 'bg-[var(--bg-primary)] text-[var(--color-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
            title="Stĺpcový graf"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chart content */}
      {chartView === 'pie' ? (
        <TimePieChart
          data={pieData}
          totalSeconds={totalSeconds}
          onSegmentClick={(id) => onDrilldown?.(id, groupBy)}
        />
      ) : (
        <>
          {summary.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[var(--text-secondary)]">
              Žiadne dáta pre vybrané obdobie
            </div>
          ) : (
            <div className="space-y-2">
              {topItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onDrilldown?.(item.id, item.type)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                      {item.label}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] ml-2 whitespace-nowrap">
                      {formatDuration(item.totalSeconds)}
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                      style={{ width: `${(item.percent / maxPercent) * 100}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function TimeDashboardCharts({
  byDay,
  summary,
  groupBy,
  onGroupByChange,
  onDrilldown,
}: TimeDashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Time by day chart */}
      <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">
          Čas podľa dní
        </h3>
        <DayChart byDay={byDay} />
      </div>

      {/* Time by group chart */}
      <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">
          Čas podľa
        </h3>
        <GroupByChart
          summary={summary}
          groupBy={groupBy}
          onGroupByChange={onGroupByChange}
          onDrilldown={onDrilldown}
        />
      </div>
    </div>
  )
}
