'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Invitation, UserRole, UserStatus, Area, DepartmentMember } from '@/types'

interface CreateInvitationData {
  email: string
  full_name: string
  nickname: string
  position?: string
  role: UserRole
  departments: string[] // area IDs
}

interface UpdateUserData {
  full_name?: string
  nickname?: string
  position?: string
  role?: UserRole
  status?: UserStatus
}

interface UseUsersManagementResult {
  users: User[]
  invitations: Invitation[]
  departments: Area[]
  loading: boolean
  error: Error | null

  // User operations
  updateUser: (userId: string, data: UpdateUserData) => Promise<void>
  deactivateUser: (userId: string) => Promise<void>
  reactivateUser: (userId: string) => Promise<void>

  // Department membership
  addUserToDepartment: (userId: string, departmentId: string) => Promise<void>
  removeUserFromDepartment: (userId: string, departmentId: string) => Promise<void>
  getUserDepartments: (userId: string) => Promise<Area[]>

  // Invitation operations
  inviteUser: (data: CreateInvitationData) => Promise<Invitation>
  deleteInvitation: (invitationId: string) => Promise<void>
  resendInvitation: (invitationId: string) => Promise<void>

  // Refresh data
  refetch: () => Promise<void>
}

export function useUsersManagement(): UseUsersManagementResult {
  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [departments, setDepartments] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true })

      if (usersError) throw usersError
      setUsers(usersData || [])

      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select('*')
        .is('accepted_at', null)
        .order('created_at', { ascending: false })

      if (invitationsError) throw invitationsError
      setInvitations(invitationsData || [])

      // Fetch all departments (global areas)
      const { data: deptData, error: deptError } = await supabase
        .from('areas')
        .select('*')
        .eq('is_global', true)
        .is('archived_at', null)
        .order('sort_order', { ascending: true })

      if (deptError) throw deptError
      setDepartments(deptData || [])

    } catch (err) {
      console.error('Error fetching users data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Update user
  const updateUser = useCallback(async (userId: string, data: UpdateUserData) => {
    const { error } = await supabase
      .from('users')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) throw error
    await fetchData()
  }, [supabase, fetchData])

  // Deactivate user
  const deactivateUser = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from('users')
      .update({
        status: 'inactive',
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) throw error
    await fetchData()
  }, [supabase, fetchData])

  // Reactivate user
  const reactivateUser = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from('users')
      .update({
        status: 'active',
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) throw error
    await fetchData()
  }, [supabase, fetchData])

  // Add user to department
  const addUserToDepartment = useCallback(async (userId: string, departmentId: string) => {
    const { error } = await supabase
      .from('department_members')
      .insert({
        user_id: userId,
        department_id: departmentId,
      })

    if (error && error.code !== '23505') { // Ignore duplicate key error
      throw error
    }
  }, [supabase])

  // Remove user from department
  const removeUserFromDepartment = useCallback(async (userId: string, departmentId: string) => {
    const { error } = await supabase
      .from('department_members')
      .delete()
      .eq('user_id', userId)
      .eq('department_id', departmentId)

    if (error) throw error
  }, [supabase])

  // Get user's departments
  const getUserDepartments = useCallback(async (userId: string): Promise<Area[]> => {
    const { data, error } = await supabase
      .from('department_members')
      .select('department_id, areas(*)')
      .eq('user_id', userId)

    if (error) throw error

    return (data || []).map((d: any) => d.areas).filter(Boolean)
  }, [supabase])

  // Invite user
  const inviteUser = useCallback(async (data: CreateInvitationData): Promise<Invitation> => {
    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Get current user as inviter and their organization
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    let organizationId = null
    if (currentUser) {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', currentUser.id)
        .single()
      organizationId = userData?.organization_id
    }

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email: data.email,
        full_name: data.full_name,
        nickname: data.nickname,
        position: data.position || null,
        role: data.role,
        departments: data.departments,
        expires_at: expiresAt.toISOString(),
        invited_by: currentUser?.id || null,
        organization_id: organizationId,
      })
      .select()
      .single()

    if (error) throw error

    await fetchData()
    return invitation
  }, [supabase, fetchData])

  // Delete invitation
  const deleteInvitation = useCallback(async (invitationId: string) => {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (error) throw error
    await fetchData()
  }, [supabase, fetchData])

  // Resend invitation (extend expiration)
  const resendInvitation = useCallback(async (invitationId: string) => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error } = await supabase
      .from('invitations')
      .update({
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', invitationId)

    if (error) throw error
    await fetchData()
  }, [supabase, fetchData])

  return {
    users,
    invitations,
    departments,
    loading,
    error,
    updateUser,
    deactivateUser,
    reactivateUser,
    addUserToDepartment,
    removeUserFromDepartment,
    getUserDepartments,
    inviteUser,
    deleteInvitation,
    resendInvitation,
    refetch: fetchData,
  }
}
