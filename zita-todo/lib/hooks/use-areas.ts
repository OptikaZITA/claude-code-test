'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Area, Project, TaskWithRelations } from '@/types'
import { sortTasksTodayFirst } from '@/lib/utils/task-sorting'
import { AssigneeFilter } from './use-tasks'

export interface AreaWithDetails extends Area {
  projects: Project[]
  tasks: TaskWithRelations[]
}

export function useArea(areaId: string) {
  const [area, setArea] = useState<Area | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchArea = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('areas')
          .select('*')
          .eq('id', areaId)
          .single()

        if (error) throw error
        setArea(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    if (areaId) {
      fetchArea()
    }
  }, [supabase, areaId])

  return { area, loading, error }
}

export function useAreaProjects(areaId: string) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('area_id', areaId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, areaId])

  useEffect(() => {
    if (areaId) {
      fetchProjects()
    }
  }, [areaId, fetchProjects])

  return { projects, loading, error, refetch: fetchProjects }
}

// assigneeFilter: user.id (default), 'all', 'unassigned', alebo konkrétny UUID
export function useAreaTasks(areaId: string, assigneeFilter?: AssigneeFilter) {
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

      // Fetch tasks that belong directly to the area (not in a project)
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color)
        `)
        .eq('area_id', areaId)
        .is('project_id', null)
        .is('archived_at', null)
        .neq('status', 'done')

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
      setTasks(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, areaId, assigneeFilter])

  useEffect(() => {
    if (areaId) {
      fetchTasks()
    }
  }, [areaId, fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}

// Fetch all tasks in an area (including those in projects)
// assigneeFilter: user.id (default), 'all', 'unassigned', alebo konkrétny UUID
export function useAllAreaTasks(areaId: string, assigneeFilter?: AssigneeFilter) {
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

      // Fetch all tasks in the area (with or without project)
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(*))
        `)
        .eq('area_id', areaId)
        .is('deleted_at', null)
        .is('archived_at', null)
        .neq('status', 'done')

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

      // Transform tags structure
      const transformedTasks = (data || []).map(task => ({
        ...task,
        tags: task.tags?.map((tt: any) => tt.tag).filter(Boolean) || []
      }))

      // Apply today-first sorting
      setTasks(sortTasksTodayFirst(transformedTasks))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, areaId, assigneeFilter])

  useEffect(() => {
    if (areaId) {
      fetchTasks()
    }
  }, [areaId, fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}

export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchAreas = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .is('archived_at', null)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setAreas(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  const createArea = async (area: Partial<Area>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('areas')
      .insert({
        ...area,
        owner_id: user.id,
      })
      .select()
      .single()

    if (error) throw error
    await fetchAreas()
    return data
  }

  const updateArea = async (areaId: string, updates: Partial<Area>) => {
    const { data, error } = await supabase
      .from('areas')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', areaId)
      .select()
      .single()

    if (error) throw error
    await fetchAreas()
    return data
  }

  const deleteArea = async (areaId: string) => {
    const { error } = await supabase
      .from('areas')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', areaId)

    if (error) throw error
    await fetchAreas()
  }

  return {
    areas,
    loading,
    error,
    refetch: fetchAreas,
    createArea,
    updateArea,
    deleteArea,
  }
}
