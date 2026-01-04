'use client'

import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/contexts/theme-context'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
  category?: 'navigation' | 'actions' | 'other'
}

interface UseKeyboardShortcutsOptions {
  onNewTask?: () => void
  onSearch?: () => void
  onToggleHelp?: () => void
  onToggleTimer?: () => void
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter()
  const { setTheme, theme } = useTheme()
  const [showHelp, setShowHelp] = useState(false)

  const shortcuts: KeyboardShortcut[] = [
    // Actions
    {
      key: 'n',
      description: 'Nová úloha',
      action: () => options.onNewTask?.(),
      category: 'actions',
    },
    {
      key: '/',
      description: 'Vyhľadávanie',
      action: () => options.onSearch?.(),
      category: 'actions',
    },
    {
      key: 'd',
      description: 'Prepnúť dark mode',
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      category: 'actions',
    },
    {
      key: 't',
      meta: true,
      description: 'Prepnúť časovač',
      action: () => options.onToggleTimer?.(),
      category: 'actions',
    },
    // Navigation - Main views
    {
      key: 'i',
      description: 'Inbox',
      action: () => router.push('/inbox'),
      category: 'navigation',
    },
    {
      key: 'y',
      description: 'Dnes (Today)',
      action: () => router.push('/today'),
      category: 'navigation',
    },
    {
      key: 'u',
      description: 'Nadchádzajúce (Upcoming)',
      action: () => router.push('/upcoming'),
      category: 'navigation',
    },
    {
      key: 'a',
      description: 'Kedykoľvek (Anytime)',
      action: () => router.push('/anytime'),
      category: 'navigation',
    },
    {
      key: 's',
      description: 'Niekedy (Someday)',
      action: () => router.push('/someday'),
      category: 'navigation',
    },
    {
      key: 'l',
      description: 'Logbook',
      action: () => router.push('/logbook'),
      category: 'navigation',
    },
    {
      key: 'c',
      description: 'Kalendár',
      action: () => router.push('/calendar'),
      category: 'navigation',
    },
    {
      key: 't',
      description: 'Tímový Inbox',
      action: () => router.push('/inbox/team'),
      category: 'navigation',
    },
    // Task actions (when task is expanded)
    {
      key: 'Backspace',
      description: 'Vymazať úlohu (keď je rozbalená)',
      action: () => {}, // Handled in TaskList component
      category: 'actions',
    },
    // Other
    {
      key: '?',
      shift: true,
      description: 'Zobraziť skratky',
      action: () => setShowHelp(true),
      category: 'other',
    },
    {
      key: 'Escape',
      description: 'Zavrieť dialóg',
      action: () => {
        setShowHelp(false)
        options.onToggleHelp?.()
      },
      category: 'other',
    },
  ]

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if user is typing in an input or textarea
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape even in inputs
      if (event.key !== 'Escape') return
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey
      const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
      const altMatch = shortcut.alt ? event.altKey : !event.altKey
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        event.preventDefault()
        shortcut.action()
        return
      }
    }
  }, [shortcuts, options, router, theme, setTheme])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    shortcuts,
    showHelp,
    setShowHelp,
  }
}
