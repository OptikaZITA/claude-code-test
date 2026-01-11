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

interface EditTimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  entry?: TimeEntry | null // null = create mode
  tasks: TaskWithRelations[]
  preselectedTaskId?: string
  onSuccess?: () => void
}

function formatDurationFromSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

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
}: EditTimeEntryModalProps) {
  const isEditMode = !!entry
  const { updateTimeEntry, loading: updateLoading } = useUpdateTimeEntry()
  const { createTimeEntry, loading: createLoading } = useCreateTimeEntry()

  // Form state
  const [taskId, setTaskId] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [startTime, setStartTime] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        // Edit mode - populate from entry
        setTaskId(entry.task_id || '')
        setDescription(entry.description || entry.note || '')

        const startedAt = parseISO(entry.started_at)
        setStartDate(format(startedAt, 'yyyy-MM-dd'))
        setStartTime(format(startedAt, 'HH:mm'))

        if (entry.ended_at) {
          const endedAt = parseISO(entry.ended_at)
          setEndDate(format(endedAt, 'yyyy-MM-dd'))
          setEndTime(format(endedAt, 'HH:mm'))
        } else {
          setEndDate(format(startedAt, 'yyyy-MM-dd'))
          setEndTime(format(new Date(), 'HH:mm'))
        }
      } else {
        // Create mode - set defaults
        setTaskId(preselectedTaskId || '')
        setDescription('')
        const now = new Date()
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        setStartDate(format(now, 'yyyy-MM-dd'))
        setStartTime(format(oneHourAgo, 'HH:mm'))
        setEndDate(format(now, 'yyyy-MM-dd'))
        setEndTime(format(now, 'HH:mm'))
      }
      setError(null)
    }
  }, [isOpen, entry, preselectedTaskId])

  // Calculate duration
  const calculatedDuration = useMemo(() => {
    if (!startDate || !startTime || !endDate || !endTime) return 0

    const start = new Date(`${startDate}T${startTime}`)
    const end = new Date(`${endDate}T${endTime}`)
    const diffMs = end.getTime() - start.getTime()

    return diffMs > 0 ? Math.floor(diffMs / 1000) : 0
  }, [startDate, startTime, endDate, endTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!taskId) {
      setError('Vyberte úlohu')
      return
    }

    if (calculatedDuration <= 0) {
      setError('Koniec musí byť po začiatku')
      return
    }

    const started_at = new Date(`${startDate}T${startTime}`).toISOString()
    const stopped_at = new Date(`${endDate}T${endTime}`).toISOString()

    try {
      if (isEditMode && entry) {
        await updateTimeEntry(entry.id, {
          task_id: taskId,
          description: description || undefined,
          started_at,
          stopped_at,
        })
      } else {
        await createTimeEntry({
          task_id: taskId,
          description: description || undefined,
          started_at,
          stopped_at,
        })
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      setError((err as Error).message)
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

        {/* Time inputs */}
        <div className="grid grid-cols-2 gap-4">
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

        {/* Duration display */}
        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          <span className="text-sm text-[var(--text-secondary)]">Trvanie: </span>
          <span className={cn(
            'text-sm font-medium',
            calculatedDuration > 0 ? 'text-[var(--text-primary)]' : 'text-red-500'
          )}>
            {calculatedDuration > 0 ? formatDurationFromSeconds(calculatedDuration) : 'Neplatný čas'}
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
            disabled={loading || calculatedDuration <= 0}
          >
            {loading ? 'Ukladám...' : isEditMode ? 'Uložiť' : 'Pridať'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
