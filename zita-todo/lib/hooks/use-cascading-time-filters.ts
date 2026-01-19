'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeFilters } from './use-time-filters'

export interface FilterOption {
  id: string
  name: string
  color?: string | null
  area_id?: string | null
}

export interface CascadingFilterOptions {
  areas: FilterOption[]
  projects: FilterOption[]
  users: FilterOption[]
  tags: FilterOption[]
  loading: boolean
}

interface UseCascadingTimeFiltersProps {
  filters: TimeFilters
}

export function useCascadingTimeFilters({ filters }: UseCascadingTimeFiltersProps): CascadingFilterOptions {
  const [allAreas, setAllAreas] = useState<FilterOption[]>([])
  const [allProjects, setAllProjects] = useState<FilterOption[]>([])
  const [allUsers, setAllUsers] = useState<FilterOption[]>([])
  const [allTags, setAllTags] = useState<FilterOption[]>([])
  const [timeEntryMeta, setTimeEntryMeta] = useState<{
    areaIds: Set<string>
    projectIds: Set<string>
    userIds: Set<string>
    tagIds: Set<string>
    projectToArea: Map<string, string>
    userToAreas: Map<string, Set<string>>
    userToProjects: Map<string, Set<string>>
  }>({
    areaIds: new Set(),
    projectIds: new Set(),
    userIds: new Set(),
    tagIds: new Set(),
    projectToArea: new Map(),
    userToAreas: new Map(),
    userToProjects: new Map(),
  })
  const [loading, setLoading] = useState(true)

  // Fetch all base data and time entry relationships
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      try {
        // Fetch all areas
        const { data: areasData } = await supabase
          .from('areas')
          .select('id, name, color')
          .is('archived_at', null)
          .order('name')

        // Fetch all projects with their area_id
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name, area_id')
          .eq('status', 'active')
          .order('name')

        // Fetch all active users
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, nickname')
          .eq('status', 'active')
          .order('nickname')

        // Fetch all tags
        const { data: tagsData } = await supabase
          .from('tags')
          .select('id, name, color')
          .order('name')

        // Fetch time entries - simplified query using denormalized fields
        // project_id and area_id are stored directly on time_entries
        const { data: timeEntriesData, error: timeEntriesError } = await supabase
          .from('time_entries')
          .select(`
            user_id,
            project_id,
            area_id,
            task_id
          `)
          .gte('started_at', filters.from)
          .lte('started_at', filters.to)
          .is('deleted_at', null)
          .not('duration_seconds', 'is', null)

        if (timeEntriesError) {
          console.error('Error fetching time entries for filters:', timeEntriesError)
        }

        // Build project to area mapping
        const projectToArea = new Map<string, string>()
        projectsData?.forEach(p => {
          if (p.area_id) {
            projectToArea.set(p.id, p.area_id)
          }
        })

        // Build user to areas/projects mapping from time entries
        const userToAreas = new Map<string, Set<string>>()
        const userToProjects = new Map<string, Set<string>>()
        const usedAreaIds = new Set<string>()
        const usedProjectIds = new Set<string>()
        const usedUserIds = new Set<string>()

        timeEntriesData?.forEach(entry => {
          const userId = entry.user_id
          if (!userId) return

          usedUserIds.add(userId)

          // Get area and project directly from time_entries (denormalized)
          const areaId = entry.area_id
          const projectId = entry.project_id

          if (areaId) {
            usedAreaIds.add(areaId)
            if (!userToAreas.has(userId)) {
              userToAreas.set(userId, new Set())
            }
            userToAreas.get(userId)!.add(areaId)
          }

          if (projectId) {
            usedProjectIds.add(projectId)
            if (!userToProjects.has(userId)) {
              userToProjects.set(userId, new Set())
            }
            userToProjects.get(userId)!.add(projectId)

            // Also add the project's area (from the mapping)
            const projectArea = projectToArea.get(projectId)
            if (projectArea) {
              usedAreaIds.add(projectArea)
              if (!userToAreas.has(userId)) {
                userToAreas.set(userId, new Set())
              }
              userToAreas.get(userId)!.add(projectArea)
            }
          }
        })

        setAllAreas(areasData?.map(a => ({ id: a.id, name: a.name, color: a.color })) || [])
        setAllProjects(projectsData?.map(p => ({ id: p.id, name: p.name, area_id: p.area_id })) || [])
        setAllUsers(usersData?.map(u => ({ id: u.id, name: u.nickname || u.full_name || 'Neznámy' })) || [])
        setAllTags(tagsData?.map(t => ({ id: t.id, name: t.name, color: t.color })) || [])
        setTimeEntryMeta({
          areaIds: usedAreaIds,
          projectIds: usedProjectIds,
          userIds: usedUserIds,
          tagIds: new Set(), // Tags need separate handling
          projectToArea,
          userToAreas,
          userToProjects,
        })
      } catch (error) {
        console.error('Error fetching filter options:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters.from, filters.to])

  // Calculate filtered options based on current selections
  const filteredOptions = useMemo(() => {
    const { areaIds, projectIds, userIds } = filters
    const { projectToArea, userToAreas, userToProjects } = timeEntryMeta

    // Filter areas - show all that have time entries, unless filtered by user/project
    let filteredAreas = allAreas.filter(a => timeEntryMeta.areaIds.has(a.id))

    // If users are selected, only show areas where those users have time entries
    if (userIds.length > 0) {
      const areasWithSelectedUsers = new Set<string>()
      userIds.forEach(userId => {
        userToAreas.get(userId)?.forEach(areaId => areasWithSelectedUsers.add(areaId))
      })
      filteredAreas = filteredAreas.filter(a => areasWithSelectedUsers.has(a.id))
    }

    // If projects are selected, only show areas that contain those projects
    if (projectIds.length > 0) {
      const areasWithSelectedProjects = new Set<string>()
      projectIds.forEach(projectId => {
        const areaId = projectToArea.get(projectId)
        if (areaId) areasWithSelectedProjects.add(areaId)
      })
      filteredAreas = filteredAreas.filter(a => areasWithSelectedProjects.has(a.id))
    }

    // Filter projects - show all that have time entries
    let filteredProjects = allProjects.filter(p => timeEntryMeta.projectIds.has(p.id))

    // If areas are selected, only show projects from those areas
    if (areaIds.length > 0) {
      filteredProjects = filteredProjects.filter(p => p.area_id && areaIds.includes(p.area_id))
    }

    // If users are selected, only show projects where those users have time entries
    if (userIds.length > 0) {
      const projectsWithSelectedUsers = new Set<string>()
      userIds.forEach(userId => {
        userToProjects.get(userId)?.forEach(projectId => projectsWithSelectedUsers.add(projectId))
      })
      filteredProjects = filteredProjects.filter(p => projectsWithSelectedUsers.has(p.id))
    }

    // Filter users - show all that have time entries
    let filteredUsers = allUsers.filter(u => timeEntryMeta.userIds.has(u.id))

    // If areas are selected, only show users with time entries in those areas
    if (areaIds.length > 0) {
      filteredUsers = filteredUsers.filter(u => {
        const userAreas = userToAreas.get(u.id)
        return userAreas && areaIds.some(areaId => userAreas.has(areaId))
      })
    }

    // If projects are selected, only show users with time entries in those projects
    if (projectIds.length > 0) {
      filteredUsers = filteredUsers.filter(u => {
        const userProjects = userToProjects.get(u.id)
        return userProjects && projectIds.some(projectId => userProjects.has(projectId))
      })
    }

    // Tags - for now show all (could be filtered based on time entries with tasks that have tags)
    const filteredTags = allTags

    return {
      areas: filteredAreas,
      projects: filteredProjects,
      users: filteredUsers,
      tags: filteredTags,
      loading,
    }
  }, [allAreas, allProjects, allUsers, allTags, filters, timeEntryMeta, loading])

  return filteredOptions
}
