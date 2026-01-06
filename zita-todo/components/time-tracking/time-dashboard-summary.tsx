'use client'

import { Clock, ListTodo, TrendingUp } from 'lucide-react'

interface TimeDashboardSummaryProps {
  totalSeconds: number
  entryCount: number
  avgPerDay: number
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

interface SummaryCardProps {
  label: string
  value: string
  icon: React.ElementType
  color: string
}

function SummaryCard({ label, value, icon: Icon, color }: SummaryCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
      <div
        className="flex items-center justify-center h-12 w-12 rounded-xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  )
}

export function TimeDashboardSummary({
  totalSeconds,
  entryCount,
  avgPerDay,
}: TimeDashboardSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard
        label="Celkový čas"
        value={formatDuration(totalSeconds)}
        icon={Clock}
        color="var(--color-primary)"
      />
      <SummaryCard
        label="Počet záznamov"
        value={entryCount.toString()}
        icon={ListTodo}
        color="var(--color-success)"
      />
      <SummaryCard
        label="Priemer za deň"
        value={formatDuration(avgPerDay)}
        icon={TrendingUp}
        color="var(--color-warning)"
      />
    </div>
  )
}
