'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Inbox,
  Users,
  FolderKanban,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  LogOut,
  Calendar,
  Star,
  CalendarDays,
  Clock,
  BookOpen,
  Trash2,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SidebarDropItem, SidebarDropProject, SidebarDropArea } from '@/components/layout/sidebar-drop-item'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { useTaskCounts } from '@/lib/hooks/use-task-counts'
import { useUserDepartments } from '@/lib/hooks/use-user-departments'
import { UserRole, canSeeAllDepartments, canManageUsers } from '@/types'

interface Area {
  id: string
  name: string
  color: string | null
  projects: {
    id: string
    name: string
    color: string | null
  }[]
}

interface SidebarProps {
  user: {
    full_name: string | null
    nickname?: string | null
    email: string
    avatar_url: string | null
    role?: UserRole
  } | null
  areas: Area[]
  onLogout: () => void
  onCreateProject: (areaId?: string) => void
}

export function Sidebar({
  user,
  areas,
  onLogout,
  onCreateProject,
}: SidebarProps) {
  const pathname = usePathname()
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())
  const [showOtherDepartments, setShowOtherDepartments] = useState(false)
  const { isDragging } = useSidebarDrop()
  const { counts } = useTaskCounts()
  const { myDepartments, otherDepartments, canSeeAll } = useUserDepartments()

  const toggleArea = (areaId: string) => {
    const newExpanded = new Set(expandedAreas)
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId)
    } else {
      newExpanded.add(areaId)
    }
    setExpandedAreas(newExpanded)
  }

  const isActive = (path: string) => pathname === path

  // Get display name: prefer nickname over full_name
  const displayName = user?.nickname || user?.full_name || user?.email

  // Check if user can manage users (admin only)
  const userCanManageUsers = user?.role ? canManageUsers(user.role) : false

  // Filter areas based on department membership
  const myDeptIds = new Set(myDepartments.map(d => d.id))
  const otherDeptIds = new Set(otherDepartments.map(d => d.id))

  // Areas that belong to my departments
  const myAreas = areas.filter(area => myDeptIds.has(area.id))
  // Areas that belong to other departments (only shown if expanded)
  const otherAreas = areas.filter(area => otherDeptIds.has(area.id))

  return (
    <aside className={cn(
      'flex h-screen w-64 flex-col border-r border-[var(--border-primary)] bg-[var(--bg-primary)] transition-all',
      isDragging && 'bg-[var(--bg-secondary)]'
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <h1 className="text-xl font-bold text-[var(--color-primary)]">ZITA TODO</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Inbox Section - Not droppable (regular links) */}
        <div className="mb-2">
          <SidebarDropItem
            href="/inbox"
            isActive={isActive('/inbox')}
            dropTarget={{ type: 'when', value: 'inbox' }}
            icon={<Inbox className="h-4 w-4" />}
            label="Inbox"
            count={counts.inbox}
          />
          <Link
            href="/inbox/team"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/inbox/team')
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Users className="h-4 w-4" />
            <span className="flex-1">Tímový Inbox</span>
            {counts.teamInbox > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 text-xs font-medium bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {counts.teamInbox > 99 ? '99+' : counts.teamInbox}
              </span>
            )}
          </Link>
        </div>

        <div className="my-2 h-px bg-[var(--border-primary)]" />

        {/* Things 3 Views - Droppable */}
        <div className="mb-2">
          <SidebarDropItem
            href="/today"
            isActive={isActive('/today')}
            dropTarget={{ type: 'when', value: 'today' }}
            icon={<Star className="h-4 w-4 text-[var(--color-warning)]" />}
            label="Dnes"
            count={counts.todayDeadline > 0 ? counts.todayDeadline : counts.today}
            isDeadline={counts.todayDeadline > 0}
          />
          <SidebarDropItem
            href="/upcoming"
            isActive={isActive('/upcoming')}
            dropTarget={{ type: 'when', value: 'scheduled' }}
            icon={<CalendarDays className="h-4 w-4 text-[var(--color-success)]" />}
            label="Nadchádzajúce"
            count={counts.upcoming}
          />
          <SidebarDropItem
            href="/anytime"
            isActive={isActive('/anytime')}
            dropTarget={{ type: 'when', value: 'anytime' }}
            icon={<Clock className="h-4 w-4 text-[var(--color-primary)]" />}
            label="Kedykoľvek"
            count={counts.anytime}
          />
          <Link
            href="/logbook"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/logbook')
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <BookOpen className="h-4 w-4 text-[var(--color-success)]" />
            <span>Logbook</span>
          </Link>
          <SidebarDropItem
            href="/trash"
            isActive={isActive('/trash')}
            dropTarget={{ type: 'trash' }}
            icon={<Trash2 className="h-4 w-4 text-[var(--text-secondary)]" />}
            label="Kôš"
          />
          <SidebarDropItem
            href="/calendar"
            isActive={isActive('/calendar')}
            dropTarget={{ type: 'calendar' }}
            icon={<Calendar className="h-4 w-4" />}
            label="Kalendár"
          />
        </div>

        <div className="my-2 h-px bg-[var(--border-primary)]" />

        {/* My Departments Section */}
        <div className="mb-2 px-3 py-1">
          <span className="text-xs font-medium uppercase text-[var(--text-secondary)]">
            {canSeeAll ? 'Oddelenia' : 'Moje oddelenia'}
          </span>
        </div>

        {/* Show all areas if canSeeAll, otherwise show only myAreas */}
        {(canSeeAll ? areas : myAreas).map((area) => (
          <SidebarDropArea
            key={area.id}
            areaId={area.id}
            areaName={area.name}
            areaColor={area.color}
            isExpanded={expandedAreas.has(area.id)}
            hasProjects={area.projects.length > 0}
            onToggle={() => toggleArea(area.id)}
            onCreateProject={() => onCreateProject(area.id)}
          >
            {area.projects.map((project) => (
              <SidebarDropProject
                key={project.id}
                href={`/projects/${project.id}`}
                isActive={isActive(`/projects/${project.id}`)}
                projectId={project.id}
                icon={<FolderKanban className="h-4 w-4" />}
                label={project.name}
              />
            ))}
            <button
              onClick={() => onCreateProject(area.id)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Pridať projekt</span>
            </button>
          </SidebarDropArea>
        ))}

        {/* Other Departments Section - Only for member role */}
        {!canSeeAll && otherAreas.length > 0 && (
          <>
            <button
              onClick={() => setShowOtherDepartments(!showOtherDepartments)}
              className="flex w-full items-center gap-2 px-3 py-2 mt-2 text-xs font-medium uppercase text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
            >
              <Eye className="h-3 w-3" />
              <span className="flex-1 text-left">Ostatné oddelenia</span>
              {showOtherDepartments ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>

            {showOtherDepartments && otherAreas.map((area) => (
              <SidebarDropArea
                key={area.id}
                areaId={area.id}
                areaName={area.name}
                areaColor={area.color}
                isExpanded={expandedAreas.has(area.id)}
                hasProjects={area.projects.length > 0}
                onToggle={() => toggleArea(area.id)}
                onCreateProject={() => onCreateProject(area.id)}
              >
                {area.projects.map((project) => (
                  <SidebarDropProject
                    key={project.id}
                    href={`/projects/${project.id}`}
                    isActive={isActive(`/projects/${project.id}`)}
                    projectId={project.id}
                    icon={<FolderKanban className="h-4 w-4" />}
                    label={project.name}
                  />
                ))}
              </SidebarDropArea>
            ))}
          </>
        )}
      </nav>

      {/* Drag indicator */}
      {isDragging && (
        <div className="mx-2 mb-2 rounded-lg bg-[var(--color-primary)]/10 p-3 text-center text-xs text-[var(--color-primary)]">
          Potiahni úlohu na sekciu pre jej presun
        </div>
      )}

      {/* User Section */}
      <div className="border-t border-[var(--border-primary)] p-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar src={user?.avatar_url} name={displayName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {displayName}
            </p>
            {user?.role && user.role !== 'member' && (
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {user.role === 'admin' ? 'Admin' : user.role === 'strategicka_rada' ? 'Strategická rada' : 'HR'}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {userCanManageUsers && (
              <Link href="/settings/users">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Správa používateľov">
                  <Users className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Nastavenia">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onLogout}
              title="Odhlásiť sa"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
