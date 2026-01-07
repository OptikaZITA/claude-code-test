'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'

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

interface Area {
  id: string
  name: string
}

interface ProjectFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedAreaId?: string
}

export function ProjectFormModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedAreaId,
}: ProjectFormModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [areaId, setAreaId] = useState(preselectedAreaId || '')
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch areas for dropdown - only if no preselectedAreaId
  useEffect(() => {
    const fetchAreas = async () => {
      const { data } = await supabase
        .from('areas')
        .select('id, name')
        .is('archived_at', null)
        .order('name')

      if (data) {
        setAreas(data)
      }
    }

    // Only fetch areas if we need to show the dropdown
    if (isOpen && !preselectedAreaId) {
      fetchAreas()
    }
  }, [isOpen, preselectedAreaId, supabase])

  // Update areaId when preselectedAreaId changes
  useEffect(() => {
    if (preselectedAreaId) {
      setAreaId(preselectedAreaId)
    }
  }, [preselectedAreaId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Názov je povinný')
      return
    }

    if (!areaId) {
      setError('Vyberte oddelenie')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nie ste prihlásení')

      const { error: insertError } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          color,
          area_id: areaId,
          owner_id: user.id,
        })

      if (insertError) throw insertError

      setName('')
      setColor(PRESET_COLORS[0])
      setAreaId(preselectedAreaId || '')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error creating project:', err)
      setError(err?.message || 'Chyba pri vytváraní projektu')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setColor(PRESET_COLORS[0])
    setAreaId(preselectedAreaId || '')
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nový projekt" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Názov
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="napr. Webová stránka, Marketing..."
            autoFocus
          />
        </div>

        {/* Oddelenie dropdown - len ak NIE JE preselectedAreaId */}
        {!preselectedAreaId && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Oddelenie
            </label>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="">Vyberte oddelenie...</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {areas.length === 0 && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Najprv vytvorte oddelenie
              </p>
            )}
          </div>
        )}

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
            Zrušiť
          </Button>
          <Button type="submit" disabled={loading || (!preselectedAreaId && areas.length === 0)}>
            {loading ? 'Vytváram...' : 'Vytvoriť'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
