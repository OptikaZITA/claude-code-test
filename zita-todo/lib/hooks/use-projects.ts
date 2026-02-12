'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, TaskWithRelations, Tag } from '@/types'
import { sortTasksTodayFirst } from '@/lib/utils/task-sorting'
import { AssigneeFilter } from './use-tasks'

// Helper to transform Supabase nested tags structure to flat Tag[]
// Supabase returns: tags: [{ tag: { id, name, color } }, ...]
// We need: tags: [{ id, name, color }, ...]
function transformTasks(tasks: any[]): TaskWithRelations[] {
  return tasks.map(task => ({
    ...task,
    tags: task.tags?.map((t: { tag: Tag }) => t.tag).filter(Boolean) || [],
  }))
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchProject = useCallback(async () => {
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
  }, [supabase, projectId])

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId, fetchProject])

  return { project, setProject, loading, error, refetch: fetchProject }
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url, status),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
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
      // Transform tags and apply today-first sorting
      setTasks(sortTasksTodayFirst(transformTasks(data || [])))
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
 * Hook for deleting a project (soft delete)
 */
export function useDeleteProject() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteProject = useCallback(async (
    projectId: string,
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/projects/${projectId}`,
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

/**
 * Hook for fetching deleted projects (trash)
 */
export function useTrashProjects() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          color,
          deleted_at,
          area:areas(id, name, color)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      console.error('Error fetching trash projects:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const restoreProject = async (projectId: string) => {
    // Restore project and its tasks
    const { error: restoreTasksError } = await supabase
      .from('tasks')
      .update({ deleted_at: null })
      .eq('project_id', projectId)
      .not('deleted_at', 'is', null)

    if (restoreTasksError) {
      console.error('Error restoring tasks:', restoreTasksError)
      throw restoreTasksError
    }

    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: null })
      .eq('id', projectId)

    if (error) {
      console.error('Error restoring project:', error)
      throw error
    }
    await fetchProjects()
  }

  return { projects, loading, refetch: fetchProjects, restoreProject }
}
