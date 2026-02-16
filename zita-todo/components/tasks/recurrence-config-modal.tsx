'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { addDays, addWeeks, addMonths, addYears, format, setDay, setDate, setMonth, lastDayOfMonth } from 'date-fns'
import { sk } from 'date-fns/locale'
import { Task, RecurrenceRule, RecurrenceType, RecurrenceFrequency, RecurrenceEndType, RecurrenceUnit } from '@/types'

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
  { value: 0, label: 'Pondelok', short: 'Po' },
  { value: 1, label: 'Utorok', short: 'Ut' },
  { value: 2, label: 'Streda', short: 'St' },
  { value: 3, label: 'Štvrtok', short: 'Št' },
  { value: 4, label: 'Piatok', short: 'Pi' },
  { value: 5, label: 'Sobota', short: 'So' },
  { value: 6, label: 'Nedeľa', short: 'Ne' },
]

// Mesiace
const MONTHS = [
  { value: 1, label: 'Januári', short: 'Jan' },
  { value: 2, label: 'Februári', short: 'Feb' },
  { value: 3, label: 'Marci', short: 'Mar' },
  { value: 4, label: 'Apríli', short: 'Apr' },
  { value: 5, label: 'Máji', short: 'Máj' },
  { value: 6, label: 'Júni', short: 'Jún' },
  { value: 7, label: 'Júli', short: 'Júl' },
  { value: 8, label: 'Auguste', short: 'Aug' },
  { value: 9, label: 'Septembri', short: 'Sep' },
  { value: 10, label: 'Októbri', short: 'Okt' },
  { value: 11, label: 'Novembri', short: 'Nov' },
  { value: 12, label: 'Decembri', short: 'Dec' },
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

export function RecurrenceConfigModal({ isOpen, onClose, task, onSave }: RecurrenceConfigModalProps) {
  // State pre formulár
  const [repeatType, setRepeatType] = useState<RecurrenceType | 'none'>('none')
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly')
  const [interval, setInterval] = useState(1)

  // Weekly
  const [selectedWeekday, setSelectedWeekday] = useState(0) // 0=Po ... 6=Ne

  // Monthly
  const [monthDay, setMonthDay] = useState(1) // 1-31, -1 = posledný

  // Yearly
  const [yearMonth, setYearMonth] = useState(1) // 1-12
  const [yearDay, setYearDay] = useState(1) // 1-31

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

      // Spätná kompatibilita: ak existuje unit, konvertuj na frequency
      if (rule.frequency) {
        setFrequency(rule.frequency)
      } else if (rule.unit) {
        setFrequency(unitToFrequency(rule.unit))
      }

      // Weekly
      if (rule.weekdays && rule.weekdays.length > 0) {
        setSelectedWeekday(rule.weekdays[0])
      }

      // Monthly
      if (rule.month_day !== undefined) {
        setMonthDay(rule.month_day)
      }

      // Yearly
      if (rule.year_month !== undefined) {
        setYearMonth(rule.year_month)
      }
      if (rule.year_day !== undefined) {
        setYearDay(rule.year_day)
      }

      // Start date
      if (rule.start_date) {
        setStartDate(rule.start_date)
      } else if (rule.next_date) {
        setStartDate(rule.next_date)
      }

      // End
      setEndType(rule.end_type)
      if (rule.end_after_count) setEndAfterCount(rule.end_after_count)
      if (rule.end_on_date) setEndOnDate(rule.end_on_date)

      // Options
      if (rule.reminder_time) {
        setReminderEnabled(true)
        setReminderTime(rule.reminder_time)
      }
      if (rule.deadline_days_before !== undefined) {
        setDeadlineEnabled(true)
        setDeadlineDaysBefore(rule.deadline_days_before)
      }
    } else {
      // Reset na default
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

    // Prvý dátum je startDate (po adjustovaní na správny deň)
    const getAdjustedDate = (baseDate: Date): Date => {
      let adjusted = new Date(baseDate)

      switch (frequency) {
        case 'weekly':
          // Nastav na správny deň v týždni (0=Po v našom systéme, ale Date používa 0=Ne)
          // Konvertujeme: náš 0=Po → Date 1, náš 6=Ne → Date 0
          const targetDayOfWeek = selectedWeekday === 6 ? 0 : selectedWeekday + 1
          const currentDayOfWeek = adjusted.getDay()
          const diff = targetDayOfWeek - currentDayOfWeek
          adjusted = addDays(adjusted, diff >= 0 ? diff : diff + 7)
          break

        case 'monthly':
          if (monthDay === -1) {
            // Posledný deň mesiaca
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

    // Prvý dátum
    let firstDate = getAdjustedDate(current)

    // Ak je prvý dátum pred startDate, posuň o interval
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

    // Ďalšie dátumy
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

      // Kontrola end conditions
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

    // Weekly
    if (frequency === 'weekly') {
      rule.weekdays = [selectedWeekday]
    }

    // Monthly
    if (frequency === 'monthly') {
      rule.month_day = monthDay
    }

    // Yearly
    if (frequency === 'yearly') {
      rule.year_month = yearMonth
      rule.year_day = yearDay
    }

    // End conditions
    if (endType === 'after_count') rule.end_after_count = endAfterCount
    if (endType === 'on_date') rule.end_on_date = endOnDate

    // Optional
    if (reminderEnabled) rule.reminder_time = reminderTime
    if (deadlineEnabled) rule.deadline_days_before = deadlineDaysBefore

    onSave(rule)
    onClose()
  }

  const handleRemove = () => {
    onSave(null)
    onClose()
  }

  const frequencyOption = FREQUENCY_OPTIONS.find(f => f.value === frequency)
  const frequencyLabel = interval === 1 ? frequencyOption?.label : frequencyOption?.labelPlural

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Opakovanie" size="md">
      <div className="space-y-6">
        {/* Typ opakovania s toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Opakovať
            </label>
            <select
              value={repeatType}
              onChange={(e) => setRepeatType(e.target.value as RecurrenceType | 'none')}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {REPEAT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {repeatType !== 'none' && (
          <>
            {/* Frekvencia a interval */}
            <div className="p-4 rounded-lg bg-accent/30 border border-border space-y-4">
              {/* Hlavný riadok: Každý X [frequency] */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-foreground font-medium">Každý</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1.5 rounded border border-border bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                  className="px-3 py-1.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {interval === 1 ? opt.label : opt.labelPlural}
                    </option>
                  ))}
                </select>
              </div>

              {/* Weekly: výber dňa */}
              {frequency === 'weekly' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">v</span>
                  <select
                    value={selectedWeekday}
                    onChange={(e) => setSelectedWeekday(parseInt(e.target.value))}
                    className="px-3 py-1.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Monthly: výber dňa v mesiaci */}
              {frequency === 'monthly' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">v</span>
                  <select
                    value={monthDay}
                    onChange={(e) => setMonthDay(parseInt(e.target.value))}
                    className="px-3 py-1.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}.
                      </option>
                    ))}
                    <option value={-1}>posledný</option>
                  </select>
                  <span className="text-muted-foreground">deň</span>
                </div>
              )}

              {/* Yearly: výber dňa a mesiaca */}
              {frequency === 'yearly' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">v</span>
                  <select
                    value={yearDay}
                    onChange={(e) => setYearDay(parseInt(e.target.value))}
                    className="px-3 py-1.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}.
                      </option>
                    ))}
                  </select>
                  <span className="text-muted-foreground">deň</span>
                  <span className="text-muted-foreground">v</span>
                  <select
                    value={yearMonth}
                    onChange={(e) => setYearMonth(parseInt(e.target.value))}
                    className="px-3 py-1.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Start date a preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ďalší:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Preview nasledujúcich dátumov */}
              {upcomingDates.length > 0 && (
                <div className="text-sm text-muted-foreground pl-1">
                  <span className="text-primary">→</span>{' '}
                  {upcomingDates.map((d, i) => (
                    <span key={i}>
                      {format(d, 'd.M.yyyy', { locale: sk })}
                      {i < upcomingDates.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Kedy skončiť */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Ukončiť
              </label>
              <div className="space-y-3">
                <select
                  value={endType}
                  onChange={(e) => setEndType(e.target.value as RecurrenceEndType)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {END_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {endType === 'after_count' && (
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">Po</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={endAfterCount}
                      onChange={(e) => setEndAfterCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-2 py-1 rounded border border-border bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-foreground">opakovaniach</span>
                  </div>
                )}

                {endType === 'on_date' && (
                  <input
                    type="date"
                    value={endOnDate}
                    onChange={(e) => setEndOnDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
            </div>

            {/* Voliteľné nastavenia */}
            <div className="space-y-3 pt-2 border-t border-border">
              {/* Pripomienky */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground">Pridať pripomienku</span>
                {reminderEnabled && (
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-2 py-1 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </label>

              {/* Deadline automatika */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deadlineEnabled}
                  onChange={(e) => setDeadlineEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground">Pridať deadline</span>
                {deadlineEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={deadlineDaysBefore}
                      onChange={(e) => setDeadlineDaysBefore(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
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
