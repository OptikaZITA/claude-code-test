'use client'

import { WifiOff, RefreshCw } from 'lucide-react'
import { useServiceWorker } from '@/lib/hooks/use-service-worker'
import { useEffect, useState } from 'react'

export function OfflineIndicator() {
  const { isOnline, isSupported, isRegistered } = useServiceWorker()
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  useEffect(() => {
    const handleUpdate = () => setShowUpdateBanner(true)
    window.addEventListener('sw:update-available', handleUpdate)
    return () => window.removeEventListener('sw:update-available', handleUpdate)
  }, [])

  if (isOnline && !showUpdateBanner) return null

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-warning)] px-4 py-2 text-center text-sm font-medium text-white">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>Ste offline. Zmeny budú synchronizované po pripojení.</span>
          </div>
        </div>
      )}

      {/* Update Banner */}
      {showUpdateBanner && isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-primary)] px-4 py-2 text-center text-sm font-medium text-white">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Je dostupná nová verzia.</span>
            <button
              onClick={() => window.location.reload()}
              className="ml-2 rounded bg-white/20 px-2 py-0.5 hover:bg-white/30"
            >
              Obnoviť
            </button>
          </div>
        </div>
      )}
    </>
  )
}
