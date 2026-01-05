'use client'

import { useState, useEffect, useCallback } from 'react'
import { ViewMode } from '@/components/ui/view-toggle'

const STORAGE_KEY = 'zita-view-preference'
const DEFAULT_VIEW: ViewMode = 'list'

interface ViewPreferences {
  global: ViewMode
  [pageKey: string]: ViewMode
}

function getStoredPreferences(): ViewPreferences {
  if (typeof window === 'undefined') {
    return { global: DEFAULT_VIEW }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Error reading view preferences:', e)
  }

  return { global: DEFAULT_VIEW }
}

function setStoredPreferences(preferences: ViewPreferences): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch (e) {
    console.error('Error saving view preferences:', e)
  }
}

/**
 * Hook for managing view preference (list/kanban) with localStorage persistence.
 * Can be used globally or per-page.
 *
 * @param pageKey - Optional key to store per-page preference (e.g., 'today', 'inbox')
 *                  If not provided, uses global preference
 */
export function useViewPreference(pageKey?: string) {
  const [viewMode, setViewModeState] = useState<ViewMode>(DEFAULT_VIEW)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load preference on mount
  useEffect(() => {
    const preferences = getStoredPreferences()
    const key = pageKey || 'global'
    const storedView = preferences[key] || preferences.global || DEFAULT_VIEW
    setViewModeState(storedView)
    setIsLoaded(true)
  }, [pageKey])

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)

    const preferences = getStoredPreferences()
    const key = pageKey || 'global'
    preferences[key] = mode

    // Also update global if no pageKey
    if (!pageKey) {
      preferences.global = mode
    }

    setStoredPreferences(preferences)
  }, [pageKey])

  return {
    viewMode,
    setViewMode,
    isLoaded,
  }
}

/**
 * Hook for getting the global view preference (read-only).
 * Useful for checking the default preference.
 */
export function useGlobalViewPreference() {
  return useViewPreference()
}
