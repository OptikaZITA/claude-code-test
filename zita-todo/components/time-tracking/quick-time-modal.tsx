'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Clock, Timer, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useCreateTimeEntry } from '@/lib/hooks/use-time-entries'

interface QuickTimeModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  taskTitle: string
  onComplete: () => void  // Called after time is added (or skipped)
  onOpenManualEntry?: () => void  // Opens full manual entry modal
}

const QUICK_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hod', minutes: 60 },
]

export function QuickTimeModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onComplete,
  onOpenManualEntry,
}: QuickTimeModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null)
  const [customMinutes, setCustomMinutes] = useState<string>('')
  const [showCustom, setShowCustom] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { createTimeEntry, loading } = useCreateTimeEntry()

  const handleQuickSelect = (minutes: number) => {
    setSelectedMinutes(minutes)
    setShowCustom(false)
    setCustomMinutes('')
  }

  const handleCustomClick = () => {
    setShowCustom(true)
    setSelectedMinutes(null)
  }

  const handleCustomChange = (value: string) => {
    setCustomMinutes(value)
    const parsed = parseInt(value)
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedMinutes(parsed)
    } else {
      setSelectedMinutes(null)
    }
  }

  const handleSkip = () => {
    onComplete()
    onClose()
  }

  const handleComplete = async () => {
    if (!selectedMinutes || selectedMinutes < 1) {
      setError('Vyberte čas')
      return
    }

    setError(null)

    // Create time entry ending now, starting selectedMinutes ago
    const now = new Date()
    const started = new Date(now.getTime() - selectedMinutes * 60 * 1000)

    try {
      await createTimeEntry({
        task_id: taskId,
        started_at: started.toISOString(),
        stopped_at: now.toISOString(),
      })

      onComplete()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleOpenManual = () => {
    onClose()
    onOpenManualEntry?.()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pridať čas k úlohe"
      size="sm"
    >
      <div className="space-y-4">
        {/* Task title */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--text-primary)] line-clamp-2">{taskTitle}</p>
        </div>

        {/* Info text */}
        <p className="text-sm text-[var(--text-secondary)]">
          Táto úloha nemá žiadny zaznamenaný čas. Koľko času ste na nej strávili?
        </p>

        {/* Quick options */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK_OPTIONS.map((option) => (
            <button
              key={option.minutes}
              onClick={() => handleQuickSelect(option.minutes)}
              className={cn(
                'py-2 px-3 rounded-lg border text-sm font-medium transition-colors',
                selectedMinutes === option.minutes && !showCustom
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background text-foreground border-[var(--border)] hover:bg-accent'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="space-y-2">
          <button
            onClick={handleCustomClick}
            className={cn(
              'w-full py-2 px-3 rounded-lg border text-sm font-medium transition-colors text-left',
              showCustom
                ? 'bg-primary text-white border-primary'
                : 'bg-background text-foreground border-[var(--border)] hover:bg-accent'
            )}
          >
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span>Vlastný čas</span>
            </div>
          </button>

          {showCustom && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <Input
                type="number"
                min="1"
                max="480"
                value={customMinutes}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="30"
                className="w-20 text-center"
                autoFocus
              />
              <span className="text-sm text-[var(--text-secondary)]">minút</span>
            </div>
          )}
        </div>

        {/* Selected time display */}
        {selectedMinutes && (
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-sm text-[var(--text-secondary)]">Vybraný čas:</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {selectedMinutes >= 60
                  ? `${Math.floor(selectedMinutes / 60)}h ${selectedMinutes % 60}m`
                  : `${selectedMinutes}m`
                }
              </span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={loading}
            className="text-[var(--text-secondary)]"
          >
            <X className="h-4 w-4 mr-1" />
            Preskočiť
          </Button>

          <div className="flex gap-2">
            {onOpenManualEntry && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleOpenManual}
                disabled={loading}
              >
                Manuálne
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={handleComplete}
              disabled={loading || !selectedMinutes}
            >
              {loading ? 'Ukladám...' : 'Dokončiť'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
