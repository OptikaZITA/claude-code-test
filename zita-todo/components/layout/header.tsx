'use client'

import { Search, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#E5E5E5] bg-white px-6">
      <h1 className="text-lg font-semibold text-[#1D1D1F]">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868B]" />
          <Input
            type="search"
            placeholder="Hľadať úlohy..."
            className="w-64 pl-9"
          />
        </div>

        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
