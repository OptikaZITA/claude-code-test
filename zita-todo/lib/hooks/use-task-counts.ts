'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TaskCounts {
  inbox: number
  today: number
  upcoming: number
}

export function useTaskCounts() {
  const [counts, setCounts] = useState<TaskCounts>({
    inbox: 0,
    today: 0,
    upcoming: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCounts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      // Fetch all counts in parallel using new deadline-based logic
      const [
        inboxResult,
        todayResult,
        upcomingResult,
      ] = await Promise.all([
        // Inbox: assignee = user, no project, no deadline
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .is('project_id', null)
          .is('deadline', null)
          .is('archived_at', null)
          .is('deleted_at', null)
          .neq('status', 'done')
          .neq('status', 'canceled'),

        // Today: assignee = user, deadline <= today (includes overdue)
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .lte('deadline', today)
          .is('archived_at', null)
          .is('deleted_at', null)
          .neq('status', 'done')
          .neq('status', 'canceled'),

        // Upcoming: assignee = user, deadline > today
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', user.id)
          .gt('deadline', today)
          .is('archived_at', null)
          .is('deleted_at', null)
          .neq('status', 'done')
          .neq('status', 'canceled'),
      ])

      setCounts({
        inbox: inboxResult.count || 0,
        today: todayResult.count || 0,
        upcoming: upcomingResult.count || 0,
      })
    } catch (error) {
      console.error('Error fetching task counts:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCounts()

    // Refetch counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [fetchCounts])

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('task-counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchCounts])

  return {
    counts,
    loading,
    refetch: fetchCounts,
  }
}
