'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { User, Palette, Link as LinkIcon, Users } from 'lucide-react'
import { useCurrentUser } from '@/lib/hooks/use-user-departments'
import { canManageUsers } from '@/types'

const baseTabs = [
  { id: 'profile', label: 'Profil', icon: User, href: '/settings/profile' },
  { id: 'appearance', label: 'Vzhľad', icon: Palette, href: '/settings/appearance' },
  { id: 'integrations', label: 'Integrácie', icon: LinkIcon, href: '/settings/integrations' },
]

export function SettingsTabs() {
  const pathname = usePathname()
  const { user, loading } = useCurrentUser()

  const tabs = [...baseTabs]

  // Add users tab for admin
  if (user?.role && canManageUsers(user.role)) {
    tabs.push({
      id: 'users',
      label: 'Používatelia',
      icon: Users,
      href: '/settings/users',
    })
  }

  if (loading) {
    return (
      <div className="flex gap-1 border-b border-border">
        {baseTabs.map((tab) => (
          <div
            key={tab.id}
            className="px-4 py-3 text-sm text-muted-foreground"
          >
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-1 border-b border-border overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = pathname === tab.href ||
          (tab.href === '/settings/profile' && pathname === '/settings')

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
