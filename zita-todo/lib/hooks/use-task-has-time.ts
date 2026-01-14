'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook to check if a task has any time entries.
 * Used to determine if QuickTimeModal should be shown when completing a task.
 */
export function useTaskHasTime() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const checkTaskHasTime = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      setLoading(true)

      const { count, error } = await supabase
        .from('time_entries')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId)
        .is('deleted_at', null)

      if (error) {
        console.error('Error checking task time entries:', error)
        return true // Assume has time on error to skip modal
      }

      return (count || 0) > 0
    } catch (err) {
      console.error('Error checking task time entries:', err)
      return true // Assume has time on error to skip modal
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return { checkTaskHasTime, loading }
}
