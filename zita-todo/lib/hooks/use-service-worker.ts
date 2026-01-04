'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isOnline: boolean
  registration: ServiceWorkerRegistration | null
}

export function useServiceWorker() {
  // Start with isOnline: true - we assume online until proven otherwise
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    registration: null,
  })

  const offlineConfirmedRef = useRef(false)

  // Reliable network check using multiple methods
  const checkOnlineStatus = useCallback(async (): Promise<boolean> => {
    // If navigator.onLine is false, we're definitely offline
    if (!navigator.onLine) {
      return false
    }

    // Try to fetch a small resource to verify actual connectivity
    // Use favicon as it's small and always exists
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok || response.status === 304
    } catch {
      // Network request failed - but don't immediately assume offline
      // Could be a temporary glitch, so trust navigator.onLine
      return navigator.onLine
    }
  }, [])

  useEffect(() => {
    // Check if service workers are supported
    const isSupported = 'serviceWorker' in navigator

    if (!isSupported) {
      setState((prev) => ({ ...prev, isSupported: false }))
      return
    }

    setState((prev) => ({ ...prev, isSupported: true }))

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }))

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, notify user
                window.dispatchEvent(new CustomEvent('sw:update-available'))
              }
            })
          }
        })
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    registerSW()

    // Online/offline detection - use browser events with debouncing
    let onlineDebounceTimer: NodeJS.Timeout | null = null
    let offlineDebounceTimer: NodeJS.Timeout | null = null

    const handleOnline = () => {
      // Clear any pending offline timer
      if (offlineDebounceTimer) {
        clearTimeout(offlineDebounceTimer)
        offlineDebounceTimer = null
      }

      // Debounce online detection to avoid flapping
      if (onlineDebounceTimer) {
        clearTimeout(onlineDebounceTimer)
      }

      onlineDebounceTimer = setTimeout(() => {
        // Verify with actual request before marking online
        checkOnlineStatus().then((isOnline) => {
          if (isOnline) {
            offlineConfirmedRef.current = false
            setState((prev) => ({ ...prev, isOnline: true }))
          }
        })
      }, 500)
    }

    const handleOffline = () => {
      // Clear any pending online timer
      if (onlineDebounceTimer) {
        clearTimeout(onlineDebounceTimer)
        onlineDebounceTimer = null
      }

      // Debounce offline detection - wait a bit before confirming
      if (offlineDebounceTimer) {
        clearTimeout(offlineDebounceTimer)
      }

      offlineDebounceTimer = setTimeout(() => {
        // Double-check we're really offline
        if (!navigator.onLine) {
          offlineConfirmedRef.current = true
          setState((prev) => ({ ...prev, isOnline: false }))
        }
      }, 1000)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check - only mark as offline if navigator.onLine is definitely false
    // Don't do network requests on initial load to avoid false positives
    if (!navigator.onLine) {
      offlineConfirmedRef.current = true
      setState((prev) => ({ ...prev, isOnline: false }))
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (onlineDebounceTimer) clearTimeout(onlineDebounceTimer)
      if (offlineDebounceTimer) clearTimeout(offlineDebounceTimer)
    }
  }, [checkOnlineStatus])

  const update = async () => {
    if (state.registration) {
      await state.registration.update()
    }
  }

  const skipWaiting = async () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  return {
    ...state,
    update,
    skipWaiting,
  }
}
