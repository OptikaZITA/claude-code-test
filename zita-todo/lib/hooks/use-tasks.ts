'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskWithRelations, Tag, RecurrenceRule } from '@/types'
import { sortTasksTodayFirst } from '@/lib/utils/task-sorting'
import { addDays, addWeeks, addMonths, addYears } from 'date-fns'

// Helper pre výpočet nasledujúceho dátumu pre recurrence
function getNextRecurrenceDate(fromDate: Date, rule: RecurrenceRule): Date {
  switch (rule.unit) {
    case 'day':
      return addDays(fromDate, rule.interval)
    case 'week':
      return addWeeks(fromDate, rule.interval)
    case 'month':
      return addMonths(fromDate, rule.interval)
    case 'year':
      return addYears(fromDate, rule.interval)
    default:
      return addDays(fromDate, rule.interval)
  }
}

// Skontroluje či sa má vytvoriť nový recurring task
function shouldCreateRecurringTask(rule: RecurrenceRule, nextDate: Date): boolean {
  // Kontrola end conditions
  if (rule.end_type === 'after_count') {
    const completedCount = rule.completed_count || 0
    const endAfterCount = rule.end_after_count || 0
    if (completedCount >= endAfterCount) {
      return false
    }
  }

  if (rule.end_type === 'on_date' && rule.end_on_date) {
    if (nextDate > new Date(rule.end_on_date)) {
      return false
    }
  }

  return true
}

// Helper to transform Supabase nested tags structure to flat Tag[]
// Supabase returns: tags: [{ tag: { id, name, color } }, ...]
// We need: tags: [{ id, name, color }, ...]
function transformTasks(tasks: any[]): TaskWithRelations[] {
  return tasks.map(task => ({
    ...task,
    tags: task.tags?.map((t: { tag: Tag }) => t.tag).filter(Boolean) || [],
  }))
}

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
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .is('archived_at', null)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setTasks(transformTasks(data || []))
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

    const whenType = task.when_type || 'inbox'

    // Get the minimum sort_order to place new task FIRST in the list
    const { data: minOrderData } = await supabase
      .from('tasks')
      .select('sort_order')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single()

    const minSortOrder = minOrderData?.sort_order ?? 0
    const newSortOrder = minSortOrder - 1

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        created_by: user.id,
        inbox_user_id: task.inbox_type === 'personal' ? user.id : null,
        when_type: whenType,
        is_inbox: task.is_inbox !== undefined ? task.is_inbox : (!task.project_id && !task.area_id),
        // Auto-set added_to_today_at when creating task in 'today'
        added_to_today_at: whenType === 'today' ? new Date().toISOString() : null,
        // Place new task FIRST in the list
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (error) throw error
    await fetchTasks()
    return data
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    // Auto-set added_to_today_at when task moves to 'today'
    const finalUpdates = { ...updates }
    if (updates.when_type === 'today' && !updates.added_to_today_at) {
      finalUpdates.added_to_today_at = new Date().toISOString()
    }
    // Clear added_to_today_at when task moves away from 'today'
    if (updates.when_type && updates.when_type !== 'today') {
      finalUpdates.added_to_today_at = null
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(finalUpdates)
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
    // Najprv získaj aktuálny task pre recurrence logiku
    const currentTask = tasks.find(t => t.id === taskId)

    // AUTO-LOGBOOK: Keď task je done, presunie sa do Logbooku (when_type = null)
    // Keď sa odznačí, vráti sa do inbox
    await updateTask(taskId, {
      status: completed ? 'done' : 'todo',
      completed_at: completed ? new Date().toISOString() : null,
      when_type: completed ? null : 'inbox', // Auto-logbook: null = Logbook
    } as Partial<Task>)

    // After completion recurring logic
    if (completed && currentTask?.recurrence_rule?.type === 'after_completion') {
      const rule = currentTask.recurrence_rule
      const nextDate = getNextRecurrenceDate(new Date(), rule)

      if (shouldCreateRecurringTask(rule, nextDate)) {
        // Vytvor nový recurring task
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Aktualizuj recurrence_rule s novým completed_count
        const newRule: RecurrenceRule = {
          ...rule,
          completed_count: (rule.completed_count || 0) + 1,
          next_date: nextDate.toISOString().split('T')[0],
        }

        // Reset checklist items (všetky unchecked)
        const resetChecklist = currentTask.checklist_items?.map(item => ({
          ...item,
          completed: false,
        })) || []

        // Vytvor nový task
        const { error } = await supabase
          .from('tasks')
          .insert({
            title: currentTask.title,
            notes: currentTask.notes,
            description: currentTask.description,
            area_id: currentTask.area_id,
            project_id: currentTask.project_id,
            heading_id: currentTask.heading_id,
            priority: currentTask.priority,
            assignee_id: currentTask.assignee_id,
            when_type: 'scheduled',
            when_date: nextDate.toISOString().split('T')[0],
            deadline: rule.deadline_days_before !== undefined
              ? addDays(nextDate, -rule.deadline_days_before).toISOString().split('T')[0]
              : null,
            recurrence_rule: newRule,
            checklist_items: resetChecklist,
            created_by: user.id,
            inbox_type: currentTask.inbox_type,
            inbox_user_id: currentTask.inbox_user_id,
            organization_id: currentTask.organization_id,
            added_to_today_at: new Date().toISOString(), // Pre žltú bodku signalizáciu
            status: 'todo',
          })

        if (error) {
          console.error('Error creating recurring task:', error)
        } else {
          // Emit event pre refresh na iných stránkach
          window.dispatchEvent(new CustomEvent('task:moved'))
        }

        await fetchTasks()
      }
    }
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
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
      setTasks(transformTasks(data || []))
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .or(`when_type.eq.today,and(when_type.eq.scheduled,when_date.eq.${today}),and(due_date.lt.${today},status.neq.done)`)
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setTasks(transformTasks(data || []))
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .eq('when_type', 'scheduled')
        .gte('when_date', today)
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .order('when_date', { ascending: true })

      if (error) throw error
      setTasks(transformTasks(data || []))
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .in('when_type', ['anytime', 'someday'])
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .order('sort_order', { ascending: true })

      if (error) throw error
      // Apply today-first sorting
      setTasks(sortTasksTodayFirst(transformTasks(data || [])))
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .eq('status', 'done')
        .is('archived_at', null)
        .is('deleted_at', null)
        .order('completed_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setTasks(transformTasks(data || []))
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
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setTasks(transformTasks(data || []))
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
