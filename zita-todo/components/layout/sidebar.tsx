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
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

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
    <aside className="flex h-screen w-64 flex-col border-r border-[var(--border-primary)] bg-[var(--bg-primary)]">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <h1 className="text-xl font-bold text-[var(--color-primary)]">ZITA TODO</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Inbox Section */}
        <div className="mb-2">
          <Link
            href="/inbox"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/inbox')
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Inbox className="h-4 w-4" />
            <span>Inbox</span>
          </Link>
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
            <span>Tímový Inbox</span>
          </Link>
        </div>

        <div className="my-2 h-px bg-[var(--border-primary)]" />

        {/* Things 3 Views */}
        <div className="mb-2">
          <Link
            href="/today"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/today')
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Sun className="h-4 w-4 text-[var(--color-warning)]" />
            <span>Dnes</span>
          </Link>
          <Link
            href="/upcoming"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/upcoming')
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <CalendarDays className="h-4 w-4 text-[var(--color-success)]" />
            <span>Nadchádzajúce</span>
          </Link>
          <Link
            href="/anytime"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/anytime')
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Clock className="h-4 w-4 text-[var(--color-primary)]" />
            <span>Kedykoľvek</span>
          </Link>
          <Link
            href="/someday"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/someday')
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Moon className="h-4 w-4 text-[var(--text-secondary)]" />
            <span>Niekedy</span>
          </Link>
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
            href="/calendar"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/calendar')
                ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>Kalendár</span>
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
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive(`/projects/${project.id}`)
                        ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    )}
                  >
                    <FolderKanban className="h-4 w-4" />
                    <span>{project.name}</span>
                  </Link>
                ))}
                <button
                  onClick={() => onCreateProject(area.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Pridať projekt</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </nav>

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
