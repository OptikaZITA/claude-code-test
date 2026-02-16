'use client'

import * as React from 'react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { ChevronDown, Calendar as CalendarIcon } from 'lucide-react'
import { addDays, addWeeks, addMonths, addYears, format, lastDayOfMonth } from 'date-fns'
import { sk } from 'date-fns/locale'
import { Task, RecurrenceRule, RecurrenceType, RecurrenceFrequency, RecurrenceEndType, RecurrenceUnit } from '@/types'
import { cn } from '@/lib/utils/cn'

interface RecurrenceConfigModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task
  onSave: (rule: RecurrenceRule | null) => void
}

// Možnosti pre dropdown "Repeat type"
const REPEAT_TYPE_OPTIONS: { value: RecurrenceType | 'none'; label: string }[] = [
  { value: 'none', label: 'Neopakovať' },
  { value: 'after_completion', label: 'Po dokončení' },
  { value: 'scheduled', label: 'Podľa rozvrhu' },
]

// Možnosti pre dropdown "Frequency"
const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string; labelPlural: string }[] = [
  { value: 'daily', label: 'deň', labelPlural: 'dní' },
  { value: 'weekly', label: 'týždeň', labelPlural: 'týždňov' },
  { value: 'monthly', label: 'mesiac', labelPlural: 'mesiacov' },
  { value: 'yearly', label: 'rok', labelPlural: 'rokov' },
]

// Možnosti pre dropdown "Ends"
const END_TYPE_OPTIONS: { value: RecurrenceEndType; label: string }[] = [
  { value: 'never', label: 'Nikdy' },
  { value: 'after_count', label: 'Po počte opakovaní' },
  { value: 'on_date', label: 'K dátumu' },
]

// Dni v týždni
const WEEKDAYS = [
  { value: 0, label: 'Pondelok' },
  { value: 1, label: 'Utorok' },
  { value: 2, label: 'Streda' },
  { value: 3, label: 'Štvrtok' },
  { value: 4, label: 'Piatok' },
  { value: 5, label: 'Sobota' },
  { value: 6, label: 'Nedeľa' },
]

// Mesiace
const MONTHS = [
  { value: 1, label: 'Január' },
  { value: 2, label: 'Február' },
  { value: 3, label: 'Marec' },
  { value: 4, label: 'Apríl' },
  { value: 5, label: 'Máj' },
  { value: 6, label: 'Jún' },
  { value: 7, label: 'Júl' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Október' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

// Helper: konverzia starého unit na nový frequency
function unitToFrequency(unit: RecurrenceUnit): RecurrenceFrequency {
  const map: Record<RecurrenceUnit, RecurrenceFrequency> = {
    day: 'daily',
    week: 'weekly',
    month: 'monthly',
    year: 'yearly',
  }
  return map[unit]
}

// Custom Select Component
interface SelectProps {
  value: string | number
  options: { value: string | number; label: string }[]
  onChange: (value: string | number) => void
  className?: string
}

function Select({ value, options, onChange, className }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(o => o.value === value)

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2 rounded-lg',
          'border border-border bg-background text-foreground text-sm',
          'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'transition-colors',
          className
        )}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed rounded-lg border border-border bg-card shadow-lg z-[9999] py-1 max-h-60 overflow-y-auto"
          style={{ top: position.top, left: position.left, minWidth: position.width }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors',
                'hover:bg-accent',
                value === option.value && 'bg-accent text-primary font-medium'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

// Date Picker with Calendar
interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  minDate?: Date
}

function DatePicker({ value, onChange, minDate }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedDate = value ? new Date(value) : undefined

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const dropdownHeight = 320
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= dropdownHeight ? rect.bottom + 4 : rect.top - dropdownHeight - 4
      setPosition({ top, left: rect.left })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'))
      setIsOpen(false)
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'border border-border bg-background text-foreground text-sm',
          'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'transition-colors'
        )}
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <span>{value ? format(new Date(value), 'd. MMM yyyy', { locale: sk }) : 'Vybrať dátum'}</span>
      </button>

      {isOpen && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed rounded-xl border border-border bg-card shadow-xl z-[9999]"
          style={{ top: position.top, left: position.left }}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={minDate ? { before: minDate } : undefined}
          />
        </div>,
        document.body
      )}
    </>
  )
}

export function RecurrenceConfigModal({ isOpen, onClose, task, onSave }: RecurrenceConfigModalProps) {
  // State pre formulár
  const [repeatType, setRepeatType] = useState<RecurrenceType | 'none'>('none')
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly')
  const [interval, setInterval] = useState(1)

  // Weekly
  const [selectedWeekday, setSelectedWeekday] = useState(0)

  // Monthly
  const [monthDay, setMonthDay] = useState(1)

  // Yearly
  const [yearMonth, setYearMonth] = useState(1)
  const [yearDay, setYearDay] = useState(1)

  // Start date
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // End
  const [endType, setEndType] = useState<RecurrenceEndType>('never')
  const [endAfterCount, setEndAfterCount] = useState(5)
  const [endOnDate, setEndOnDate] = useState('')

  // Reminders & deadlines
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('09:00')
  const [deadlineEnabled, setDeadlineEnabled] = useState(false)
  const [deadlineDaysBefore, setDeadlineDaysBefore] = useState(0)

  // Naplniť formulár z existujúceho pravidla
  useEffect(() => {
    if (task.recurrence_rule) {
      const rule = task.recurrence_rule

      setRepeatType(rule.type)
      setInterval(rule.interval)

      if (rule.frequency) {
        setFrequency(rule.frequency)
      } else if (rule.unit) {
        setFrequency(unitToFrequency(rule.unit))
      }

      if (rule.weekdays && rule.weekdays.length > 0) {
        setSelectedWeekday(rule.weekdays[0])
      }

      if (rule.month_day !== undefined) {
        setMonthDay(rule.month_day)
      }

      if (rule.year_month !== undefined) {
        setYearMonth(rule.year_month)
      }
      if (rule.year_day !== undefined) {
        setYearDay(rule.year_day)
      }

      if (rule.start_date) {
        setStartDate(rule.start_date)
      } else if (rule.next_date) {
        setStartDate(rule.next_date)
      }

      setEndType(rule.end_type)
      if (rule.end_after_count) setEndAfterCount(rule.end_after_count)
      if (rule.end_on_date) setEndOnDate(rule.end_on_date)

      if (rule.reminder_time) {
        setReminderEnabled(true)
        setReminderTime(rule.reminder_time)
      }
      if (rule.deadline_days_before !== undefined) {
        setDeadlineEnabled(true)
        setDeadlineDaysBefore(rule.deadline_days_before)
      }
    } else {
      setRepeatType('none')
      setFrequency('weekly')
      setInterval(1)
      setSelectedWeekday(0)
      setMonthDay(1)
      setYearMonth(1)
      setYearDay(1)
      setStartDate(format(new Date(), 'yyyy-MM-dd'))
      setEndType('never')
      setEndAfterCount(5)
      setEndOnDate('')
      setReminderEnabled(false)
      setReminderTime('09:00')
      setDeadlineEnabled(false)
      setDeadlineDaysBefore(0)
    }
  }, [task.recurrence_rule, isOpen])

  // Vypočítať nasledujúce dátumy
  const upcomingDates = useMemo(() => {
    if (repeatType === 'none') return []

    const dates: Date[] = []
    let current = startDate ? new Date(startDate) : new Date()

    const getAdjustedDate = (baseDate: Date): Date => {
      let adjusted = new Date(baseDate)

      switch (frequency) {
        case 'weekly':
          const targetDayOfWeek = selectedWeekday === 6 ? 0 : selectedWeekday + 1
          const currentDayOfWeek = adjusted.getDay()
          const diff = targetDayOfWeek - currentDayOfWeek
          adjusted = addDays(adjusted, diff >= 0 ? diff : diff + 7)
          break

        case 'monthly':
          if (monthDay === -1) {
            adjusted = lastDayOfMonth(adjusted)
          } else {
            const maxDay = lastDayOfMonth(adjusted).getDate()
            adjusted.setDate(Math.min(monthDay, maxDay))
          }
          break

        case 'yearly':
          adjusted.setMonth(yearMonth - 1)
          const maxDayInMonth = lastDayOfMonth(adjusted).getDate()
          adjusted.setDate(Math.min(yearDay, maxDayInMonth))
          break
      }

      return adjusted
    }

    let firstDate = getAdjustedDate(current)

    if (firstDate < new Date(startDate)) {
      switch (frequency) {
        case 'daily':
          firstDate = addDays(firstDate, interval)
          break
        case 'weekly':
          firstDate = addWeeks(firstDate, interval)
          break
        case 'monthly':
          firstDate = addMonths(firstDate, interval)
          firstDate = getAdjustedDate(firstDate)
          break
        case 'yearly':
          firstDate = addYears(firstDate, interval)
          firstDate = getAdjustedDate(firstDate)
          break
      }
    }

    dates.push(new Date(firstDate))
    current = firstDate

    for (let i = 1; i < 4; i++) {
      switch (frequency) {
        case 'daily':
          current = addDays(current, interval)
          break
        case 'weekly':
          current = addWeeks(current, interval)
          break
        case 'monthly':
          current = addMonths(current, interval)
          current = getAdjustedDate(current)
          break
        case 'yearly':
          current = addYears(current, interval)
          current = getAdjustedDate(current)
          break
      }

      if (endType === 'after_count' && i >= endAfterCount) break
      if (endType === 'on_date' && endOnDate && current > new Date(endOnDate)) break

      dates.push(new Date(current))
    }

    return dates
  }, [repeatType, frequency, interval, startDate, selectedWeekday, monthDay, yearMonth, yearDay, endType, endAfterCount, endOnDate])

  const handleSave = () => {
    if (repeatType === 'none') {
      onSave(null)
      onClose()
      return
    }

    const rule: RecurrenceRule = {
      type: repeatType,
      frequency,
      interval,
      end_type: endType,
      completed_count: task.recurrence_rule?.completed_count || 0,
      start_date: startDate,
      next_date: upcomingDates.length > 0 ? format(upcomingDates[0], 'yyyy-MM-dd') : startDate,
    }

    if (frequency === 'weekly') {
      rule.weekdays = [selectedWeekday]
    }

    if (frequency === 'monthly') {
      rule.month_day = monthDay
    }

    if (frequency === 'yearly') {
      rule.year_month = yearMonth
      rule.year_day = yearDay
    }

    if (endType === 'after_count') rule.end_after_count = endAfterCount
    if (endType === 'on_date') rule.end_on_date = endOnDate

    if (reminderEnabled) rule.reminder_time = reminderTime
    if (deadlineEnabled) rule.deadline_days_before = deadlineDaysBefore

    onSave(rule)
    onClose()
  }

  const handleRemove = () => {
    onSave(null)
    onClose()
  }

  // Build interval label
  const frequencyOption = FREQUENCY_OPTIONS.find(f => f.value === frequency)
  const intervalLabel = interval === 1 ? frequencyOption?.label : frequencyOption?.labelPlural

  // Build weekday options
  const weekdayOptions = WEEKDAYS.map(d => ({ value: d.value, label: d.label }))

  // Build month day options
  const monthDayOptions = [
    ...Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}.` })),
    { value: -1, label: 'posledný' }
  ]

  // Build year day options
  const yearDayOptions = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}.` }))

  // Build month options
  const monthOptions = MONTHS.map(m => ({ value: m.value, label: m.label }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Opakovanie" size="md">
      <div className="space-y-5">
        {/* Typ opakovania */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Opakovať
          </label>
          <Select
            value={repeatType}
            options={REPEAT_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            onChange={(v) => setRepeatType(v as RecurrenceType | 'none')}
            className="w-full"
          />
        </div>

        {repeatType !== 'none' && (
          <>
            {/* Frekvencia a interval */}
            <div className="rounded-xl bg-muted/30 border border-border p-4 space-y-4">
              {/* Hlavný riadok */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-foreground font-medium">Každý</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Select
                  value={frequency}
                  options={FREQUENCY_OPTIONS.map(o => ({ value: o.value, label: interval === 1 ? o.label : o.labelPlural }))}
                  onChange={(v) => setFrequency(v as RecurrenceFrequency)}
                  className="min-w-[100px]"
                />

                {/* Weekly: deň v týždni inline */}
                {frequency === 'weekly' && (
                  <>
                    <span className="text-muted-foreground">v</span>
                    <Select
                      value={selectedWeekday}
                      options={weekdayOptions}
                      onChange={(v) => setSelectedWeekday(v as number)}
                      className="min-w-[120px]"
                    />
                  </>
                )}
              </div>

              {/* Monthly: deň v mesiaci */}
              {frequency === 'monthly' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">v</span>
                  <Select
                    value={monthDay}
                    options={monthDayOptions}
                    onChange={(v) => setMonthDay(v as number)}
                    className="min-w-[100px]"
                  />
                  <span className="text-muted-foreground">deň mesiaca</span>
                </div>
              )}

              {/* Yearly: deň a mesiac */}
              {frequency === 'yearly' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">v</span>
                  <Select
                    value={yearDay}
                    options={yearDayOptions}
                    onChange={(v) => setYearDay(v as number)}
                    className="min-w-[80px]"
                  />
                  <span className="text-muted-foreground">deň</span>
                  <Select
                    value={yearMonth}
                    options={monthOptions}
                    onChange={(v) => setYearMonth(v as number)}
                    className="min-w-[120px]"
                  />
                </div>
              )}
            </div>

            {/* Start date a preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Začať od:</span>
                <DatePicker value={startDate} onChange={setStartDate} />
              </div>

              {/* Preview nasledujúcich dátumov */}
              {upcomingDates.length > 0 && (
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Nasledujúce výskyty:</p>
                  <p className="text-sm text-foreground">
                    {upcomingDates.map((d, i) => (
                      <span key={i}>
                        {format(d, 'd. MMMM yyyy', { locale: sk })}
                        {i < upcomingDates.length - 1 && <span className="text-muted-foreground">, </span>}
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>

            {/* Kedy skončiť */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Ukončiť
              </label>
              <div className="space-y-3">
                <Select
                  value={endType}
                  options={END_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  onChange={(v) => setEndType(v as RecurrenceEndType)}
                  className="w-full"
                />

                {endType === 'after_count' && (
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">Po</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={endAfterCount}
                      onChange={(e) => setEndAfterCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-foreground">opakovaniach</span>
                  </div>
                )}

                {endType === 'on_date' && (
                  <DatePicker
                    value={endOnDate}
                    onChange={setEndOnDate}
                    minDate={new Date()}
                  />
                )}
              </div>
            </div>

            {/* Voliteľné nastavenia */}
            <div className="space-y-3 pt-3 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground text-sm">Pridať pripomienku</span>
                {reminderEnabled && (
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deadlineEnabled}
                  onChange={(e) => setDeadlineEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground text-sm">Pridať deadline</span>
                {deadlineEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={deadlineDaysBefore}
                      onChange={(e) => setDeadlineDaysBefore(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-sm text-muted-foreground">dní skôr</span>
                  </div>
                )}
              </label>
            </div>

            {/* Aktuálny stav */}
            {task.recurrence_rule?.completed_count !== undefined && task.recurrence_rule.completed_count > 0 && (
              <div className="text-sm text-muted-foreground">
                Dokončených opakovaní: {task.recurrence_rule.completed_count}
              </div>
            )}
          </>
        )}

        {/* Tlačidlá */}
        <div className="flex justify-between pt-4 border-t border-border">
          <div>
            {task.recurrence_rule && (
              <Button variant="ghost" onClick={handleRemove} className="text-destructive hover:text-destructive">
                Odstrániť
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Zrušiť
            </Button>
            <Button onClick={handleSave}>
              Uložiť
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
