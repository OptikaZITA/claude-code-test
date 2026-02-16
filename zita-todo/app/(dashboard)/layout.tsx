'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { KeyboardShortcutsModal } from '@/components/ui/keyboard-shortcuts-modal'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'
import { SidebarDropProvider } from '@/lib/contexts/sidebar-drop-context'
import { GlobalTimerProvider } from '@/lib/contexts/global-timer-context'
import { SidebarProvider } from '@/lib/contexts/sidebar-context'
import { MultiSelectProvider } from '@/lib/contexts/multi-select-context'
import { ProjectFormModal } from '@/components/projects/project-form-modal'
import { AreaForm } from '@/components/areas/area-form'
import { CalendarDropPicker } from '@/components/layout/calendar-drop-picker'
import { BulkActionToolbar } from '@/components/tasks/bulk-action-toolbar'

interface User {
  full_name: string | null
  nickname: string | null
  email: string
  avatar_url: string | null
  role?: 'admin' | 'strategicka_rada' | 'hr' | 'member'
}

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const router = useRouter()
  const supabase = createClient()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [showAreaForm, setShowAreaForm] = useState(false)
  const [selectedAreaIdForProject, setSelectedAreaIdForProject] = useState<string | undefined>()

  const { shortcuts, showHelp, setShowHelp } = useKeyboardShortcuts({
    onNewTask: () => {
      // Dispatch custom event that inbox/project pages can listen to
      window.dispatchEvent(new CustomEvent('keyboard:newTask'))
    },
    onSearch: () => {
      // Focus search input if available
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    },
    onToggleHelp: () => setShowHelp(false),
  })

  useEffect(() => {
    const fetchData = async () => {
      // Fetch user
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('full_name, nickname, email, avatar_url, role')
        .eq('id', authUser.id)
        .single()

      if (userData) {
        setUser(userData)
      } else {
        // Fallback to auth user data
        setUser({
          full_name: authUser.user_metadata?.full_name || null,
          nickname: null,
          email: authUser.email || '',
          avatar_url: null,
          role: undefined
        })
      }

      // Fetch areas with projects (excluding soft-deleted projects)
      const { data: areasData } = await supabase
        .from('areas')
        .select(`
          id,
          name,
          color,
          projects!left (
            id,
            name,
            color,
            deleted_at
          )
        `)
        .is('archived_at', null)
        .order('sort_order')

      if (areasData) {
        // Filter out soft-deleted projects
        const filtered = areasData.map((area: any) => ({
          ...area,
          projects: (area.projects || []).filter((p: any) => !p.deleted_at)
        }))
        setAreas(filtered as Area[])
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase, router])

  const refetchAreas = async () => {
    const { data: areasData } = await supabase
      .from('areas')
      .select(`
        id,
        name,
        color,
        projects!left (
          id,
          name,
          color,
          deleted_at
        )
      `)
      .is('archived_at', null)
      .order('sort_order')

    if (areasData) {
      const filtered = areasData.map((area: any) => ({
        ...area,
        projects: (area.projects || []).filter((p: any) => !p.deleted_at)
      }))
      setAreas(filtered as Area[])
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleCreateProject = (areaId?: string) => {
    setSelectedAreaIdForProject(areaId)
    setShowProjectForm(true)
  }

  const handleCreateArea = async (data: { name: string; color: string }) => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', authUser.id)
      .single()

    const { error } = await supabase.from('areas').insert({
      name: data.name,
      color: data.color,
      user_id: authUser.id,
      organization_id: userData?.organization_id || null,
      is_global: true,
    })

    if (error) throw error
    refetchAreas()
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-secondary)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <GlobalTimerProvider>
      <SidebarDropProvider>
        <MultiSelectProvider>
          <div className="min-h-screen bg-background">
            {/* Sidebar - vždy viditeľný, fixed vľavo (skrytý na mobile) */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-[var(--border)] z-30 hidden lg:block">
              <Sidebar
                user={user}
                areas={areas}
                onLogout={handleLogout}
                onCreateProject={handleCreateProject}
                onCreateArea={() => setShowAreaForm(true)}
                onRefresh={refetchAreas}
              />
            </aside>

            {/* Mobile Navigation (bottom bar) */}
            <MobileNav />

            {/* Main Content - odsadený o šírku sidebaru na desktop */}
            <main className="min-h-screen lg:ml-64 pb-16 lg:pb-0">
              {children}
            </main>

            {/* Bulk Action Toolbar - shows when tasks are selected */}
            <BulkActionToolbar />

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal
              isOpen={showHelp}
              onClose={() => setShowHelp(false)}
              shortcuts={shortcuts}
            />

            {/* Project Form Modal */}
            <ProjectFormModal
              isOpen={showProjectForm}
              onClose={() => {
                setShowProjectForm(false)
                setSelectedAreaIdForProject(undefined)
              }}
              onSuccess={refetchAreas}
              preselectedAreaId={selectedAreaIdForProject}
            />

            {/* Area Form Modal */}
            <AreaForm
              isOpen={showAreaForm}
              onClose={() => setShowAreaForm(false)}
              onSubmit={handleCreateArea}
            />

            {/* Calendar Drop Picker Modal */}
            <CalendarDropPicker />
          </div>
        </MultiSelectProvider>
      </SidebarDropProvider>
    </GlobalTimerProvider>
  )
}
