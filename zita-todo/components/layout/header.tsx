'use client'

import { Search, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TimerIndicator } from '@/components/time-tracking/timer-indicator'
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { ReactNode } from 'react'

interface HeaderProps {
  title: string
  children?: ReactNode
  /** Show view toggle (list/kanban) */
  showViewToggle?: boolean
  /** Current view mode */
  viewMode?: ViewMode
  /** Callback when view mode changes */
  onViewModeChange?: (mode: ViewMode) => void
}

export function Header({
  title,
  children,
  showViewToggle = false,
  viewMode = 'list',
  onViewModeChange,
}: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h1>

      <div className="flex items-center gap-4">
        {children}

        {/* View Toggle (List/Kanban) */}
        {showViewToggle && onViewModeChange && (
          <ViewToggle value={viewMode} onChange={onViewModeChange} />
        )}

        {/* Global Timer Indicator */}
        <TimerIndicator />

        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <Input
            type="search"
            placeholder="Hľadať úlohy..."
            className="w-64 pl-9"
          />
        </div>

        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
