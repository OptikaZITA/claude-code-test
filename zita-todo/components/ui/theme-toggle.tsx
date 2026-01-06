'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/contexts/theme-context'
import { cn } from '@/lib/utils/cn'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  // Toggle between light and dark
  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-2 rounded-lg transition-colors',
        'hover:bg-accent/50',
        'text-foreground'
      )}
      title={resolvedTheme === 'dark' ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}
