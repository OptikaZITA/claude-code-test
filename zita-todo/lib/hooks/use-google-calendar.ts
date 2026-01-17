'use client'

import { useState, useEffect, useCallback } from 'react'
import { GoogleCalendarEvent } from '@/app/api/google/events/route'

export interface GoogleCalendarConnection {
  id: string
  google_email: string
  selected_calendars: string[]
  created_at: string
}

export interface GoogleCalendar {
  id: string
  name: string
  description?: string
  primary: boolean
  color?: string
  selected: boolean
}

interface UseGoogleCalendarConnectionReturn {
  connected: boolean
  connection: GoogleCalendarConnection | null
  loading: boolean
  error: string | null
  connect: () => void
  disconnect: () => Promise<void>
  refetch: () => Promise<void>
}

export function useGoogleCalendarConnection(): UseGoogleCalendarConnectionReturn {
  const [connected, setConnected] = useState(false)
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConnection = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/google/connection')

      if (!response.ok) {
        throw new Error('Failed to fetch connection status')
      }

      const data = await response.json()
      setConnected(data.connected)
      setConnection(data.connection)
    } catch (err) {
      console.error('Error fetching Google Calendar connection:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setConnected(false)
      setConnection(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnection()
  }, [fetchConnection])

  const connect = useCallback(() => {
    // Redirect to Google OAuth
    window.location.href = '/api/google/auth'
  }, [])

  const disconnect = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/google/connection', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setConnected(false)
      setConnection(null)
    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    connected,
    connection,
    loading,
    error,
    connect,
    disconnect,
    refetch: fetchConnection,
  }
}

interface UseGoogleCalendarsReturn {
  calendars: GoogleCalendar[]
  loading: boolean
  error: string | null
  updateSelectedCalendars: (calendarIds: string[]) => Promise<void>
  refetch: () => Promise<void>
}

export function useGoogleCalendars(): UseGoogleCalendarsReturn {
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendars = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/google/calendars')

      if (response.status === 404) {
        // Not connected, not an error
        setCalendars([])
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch calendars')
      }

      const data = await response.json()
      setCalendars(data.calendars || [])
    } catch (err) {
      console.error('Error fetching Google calendars:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setCalendars([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCalendars()
  }, [fetchCalendars])

  const updateSelectedCalendars = useCallback(async (calendarIds: string[]) => {
    try {
      setLoading(true)
      const response = await fetch('/api/google/connection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_calendars: calendarIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to update selected calendars')
      }

      // Update local state
      setCalendars(prev => prev.map(cal => ({
        ...cal,
        selected: calendarIds.includes(cal.id),
      })))
    } catch (err) {
      console.error('Error updating selected calendars:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    calendars,
    loading,
    error,
    updateSelectedCalendars,
    refetch: fetchCalendars,
  }
}

interface UseGoogleCalendarEventsReturn {
  events: GoogleCalendarEvent[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useGoogleCalendarEvents(
  startDate: Date,
  endDate: Date,
  enabled: boolean = true
): UseGoogleCalendarEventsReturn {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!enabled) {
      setEvents([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const timeMin = startDate.toISOString()
      const timeMax = endDate.toISOString()

      const response = await fetch(
        `/api/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()

      if (data.error === 'token_refresh_failed') {
        // Token refresh failed, treat as disconnected
        setEvents([])
        return
      }

      setEvents(data.events || [])
    } catch (err) {
      console.error('Error fetching Google Calendar events:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, enabled])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
  }
}

// Hook specifically for today's events (used in Today page banner)
export function useTodayGoogleEvents(): UseGoogleCalendarEventsReturn {
  const today = new Date()
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)

  return useGoogleCalendarEvents(startOfDay, endOfDay)
}
