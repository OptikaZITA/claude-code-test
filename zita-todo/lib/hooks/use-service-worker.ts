'use client'

import { useEffect, useState, useCallback } from 'react'

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

  // Actual network check - more reliable than navigator.onLine
  const checkOnlineStatus = useCallback(async (): Promise<boolean> => {
    // If navigator.onLine is false, we're definitely offline
    if (!navigator.onLine) {
      return false
    }

    // navigator.onLine can be unreliable (returns true even when offline)
    // So we do an actual network request to verify
    try {
      // Use a small request to check connectivity
      // We use the Supabase health endpoint or a simple HEAD request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(() => null)

      clearTimeout(timeoutId)

      // If we get any response (even 404), we're online
      // If fetch fails completely, we're offline
      return response !== null
    } catch {
      // If the health check fails, fall back to navigator.onLine
      // This handles cases where /api/health doesn't exist
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

    // Online/offline detection - use browser events
    const handleOnline = () => {
      // When browser says we're online, verify with actual request
      checkOnlineStatus().then((isOnline) => {
        setState((prev) => ({ ...prev, isOnline }))
      })
    }

    const handleOffline = () => {
      // When browser says we're offline, trust it immediately
      setState((prev) => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check - only mark as offline if we're sure
    // Keep isOnline: true by default, only change to false on 'offline' event
    // This prevents false positives from unreliable navigator.onLine
    if (!navigator.onLine) {
      setState((prev) => ({ ...prev, isOnline: false }))
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
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
