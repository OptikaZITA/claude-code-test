'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseTaskTimeTotalResult {
  totalSeconds: number
  loading: boolean
  refetch: () => Promise<void>
}

export function useTaskTimeTotal(taskId: string | undefined): UseTaskTimeTotalResult {
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTotal = useCallback(async () => {
    if (!taskId) {
      setTotalSeconds(0)
      setLoading(false)
      return
    }

    try {
      // Get total from completed time entries
      const { data, error } = await supabase
        .from('time_entries')
        .select('duration_seconds')
        .eq('task_id', taskId)
        .not('duration_seconds', 'is', null)

      if (error) throw error

      const total = data?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) || 0
      setTotalSeconds(total)
    } catch (err) {
      console.error('Error fetching task time total:', err)
    } finally {
      setLoading(false)
    }
  }, [taskId, supabase])

  // Fetch on mount and when taskId changes
  useEffect(() => {
    fetchTotal()
  }, [fetchTotal])

  // Listen for timer:stopped event to refetch
  useEffect(() => {
    const handleTimerStopped = (e: CustomEvent<{ taskId: string; durationSeconds: number }>) => {
      if (e.detail.taskId === taskId) {
        // Optimistically update the total
        setTotalSeconds(prev => prev + e.detail.durationSeconds)
      }
    }

    window.addEventListener('timer:stopped', handleTimerStopped as EventListener)
    return () => {
      window.removeEventListener('timer:stopped', handleTimerStopped as EventListener)
    }
  }, [taskId])

  return {
    totalSeconds,
    loading,
    refetch: fetchTotal,
  }
}
