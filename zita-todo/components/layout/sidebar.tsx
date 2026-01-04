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
  Sun,
  CalendarDays,
  Clock,
  Moon,
  BookOpen,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { SidebarDropItem, SidebarDropProject } from '@/components/layout/sidebar-drop-item'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'

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
  onCreateArea: () => void
  onCreateProject: (areaId?: string) => void
}

export function Sidebar({
  user,
  areas,
  onLogout,
  onCreateArea,
  onCreateProject,
}: SidebarProps) {
  const pathname = usePathname()
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())
  const { isDragging } = useSidebarDrop()

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
            <span>Timovy Inbox</span>
          </Link>
        </div>

        <div className="my-2 h-px bg-[var(--border-primary)]" />

        {/* Things 3 Views - Droppable */}
        <div className="mb-2">
          <SidebarDropItem
            href="/today"
            isActive={isActive('/today')}
            dropTarget={{ type: 'when', value: 'today' }}
            icon={<Sun className="h-4 w-4 text-[var(--color-warning)]" />}
            label="Dnes"
          />
          <SidebarDropItem
            href="/upcoming"
            isActive={isActive('/upcoming')}
            dropTarget={{ type: 'when', value: 'scheduled' }}
            icon={<CalendarDays className="h-4 w-4 text-[var(--color-success)]" />}
            label="Nadchadzajuce"
          />
          <SidebarDropItem
            href="/anytime"
            isActive={isActive('/anytime')}
            dropTarget={{ type: 'when', value: 'anytime' }}
            icon={<Clock className="h-4 w-4 text-[var(--color-primary)]" />}
            label="Kedykolvek"
          />
          <SidebarDropItem
            href="/someday"
            isActive={isActive('/someday')}
            dropTarget={{ type: 'when', value: 'someday' }}
            icon={<Moon className="h-4 w-4 text-[var(--text-secondary)]" />}
            label="Niekedy"
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
          <Link
            href="/trash"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/trash')
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Trash2 className="h-4 w-4 text-[var(--text-secondary)]" />
            <span>Kos</span>
          </Link>
          <Link
            href="/calendar"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/calendar')
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>Kalendar</span>
          </Link>
        </div>

        <div className="my-2 h-px bg-[var(--border-primary)]" />

        {/* Areas Section */}
        <div className="mb-2 flex items-center justify-between px-3 py-1">
          <span className="text-xs font-medium uppercase text-[var(--text-secondary)]">
            Oblasti
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onCreateArea}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {areas.map((area) => (
          <div key={area.id}>
            <button
              onClick={() => toggleArea(area.id)}
              className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              {expandedAreas.has(area.id) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: area.color || 'var(--color-primary)' }}
              />
              <span className="flex-1 text-left">{area.name}</span>
              <span
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)]"
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateProject(area.id)
                }}
              >
                <Plus className="h-3 w-3" />
              </span>
            </button>

            {expandedAreas.has(area.id) && (
              <div className="ml-4 space-y-1">
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
                  <span>Pridat projekt</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Drag indicator */}
      {isDragging && (
        <div className="mx-2 mb-2 rounded-lg bg-[var(--color-primary)]/10 p-3 text-center text-xs text-[var(--color-primary)]">
          Potiahni ulohu na sekciu pre jej presun
        </div>
      )}

      {/* Theme Toggle */}
      <div className="border-t border-[var(--border-primary)] p-3">
        <ThemeToggle />
      </div>

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
