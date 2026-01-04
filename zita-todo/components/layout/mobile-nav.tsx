'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Inbox, Users, FolderKanban, Settings, Calendar, Star, Clock, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { TimerIndicatorCompact } from '@/components/time-tracking/timer-indicator'

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/inbox', label: 'Inbox', icon: Inbox },
    { href: '/today', label: 'Dnes', icon: Star },
    { href: '/inbox/team', label: 'Tím', icon: Users },
    { href: '/settings', label: 'Nastavenia', icon: Settings },
  ]

  const menuItems = [
    { href: '/inbox', label: 'Inbox', icon: Inbox },
    { href: '/inbox/team', label: 'Tímový Inbox', icon: Users },
    { href: '/today', label: 'Dnes', icon: Star },
    { href: '/upcoming', label: 'Nadchádzajúce', icon: Calendar },
    { href: '/anytime', label: 'Kedykoľvek', icon: Clock },
    { href: '/logbook', label: 'Logbook', icon: BookOpen },
    { href: '/calendar', label: 'Kalendár', icon: Calendar },
    { href: '/settings', label: 'Nastavenia', icon: Settings },
  ]

  return (
    <>
      {/* Mobile Header */}
      <header className="flex h-14 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 lg:hidden">
        <h1 className="text-xl font-bold text-[var(--color-primary)]">ZITA TODO</h1>
        <div className="flex items-center gap-2">
          <TimerIndicatorCompact />
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70"
            onClick={() => setIsOpen(false)}
          />
          <nav className="fixed left-0 top-0 h-full w-64 bg-[var(--bg-primary)] p-4 overflow-y-auto">
            <div className="mb-8">
              <h1 className="text-xl font-bold text-[var(--color-primary)]">ZITA TODO</h1>
            </div>
            <div className="space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-primary)] bg-[var(--bg-primary)] lg:hidden safe-area-pb">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1',
                isActive(item.href) ? 'text-[var(--color-primary)]' : 'text-[var(--text-secondary)]'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
