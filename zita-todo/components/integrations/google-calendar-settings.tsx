'use client'

import { useState, useEffect } from 'react'
import { Calendar, Check, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useGoogleCalendarConnection,
  useGoogleCalendars,
} from '@/lib/hooks/use-google-calendar'

interface GoogleCalendarSettingsProps {
  showSuccessMessage?: boolean
}

export function GoogleCalendarSettings({ showSuccessMessage }: GoogleCalendarSettingsProps) {
  const {
    connected,
    connection,
    loading: connectionLoading,
    connect,
    disconnect,
  } = useGoogleCalendarConnection()

  const {
    calendars,
    loading: calendarsLoading,
    updateSelectedCalendars,
  } = useGoogleCalendars()

  const [disconnecting, setDisconnecting] = useState(false)
  const [updatingCalendars, setUpdatingCalendars] = useState(false)
  const [showSuccess, setShowSuccess] = useState(showSuccessMessage || false)

  // Hide success message after 5 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  const handleDisconnect = async () => {
    if (!confirm('Naozaj chcete odpojiť Google Calendar?')) return

    setDisconnecting(true)
    try {
      await disconnect()
    } catch {
      // Error already handled in hook
    } finally {
      setDisconnecting(false)
    }
  }

  const handleCalendarToggle = async (calendarId: string) => {
    const currentSelected = calendars.filter(c => c.selected).map(c => c.id)
    let newSelected: string[]

    if (currentSelected.includes(calendarId)) {
      // Don't allow deselecting all calendars
      if (currentSelected.length === 1) {
        return
      }
      newSelected = currentSelected.filter(id => id !== calendarId)
    } else {
      newSelected = [...currentSelected, calendarId]
    }

    setUpdatingCalendars(true)
    try {
      await updateSelectedCalendars(newSelected)
    } catch {
      // Error already handled in hook
    } finally {
      setUpdatingCalendars(false)
    }
  }

  const isLoading = connectionLoading || calendarsLoading

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-medium text-[var(--text-primary)]">Google Calendar</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Zobrazujte Google eventy v ZITA kalendári
          </p>
        </div>
      </div>

      {showSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300">
            Google Calendar bol uspesne pripojeny
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : connected ? (
        <div className="space-y-4 p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          {/* Connected status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-[var(--text-primary)]">
                Pripojene: {connection?.google_email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Odpojit'
              )}
            </Button>
          </div>

          {/* Calendar selection */}
          {calendars.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Synchronizovane kalendare:
              </p>
              <div className="space-y-1">
                {calendars.map((calendar) => (
                  <label
                    key={calendar.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={calendar.selected}
                      onChange={() => handleCalendarToggle(calendar.id)}
                      disabled={updatingCalendars}
                      className="h-4 w-4 rounded border-[var(--border-primary)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                    <span className="flex-1 text-sm text-[var(--text-primary)]">
                      {calendar.primary ? `${calendar.name} (primarny)` : calendar.name}
                    </span>
                    {calendar.color && (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: calendar.color }}
                      />
                    )}
                  </label>
                ))}
              </div>
              {updatingCalendars && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Ukladam...</span>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Google eventy su len na citanie - editovat ich mozete v Google Calendar
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Pripojte svoj Google ucet pre zobrazenie eventov v ZITA kalendari.
          </p>
          <Button onClick={connect}>
            <Calendar className="h-4 w-4 mr-2" />
            Pripojit Google ucet
          </Button>
        </div>
      )}
    </div>
  )
}
