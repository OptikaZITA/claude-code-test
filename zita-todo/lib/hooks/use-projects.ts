'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, TaskWithRelations } from '@/types'

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (error) throw error
        setProject(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchProject()
    }
  }, [supabase, projectId])

  return { project, loading, error }
}

export function useProjectTasks(projectId: string) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .is('archived_at', null)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, projectId])

  useEffect(() => {
    if (projectId) {
      fetchTasks()
    }
  }, [projectId, fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}
