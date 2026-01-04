'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskWithRelations } from '@/types'

export function useTasks() {
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
          project:projects(id, name, color)
        `)
        .is('archived_at', null)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = async (task: Partial<Task>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        created_by: user.id,
        inbox_user_id: task.inbox_type === 'personal' ? user.id : null,
        when_type: task.when_type || (task.project_id ? 'anytime' : 'inbox'),
        is_inbox: task.is_inbox !== undefined ? task.is_inbox : !task.project_id,
      })
      .select()
      .single()

    if (error) throw error
    await fetchTasks()
    return data
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error
    await fetchTasks()
    return data
  }

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId)

    if (error) throw error
    await fetchTasks()
  }

  const softDelete = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId)

    if (error) throw error
    await fetchTasks()
  }

  const completeTask = async (taskId: string, completed: boolean) => {
    await updateTask(taskId, {
      status: completed ? 'done' : 'todo',
      completed_at: completed ? new Date().toISOString() : null,
    })
  }

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    softDelete,
    completeTask,
  }
}

export function useInboxTasks(type: 'personal' | 'team') {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
          project:projects(id, name, color)
        `)
        .eq('inbox_type', type)
        .eq('when_type', 'inbox')
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .order('created_at', { ascending: false })

      if (type === 'personal') {
        query = query.eq('inbox_user_id', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, type])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}

// Today view - tasks for today
export function useTodayTasks() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const today = new Date().toISOString().split('T')[0]

      // Get tasks that are:
      // 1. when_type = 'today'
      // 2. when_type = 'scheduled' AND when_date = today
      // 3. Overdue tasks (due_date < today AND status != done)
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
          project:projects(id, name, color)
        `)
        .or(`when_type.eq.today,and(when_type.eq.scheduled,when_date.eq.${today}),and(due_date.lt.${today},status.neq.done)`)
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}

// Upcoming view - scheduled tasks in the future
export function useUpcomingTasks() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
          project:projects(id, name, color)
        `)
        .eq('when_type', 'scheduled')
        .gt('when_date', today)
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .order('when_date', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}

// Anytime view - tasks without specific time
export function useAnytimeTasks() {
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
          project:projects(id, name, color)
        `)
        .eq('when_type', 'anytime')
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}

// Someday view - tasks for "maybe later"
export function useSomedayTasks() {
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
          project:projects(id, name, color)
        `)
        .eq('when_type', 'someday')
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}

// Logbook view - completed tasks
export function useLogbookTasks() {
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
          project:projects(id, name, color)
        `)
        .eq('status', 'done')
        .is('archived_at', null)
        .is('deleted_at', null)
        .order('completed_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}

// Trash view - deleted tasks
export function useTrashTasks() {
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
          project:projects(id, name, color)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const restoreTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: null })
      .eq('id', taskId)

    if (error) throw error
    await fetchTasks()
  }

  const permanentDelete = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) throw error
    await fetchTasks()
  }

  const emptyTrash = async () => {
    // Get all deleted tasks older than 30 days or all if admin
    const { error } = await supabase
      .from('tasks')
      .delete()
      .not('deleted_at', 'is', null)

    if (error) throw error
    await fetchTasks()
  }

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    restoreTask,
    permanentDelete,
    emptyTrash
  }
}
