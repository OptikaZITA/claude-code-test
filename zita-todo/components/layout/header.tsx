'use client'

import { Search, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TimerIndicator } from '@/components/time-tracking/timer-indicator'
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { ThemeToggle } from '@/components/ui/theme-toggle'
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
  /** Whether to show notifications badge (unread count) */
  hasUnreadNotifications?: boolean
}

export function Header({
  title,
  children,
  showViewToggle = false,
  viewMode = 'list',
  onViewModeChange,
  hasUnreadNotifications = false,
}: HeaderProps) {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-[var(--border)] bg-card px-4 lg:px-6">
      {/* Title */}
      <h1 className="font-heading text-xl font-semibold text-foreground">
        {title}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative max-w-md hidden sm:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Hľadať úlohy..."
          className="w-64 pl-9 bg-background"
        />
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

        {/* Notifications with red badge */}
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 hover:bg-accent/50">
          <Bell className="h-4 w-4" />
          {hasUnreadNotifications && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-error rounded-full" />
          )}
        </Button>
      </div>
    </header>
  )
}
