'use client'

import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { Clock, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

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
  items: ChartDataItem[]
  visibleItems: Set<string>
  visibleTotalSeconds: number
  onToggle: (id: string) => void
}

function CustomLegend({ items, visibleItems, visibleTotalSeconds, onToggle }: CustomLegendProps) {
  if (!items || items.length === 0) return null

  return (
    <div className="flex flex-col gap-1 mt-4">
      {items.map((item, index) => {
        const isVisible = visibleItems.has(item.id)
        const percent = isVisible && visibleTotalSeconds > 0
          ? ((item.value / visibleTotalSeconds) * 100).toFixed(0)
          : null

        return (
          <button
            key={`legend-${index}`}
            onClick={() => onToggle(item.id)}
            className={cn(
              'flex items-center gap-2 text-sm py-1.5 px-2 -mx-2 rounded-lg transition-colors',
              'hover:bg-[var(--bg-tertiary)]',
              !isVisible && 'opacity-60'
            )}
          >
            {/* Checkbox indicator - colored when checked */}
            <div
              className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                isVisible
                  ? 'border-transparent'
                  : 'border-[var(--border-primary)] bg-transparent'
              )}
              style={{ backgroundColor: isVisible ? item.color : 'transparent' }}
            >
              {isVisible && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>

            {/* Name */}
            <span className={cn(
              'truncate flex-1 text-left transition-colors',
              isVisible ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
            )}>
              {item.name}
            </span>

            {/* Duration */}
            <span className="text-[var(--text-secondary)] whitespace-nowrap">
              {formatDuration(item.value)}
            </span>

            {/* Percentage - only show for visible items */}
            <span className={cn(
              'w-10 text-right whitespace-nowrap',
              isVisible ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]/50'
            )}>
              {percent !== null ? `${percent}%` : '-'}
            </span>
          </button>
        )
      })}

      {/* Total row */}
      <div className="flex items-center gap-2 text-sm py-1.5 px-2 -mx-2 border-t border-[var(--border-primary)] mt-2 pt-3">
        <div className="w-4 h-4 shrink-0" /> {/* Spacer for checkbox */}
        <span className="truncate flex-1 text-left font-medium text-[var(--text-primary)]">
          Celkom v grafe
        </span>
        <span className="text-[var(--text-primary)] font-medium whitespace-nowrap">
          {formatDuration(visibleTotalSeconds)}
        </span>
        <span className="w-10 text-right text-[var(--text-secondary)]">
          100%
        </span>
      </div>
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

  // State for visible items (toggle functionality)
  const [visibleItems, setVisibleItems] = useState<Set<string>>(() => new Set(data.map(item => item.id)))

  // Reset visible items when data changes (e.g., when groupBy changes)
  useEffect(() => {
    setVisibleItems(new Set(data.map(item => item.id)))
  }, [data.map(d => d.id).join(',')])

  // Toggle item visibility
  const toggleItem = (itemId: string) => {
    setVisibleItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        // Don't allow unchecking if it's the last visible item
        if (next.size <= 1) return prev
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  // Group small segments into "Ostatné" for better readability
  const groupedData = groupSmallSegments(data, totalSeconds)

  // Assign colors if not provided
  const allChartData = useMemo(() => groupedData.map((item, index) => ({
    ...item,
    color: item.color || CHART_COLORS[index % CHART_COLORS.length],
  })), [groupedData])

  // Filter to only visible items for the pie chart
  const visibleChartData = useMemo(() =>
    allChartData.filter(item => visibleItems.has(item.id)),
    [allChartData, visibleItems]
  )

  // Calculate total for visible items only
  const visibleTotalSeconds = useMemo(() =>
    visibleChartData.reduce((sum, item) => sum + item.value, 0),
    [visibleChartData]
  )

  // Get active segment from index (within visible data)
  const activeSegment = activeIndex !== null ? visibleChartData[activeIndex] : null

  // Empty state
  if (data.length === 0 || totalSeconds === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-[var(--text-secondary)]">
        <Clock className="h-12 w-12 mb-4 opacity-50" />
        <p>Žiadne dáta</p>
        <p className="text-sm">pre vybrané obdobie</p>
      </div>
    )
  }

  // No visible items state
  if (visibleChartData.length === 0) {
    return (
      <div className="flex flex-col items-center py-8">
        <Clock className="h-12 w-12 mb-4 opacity-50 text-[var(--text-secondary)]" />
        <p className="text-[var(--text-secondary)] mb-4">Vyberte aspoň jednu položku</p>
        <div className="w-full max-h-[250px] overflow-y-auto">
          <CustomLegend
            items={allChartData}
            visibleItems={visibleItems}
            visibleTotalSeconds={0}
            onToggle={toggleItem}
          />
        </div>
      </div>
    )
  }

  // Chart dimensions - fixed size for consistent appearance
  const chartSize = 200
  const innerRadius = 55
  const outerRadius = 85

  return (
    <div className="flex flex-col items-center" onMouseLeave={() => setActiveIndex(null)}>
      {/* Chart container - fixed size, centered */}
      <div className="relative" style={{ width: chartSize, height: chartSize }}>
        <PieChart
          width={chartSize}
          height={chartSize}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <Pie
            data={visibleChartData}
            cx={chartSize / 2}
            cy={chartSize / 2}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            startAngle={90}
            endAngle={-270}
            onClick={(data) => data.id !== 'others' && onSegmentClick?.(data.id)}
            onMouseOver={(_, index) => setActiveIndex(index)}
            style={{ cursor: onSegmentClick ? 'pointer' : 'default', outline: 'none' }}
          >
            {visibleChartData.map((entry, index) => (
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
        </PieChart>

        {/* Central value - absolutely positioned in the center of the donut hole */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="flex flex-col items-center justify-center text-center transition-all duration-150">
            {activeSegment ? (
              (() => {
                const { text, isLong } = formatCenterName(activeSegment.name)
                const segmentPercent = visibleTotalSeconds > 0
                  ? ((activeSegment.value / visibleTotalSeconds) * 100).toFixed(1)
                  : '0'
                return (
                  <>
                    <div
                      className={cn(
                        'font-bold leading-tight max-w-[90px] text-center',
                        isLong ? 'text-xs' : 'text-sm'
                      )}
                      style={{ color: activeSegment.color }}
                    >
                      {text}
                    </div>
                    <div className="text-base font-bold text-[var(--text-primary)] mt-0.5 text-center">
                      {formatDuration(activeSegment.value)}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] text-center">
                      {segmentPercent}%
                    </div>
                  </>
                )
              })()
            ) : (
              <>
                <div className="text-xl font-bold text-[var(--text-primary)] text-center">
                  {formatDuration(visibleTotalSeconds)}
                </div>
                <div className="text-xs text-[var(--text-secondary)] text-center">
                  celkovo
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Custom Legend with toggle functionality - scrollable if many items */}
      <div className="w-full mt-4 max-h-[250px] overflow-y-auto">
        <CustomLegend
          items={allChartData}
          visibleItems={visibleItems}
          visibleTotalSeconds={visibleTotalSeconds}
          onToggle={toggleItem}
        />
      </div>
    </div>
  )
}
