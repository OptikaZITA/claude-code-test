'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TaskCounts {
  inbox: number
  teamInbox: number
  today: number
  todayDeadline: number // Tasks with deadline = today
  upcoming: number
  anytime: number
}

export function useTaskCounts() {
  const [counts, setCounts] = useState<TaskCounts>({
    inbox: 0,
    teamInbox: 0,
    today: 0,
    todayDeadline: 0,
    upcoming: 0,
    anytime: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCounts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      // Fetch all counts in parallel
      const [
        inboxResult,
        teamInboxResult,
        todayResult,
        todayDeadlineResult,
        upcomingResult,
        anytimeResult,
      ] = await Promise.all([
        // Personal inbox count
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('inbox_type', 'personal')
          .eq('when_type', 'inbox')
          .eq('inbox_user_id', user.id)
          .is('archived_at', null)
          .is('deleted_at', null)
          .neq('status', 'done'),

        // Team inbox count
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('inbox_type', 'team')
          .eq('when_type', 'inbox')
          .is('archived_at', null)
          .is('deleted_at', null)
          .neq('status', 'done'),

        // Today count (when_type = today OR when_date = today)
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .or(`when_type.eq.today,and(when_type.eq.scheduled,when_date.eq.${today})`)
          .is('archived_at', null)
          .is('deleted_at', null)
          .neq('status', 'done'),

        // Today deadline count (deadline = today)
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('deadline', today)
          .is('archived_at', null)
          .is('deleted_at', null)
          .neq('status', 'done'),

        // Upcoming count
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('when_type', 'scheduled')
          .gt('when_date', today)
          .is('archived_at', null)
          .is('deleted_at', null)
          .neq('status', 'done'),

        // Anytime count (includes former someday tasks)
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .in('when_type', ['anytime', 'someday'])
          .is('archived_at', null)
          .is('deleted_at', null)
          .neq('status', 'done'),
      ])

      setCounts({
        inbox: inboxResult.count || 0,
        teamInbox: teamInboxResult.count || 0,
        today: todayResult.count || 0,
        todayDeadline: todayDeadlineResult.count || 0,
        upcoming: upcomingResult.count || 0,
        anytime: anytimeResult.count || 0,
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
