'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { Clock } from 'lucide-react'

// ZITA TODO color palette
const CHART_COLORS = [
  '#007AFF', // Modrá (primary)
  '#34C759', // Zelená (success)
  '#FF9500', // Oranžová (warning)
  '#AF52DE', // Fialová
  '#FF3B30', // Červená
  '#5AC8FA', // Svetlo modrá
  '#FFCC00', // Žltá
  '#FF2D55', // Ružová
  '#00C7BE', // Tyrkysová
  '#8E8E93', // Šedá
]

interface ChartDataItem {
  id: string
  name: string
  value: number // seconds
  percent: number
  color?: string
}

interface TimePieChartProps {
  data: ChartDataItem[]
  totalSeconds: number
  onSegmentClick?: (id: string) => void
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

interface CustomLegendProps {
  payload?: Array<{
    value: string
    color: string
    payload: ChartDataItem
  }>
  totalSeconds: number
}

function CustomLegend({ payload, totalSeconds }: CustomLegendProps) {
  if (!payload) return null

  return (
    <div className="flex flex-col gap-2 mt-4">
      {payload.map((entry, index) => {
        const percent = totalSeconds > 0
          ? ((entry.payload.value / totalSeconds) * 100).toFixed(0)
          : '0'

        return (
          <div key={`legend-${index}`} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[var(--text-primary)] truncate flex-1">
              {entry.value}
            </span>
            <span className="text-[var(--text-secondary)] whitespace-nowrap">
              {formatDuration(entry.payload.value)}
            </span>
            <span className="text-[var(--text-secondary)] w-10 text-right">
              {percent}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Helper to format long names for center display
function formatCenterName(name: string): { text: string; isLong: boolean } {
  if (name.length <= 12) {
    return { text: name, isLong: false }
  }
  // For longer names, try to break at a reasonable point
  if (name.length <= 20) {
    return { text: name, isLong: true }
  }
  // Very long names - truncate with ellipsis
  return { text: name.substring(0, 18) + '…', isLong: true }
}

// Configuration for grouping small segments
const TOP_N = 6 // Maximum number of segments before grouping
const MIN_PERCENT_THRESHOLD = 3 // Minimum percentage to show as separate segment

// Group small segments into "Ostatné"
function groupSmallSegments(
  data: ChartDataItem[],
  totalSeconds: number
): ChartDataItem[] {
  if (data.length <= TOP_N) {
    return data
  }

  // Sort by value descending
  const sorted = [...data].sort((a, b) => b.value - a.value)

  // Keep items that are either in top N or above threshold
  const threshold = totalSeconds * (MIN_PERCENT_THRESHOLD / 100)
  const significantItems: ChartDataItem[] = []
  const smallItems: ChartDataItem[] = []

  sorted.forEach((item, index) => {
    // Keep if in top (N-1) to leave room for "Ostatné", OR if above threshold
    if (index < TOP_N - 1 || item.value >= threshold) {
      significantItems.push(item)
    } else {
      smallItems.push(item)
    }
  })

  // If we have small items, group them
  if (smallItems.length > 0) {
    const othersValue = smallItems.reduce((sum, item) => sum + item.value, 0)
    const othersPercent = totalSeconds > 0
      ? Math.round((othersValue / totalSeconds) * 1000) / 10
      : 0

    // Limit significant items to TOP_N - 1 to make room for "Ostatné"
    const finalSignificant = significantItems.slice(0, TOP_N - 1)

    // Add remaining significant items to "Ostatné"
    const extraItems = significantItems.slice(TOP_N - 1)
    const extraValue = extraItems.reduce((sum, item) => sum + item.value, 0)

    return [
      ...finalSignificant,
      {
        id: 'others',
        name: `Ostatné (${smallItems.length + extraItems.length})`,
        value: othersValue + extraValue,
        percent: othersPercent + extraItems.reduce((sum, item) => sum + item.percent, 0),
        color: '#8E8E93', // Gray for "others"
      },
    ]
  }

  return significantItems
}

export function TimePieChart({ data, totalSeconds, onSegmentClick }: TimePieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Group small segments into "Ostatné" for better readability
  const groupedData = groupSmallSegments(data, totalSeconds)

  // Assign colors if not provided
  const chartData = groupedData.map((item, index) => ({
    ...item,
    color: item.color || CHART_COLORS[index % CHART_COLORS.length],
  }))

  // Get active segment from index
  const activeSegment = activeIndex !== null ? chartData[activeIndex] : null

  // Empty state
  if (data.length === 0 || totalSeconds === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-[var(--text-secondary)]">
        <Clock className="h-12 w-12 mb-4 opacity-50" />
        <p>Žiadne dáta</p>
        <p className="text-sm">pre vybrané obdobie</p>
      </div>
    )
  }

  return (
    <div className="relative" onMouseLeave={() => setActiveIndex(null)}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart onMouseLeave={() => setActiveIndex(null)}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            onClick={(data) => data.id !== 'others' && onSegmentClick?.(data.id)}
            onMouseOver={(_, index) => setActiveIndex(index)}
            style={{ cursor: onSegmentClick ? 'pointer' : 'default', outline: 'none' }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="var(--bg-primary)"
                strokeWidth={2}
                style={{
                  opacity: activeIndex !== null && activeIndex !== index ? 0.6 : 1,
                  transition: 'opacity 150ms ease',
                  outline: 'none'
                }}
              />
            ))}
          </Pie>
          <Legend
            content={<CustomLegend totalSeconds={totalSeconds} />}
            verticalAlign="bottom"
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Central value - shows hovered segment or total */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ height: 300 }}>
        <div className="text-center -mt-16 transition-all duration-150">
          {activeSegment ? (
            (() => {
              const { text, isLong } = formatCenterName(activeSegment.name)
              return (
                <>
                  <div
                    className={`font-bold leading-tight ${isLong ? 'text-sm' : 'text-base'}`}
                    style={{ color: activeSegment.color, maxWidth: 110 }}
                  >
                    {text}
                  </div>
                  <div className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
                    {formatDuration(activeSegment.value)}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {totalSeconds > 0 ? ((activeSegment.value / totalSeconds) * 100).toFixed(1) : '0'}%
                  </div>
                </>
              )
            })()
          ) : (
            <>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {formatDuration(totalSeconds)}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                celkovo
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
