'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, TaskWithRelations } from '@/types'
import { sortTasksTodayFirst } from '@/lib/utils/task-sorting'
import { AssigneeFilter } from './use-tasks'

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

// assigneeFilter: user.id (default), 'all', 'unassigned', alebo konkrétny UUID
export function useProjectTasks(projectId: string, assigneeFilter?: AssigneeFilter) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Default = prihlásený používateľ
      const effectiveFilter = assigneeFilter || user.id

      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url, status)
        `)
        .eq('project_id', projectId)
        .is('archived_at', null)

      // Aplikuj filter podľa assignee_id
      if (effectiveFilter === 'all') {
        // Všetky úlohy v organizácii - žiadny assignee filter, RLS zabezpečí organizáciu
      } else if (effectiveFilter === 'unassigned') {
        // Nepriradené úlohy
        query = query.is('assignee_id', null)
      } else {
        // Konkrétny používateľ (UUID) - default je prihlásený user
        query = query.eq('assignee_id', effectiveFilter)
      }

      const { data, error } = await query.order('sort_order', { ascending: true })

      if (error) throw error
      // Apply today-first sorting
      setTasks(sortTasksTodayFirst(data || []))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, projectId, assigneeFilter])

  useEffect(() => {
    if (projectId) {
      fetchTasks()
    }
  }, [projectId, fetchTasks])

  return { tasks, setTasks, loading, error, refetch: fetchTasks }
}

/**
 * Hook for deleting a project
 */
export function useDeleteProject() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteProject = useCallback(async (
    projectId: string,
    deleteTasks: boolean = false
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/projects/${projectId}?deleteTasks=${deleteTasks}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Chyba pri mazaní projektu')
      }

      return true
    } catch (err) {
      setError(err as Error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { deleteProject, loading, error }
}
