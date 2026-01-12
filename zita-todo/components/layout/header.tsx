'use client'

import { TimerIndicator } from '@/components/time-tracking/timer-indicator'
import { NotificationBell } from '@/components/notifications'
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { GlobalSearch } from './global-search'
import { ReactNode } from 'react'

interface HeaderProps {
  /** @deprecated Title is no longer displayed in header - use page H1 instead */
  title?: string
  children?: ReactNode
  /** Show view toggle (list/kanban) */
  showViewToggle?: boolean
  /** Current view mode */
  viewMode?: ViewMode
  /** Callback when view mode changes */
  onViewModeChange?: (mode: ViewMode) => void
}

export function Header({
  children,
  showViewToggle = false,
  viewMode = 'list',
  onViewModeChange,
}: HeaderProps) {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-[var(--border)] bg-card px-4 lg:px-6">
      {/* Title removed - displayed in page H1 instead */}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Global Search */}
      <div className="hidden sm:block">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        {children}

        {/* View Toggle (List/Kanban) */}
        {showViewToggle && onViewModeChange && (
          <ViewToggle value={viewMode} onChange={onViewModeChange} />
        )}

        {/* Global Timer Indicator */}
        <TimerIndicator />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationBell />
      </div>
    </header>
  )
}
