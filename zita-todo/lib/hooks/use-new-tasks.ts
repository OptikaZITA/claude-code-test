'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseNewTasksResult {
  newTasksCount: number
  lastAcknowledged: string | null
  countsByArea: Record<string, number>
  countsByProject: Record<string, number>
  loading: boolean
  acknowledging: boolean
  acknowledge: () => Promise<void>
  isTaskNew: (addedToTodayAt: string | null) => boolean
  getAreaNewCount: (areaId: string) => number
  getProjectNewCount: (projectId: string) => number
  refetch: () => Promise<void>
}

/**
 * Hook pre spravu novych taskov v "Dnes"
 * Pouziva sa pre zltu bodku a banner na Today stranke
 */
export function useNewTasks(): UseNewTasksResult {
  const [newTasksCount, setNewTasksCount] = useState(0)
  const [lastAcknowledged, setLastAcknowledged] = useState<string | null>(null)
  const [countsByArea, setCountsByArea] = useState<Record<string, number>>({})
  const [countsByProject, setCountsByProject] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [acknowledging, setAcknowledging] = useState(false)

  const fetchNewTasksCount = useCallback(async () => {
    try {
      const response = await fetch('/api/user/acknowledge-tasks')
      if (response.ok) {
        const data = await response.json()
        setNewTasksCount(data.count)
        setLastAcknowledged(data.last_acknowledged)
        setCountsByArea(data.counts_by_area || {})
        setCountsByProject(data.counts_by_project || {})
      }
    } catch (error) {
      console.error('Error fetching new tasks count:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNewTasksCount()
  }, [fetchNewTasksCount])

  const acknowledge = useCallback(async () => {
    setAcknowledging(true)
    try {
      const response = await fetch('/api/user/acknowledge-tasks', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        setNewTasksCount(0)
        setLastAcknowledged(data.acknowledged_at)
        setCountsByArea({})
        setCountsByProject({})
      }
    } catch (error) {
      console.error('Error acknowledging tasks:', error)
    } finally {
      setAcknowledging(false)
    }
  }, [])

  const isTaskNew = useCallback((addedToTodayAt: string | null): boolean => {
    if (!addedToTodayAt) return false
    if (!lastAcknowledged) return true // First use - all tasks are new
    return new Date(addedToTodayAt) > new Date(lastAcknowledged)
  }, [lastAcknowledged])

  const getAreaNewCount = useCallback((areaId: string): number => {
    return countsByArea[areaId] || 0
  }, [countsByArea])

  const getProjectNewCount = useCallback((projectId: string): number => {
    return countsByProject[projectId] || 0
  }, [countsByProject])

  return {
    newTasksCount,
    lastAcknowledged,
    countsByArea,
    countsByProject,
    loading,
    acknowledging,
    acknowledge,
    isTaskNew,
    getAreaNewCount,
    getProjectNewCount,
    refetch: fetchNewTasksCount,
  }
}

/**
 * @deprecated Použite useNewTasks() namiesto tohto hooku.
 * Tento hook počíta VŠETKY úlohy v "Dnes", nie len NOVÉ úlohy.
 * Pre správnu signalizáciu nových úloh použite useNewTasks().getAreaNewCount() a .getProjectNewCount()
 */
export function useTodayTasksCounts() {
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({})
  const [areaCounts, setAreaCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCounts = useCallback(async () => {
    try {
      // Fetch all today tasks with project_id and area_id
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, project_id, area_id')
        .eq('when_type', 'today')
        .is('deleted_at', null)
        .not('status', 'in', '("done","canceled")')

      if (error) {
        console.error('Error fetching today tasks counts:', error)
        return
      }

      // Count by project
      const projectMap: Record<string, number> = {}
      const areaMap: Record<string, number> = {}

      tasks?.forEach(task => {
        if (task.project_id) {
          projectMap[task.project_id] = (projectMap[task.project_id] || 0) + 1
        }
        if (task.area_id) {
          areaMap[task.area_id] = (areaMap[task.area_id] || 0) + 1
        }
      })

      setProjectCounts(projectMap)
      setAreaCounts(areaMap)
    } catch (error) {
      console.error('Error in fetchCounts:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCounts()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('today-tasks-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          fetchCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchCounts, supabase])

  return {
    projectCounts,
    areaCounts,
    loading,
    getProjectTodayCount: (projectId: string) => projectCounts[projectId] || 0,
    getAreaTodayCount: (areaId: string) => areaCounts[areaId] || 0,
    refetch: fetchCounts,
  }
}
