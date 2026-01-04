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
  title = 'Nove oddelenie',
}: AreaFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [color, setColor] = useState(initialData?.color || PRESET_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Nazov je povinny')
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
      setError(err?.message || 'Chyba pri vytvarani oddelenia')
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Nazov
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="napr. Marketing, Vyvoj, Financie..."
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
                className={`h-8 w-8 rounded-full transition-transform ${
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Zrusit
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Vytvaram...' : 'Vytvorit'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
