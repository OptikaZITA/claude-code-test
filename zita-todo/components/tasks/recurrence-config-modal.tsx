'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns'
import { sk } from 'date-fns/locale'
import { Task, RecurrenceRule, RecurrenceType, RecurrenceUnit, RecurrenceEndType } from '@/types'

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

// Možnosti pre dropdown "Unit"
const UNIT_OPTIONS: { value: RecurrenceUnit; label: string }[] = [
  { value: 'day', label: 'deň' },
  { value: 'week', label: 'týždeň' },
  { value: 'month', label: 'mesiac' },
  { value: 'year', label: 'rok' },
]

// Možnosti pre dropdown "Ends"
const END_TYPE_OPTIONS: { value: RecurrenceEndType; label: string }[] = [
  { value: 'never', label: 'Nikdy' },
  { value: 'after_count', label: 'Po počte opakovaní' },
  { value: 'on_date', label: 'K dátumu' },
]

export function RecurrenceConfigModal({ isOpen, onClose, task, onSave }: RecurrenceConfigModalProps) {
  // State pre formulár
  const [repeatType, setRepeatType] = useState<RecurrenceType | 'none'>('none')
  const [interval, setInterval] = useState(1)
  const [unit, setUnit] = useState<RecurrenceUnit>('week')
  const [endType, setEndType] = useState<RecurrenceEndType>('never')
  const [endAfterCount, setEndAfterCount] = useState(5)
  const [endOnDate, setEndOnDate] = useState('')
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
      setUnit(rule.unit)
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
      // Reset na default
      setRepeatType('none')
      setInterval(1)
      setUnit('week')
      setEndType('never')
      setEndAfterCount(5)
      setEndOnDate('')
      setReminderEnabled(false)
      setReminderTime('09:00')
      setDeadlineEnabled(false)
      setDeadlineDaysBefore(0)
    }
  }, [task.recurrence_rule, isOpen])

  // Vypočítať nasledujúce dátumy pre scheduled typ
  const upcomingDates = useMemo(() => {
    if (repeatType !== 'scheduled') return []

    const dates: Date[] = []
    let current = new Date()

    for (let i = 0; i < 5; i++) {
      switch (unit) {
        case 'day':
          current = addDays(current, interval)
          break
        case 'week':
          current = addWeeks(current, interval)
          break
        case 'month':
          current = addMonths(current, interval)
          break
        case 'year':
          current = addYears(current, interval)
          break
      }

      // Kontrola end conditions
      if (endType === 'after_count' && i >= endAfterCount) break
      if (endType === 'on_date' && endOnDate && current > new Date(endOnDate)) break

      dates.push(new Date(current))
    }

    return dates
  }, [repeatType, interval, unit, endType, endAfterCount, endOnDate])

  const handleSave = () => {
    if (repeatType === 'none') {
      onSave(null)
      onClose()
      return
    }

    const rule: RecurrenceRule = {
      type: repeatType,
      interval,
      unit,
      end_type: endType,
      completed_count: task.recurrence_rule?.completed_count || 0,
    }

    if (endType === 'after_count') {
      rule.end_after_count = endAfterCount
    }

    if (endType === 'on_date') {
      rule.end_on_date = endOnDate
    }

    if (repeatType === 'scheduled' && upcomingDates.length > 0) {
      rule.next_date = upcomingDates[0].toISOString().split('T')[0]
    }

    if (reminderEnabled) {
      rule.reminder_time = reminderTime
    }

    if (deadlineEnabled) {
      rule.deadline_days_before = deadlineDaysBefore
    }

    onSave(rule)
    onClose()
  }

  const handleRemove = () => {
    onSave(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Opakovanie" size="md">
      <div className="space-y-6">
        {/* Typ opakovania */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Typ opakovania
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

        {repeatType !== 'none' && (
          <>
            {/* Interval a jednotka */}
            <div className="p-4 rounded-lg bg-accent/30 border border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-foreground">Každý</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as RecurrenceUnit)}
                  className="px-3 py-1 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {repeatType === 'after_completion' && (
                  <span className="text-muted-foreground text-sm">
                    po dokončení predchádzajúcej úlohy
                  </span>
                )}
              </div>
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

            {/* Budúce dátumy pre scheduled */}
            {repeatType === 'scheduled' && upcomingDates.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Nasledujúce výskyty:
                </p>
                <p className="text-sm text-foreground">
                  {upcomingDates.map((date, i) => (
                    <span key={i}>
                      {format(date, 'd.M.yyyy', { locale: sk })}
                      {i < upcomingDates.length - 1 && ', '}
                    </span>
                  ))}
                  {upcomingDates.length === 5 && '...'}
                </p>
              </div>
            )}

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
                Odstrániť opakovanie
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
