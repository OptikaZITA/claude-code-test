'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Inbox,
  FolderKanban,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  LogOut,
  Star,
  CalendarDays,
  BookOpen,
  Trash2,
  Eye,
  Timer,
  Bell,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { SidebarDropItem, SidebarDropProject, SidebarDropArea } from '@/components/layout/sidebar-drop-item'
import { DeleteProjectModal } from '@/components/projects/delete-project-modal'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { useTaskCounts } from '@/lib/hooks/use-task-counts'
import { useUserDepartments } from '@/lib/hooks/use-user-departments'
import { useNewTasks } from '@/lib/hooks/use-new-tasks'
import { UserRole, canSeeAllDepartments } from '@/types'

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
  onCreateArea?: () => void
  onNavigate?: () => void
  onRefresh?: () => void
}

export function Sidebar({
  user,
  areas,
  onLogout,
  onCreateProject,
  onCreateArea,
  onNavigate,
  onRefresh,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())
  const [showOtherDepartments, setShowOtherDepartments] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null)
  const {
    isDragging,
    showCalendarPicker,
    pendingCalendarTask,
    handleCalendarDateSelect,
    handleCalendarCancel,
  } = useSidebarDrop()
  const { counts } = useTaskCounts()
  const calendarRef = useRef<HTMLDivElement>(null)

  // No longer using document listener - using overlay instead
  const { myDepartments, otherDepartments, canSeeAll } = useUserDepartments()
  // NOVÉ: Používame useNewTasks pre správne počítanie NOVÝCH úloh (nie všetkých)
  const { getProjectNewCount, getAreaNewCount } = useNewTasks()

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

  // Filter areas based on department membership
  const myDeptIds = new Set(myDepartments.map(d => d.id))
  const otherDeptIds = new Set(otherDepartments.map(d => d.id))

  // Areas that belong to my departments
  const myAreas = areas.filter(area => myDeptIds.has(area.id))
  // Areas that belong to other departments (only shown if expanded)
  const otherAreas = areas.filter(area => otherDeptIds.has(area.id))

  return (
    <aside className={cn(
      'flex h-screen w-64 flex-col border-r bg-background transition-all',
      'border-[var(--border)]',
      isDragging && 'bg-muted'
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <h1 className="font-heading text-xl font-semibold text-primary">
          ZITA TODO
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Main Views */}
        <div className="mb-2">
          <SidebarDropItem
            href="/inbox"
            isActive={isActive('/inbox')}
            dropTarget={{ type: 'inbox' }}
            icon={<Inbox className="h-[18px] w-[18px]" />}
            label="Inbox"
            count={counts.inbox}
            onClick={onNavigate}
          />
          <SidebarDropItem
            href="/today"
            isActive={isActive('/today')}
            dropTarget={{ type: 'today' }}
            icon={<Star className="h-[18px] w-[18px] text-secondary fill-secondary" />}
            label="Dnes"
            count={counts.today}
            isDeadline={counts.today > 0}
            onClick={onNavigate}
          />
          <SidebarDropItem
            href="/upcoming"
            isActive={isActive('/upcoming')}
            dropTarget={{ type: 'upcoming' }}
            icon={<CalendarDays className="h-[18px] w-[18px] text-success" />}
            label="Nadchádzajúce"
            count={counts.upcoming}
            onClick={onNavigate}
          />
          <Link
            href="/logbook"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/logbook')
                ? 'bg-accent text-foreground font-medium'
                : 'text-foreground hover:bg-accent/50'
            )}
          >
            <BookOpen className="h-[18px] w-[18px] text-success" />
            <span>Logbook</span>
          </Link>
          <SidebarDropItem
            href="/trash"
            isActive={isActive('/trash')}
            dropTarget={{ type: 'trash' }}
            icon={<Trash2 className="h-[18px] w-[18px] text-muted-foreground" />}
            label="Kôš"
            onClick={onNavigate}
          />
          <Link
            href="/notifications"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/notifications')
                ? 'bg-accent text-foreground font-medium'
                : 'text-foreground hover:bg-accent/50'
            )}
          >
            <Bell className="h-[18px] w-[18px] text-primary" />
            <span>Notifikácie</span>
          </Link>
        </div>

        <div className="my-3 h-px bg-[var(--border)]" />

        {/* Time Tracking Dashboard */}
        <div className="mb-2">
          <Link
            href="/time"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive('/time')
                ? 'bg-accent text-foreground font-medium'
                : 'text-foreground hover:bg-accent/50'
            )}
          >
            <Timer className="h-[18px] w-[18px] text-primary" />
            <span>Časovač</span>
          </Link>
        </div>

        <div className="my-3 h-px bg-[var(--border)]" />

        {/* My Departments Section */}
        <div className="mb-2 px-3 py-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {canSeeAll ? 'Oddelenia' : 'Moje oddelenia'}
          </span>
          {onCreateArea && user?.role === 'admin' && (
            <button
              onClick={onCreateArea}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              title="Pridať oddelenie"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
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
            onNavigate={onNavigate}
            todayTasksCount={getAreaNewCount(area.id)}
          >
            {area.projects.map((project) => (
              <SidebarDropProject
                key={project.id}
                href={`/projects/${project.id}`}
                isActive={isActive(`/projects/${project.id}`)}
                projectId={project.id}
                icon={<FolderKanban className="h-4 w-4" />}
                label={project.name}
                onClick={onNavigate}
                onDelete={() => setProjectToDelete({ id: project.id, name: project.name })}
                todayTasksCount={getProjectNewCount(project.id)}
              />
            ))}
            <button
              onClick={() => onCreateProject(area.id)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
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
              className="flex w-full items-center gap-2 px-3 py-2 mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/50 transition-colors rounded-lg"
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
                onNavigate={onNavigate}
                todayTasksCount={getAreaNewCount(area.id)}
              >
                {area.projects.map((project) => (
                  <SidebarDropProject
                    key={project.id}
                    href={`/projects/${project.id}`}
                    isActive={isActive(`/projects/${project.id}`)}
                    projectId={project.id}
                    icon={<FolderKanban className="h-4 w-4" />}
                    label={project.name}
                    onClick={onNavigate}
                    onDelete={() => setProjectToDelete({ id: project.id, name: project.name })}
                    todayTasksCount={getProjectNewCount(project.id)}
                  />
                ))}
              </SidebarDropArea>
            ))}
          </>
        )}
      </nav>

      {/* Drag indicator */}
      {isDragging && (
        <div className="mx-3 mb-3 rounded-lg bg-primary/10 p-3 text-center text-xs text-primary font-medium">
          Potiahni úlohu na sekciu pre jej presun
        </div>
      )}

      {/* User Section */}
      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar src={user?.avatar_url} name={displayName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            {user?.role && user.role !== 'member' && (
              <p className="truncate text-xs text-muted-foreground">
                {user.role === 'admin' ? 'Admin' : user.role === 'strategicka_rada' ? 'Strategická rada' : 'HR'}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Link href="/settings" onClick={onNavigate}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/50" title="Nastavenia">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent/50"
              onClick={onLogout}
              title="Odhlásiť sa"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar picker popover for "Nadchádzajúce" drop */}
      {showCalendarPicker && pendingCalendarTask && (
        <>
          {/* Overlay - click to close */}
          <div
            className="fixed inset-0 z-[99]"
            onClick={handleCalendarCancel}
          />
          {/* Calendar picker */}
          <div
            ref={calendarRef}
            className="fixed left-64 top-1/4 z-[100] rounded-lg border border-[var(--border)] bg-background shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Vyber dátum</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {pendingCalendarTask.title}
                </p>
              </div>
              <button
                onClick={handleCalendarCancel}
                className="p-1 rounded-md hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Calendar
              mode="single"
              selected={undefined}
              onSelect={(date: Date | undefined) => {
                if (date) {
                  handleCalendarDateSelect(date)
                }
              }}
              disabled={(date: Date) => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return date < today
              }}
              defaultMonth={new Date()}
            />
          </div>
        </>
      )}

      {/* Delete Project Modal */}
      {projectToDelete && (
        <DeleteProjectModal
          isOpen={true}
          onClose={() => setProjectToDelete(null)}
          onSuccess={() => {
            // If we're on the deleted project's page, redirect to inbox
            if (pathname === `/projects/${projectToDelete.id}`) {
              router.push('/inbox')
            }
            // Refresh sidebar data
            onRefresh?.()
          }}
          project={projectToDelete}
        />
      )}
    </aside>
  )
}
