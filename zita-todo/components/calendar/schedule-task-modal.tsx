'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, addHours, setHours, setMinutes, parseISO, isBefore, startOfDay } from 'date-fns'
import { sk } from 'date-fns/locale'
import { Clock, Calendar, X, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { TaskWithRelations } from '@/types'
import { cn } from '@/lib/utils/cn'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

interface ScheduleTaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: TaskWithRelations | null
  onSchedule: (taskId: string, start: Date, end: Date) => Promise<void>
  onUnschedule?: (taskId: string) => Promise<void>
}

// Generovať časové sloty po 15 minútach
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4)
  const minutes = (i % 4) * 15
  return {
    value: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    label: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
  }
})

// Predvolené pracovné hodiny
const DEFAULT_START_TIME = '09:00'
const DEFAULT_END_TIME = '10:00'

export function ScheduleTaskModal({
  isOpen,
  onClose,
  task,
  onSchedule,
  onUnschedule,
}: ScheduleTaskModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME)
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inicializovať hodnoty z existujúceho time blocku
  useEffect(() => {
    if (task?.scheduled_start && task?.scheduled_end) {
      const start = parseISO(task.scheduled_start)
      const end = parseISO(task.scheduled_end)
      setSelectedDate(start)
      setStartTime(format(start, 'HH:mm'))
      setEndTime(format(end, 'HH:mm'))
    } else {
      setSelectedDate(new Date())
      setStartTime(DEFAULT_START_TIME)
      setEndTime(DEFAULT_END_TIME)
    }
    setError(null)
  }, [task, isOpen])

  // Vypočítať trvanie
  const duration = useMemo(() => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const diff = endMinutes - startMinutes

    if (diff <= 0) return null

    const hours = Math.floor(diff / 60)
    const minutes = diff % 60

    if (hours === 0) return `${minutes} minút`
    if (minutes === 0) return `${hours} ${hours === 1 ? 'hodina' : hours < 5 ? 'hodiny' : 'hodín'}`
    return `${hours}h ${minutes}m`
  }, [startTime, endTime])

  // Validácia
  const isValid = useMemo(() => {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    return endMinutes > startMinutes
  }, [startTime, endTime])

  const handleSubmit = async () => {
    if (!task || !isValid) return

    setIsSubmitting(true)
    setError(null)

    try {
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)

      const startDate = setMinutes(setHours(startOfDay(selectedDate), startHour), startMin)
      const endDate = setMinutes(setHours(startOfDay(selectedDate), endHour), endMin)

      await onSchedule(task.id, startDate, endDate)
      onClose()
    } catch (err) {
      setError('Nepodarilo sa naplánovať úlohu. Skúste to znova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnschedule = async () => {
    if (!task || !onUnschedule) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onUnschedule(task.id)
      onClose()
    } catch (err) {
      setError('Nepodarilo sa zrušiť naplánovanie. Skúste to znova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!task) return null

  const hasSchedule = !!task.scheduled_start

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Naplánovať čas na úlohu">
      <div className="space-y-6">
        {/* Task info */}
        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          <div className="font-medium text-[var(--text-primary)]">{task.title}</div>
          {task.deadline && (
            <div className="flex items-center gap-1 mt-1 text-sm text-[var(--text-secondary)]">
              <Calendar className="h-3.5 w-3.5" />
              <span>Deadline: {format(parseISO(task.deadline), 'd. MMMM yyyy', { locale: sk })}</span>
            </div>
          )}
          {task.project && (
            <div className="flex items-center gap-1 mt-1 text-sm text-[var(--text-secondary)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: task.project.color || 'var(--color-primary)' }}
              />
              <span>{task.project.name}</span>
            </div>
          )}
        </div>

        {/* Date picker */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Dátum
          </label>
          <div className="flex justify-center border border-[var(--border-primary)] rounded-lg p-2 bg-[var(--bg-secondary)]">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={sk}
              weekStartsOn={1}
              disabled={{ before: new Date() }}
              className="!font-sans"
              classNames={{
                day_selected: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]',
                day_today: 'text-[var(--color-primary)] font-bold',
              }}
            />
          </div>
        </div>

        {/* Time pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Od
            </label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              {TIME_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Do
            </label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              {TIME_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration display */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
          {duration ? (
            <span className="text-[var(--text-primary)]">Trvanie: {duration}</span>
          ) : (
            <span className="text-red-500">Koncový čas musí byť po začiatočnom</span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-primary)]">
          {/* Unschedule button */}
          {hasSchedule && onUnschedule && (
            <Button
              variant="ghost"
              onClick={handleUnschedule}
              disabled={isSubmitting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Zrušiť naplánovanie
            </Button>
          )}

          {!hasSchedule && <div />}

          {/* Submit buttons */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Zrušiť
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : hasSchedule ? (
                'Aktualizovať'
              ) : (
                'Naplánovať'
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
