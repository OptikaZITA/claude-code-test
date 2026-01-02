'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Inbox, Users, FolderKanban, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: '/inbox', label: 'Inbox', icon: Inbox },
    { href: '/inbox/team', label: 'Tím', icon: Users },
    { href: '/areas', label: 'Oblasti', icon: FolderKanban },
    { href: '/settings', label: 'Nastavenia', icon: Settings },
  ]

  return (
    <>
      {/* Mobile Header */}
      <header className="flex h-14 items-center justify-between border-b border-[#E5E5E5] bg-white px-4 lg:hidden">
        <h1 className="text-xl font-bold text-[#007AFF]">ZITA TODO</h1>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <nav className="fixed left-0 top-0 h-full w-64 bg-white p-4">
            <div className="mb-8">
              <h1 className="text-xl font-bold text-[#007AFF]">ZITA TODO</h1>
            </div>
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-[#007AFF]/10 text-[#007AFF]'
                      : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E5E5] bg-white lg:hidden">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1',
                isActive(item.href) ? 'text-[#007AFF]' : 'text-[#86868B]'
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
