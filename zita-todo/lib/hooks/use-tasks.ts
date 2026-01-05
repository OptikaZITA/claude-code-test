'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskWithRelations } from '@/types'
import { sortTasksTodayFirst } from '@/lib/utils/task-sorting'

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
          project:projects(id, name, color),
          area:areas(id, name, color)
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
        when_type: task.when_type || 'inbox',
        is_inbox: task.is_inbox !== undefined ? task.is_inbox : (!task.project_id && !task.area_id),
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
    // AUTO-LOGBOOK: Keď task je done, presunie sa do Logbooku (when_type = null)
    // Keď sa odznačí, vráti sa do inbox
    await updateTask(taskId, {
      status: completed ? 'done' : 'todo',
      completed_at: completed ? new Date().toISOString() : null,
      when_type: completed ? null : 'inbox', // Auto-logbook: null = Logbook
    } as Partial<Task>)
  }

  // Reorder tasks - update sort_order for affected tasks
  const reorderTasks = async (
    taskId: string,
    newIndex: number,
    currentTasks: TaskWithRelations[]
  ) => {
    // Create new array with reordered tasks
    const oldIndex = currentTasks.findIndex((t) => t.id === taskId)
    if (oldIndex === -1 || oldIndex === newIndex) return

    const reorderedTasks = [...currentTasks]
    const [movedTask] = reorderedTasks.splice(oldIndex, 1)
    reorderedTasks.splice(newIndex, 0, movedTask)

    // Update sort_order for all affected tasks
    const updates = reorderedTasks.map((task, index) => ({
      id: task.id,
      sort_order: index,
    }))

    // Batch update all affected tasks
    try {
      for (const update of updates) {
        await supabase
          .from('tasks')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
      }
      await fetchTasks()
    } catch (err) {
      console.error('Error reordering tasks:', err)
    }
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
    reorderTasks,
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
          project:projects(id, name, color),
          area:areas(id, name, color)
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
          project:projects(id, name, color),
          area:areas(id, name, color)
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
          project:projects(id, name, color),
          area:areas(id, name, color)
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

      // Include both anytime and someday tasks (merged)
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color)
        `)
        .in('when_type', ['anytime', 'someday'])
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .order('sort_order', { ascending: true })

      if (error) throw error
      // Apply today-first sorting
      setTasks(sortTasksTodayFirst(data || []))
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
          project:projects(id, name, color),
          area:areas(id, name, color)
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
          project:projects(id, name, color),
          area:areas(id, name, color)
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

    if (error) {
      console.error('Error restoring task:', error)
      throw error
    }
    await fetchTasks()
  }

  const permanentDelete = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error permanently deleting task:', error)
      throw error
    }
    await fetchTasks()
  }

  const emptyTrash = async () => {
    // Delete all soft-deleted tasks the user has access to
    const { error } = await supabase
      .from('tasks')
      .delete()
      .not('deleted_at', 'is', null)

    if (error) {
      console.error('Error emptying trash:', error)
      throw error
    }
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
