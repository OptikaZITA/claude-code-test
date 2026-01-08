'use client'

import { Palette, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/contexts/theme-context'
import { cn } from '@/lib/utils/cn'

export default function AppearancePage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Appearance Section */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Vzhľad</h2>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Farebný režim</span>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                    theme === 'light'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Svetlý režim"
                >
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline">Svetlý</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                    theme === 'dark'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Tmavý režim"
                >
                  <Moon className="h-4 w-4" />
                  <span className="hidden sm:inline">Tmavý</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                    theme === 'system'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Systémové nastavenie"
                >
                  <Monitor className="h-4 w-4" />
                  <span className="hidden sm:inline">Systém</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
