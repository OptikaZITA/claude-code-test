'use client'

import { useState, useCallback } from 'react'
import { TimeEntry } from '@/types'

export interface UpdateTimeEntryData {
  task_id?: string
  description?: string
  started_at?: string
  stopped_at?: string
}

export interface CreateTimeEntryData {
  task_id: string
  description?: string
  started_at: string
  stopped_at: string
}

// Hook for updating a time entry
export function useUpdateTimeEntry() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateTimeEntry = useCallback(async (id: string, data: UpdateTimeEntryData): Promise<{ data: TimeEntry | null; error: Error | null }> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chyba pri aktualizácii')
      }

      const updatedEntry = await response.json()

      // Dispatch custom event for cross-component sync
      console.log('[USE_TIME_ENTRIES] Dispatching time-entry:updated event for id:', id)
      window.dispatchEvent(new CustomEvent('time-entry:updated', {
        detail: { id, data: updatedEntry }
      }))
      console.log('[USE_TIME_ENTRIES] Event dispatched')

      return { data: updatedEntry, error: null }
    } catch (err) {
      const error = err as Error
      setError(error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateTimeEntry, loading, error }
}

// Hook for deleting (soft delete) a time entry
export function useDeleteTimeEntry() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteTimeEntry = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chyba pri mazaní')
      }

      // Dispatch custom event for cross-component sync
      window.dispatchEvent(new CustomEvent('time-entry:deleted', {
        detail: { id }
      }))

      return true
    } catch (err) {
      setError(err as Error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { deleteTimeEntry, loading, error }
}

// Hook for creating a manual time entry
export function useCreateTimeEntry() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createTimeEntry = useCallback(async (data: CreateTimeEntryData): Promise<TimeEntry | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chyba pri vytváraní')
      }

      const newEntry = await response.json()

      // Dispatch custom event for cross-component sync
      window.dispatchEvent(new CustomEvent('time-entry:created', {
        detail: { data: newEntry }
      }))

      return newEntry
    } catch (err) {
      setError(err as Error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createTimeEntry, loading, error }
}

// Hook for getting a single time entry
export function useTimeEntry(id: string | null) {
  const [entry, setEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEntry = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/time-entries/${id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chyba pri načítaní')
      }

      const data = await response.json()
      setEntry(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [id])

  return { entry, loading, error, refetch: fetchEntry }
}
