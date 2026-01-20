'use client'

import { useState } from 'react'
import { ChevronDown, Users, Building2, FolderKanban, BarChart3, PieChartIcon } from 'lucide-react'
import { format, parseISO, isWeekend, getWeek, getMonth } from 'date-fns'
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

// Aggregate data by week
interface AggregatedEntry {
  key: string
  label: string
  totalSeconds: number
  tooltip: string
}

function aggregateByWeek(byDay: DayEntry[]): AggregatedEntry[] {
  const weekMap = new Map<number, { totalSeconds: number; days: string[] }>()

  byDay.forEach(day => {
    const date = parseISO(day.date)
    const weekNum = getWeek(date, { locale: sk, weekStartsOn: 1 })

    const existing = weekMap.get(weekNum) || { totalSeconds: 0, days: [] }
    existing.totalSeconds += day.totalSeconds
    existing.days.push(format(date, 'd.M.', { locale: sk }))
    weekMap.set(weekNum, existing)
  })

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekNum, data]) => ({
      key: `week-${weekNum}`,
      label: `T${weekNum}`,
      totalSeconds: data.totalSeconds,
      tooltip: `Týždeň ${weekNum} (${data.days[0]} - ${data.days[data.days.length - 1]}): ${formatDuration(data.totalSeconds)}`,
    }))
}

// Aggregate data by month
function aggregateByMonth(byDay: DayEntry[]): AggregatedEntry[] {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
  const monthMap = new Map<string, { totalSeconds: number; monthIdx: number }>()

  byDay.forEach(day => {
    const date = parseISO(day.date)
    const monthIdx = getMonth(date)
    const year = date.getFullYear()
    const key = `${year}-${monthIdx}`

    const existing = monthMap.get(key) || { totalSeconds: 0, monthIdx }
    existing.totalSeconds += day.totalSeconds
    monthMap.set(key, existing)
  })

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => ({
      key,
      label: monthNames[data.monthIdx],
      totalSeconds: data.totalSeconds,
      tooltip: `${monthNames[data.monthIdx]}: ${formatDuration(data.totalSeconds)}`,
    }))
}

// Determine display mode based on day count
type DisplayMode = 'dayWithName' | 'dateOnly' | 'weekly' | 'monthly'

function getDisplayMode(dayCount: number): DisplayMode {
  if (dayCount <= 7) return 'dayWithName'
  if (dayCount <= 14) return 'dateOnly'
  if (dayCount <= 31) return 'weekly'
  return 'monthly'
}

function DayChart({ byDay }: { byDay: DayEntry[] }) {
  if (byDay.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--text-secondary)]">
        Žiadne dáta pre vybrané obdobie
      </div>
    )
  }

  const displayMode = getDisplayMode(byDay.length)

  // For weekly/monthly views, aggregate the data
  let chartData: AggregatedEntry[]

  if (displayMode === 'weekly') {
    chartData = aggregateByWeek(byDay)
  } else if (displayMode === 'monthly') {
    chartData = aggregateByMonth(byDay)
  } else {
    // Daily view - convert to same format
    chartData = byDay.map(day => {
      const date = parseISO(day.date)
      return {
        key: day.date,
        label: displayMode === 'dayWithName'
          ? format(date, 'EE d.M.', { locale: sk })
          : format(date, 'd.M.', { locale: sk }),
        totalSeconds: day.totalSeconds,
        tooltip: `${format(date, 'EEEE d.M.', { locale: sk })}: ${formatDuration(day.totalSeconds)}`,
      }
    })
  }

  const maxSeconds = Math.max(...chartData.map(d => d.totalSeconds), 1)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-40">
        {chartData.map((item, index) => {
          const height = (item.totalSeconds / maxSeconds) * 100
          // For daily view, check if weekend
          const isWeekendDay = displayMode !== 'weekly' && displayMode !== 'monthly' && byDay[index]
            ? isWeekend(parseISO(byDay[index].date))
            : false

          return (
            <div
              key={item.key}
              className="flex-1 flex flex-col justify-end h-full group relative"
            >
              <div
                className={cn(
                  'w-full rounded-t transition-all cursor-pointer hover:opacity-80',
                  isWeekendDay
                    ? 'bg-[var(--color-warning)]/60'
                    : 'bg-[var(--color-primary)]'
                )}
                style={{ height: `${Math.max(height, 2)}%` }}
                title={item.tooltip}
              />
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded shadow-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {item.tooltip}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-1">
        {chartData.map(item => (
          <div
            key={`label-${item.key}`}
            className={cn(
              'flex-1 text-center text-[var(--text-secondary)] truncate',
              chartData.length > 14 ? 'text-[8px]' : 'text-[10px]'
            )}
          >
            {item.label}
          </div>
        ))}
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
