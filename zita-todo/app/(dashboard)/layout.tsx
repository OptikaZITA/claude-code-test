'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

interface User {
  full_name: string | null
  email: string
  avatar_url: string | null
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
  const [user, setUser] = useState<User | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      // Fetch user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email, avatar_url')
          .eq('id', authUser.id)
          .single()

        if (userData) {
          setUser(userData)
        } else {
          // Fallback to auth user data
          setUser({
            full_name: authUser.user_metadata?.full_name || null,
            email: authUser.email || '',
            avatar_url: null
          })
        }
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
    }

    fetchData()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleCreateArea = () => {
    // TODO: Open create area modal
    console.log('Create area')
  }

  const handleCreateProject = (areaId?: string) => {
    // TODO: Open create project modal
    console.log('Create project in area:', areaId)
  }

  return (
    <div className="flex h-screen bg-[#F5F5F7]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          user={user}
          areas={areas}
          onLogout={handleLogout}
          onCreateArea={handleCreateArea}
          onCreateProject={handleCreateProject}
        />
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0 pb-16 lg:pb-0">
        {children}
      </main>
    </div>
  )
}
