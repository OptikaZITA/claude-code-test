'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseUnassignedTaskCountResult {
  count: number
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook pre získanie počtu nepriradených úloh v organizácii.
 * Používa sa pre zobrazenie "Nepriradené" v Strážci vesmíru dropdown.
 */
export function useUnassignedTaskCount(): UseUnassignedTaskCountResult {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchCount = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Count unassigned tasks (assignee_id IS NULL, not deleted, not archived, not done)
      const { count: unassignedCount, error: fetchError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .is('assignee_id', null)
        .is('deleted_at', null)
        .is('archived_at', null)
        .neq('status', 'done')

      if (fetchError) throw fetchError
      setCount(unassignedCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch unassigned task count'))
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  return {
    count,
    loading,
    error,
    refetch: fetchCount,
  }
}
