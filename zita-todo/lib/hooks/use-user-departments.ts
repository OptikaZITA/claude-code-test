'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Area, User, DepartmentMember, canSeeAllDepartments } from '@/types'

interface UseUserDepartmentsResult {
  myDepartments: Area[]      // Oddelenia kde som členom
  allDepartments: Area[]     // Všetky globálne oddelenia
  otherDepartments: Area[]   // Oddelenia kde NIE som členom
  canSeeAll: boolean         // Či user má full access role
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useUserDepartments(): UseUserDepartmentsResult {
  const [myDepartments, setMyDepartments] = useState<Area[]>([])
  const [allDepartments, setAllDepartments] = useState<Area[]>([])
  const [canSeeAll, setCanSeeAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user with role
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setLoading(false)
        return
      }

      // Get user details including role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (userError) throw userError

      const userRole = userData?.role || 'member'
      const hasFullAccess = canSeeAllDepartments(userRole)
      setCanSeeAll(hasFullAccess)

      // Fetch all global departments
      const { data: globalDepts, error: globalError } = await supabase
        .from('areas')
        .select('*')
        .eq('is_global', true)
        .is('archived_at', null)
        .order('sort_order', { ascending: true })

      if (globalError) throw globalError
      setAllDepartments(globalDepts || [])

      if (hasFullAccess) {
        // User s full access vidí všetky oddelenia ako "svoje"
        setMyDepartments(globalDepts || [])
      } else {
        // Načítaj členstvo v oddeleniach
        const { data: memberships, error: memberError } = await supabase
          .from('department_members')
          .select('department_id')
          .eq('user_id', authUser.id)

        if (memberError) throw memberError

        const myDeptIds = new Set((memberships || []).map(m => m.department_id))
        const myDepts = (globalDepts || []).filter(d => myDeptIds.has(d.id))
        setMyDepartments(myDepts)
      }

    } catch (err) {
      console.error('Error fetching departments:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch departments'))
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  // Compute other departments (where user is NOT a member)
  const otherDepartments = allDepartments.filter(
    dept => !myDepartments.some(my => my.id === dept.id)
  )

  return {
    myDepartments,
    allDepartments,
    otherDepartments,
    canSeeAll,
    loading,
    error,
    refetch: fetchDepartments,
  }
}

// Hook for getting current user with extended profile
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      const { data, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userError) throw userError
      setUser(data)
    } catch (err) {
      console.error('Error fetching current user:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch user'))
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return { user, loading, error, refetch: fetchUser }
}
