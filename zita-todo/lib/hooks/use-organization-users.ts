'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'

interface UseOrganizationUsersResult {
  users: User[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook pre načítanie všetkých používateľov organizácie.
 * Používa sa pre filter "Strážci vesmíru" aby zobrazoval všetkých používateľov,
 * nielen tých z aktuálne viditeľných úloh.
 */
export function useOrganizationUsers(): UseOrganizationUsersResult {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // RLS zabezpečí že vidíme len používateľov z našej organizácie
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('nickname', { ascending: true, nullsFirst: false })
        .order('full_name', { ascending: true })

      if (fetchError) throw fetchError
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching organization users:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch users'))
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  }
}
