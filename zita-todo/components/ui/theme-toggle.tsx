'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/contexts/theme-context'
import { cn } from '@/lib/utils/cn'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          'rounded-md p-1.5 transition-colors',
          theme === 'light'
            ? 'bg-white text-[#007AFF] shadow-sm dark:bg-gray-700'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        )}
        title="Svetlý režim"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          'rounded-md p-1.5 transition-colors',
          theme === 'dark'
            ? 'bg-white text-[#007AFF] shadow-sm dark:bg-gray-700'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        )}
        title="Tmavý režim"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn(
          'rounded-md p-1.5 transition-colors',
          theme === 'system'
            ? 'bg-white text-[#007AFF] shadow-sm dark:bg-gray-700'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        )}
        title="Systémové nastavenie"
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  )
}
