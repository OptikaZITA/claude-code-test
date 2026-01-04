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
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SidebarDropItem, SidebarDropProject, SidebarDropArea } from '@/components/layout/sidebar-drop-item'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { useTaskCounts } from '@/lib/hooks/use-task-counts'

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
    email: string
    avatar_url: string | null
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
  const { isDragging } = useSidebarDrop()
  const { counts } = useTaskCounts()

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
            <span className="flex-1">Timovy Inbox</span>
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
            label="Nadchadzajuce"
            count={counts.upcoming}
          />
          <SidebarDropItem
            href="/anytime"
            isActive={isActive('/anytime')}
            dropTarget={{ type: 'when', value: 'anytime' }}
            icon={<Clock className="h-4 w-4 text-[var(--color-primary)]" />}
            label="Kedykolvek"
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

        {/* Departments Section - Fixed, cannot add new */}
        <div className="mb-2 px-3 py-1">
          <span className="text-xs font-medium uppercase text-[var(--text-secondary)]">
            Oddelenia
          </span>
        </div>

        {areas.map((area) => (
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
      </nav>

      {/* Drag indicator */}
      {isDragging && (
        <div className="mx-2 mb-2 rounded-lg bg-[var(--color-primary)]/10 p-3 text-center text-xs text-[var(--color-primary)]">
          Potiahni ulohu na sekciu pre jej presun
        </div>
      )}

      {/* User Section */}
      <div className="border-t border-[var(--border-primary)] p-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar src={user?.avatar_url} name={user?.full_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {user?.full_name || user?.email}
            </p>
          </div>
          <div className="flex gap-1">
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
