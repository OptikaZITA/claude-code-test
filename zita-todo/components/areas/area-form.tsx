'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

const PRESET_COLORS = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#FF3B30', // Red
  '#AF52DE', // Purple
  '#5856D6', // Indigo
  '#FF2D55', // Pink
  '#00C7BE', // Teal
  '#059669', // Tmavozelená
  '#92400E', // Hnedá
  '#6B7280', // Sivá
  '#4F46E5', // Indigo (dark)
]

interface AreaFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; color: string }) => Promise<void>
  initialData?: { name: string; color: string }
  title?: string
}

export function AreaForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title = 'Nové oddelenie',
}: AreaFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [color, setColor] = useState(initialData?.color || PRESET_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Názov je povinný')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSubmit({ name: name.trim(), color })
      setName('')
      setColor(PRESET_COLORS[0])
      onClose()
    } catch (err: any) {
      console.error('Error creating area:', err)
      setError(err?.message || 'Chyba pri vytváraní oddelenia')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setColor(PRESET_COLORS[0])
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Názov
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="napr. Marketing, Vývoj, Financie..."
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Farba
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                onClick={() => setColor(presetColor)}
                className={`h-6 w-6 rounded-full transition-transform ${
                  color === presetColor
                    ? 'ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: presetColor }}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Zrušiť
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Vytváram...' : 'Vytvoriť'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
