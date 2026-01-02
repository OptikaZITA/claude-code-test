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
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

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
    <aside className="flex h-screen w-64 flex-col border-r border-[#E5E5E5] bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <h1 className="text-xl font-bold text-[#007AFF]">ZITA TODO</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Inbox Section */}
        <div className="mb-4">
          <Link
            href="/inbox"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/inbox')
                ? 'bg-[#007AFF]/10 text-[#007AFF]'
                : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
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
                ? 'bg-[#007AFF]/10 text-[#007AFF]'
                : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
            )}
          >
            <Users className="h-4 w-4" />
            <span>Tímový Inbox</span>
          </Link>
        </div>

        <div className="my-2 h-px bg-[#E5E5E5]" />

        {/* Areas Section */}
        <div className="mb-2 flex items-center justify-between px-3 py-1">
          <span className="text-xs font-medium uppercase text-[#86868B]">
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
              className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
            >
              {expandedAreas.has(area.id) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: area.color || '#007AFF' }}
              />
              <span className="flex-1 text-left">{area.name}</span>
              <span
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-[#E5E5E5]"
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
                        ? 'bg-[#007AFF]/10 text-[#007AFF]'
                        : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                    )}
                  >
                    <FolderKanban className="h-4 w-4" />
                    <span>{project.name}</span>
                  </Link>
                ))}
                <button
                  onClick={() => onCreateProject(area.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#86868B] hover:bg-[#F5F5F7] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Pridať projekt</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-[#E5E5E5] p-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar src={user?.avatar_url} name={user?.full_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-[#1D1D1F]">
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
