'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { User, UserRole, Area } from '@/types'

interface EditUserModalProps {
  isOpen: boolean
  user: User | null
  onClose: () => void
  onSave: (userId: string, data: EditUserData) => Promise<void>
  onUpdateDepartments: (userId: string, departmentIds: string[]) => Promise<void>
  departments: Area[]
  userDepartments: Area[]
}

export interface EditUserData {
  full_name?: string
  nickname?: string
  position?: string
  role?: UserRole
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'strategicka_rada', label: 'Strategická rada' },
  { value: 'hr', label: 'HR' },
  { value: 'member', label: 'Člen' },
]

export function EditUserModal({
  isOpen,
  user,
  onClose,
  onSave,
  onUpdateDepartments,
  departments,
  userDepartments,
}: EditUserModalProps) {
  const [formData, setFormData] = useState<EditUserData>({})
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        nickname: user.nickname || '',
        position: user.position || '',
        role: user.role,
      })
      setSelectedDepartments(userDepartments.map((d) => d.id))
    }
  }, [user, userDepartments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError(null)

    try {
      setLoading(true)
      await onSave(user.id, formData)
      await onUpdateDepartments(user.id, selectedDepartments)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní')
    } finally {
      setLoading(false)
    }
  }

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    )
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[var(--bg-primary)] rounded-xl shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Upraviť používateľa
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

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Celé meno
            </label>
            <input
              type="text"
              value={formData.full_name || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Prezývka
            </label>
            <input
              type="text"
              value={formData.nickname || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, nickname: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Pozícia
            </label>
            <input
              type="text"
              value={formData.position || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
              className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Rola
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
              Oddelenia
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {departments.map((dept) => (
                <label
                  key={dept.id}
                  className="flex items-center gap-2 p-2 border border-[var(--border-primary)] rounded-lg cursor-pointer hover:bg-[var(--bg-hover)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedDepartments.includes(dept.id)}
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
              {loading ? 'Ukladám...' : 'Uložiť'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
