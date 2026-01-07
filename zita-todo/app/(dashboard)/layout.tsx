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
import { SidebarProvider, useSidebar } from '@/lib/contexts/sidebar-context'
import { ProjectFormModal } from '@/components/projects/project-form-modal'
import { CalendarDropPicker } from '@/components/layout/calendar-drop-picker'

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
  const { sidebarOpen, setSidebarOpen } = useSidebar()
  const router = useRouter()
  const supabase = createClient()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)
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

      // Fetch areas with projects
      const { data: areasData } = await supabase
        .from('areas')
        .select(`
          id,
          name,
          color,
          projects (
            id,
            name,
            color
          )
        `)
        .is('archived_at', null)
        .order('sort_order')

      if (areasData) {
        setAreas(areasData as Area[])
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
        projects (
          id,
          name,
          color
        )
      `)
      .is('archived_at', null)
      .order('sort_order')

    if (areasData) {
      setAreas(areasData as Area[])
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
        <div className="flex h-screen bg-background">
          {/* Sidebar Drawer - hidden by default, slides in on toggle */}
          {sidebarOpen && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
                onClick={() => setSidebarOpen(false)}
              />
              {/* Sidebar */}
              <div className="fixed left-0 top-0 h-full z-50 animate-slide-in-left shadow-lg">
                <Sidebar
                  user={user}
                  areas={areas}
                  onLogout={handleLogout}
                  onCreateProject={handleCreateProject}
                  onNavigate={() => setSidebarOpen(false)}
                />
              </div>
            </>
          )}

          {/* Mobile Navigation (bottom bar) */}
          <MobileNav />

          {/* Main Content - full width now */}
          <main className="flex-1 overflow-auto pt-0 pb-16 lg:pb-0">
            {children}
          </main>

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

          {/* Calendar Drop Picker Modal */}
          <CalendarDropPicker />
        </div>
      </SidebarDropProvider>
    </GlobalTimerProvider>
  )
}
