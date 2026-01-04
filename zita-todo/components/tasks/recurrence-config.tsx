'use client'

import { useState } from 'react'
import { Repeat, Calendar, X } from 'lucide-react'
import { RecurrenceRule, RecurrenceFrequency, WeekDay } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

interface RecurrenceConfigProps {
  value: RecurrenceRule | null
  onChange: (rule: RecurrenceRule | null) => void
}

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Denne' },
  { value: 'weekly', label: 'Týždenne' },
  { value: 'monthly', label: 'Mesačne' },
  { value: 'yearly', label: 'Ročne' },
]

const WEEKDAYS: { value: WeekDay; label: string; short: string }[] = [
  { value: 'monday', label: 'Pondelok', short: 'Po' },
  { value: 'tuesday', label: 'Utorok', short: 'Ut' },
  { value: 'wednesday', label: 'Streda', short: 'St' },
  { value: 'thursday', label: 'Štvrtok', short: 'Št' },
  { value: 'friday', label: 'Piatok', short: 'Pi' },
  { value: 'saturday', label: 'Sobota', short: 'So' },
  { value: 'sunday', label: 'Nedeľa', short: 'Ne' },
]

export function RecurrenceConfig({ value, onChange }: RecurrenceConfigProps) {
  const [isExpanded, setIsExpanded] = useState(!!value)

  const handleFrequencyChange = (frequency: RecurrenceFrequency) => {
    onChange({
      frequency,
      interval: 1,
      weekDays: frequency === 'weekly' ? ['monday'] : undefined,
      monthDay: frequency === 'monthly' ? 1 : undefined,
    })
  }

  const handleIntervalChange = (interval: number) => {
    if (!value) return
    onChange({ ...value, interval: Math.max(1, interval) })
  }

  const handleWeekDayToggle = (day: WeekDay) => {
    if (!value || value.frequency !== 'weekly') return

    const currentDays = value.weekDays || []
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day]

    // Ensure at least one day is selected
    if (newDays.length === 0) return

    onChange({ ...value, weekDays: newDays })
  }

  const handleMonthDayChange = (day: number) => {
    if (!value || value.frequency !== 'monthly') return
    onChange({ ...value, monthDay: Math.min(31, Math.max(1, day)) })
  }

  const handleEndDateChange = (date: string) => {
    if (!value) return
    onChange({
      ...value,
      endDate: date || undefined,
      endAfterOccurrences: undefined
    })
  }

  const handleEndAfterChange = (count: number) => {
    if (!value) return
    onChange({
      ...value,
      endAfterOccurrences: count > 0 ? count : undefined,
      endDate: undefined
    })
  }

  const handleRemove = () => {
    onChange(null)
    setIsExpanded(false)
  }

  const getIntervalLabel = () => {
    if (!value) return ''
    const labels: Record<RecurrenceFrequency, string> = {
      daily: value.interval === 1 ? 'deň' : 'dní',
      weekly: value.interval === 1 ? 'týždeň' : 'týždňov',
      monthly: value.interval === 1 ? 'mesiac' : 'mesiacov',
      yearly: value.interval === 1 ? 'rok' : 'rokov',
    }
    return labels[value.frequency]
  }

  const getRecurrenceDescription = () => {
    if (!value) return ''

    let desc = ''

    if (value.interval === 1) {
      desc = FREQUENCIES.find(f => f.value === value.frequency)?.label || ''
    } else {
      desc = `Každých ${value.interval} ${getIntervalLabel()}`
    }

    if (value.frequency === 'weekly' && value.weekDays) {
      const days = value.weekDays.map(d => WEEKDAYS.find(w => w.value === d)?.short).join(', ')
      desc += ` (${days})`
    }

    if (value.frequency === 'monthly' && value.monthDay) {
      desc += ` ${value.monthDay}. dňa`
    }

    return desc
  }

  if (!isExpanded) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsExpanded(true)
          if (!value) {
            handleFrequencyChange('daily')
          }
        }}
        className="gap-2 text-[var(--text-secondary)]"
      >
        <Repeat className="h-4 w-4" />
        {value ? getRecurrenceDescription() : 'Pridať opakovanie'}
      </Button>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-[var(--border-primary)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
          <Repeat className="h-4 w-4" />
          Opakovanie
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Frequency selector */}
      <div className="flex flex-wrap gap-2">
        {FREQUENCIES.map((freq) => (
          <button
            key={freq.value}
            type="button"
            onClick={() => handleFrequencyChange(freq.value)}
            className={cn(
              'rounded-full px-3 py-1 text-sm transition-colors',
              value?.frequency === freq.value
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            )}
          >
            {freq.label}
          </button>
        ))}
      </div>

      {/* Interval */}
      {value && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Každých</span>
          <Input
            type="number"
            min={1}
            value={value.interval}
            onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
            className="w-16 text-center"
          />
          <span className="text-sm text-[var(--text-secondary)]">{getIntervalLabel()}</span>
        </div>
      )}

      {/* Week days for weekly */}
      {value?.frequency === 'weekly' && (
        <div className="flex flex-wrap gap-1">
          {WEEKDAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => handleWeekDayToggle(day.value)}
              className={cn(
                'h-8 w-8 rounded-full text-xs font-medium transition-colors',
                value.weekDays?.includes(day.value)
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              )}
              title={day.label}
            >
              {day.short}
            </button>
          ))}
        </div>
      )}

      {/* Month day for monthly */}
      {value?.frequency === 'monthly' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Deň v mesiaci:</span>
          <Input
            type="number"
            min={1}
            max={31}
            value={value.monthDay || 1}
            onChange={(e) => handleMonthDayChange(parseInt(e.target.value) || 1)}
            className="w-16 text-center"
          />
        </div>
      )}

      {/* End condition */}
      {value && (
        <div className="space-y-2">
          <span className="text-sm text-[var(--text-secondary)]">Ukončenie:</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onChange({ ...value, endDate: undefined, endAfterOccurrences: undefined })
              }}
              className={cn(
                'rounded-full px-3 py-1 text-sm transition-colors',
                !value.endDate && !value.endAfterOccurrences
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              )}
            >
              Nikdy
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleEndAfterChange(value.endAfterOccurrences || 10)}
                className={cn(
                  'rounded-l-full px-3 py-1 text-sm transition-colors',
                  value.endAfterOccurrences
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                )}
              >
                Po
              </button>
              {value.endAfterOccurrences && (
                <>
                  <Input
                    type="number"
                    min={1}
                    value={value.endAfterOccurrences}
                    onChange={(e) => handleEndAfterChange(parseInt(e.target.value) || 1)}
                    className="w-14 rounded-none text-center"
                  />
                  <span className="rounded-r-full bg-[var(--bg-secondary)] px-3 py-1 text-sm text-[var(--text-primary)]">
                    x
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  today.setMonth(today.getMonth() + 3)
                  handleEndDateChange(today.toISOString().split('T')[0])
                }}
                className={cn(
                  'rounded-l-full px-3 py-1 text-sm transition-colors',
                  value.endDate
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                )}
              >
                <Calendar className="h-3 w-3" />
              </button>
              {value.endDate && (
                <Input
                  type="date"
                  value={value.endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="rounded-l-none"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {value && (
        <div className="rounded-lg bg-[var(--bg-secondary)] p-2 text-sm text-[var(--text-secondary)]">
          {getRecurrenceDescription()}
          {value.endDate && ` do ${new Date(value.endDate).toLocaleDateString('sk')}`}
          {value.endAfterOccurrences && ` (${value.endAfterOccurrences}x)`}
        </div>
      )}
    </div>
  )
}
