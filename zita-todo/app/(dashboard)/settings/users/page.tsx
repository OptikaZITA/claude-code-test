'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Users, Mail, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserRow } from '@/components/users/user-row'
import { InviteUserModal, InviteUserData } from '@/components/users/invite-user-modal'
import { EditUserModal, EditUserData } from '@/components/users/edit-user-modal'
import { useUsersManagement } from '@/lib/hooks/use-users-management'
import { useCurrentUser } from '@/lib/hooks/use-user-departments'
import { User, UserRole, UserStatus, Area, canManageUsers } from '@/types'

type FilterRole = UserRole | 'all'
type FilterStatus = UserStatus | 'all'

export default function UsersManagementPage() {
  const router = useRouter()
  const { user: currentUser, loading: currentUserLoading } = useCurrentUser()
  const {
    users,
    invitations,
    departments,
    loading,
    inviteUser,
    updateUser,
    deactivateUser,
    reactivateUser,
    deleteInvitation,
    addUserToDepartment,
    removeUserFromDepartment,
    getUserDepartments,
  } = useUsersManagement()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string | 'all'>('all')

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingUserDepartments, setEditingUserDepartments] = useState<Area[]>([])
  const [lastInviteEmail, setLastInviteEmail] = useState<string | null>(null)

  // Check if current user is admin
  useEffect(() => {
    if (!currentUserLoading && currentUser) {
      if (!canManageUsers(currentUser.role)) {
        router.push('/settings')
      }
    }
  }, [currentUser, currentUserLoading, router])

  // Load user departments when editing
  useEffect(() => {
    if (editingUser) {
      getUserDepartments(editingUser.id).then(setEditingUserDepartments)
    }
  }, [editingUser, getUserDepartments])

  // Filter and sort users (active first, inactive last)
  const filteredUsers = users
    .filter((user) => {
      // Search
      if (search) {
        const searchLower = search.toLowerCase()
        const matches =
          user.email.toLowerCase().includes(searchLower) ||
          user.full_name?.toLowerCase().includes(searchLower) ||
          user.nickname?.toLowerCase().includes(searchLower)
        if (!matches) return false
      }

      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false

      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) return false

      return true
    })
    .sort((a, b) => {
      // Active users first, inactive last
      if (a.status === 'active' && b.status !== 'active') return -1
      if (a.status !== 'active' && b.status === 'active') return 1
      // Within same status, sort by name
      const nameA = a.nickname || a.full_name || a.email
      const nameB = b.nickname || b.full_name || b.email
      return nameA.localeCompare(nameB)
    })

  const handleInvite = async (data: InviteUserData) => {
    await inviteUser(data)
    // Supabase sends email automatically
    setLastInviteEmail(data.email)
  }

  const handleSaveUser = async (userId: string, data: EditUserData) => {
    await updateUser(userId, data)
  }

  const handleUpdateDepartments = async (userId: string, departmentIds: string[]) => {
    const currentDepts = await getUserDepartments(userId)
    const currentIds = currentDepts.map((d) => d.id)

    // Remove from departments not in new list
    for (const id of currentIds) {
      if (!departmentIds.includes(id)) {
        await removeUserFromDepartment(userId, id)
      }
    }

    // Add to new departments
    for (const id of departmentIds) {
      if (!currentIds.includes(id)) {
        await addUserToDepartment(userId, id)
      }
    }
  }

  const handleViewTasks = (userId: string) => {
    // Navigate to inbox with assignee filter
    router.push(`/inbox?assignee=${userId}`)
  }

  if (currentUserLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!currentUser || !canManageUsers(currentUser.role)) {
    return null
  }

  return (
    <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať používateľov..."
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Filters */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as FilterRole)}
            className="px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)]"
          >
            <option value="all">Všetky roly</option>
            <option value="admin">Admin</option>
            <option value="strategicka_rada">Strategická rada</option>
            <option value="hr">HR</option>
            <option value="member">Člen</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="px-3 py-2 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)]"
          >
            <option value="all">Všetky statusy</option>
            <option value="active">Aktívny</option>
            <option value="inactive">Neaktívny</option>
            <option value="invited">Pozvaný</option>
          </select>

          {/* Invite Button */}
          <Button onClick={() => setShowInviteModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Pozvať používateľa
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{users.length}</p>
            <p className="text-sm text-[var(--text-secondary)]">Celkom používateľov</p>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <p className="text-2xl font-bold text-green-600">{users.filter((u) => u.status === 'active').length}</p>
            <p className="text-sm text-[var(--text-secondary)]">Aktívnych</p>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{invitations.length}</p>
            <p className="text-sm text-[var(--text-secondary)]">Čakajúcich pozvánok</p>
          </div>
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{departments.length}</p>
            <p className="text-sm text-[var(--text-secondary)]">Oddelení</p>
          </div>
        </div>

        {/* Last Invite Notification */}
        {lastInviteEmail && (
          <div className="mb-6 p-4 border rounded-lg bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Pozvánka odoslaná
                </p>
                <p className="text-sm mt-1 text-green-600 dark:text-green-400">
                  Email s pozvánkou bol odoslaný na adresu <strong>{lastInviteEmail}</strong>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLastInviteEmail(null)}
              >
                Zavrieť
              </Button>
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase mb-3">
              Čakajúce pozvánky ({invitations.length})
            </h3>
            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center gap-4 p-4 border-b border-[var(--border-primary)] last:border-b-0"
                >
                  <Mail className="h-5 w-5 text-[var(--text-secondary)]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)]">
                      {invitation.full_name || invitation.email}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">{invitation.email}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Pozvaný
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const link = `${window.location.origin}/invite/${invitation.id}`
                      navigator.clipboard.writeText(link)
                    }}
                    title="Kopírovať odkaz"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteInvitation(invitation.id)}
                    className="text-red-600 hover:text-red-700"
                    title="Odstrániť pozvánku"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users List */}
        <div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase mb-3">
            Používatelia ({filteredUsers.length})
          </h3>
          <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-[var(--text-secondary)]" />
                <p className="text-[var(--text-secondary)]">
                  {search ? 'Žiadni používatelia nezodpovedajú vyhľadávaniu' : 'Žiadni používatelia'}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={setEditingUser}
                  onDeactivate={deactivateUser}
                  onReactivate={reactivateUser}
                  onViewTasks={handleViewTasks}
                />
              ))
            )}
          </div>
        </div>

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        departments={departments}
      />

      {/* Edit Modal */}
      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveUser}
        onUpdateDepartments={handleUpdateDepartments}
        departments={departments}
        userDepartments={editingUserDepartments}
      />
    </div>
  )
}
