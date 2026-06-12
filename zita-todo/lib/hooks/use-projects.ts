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
        .is('deleted_at', null)
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

export type CloseProjectTaskAction = 'complete' | 'inbox' | 'trash'

/**
 * Hook for closing a project and handling its active tasks
 */
export function useCloseProject() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  // NOTE: This is not a single DB transaction — task batches and the project
  // update run as separate Supabase calls. On the first failure we abort and
  // the project is left open, but a failure between batches can leave tasks
  // partially processed. Acceptable for now; would need a Postgres RPC to be
  // fully atomic.
  const closeProject = useCallback(async (
    projectId: string,
    taskDecisions: Record<string, CloseProjectTaskAction>,
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const nowISO = new Date().toISOString()

      // 1. Process active tasks based on user choice
      const taskIds = Object.keys(taskDecisions)
      if (taskIds.length > 0) {
        const completeIds: string[] = []
        const inboxIds: string[] = []
        const trashIds: string[] = []

        for (const taskId of taskIds) {
          const action = taskDecisions[taskId]
          if (action === 'complete') completeIds.push(taskId)
          else if (action === 'inbox') inboxIds.push(taskId)
          else if (action === 'trash') trashIds.push(taskId)
        }

        if (completeIds.length > 0) {
          const { error: completeError } = await supabase
            .from('tasks')
            .update({
              status: 'done',
              completed_at: nowISO,
              when_type: null,
              added_to_today_at: null,
            })
            .in('id', completeIds)
          if (completeError) throw completeError
        }

        if (inboxIds.length > 0) {
          const { error: inboxError } = await supabase
            .from('tasks')
            .update({
              project_id: null,
              area_id: null,
              when_type: 'inbox',
              is_inbox: true,
              inbox_type: 'personal',
            })
            .in('id', inboxIds)
          if (inboxError) throw inboxError
        }

        if (trashIds.length > 0) {
          const { error: trashError } = await supabase
            .from('tasks')
            .update({ deleted_at: nowISO })
            .in('id', trashIds)
          if (trashError) throw trashError
        }
      }

      // 2. Close the project
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          status: 'completed',
          completed_at: nowISO,
          updated_at: nowISO,
        })
        .eq('id', projectId)

      if (projectError) throw projectError

      // 3. Emit refresh event for sidebar counters and other views
      window.dispatchEvent(new CustomEvent('task:moved'))

      return true
    } catch (err) {
      console.error('Error closing project:', err)
      setError(err as Error)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const reopenProject = useCallback(async (projectId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          status: 'active',
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)

      if (error) throw error
      window.dispatchEvent(new CustomEvent('task:moved'))
      return true
    } catch (err) {
      console.error('Error reopening project:', err)
      setError(err as Error)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return { closeProject, reopenProject, loading, error }
}

export interface CompletedProjectSummary {
  id: string
  name: string
  color: string | null
  completed_at: string | null
  area_id: string | null
  area?: { id: string; name: string; color: string | null } | null
}

/**
 * Hook for fetching completed (closed) projects, optionally scoped to an area
 */
export function useCompletedProjects(areaId?: string) {
  const [projects, setProjects] = useState<CompletedProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          color,
          completed_at,
          area_id,
          area:areas(id, name, color)
        `)
        .eq('status', 'completed')
        .is('deleted_at', null)

      if (areaId) {
        query = query.eq('area_id', areaId)
      }

      const { data, error } = await query
        .order('completed_at', { ascending: false })
        .limit(100)

      if (error) throw error

      // Supabase returns area as array for joined relations; normalize to single object.
      const normalized: CompletedProjectSummary[] = (data || []).map(row => {
        const rawArea = (row as { area?: unknown }).area
        const area = Array.isArray(rawArea) ? rawArea[0] ?? null : rawArea ?? null
        return {
          id: row.id as string,
          name: row.name as string,
          color: (row.color as string | null) ?? null,
          completed_at: (row.completed_at as string | null) ?? null,
          area_id: (row.area_id as string | null) ?? null,
          area: area as CompletedProjectSummary['area'],
        }
      })
      setProjects(normalized)
    } catch (err) {
      console.error('Error fetching completed projects:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, areaId])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return { projects, loading, refetch: fetchProjects }
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
