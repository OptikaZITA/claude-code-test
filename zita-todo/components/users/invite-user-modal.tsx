'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserRole, Area } from '@/types'

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (data: InviteUserData) => Promise<void>
  departments: Area[]
}

export interface InviteUserData {
  email: string
  full_name: string
  nickname: string
  position?: string
  role: UserRole
  departments: string[]
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'strategicka_rada', label: 'Strategická rada' },
  { value: 'hr', label: 'HR' },
  { value: 'member', label: 'Člen' },
]

export function InviteUserModal({
  isOpen,
  onClose,
  onInvite,
  departments,
}: InviteUserModalProps) {
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState<InviteUserData>({
    email: '',
    full_name: '',
    nickname: '',
    position: '',
    role: 'member',
    departments: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Client-side mount check for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.email || !formData.full_name || !formData.nickname) {
      setError('Vyplňte všetky povinné polia')
      return
    }

    if (formData.departments.length === 0) {
      setError('Vyberte aspoň jedno oddelenie')
      return
    }

    try {
      setLoading(true)
      await onInvite(formData)
      onClose()
      setFormData({
        email: '',
        full_name: '',
        nickname: '',
        position: '',
        role: 'member',
        departments: [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri odosielaní pozvánky')
    } finally {
      setLoading(false)
    }
  }

  const toggleDepartment = (deptId: string) => {
    setFormData((prev) => ({
      ...prev,
      departments: prev.departments.includes(deptId)
        ? prev.departments.filter((id) => id !== deptId)
        : [...prev.departments, deptId],
    }))
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-[9999] w-full max-w-lg bg-[var(--bg-primary)] rounded-xl shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Pozvať používateľa
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="email@example.com"
              required
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Celé meno *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="Meno Priezvisko"
              required
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Prezývka *
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData((prev) => ({ ...prev, nickname: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="Prezývka"
              required
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Pozícia
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="Napr. Optometrista"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Rola *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as UserRole }))}
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Departments */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Oddelenia *
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {departments.map((dept) => (
                <label
                  key={dept.id}
                  className="flex items-center gap-2 p-2 border border-[var(--border-primary)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)]"
                >
                  <input
                    type="checkbox"
                    checked={formData.departments.includes(dept.id)}
                    onChange={() => toggleDepartment(dept.id)}
                    className="w-4 h-4 rounded border-[var(--border-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{dept.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Zrušiť
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Odosielam...' : 'Poslať pozvánku'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
