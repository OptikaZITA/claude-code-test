'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TimeEntry, TaskWithRelations } from '@/types'
import { useUpdateTimeEntry, useCreateTimeEntry } from '@/lib/hooks/use-time-entries'
import { cn } from '@/lib/utils/cn'

type TimeInputMode = 'duration' | 'range'

interface EditTimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  entry?: TimeEntry | null // null = create mode
  tasks: TaskWithRelations[]
  preselectedTaskId?: string
  onSuccess?: () => void | Promise<void>
  defaultMode?: TimeInputMode
}

function formatDurationFromSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours === 0 && minutes === 0) {
    return `${secs}s`
  }

  if (hours === 0) {
    return `${minutes}m`
  }
  return `${hours}h ${minutes}m`
}

export function EditTimeEntryModal({
  isOpen,
  onClose,
  entry,
  tasks,
  preselectedTaskId,
  onSuccess,
  defaultMode = 'duration',
}: EditTimeEntryModalProps) {
  const isEditMode = !!entry
  const { updateTimeEntry, loading: updateLoading } = useUpdateTimeEntry()
  const { createTimeEntry, loading: createLoading, error: createError } = useCreateTimeEntry()

  // Form state
  const [mode, setMode] = useState<TimeInputMode>(defaultMode)
  const [taskId, setTaskId] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  // Duration mode state
  const [durationHours, setDurationHours] = useState<string>('0')
  const [durationMinutes, setDurationMinutes] = useState<string>('0')
  const [durationDate, setDurationDate] = useState<string>('')

  // Range mode state
  const [startDate, setStartDate] = useState<string>('')
  const [startTime, setStartTime] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')

  const [error, setError] = useState<string | null>(null)

  // Duration mode handlers with automatic rollover
  const handleDurationHoursChange = (value: string) => {
    const num = parseInt(value) || 0
    // Minimum 0, maximum 99 hours
    if (num < 0) {
      setDurationHours('0')
    } else if (num > 99) {
      setDurationHours('99')
    } else {
      setDurationHours(String(num))
    }
  }

  const handleDurationMinutesChange = (value: string) => {
    const num = parseInt(value)
    const currentHours = parseInt(durationHours) || 0

    // Handle NaN (empty input)
    if (isNaN(num)) {
      setDurationMinutes('0')
      return
    }

    // Minutes exceed 59 - rollover to hours
    if (num > 59) {
      const extraHours = Math.floor(num / 60)
      const remainingMinutes = num % 60
      setDurationHours(String(Math.min(currentHours + extraHours, 99)))
      setDurationMinutes(String(remainingMinutes))
    }
    // Minutes go below 0 - borrow from hours
    else if (num < 0) {
      if (currentHours > 0) {
        // Borrow from hours: -1 min with 1+ hours = 59 min, hours-1
        const borrowHours = Math.ceil(Math.abs(num) / 60)
        const newHours = Math.max(0, currentHours - borrowHours)
        const newMinutes = (60 + (num % 60)) % 60
        setDurationHours(String(newHours))
        setDurationMinutes(String(newMinutes))
      } else {
        // Can't go below 0h 0m
        setDurationMinutes('0')
      }
    }
    // Normal range
    else {
      setDurationMinutes(String(num))
    }
  }

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (entry && entry.started_at) {
        // Edit mode - populate from entry
        setTaskId(entry.task_id || '')
        setDescription(entry.description || entry.note || '')

        const startedAt = parseISO(entry.started_at)

        // Set range mode values
        setStartDate(format(startedAt, 'yyyy-MM-dd'))
        setStartTime(format(startedAt, 'HH:mm'))

        if (entry.ended_at) {
          const endedAt = parseISO(entry.ended_at)
          setEndDate(format(endedAt, 'yyyy-MM-dd'))
          setEndTime(format(endedAt, 'HH:mm'))

          // Calculate duration for duration mode
          const durationSec = entry.duration_seconds || Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
          setDurationHours(String(Math.floor(durationSec / 3600)))
          setDurationMinutes(String(Math.floor((durationSec % 3600) / 60)))
          setDurationDate(format(startedAt, 'yyyy-MM-dd'))

          // If we have precise times, default to range mode
          setMode('range')
        } else if (entry.duration_seconds) {
          // Only duration available - use duration mode
          setDurationHours(String(Math.floor(entry.duration_seconds / 3600)))
          setDurationMinutes(String(Math.floor((entry.duration_seconds % 3600) / 60)))
          setDurationDate(format(startedAt, 'yyyy-MM-dd'))

          const endedAt = new Date(startedAt.getTime() + entry.duration_seconds * 1000)
          setEndDate(format(endedAt, 'yyyy-MM-dd'))
          setEndTime(format(endedAt, 'HH:mm'))

          setMode('duration')
        } else {
          setEndDate(format(startedAt, 'yyyy-MM-dd'))
          setEndTime(format(new Date(), 'HH:mm'))
          setDurationDate(format(startedAt, 'yyyy-MM-dd'))
          setDurationHours('0')
          setDurationMinutes('0')
          setMode('range')
        }
      } else {
        // Create mode - set defaults
        setTaskId(preselectedTaskId || (entry?.task_id || ''))
        setDescription('')
        setMode(defaultMode)

        const now = new Date()
        const todayStr = format(now, 'yyyy-MM-dd')

        // Duration mode defaults
        setDurationHours('0')
        setDurationMinutes('30')
        setDurationDate(todayStr)

        // Range mode defaults
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        setStartDate(todayStr)
        setStartTime(format(oneHourAgo, 'HH:mm'))
        setEndDate(todayStr)
        setEndTime(format(now, 'HH:mm'))
      }
      setError(null)
    }
  }, [isOpen, entry, preselectedTaskId, defaultMode])

  // Calculate duration based on mode
  const calculatedDuration = useMemo(() => {
    if (mode === 'duration') {
      const hours = parseInt(durationHours) || 0
      const minutes = parseInt(durationMinutes) || 0
      return hours * 3600 + minutes * 60
    } else {
      if (!startDate || !startTime || !endDate || !endTime) return 0
      const start = new Date(`${startDate}T${startTime}`)
      const end = new Date(`${endDate}T${endTime}`)
      const diffMs = end.getTime() - start.getTime()
      return diffMs > 0 ? Math.floor(diffMs / 1000) : 0
    }
  }, [mode, durationHours, durationMinutes, startDate, startTime, endDate, endTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!taskId) {
      setError('Vyberte úlohu')
      return
    }

    if (calculatedDuration < 60) {
      setError('Minimálne trvanie je 1 minúta')
      return
    }

    let started_at: string
    let stopped_at: string

    if (mode === 'duration') {
      // Duration mode - create timestamps from date + duration
      if (!durationDate) {
        setError('Dátum nie je nastavený')
        return
      }

      // Use the original start time if editing, otherwise use noon
      let baseDate: Date
      if (isEditMode && entry?.started_at) {
        const originalStart = parseISO(entry.started_at)
        baseDate = new Date(`${durationDate}T${format(originalStart, 'HH:mm:ss')}`)
      } else {
        baseDate = new Date(`${durationDate}T12:00:00`)
      }

      if (isNaN(baseDate.getTime())) {
        setError('Neplatný dátum')
        return
      }

      started_at = baseDate.toISOString()
      stopped_at = new Date(baseDate.getTime() + calculatedDuration * 1000).toISOString()
    } else {
      // Range mode - use exact times
      if (!startDate || !startTime || !endDate || !endTime) {
        setError('Vyplňte všetky časové polia')
        return
      }
      started_at = new Date(`${startDate}T${startTime}`).toISOString()
      stopped_at = new Date(`${endDate}T${endTime}`).toISOString()
    }

    try {
      if (isEditMode && entry) {
        const { data: result, error: updateErr } = await updateTimeEntry(entry.id, {
          task_id: taskId,
          description: description || undefined,
          started_at,
          stopped_at,
        })

        if (!result || updateErr) {
          setError(updateErr?.message || 'Chyba pri ukladaní. Skúste to znova.')
          return
        }
      } else {
        const result = await createTimeEntry({
          task_id: taskId,
          description: description || undefined,
          started_at,
          stopped_at,
        })

        if (!result) {
          // Use the actual error message from the hook
          setError(createError?.message || 'Chyba pri vytváraní. Skúste to znova.')
          return
        }
      }

      // onSuccess closes the modal, event listener handles data refresh
      onSuccess?.()
      // Don't call onClose here - onSuccess handles it
    } catch (err) {
      console.error('Edit time entry error:', err)
      setError((err as Error).message || 'Nastala neočakávaná chyba')
    }
  }

  const loading = updateLoading || createLoading

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Upraviť čas' : 'Pridať čas manuálne'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task selector */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Úloha
          </label>
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            className={cn(
              'flex h-10 w-full px-3 py-2 text-sm',
              'rounded-[var(--radius-md)] border border-[var(--border)]',
              'bg-background text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            )}
          >
            <option value="">Vyberte úlohu...</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Popis (voliteľné)
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Napr. Telefonát s klientom"
          />
        </div>

        {/* Mode toggle */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Ako chceš zadať čas?
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('duration')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors',
                mode === 'duration'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background text-foreground border-[var(--border)] hover:bg-accent'
              )}
            >
              Trvanie
            </button>
            <button
              type="button"
              onClick={() => setMode('range')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors',
                mode === 'range'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background text-foreground border-[var(--border)] hover:bg-accent'
              )}
            >
              Rozsah
            </button>
          </div>
        </div>

        {/* Duration mode inputs */}
        {mode === 'duration' && (
          <div className="space-y-3 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Trvalo to:
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="99"
                  value={durationHours}
                  onChange={(e) => handleDurationHoursChange(e.target.value)}
                  className="w-20 text-center"
                />
                <span className="text-sm text-[var(--text-secondary)]">hod</span>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => handleDurationMinutesChange(e.target.value)}
                  className="w-20 text-center"
                />
                <span className="text-sm text-[var(--text-secondary)]">min</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Dátum:
              </label>
              <Input
                type="date"
                value={durationDate}
                onChange={(e) => setDurationDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Range mode inputs */}
        {mode === 'range' && (
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            {/* Start */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Začiatok
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Koniec
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Duration display */}
        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          <span className="text-sm text-[var(--text-secondary)]">Trvanie: </span>
          <span className={cn(
            'text-sm font-medium',
            calculatedDuration >= 60 ? 'text-[var(--text-primary)]' : 'text-red-500'
          )}>
            {calculatedDuration >= 60 ? formatDurationFromSeconds(calculatedDuration) : 'Minimálne 1 minúta'}
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Zrušiť
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || calculatedDuration < 60}
          >
            {loading ? 'Ukladám...' : isEditMode ? 'Uložiť' : 'Pridať'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
