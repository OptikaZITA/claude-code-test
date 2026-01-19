'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
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

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: ChartDataItem
  }>
  totalSeconds: number
}

function CustomTooltip({ active, payload, totalSeconds }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const item = payload[0]
  const percent = totalSeconds > 0 ? ((item.value / totalSeconds) * 100).toFixed(1) : '0'

  return (
    <div className="bg-[var(--bg-primary)] p-3 rounded-lg shadow-lg border border-[var(--border-primary)]">
      <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
      <p className="text-[var(--text-secondary)]">
        {formatDuration(item.value)}
      </p>
      <p className="text-sm text-[var(--text-secondary)]">
        {percent}%
      </p>
    </div>
  )
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

export function TimePieChart({ data, totalSeconds, onSegmentClick }: TimePieChartProps) {
  // Assign colors if not provided
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || CHART_COLORS[index % CHART_COLORS.length],
  }))

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
    <div className="relative">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            onClick={(data) => onSegmentClick?.(data.id)}
            style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="var(--bg-primary)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            content={<CustomTooltip totalSeconds={totalSeconds} />}
          />
          <Legend
            content={<CustomLegend totalSeconds={totalSeconds} />}
            verticalAlign="bottom"
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Central value */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ height: 300 }}>
        <div className="text-center -mt-16">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {formatDuration(totalSeconds)}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            celkovo
          </div>
        </div>
      </div>
    </div>
  )
}
