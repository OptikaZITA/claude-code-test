'use client'

import { useState } from 'react'
import { MoreHorizontal, Edit, UserX, UserCheck, Eye } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { User, UserRole, UserStatus, Area } from '@/types'
import { cn } from '@/lib/utils/cn'

interface UserRowProps {
  user: User
  departments?: Area[]
  onEdit: (user: User) => void
  onDeactivate: (userId: string) => void
  onReactivate: (userId: string) => void
  onViewTasks: (userId: string) => void
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  strategicka_rada: 'Strategická rada',
  hr: 'HR',
  member: 'Člen',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  strategicka_rada: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  hr: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  member: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
}

const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Aktívny',
  inactive: 'Neaktívny',
  invited: 'Pozvaný',
}

const STATUS_COLORS: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  invited: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

export function UserRow({
  user,
  departments = [],
  onEdit,
  onDeactivate,
  onReactivate,
  onViewTasks,
}: UserRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = user.nickname || user.full_name || user.email

  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-primary)] hover:bg-[var(--bg-hover)] transition-colors">
      {/* Avatar & Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar src={user.avatar_url} name={displayName} size="md" />
        <div className="min-w-0">
          <p className="font-medium text-[var(--text-primary)] truncate">
            {displayName}
          </p>
          <p className="text-sm text-[var(--text-secondary)] truncate">
            {user.email}
          </p>
          {user.position && (
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {user.position}
            </p>
          )}
        </div>
      </div>

      {/* Departments */}
      <div className="hidden md:flex items-center gap-1 flex-wrap max-w-[200px]">
        {departments.slice(0, 3).map((dept) => (
          <span
            key={dept.id}
            className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
          >
            {dept.name}
          </span>
        ))}
        {departments.length > 3 && (
          <span className="text-xs text-[var(--text-secondary)]">
            +{departments.length - 3}
          </span>
        )}
      </div>

      {/* Role Badge */}
      <span className={cn('px-2 py-1 text-xs font-medium rounded-full', ROLE_COLORS[user.role])}>
        {ROLE_LABELS[user.role]}
      </span>

      {/* Status Badge */}
      <span className={cn('px-2 py-1 text-xs font-medium rounded-full', STATUS_COLORS[user.status])}>
        {STATUS_LABELS[user.status]}
      </span>

      {/* Actions Menu */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMenuOpen(!menuOpen)}
          className="h-8 w-8 p-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg shadow-lg z-50">
              <button
                onClick={() => {
                  onEdit(user)
                  setMenuOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Edit className="h-4 w-4" />
                Upraviť
              </button>
              <button
                onClick={() => {
                  onViewTasks(user.id)
                  setMenuOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Eye className="h-4 w-4" />
                Zobraziť úlohy
              </button>
              <div className="h-px bg-[var(--border-primary)]" />
              {user.status === 'active' ? (
                <button
                  onClick={() => {
                    onDeactivate(user.id)
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <UserX className="h-4 w-4" />
                  Deaktivovať
                </button>
              ) : (
                <button
                  onClick={() => {
                    onReactivate(user.id)
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <UserCheck className="h-4 w-4" />
                  Aktivovať
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
