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
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url, status),
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

    // Auto-assign: Tímový Inbox → null, ostatné → current user (ak nie je špecifikované)
    const autoAssigneeId = task.assignee_id !== undefined
      ? task.assignee_id
      : task.inbox_type === 'team'
        ? null
        : user.id

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...task,
        created_by: user.id,
        assignee_id: autoAssigneeId,
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

    // OPTIMISTIC UPDATE: Okamžite aktualizuj lokálny stav
    const completedAt = completed ? new Date().toISOString() : null
    const newStatus = completed ? 'done' : 'todo'
    const newWhenType = completed ? null : 'inbox'

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? {
            ...t,
            status: newStatus as TaskWithRelations['status'],
            completed_at: completedAt,
            when_type: newWhenType,
          }
        : t
    ))

    // AUTO-LOGBOOK: Keď task je done, presunie sa do Logbooku (when_type = null)
    // Keď sa odznačí, vráti sa do inbox
    // Použijeme priamy Supabase update namiesto updateTask (aby sa nevolal fetchTasks)
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: completedAt,
        when_type: newWhenType,
        added_to_today_at: null, // Clear added_to_today_at when completing
      })
      .eq('id', taskId)

    if (updateError) {
      console.error('Error completing task:', updateError)
      // ROLLBACK: Vráť pôvodný stav pri chybe
      if (currentTask) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? currentTask : t
        ))
      }
      return
    }

    // Emit event pre refresh na iných stránkach (napr. sidebar počítadlá)
    window.dispatchEvent(new CustomEvent('task:moved'))

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
        }

        // Pre recurring tasky musíme refreshnúť, aby sa zobrazil nový task
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

// Typ pre assignee filter (Strážcovia vesmíru)
// 'all' = všetky úlohy v organizácii (žiadny assignee filter)
// 'unassigned' = úlohy bez priradeného používateľa
// UUID = úlohy konkrétneho používateľa (default = prihlásený user)
export type AssigneeFilter = 'all' | 'unassigned' | string

// Inbox view - tasks without project and without deadline
// New simplified logic: assignee = current user, no project, no deadline
// assigneeFilter: user.id (default), 'all', 'unassigned', alebo konkrétny UUID
export function useInboxTasks(assigneeFilter?: AssigneeFilter) {
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
        .is('project_id', null)
        .is('deadline', null)
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .neq('status', 'canceled')

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
      setTasks(transformTasks(data || []))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, assigneeFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, setTasks, loading, error, refetch: fetchTasks }
}

// Today view - tasks with deadline = today
// New simplified logic: deadline = today (includes overdue)
// assigneeFilter: user.id (default), 'all', 'unassigned', alebo konkrétny UUID
export function useTodayTasks(assigneeFilter?: AssigneeFilter) {
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

      const today = new Date().toISOString().split('T')[0]

      // Get tasks with deadline = today OR overdue (deadline < today)
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url, status),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .lte('deadline', today)
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .neq('status', 'canceled')

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

      const { data, error } = await query.order('deadline', { ascending: true })

      if (error) throw error
      setTasks(transformTasks(data || []))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, assigneeFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, setTasks, loading, error, refetch: fetchTasks }
}

// Upcoming view - tasks with deadline > today
// New simplified logic: deadline in the future
// assigneeFilter: user.id (default), 'all', 'unassigned', alebo konkrétny UUID
export function useUpcomingTasks(assigneeFilter?: AssigneeFilter) {
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

      const today = new Date().toISOString().split('T')[0]

      // Get tasks with deadline > today
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url, status),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .gt('deadline', today)
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')
        .neq('status', 'canceled')

      // Aplikuj filter podľa assignee_id
      if (effectiveFilter === 'all') {
        // Všetky úlohy v organizácii
      } else if (effectiveFilter === 'unassigned') {
        query = query.is('assignee_id', null)
      } else {
        query = query.eq('assignee_id', effectiveFilter)
      }

      const { data, error } = await query.order('deadline', { ascending: true })

      if (error) throw error
      setTasks(transformTasks(data || []))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, assigneeFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, setTasks, loading, error, refetch: fetchTasks }
}

// Anytime view - tasks without specific time
// assigneeFilter: user.id (default), 'all', 'unassigned', alebo konkrétny UUID
export function useAnytimeTasks(assigneeFilter?: AssigneeFilter) {
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

      // Include both anytime and someday tasks (merged)
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url, status),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .in('when_type', ['anytime', 'someday'])
        .is('archived_at', null)
        .is('deleted_at', null)
        .neq('status', 'done')

      // Aplikuj filter podľa assignee_id
      if (effectiveFilter === 'all') {
        // Všetky úlohy v organizácii
      } else if (effectiveFilter === 'unassigned') {
        query = query.is('assignee_id', null)
      } else {
        query = query.eq('assignee_id', effectiveFilter)
      }

      const { data, error } = await query.order('sort_order', { ascending: true })

      if (error) throw error
      // Apply today-first sorting
      setTasks(sortTasksTodayFirst(transformTasks(data || [])))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, assigneeFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, setTasks, loading, error, refetch: fetchTasks }
}

// Logbook view - completed tasks
// assigneeFilter: user.id (default), 'all', 'unassigned', alebo konkrétny UUID
export function useLogbookTasks(assigneeFilter?: AssigneeFilter) {
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
        .eq('status', 'done')
        .is('archived_at', null)
        .is('deleted_at', null)

      // Aplikuj filter podľa assignee_id
      if (effectiveFilter === 'all') {
        // Všetky úlohy v organizácii
      } else if (effectiveFilter === 'unassigned') {
        query = query.is('assignee_id', null)
      } else {
        query = query.eq('assignee_id', effectiveFilter)
      }

      const { data, error } = await query
        .order('completed_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setTasks(transformTasks(data || []))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, assigneeFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, setTasks, loading, error, refetch: fetchTasks }
}

// Trash view - deleted tasks
// assigneeFilter: user.id (default), 'all', 'unassigned', alebo konkrétny UUID
export function useTrashTasks(assigneeFilter?: AssigneeFilter) {
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
        .not('deleted_at', 'is', null)

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

      const { data, error } = await query
        .order('deleted_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setTasks(transformTasks(data || []))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, assigneeFilter])

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
