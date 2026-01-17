'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TaskWithRelations, Tag } from '@/types'

/**
 * TimeBlock predstavuje úlohu s naplánovaným časom
 */
export interface TimeBlock {
  id: string
  task_id: string
  start: Date
  end: Date
  task: TaskWithRelations
}

// Helper to transform Supabase nested tags structure to flat Tag[]
function transformTasks(tasks: any[]): TaskWithRelations[] {
  return tasks.map(task => ({
    ...task,
    tags: task.tags?.map((t: { tag: Tag }) => t.tag).filter(Boolean) || [],
  }))
}

/**
 * Hook pre načítanie time blockov (úloh s naplánovaným časom) v danom rozsahu
 */
export function useTimeBlocks(startDate: Date, endDate: Date) {
  const [timeBlocks, setTimeBlocks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchTimeBlocks = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .not('scheduled_start', 'is', null)
        .gte('scheduled_start', startDate.toISOString())
        .lte('scheduled_start', endDate.toISOString())
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('scheduled_start', { ascending: true })

      if (error) throw error
      setTimeBlocks(transformTasks(data || []))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, startDate, endDate])

  useEffect(() => {
    fetchTimeBlocks()
  }, [fetchTimeBlocks])

  return { timeBlocks, loading, error, refetch: fetchTimeBlocks }
}

/**
 * Hook pre načítanie nenaplánovaných úloh (úlohy bez scheduled_start)
 * Používa sa pre bočný panel v týždennom pohľade
 */
export function useUnscheduledTasks() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Načítaj úlohy ktoré:
      // - nemajú naplánovaný čas
      // - nie sú dokončené
      // - nie sú vymazané/archivované
      // - sú priradené aktuálnemu používateľovi alebo nepriradené
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url),
          project:projects(id, name, color),
          area:areas(id, name, color),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .is('scheduled_start', null)
        .neq('status', 'done')
        .neq('status', 'canceled')
        .is('deleted_at', null)
        .is('archived_at', null)
        .or(`assignee_id.eq.${user.id},assignee_id.is.null`)
        .order('deadline', { ascending: true, nullsFirst: false })
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

/**
 * Hook pre správu time blockov - vytvorenie, aktualizácia, zmazanie
 */
export function useTimeBlockActions() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  /**
   * Naplánovať čas na úlohu
   */
  const scheduleTask = useCallback(async (
    taskId: string,
    scheduledStart: Date,
    scheduledEnd: Date
  ): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const { error } = await supabase
        .from('tasks')
        .update({
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err as Error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [supabase])

  /**
   * Zrušiť naplánovanie úlohy
   */
  const unscheduleTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const { error } = await supabase
        .from('tasks')
        .update({
          scheduled_start: null,
          scheduled_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (error) throw error
      return true
    } catch (err) {
      setError(err as Error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [supabase])

  /**
   * Presunúť time block na nový čas (zachovať trvanie)
   */
  const moveTimeBlock = useCallback(async (
    taskId: string,
    newStart: Date,
    newEnd: Date
  ): Promise<boolean> => {
    return scheduleTask(taskId, newStart, newEnd)
  }, [scheduleTask])

  /**
   * Zmeniť trvanie time blocku (resize)
   */
  const resizeTimeBlock = useCallback(async (
    taskId: string,
    newStart: Date,
    newEnd: Date
  ): Promise<boolean> => {
    return scheduleTask(taskId, newStart, newEnd)
  }, [scheduleTask])

  return {
    scheduleTask,
    unscheduleTask,
    moveTimeBlock,
    resizeTimeBlock,
    isUpdating,
    error,
  }
}

/**
 * Pomocná funkcia pre výpočet pozície a výšky time blocku v gridu
 */
export function calculateTimeBlockPosition(
  scheduledStart: string,
  scheduledEnd: string,
  startHour: number,
  hourHeight: number
): { top: number; height: number } {
  const start = new Date(scheduledStart)
  const end = new Date(scheduledEnd)

  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const gridStartMinutes = startHour * 60

  const top = ((startMinutes - gridStartMinutes) / 60) * hourHeight
  const height = ((endMinutes - startMinutes) / 60) * hourHeight

  return { top: Math.max(0, top), height: Math.max(hourHeight / 4, height) }
}

/**
 * Pomocná funkcia pre kontrolu konfliktu medzi time blockmi
 */
export function checkTimeBlockConflict(
  block1Start: Date,
  block1End: Date,
  block2Start: Date,
  block2End: Date
): boolean {
  // Dva intervaly sa prekrývajú ak začiatok jedného je pred koncom druhého
  // a koniec jedného je po začiatku druhého
  return block1Start < block2End && block1End > block2Start
}

/**
 * Pomocná funkcia pre nájdenie konfliktov pre daný time block
 */
export function findConflicts(
  task: TaskWithRelations,
  allTimeBlocks: TaskWithRelations[],
  googleEvents?: Array<{ start: Date; end: Date; id: string }>
): Array<{ type: 'task' | 'google'; id: string }> {
  if (!task.scheduled_start || !task.scheduled_end) return []

  const blockStart = new Date(task.scheduled_start)
  const blockEnd = new Date(task.scheduled_end)
  const conflicts: Array<{ type: 'task' | 'google'; id: string }> = []

  // Kontrola konfliktu s inými úlohami
  for (const other of allTimeBlocks) {
    if (other.id === task.id) continue
    if (!other.scheduled_start || !other.scheduled_end) continue

    if (checkTimeBlockConflict(
      blockStart,
      blockEnd,
      new Date(other.scheduled_start),
      new Date(other.scheduled_end)
    )) {
      conflicts.push({ type: 'task', id: other.id })
    }
  }

  // Kontrola konfliktu s Google eventmi
  if (googleEvents) {
    for (const event of googleEvents) {
      if (checkTimeBlockConflict(blockStart, blockEnd, event.start, event.end)) {
        conflicts.push({ type: 'google', id: event.id })
      }
    }
  }

  return conflicts
}
