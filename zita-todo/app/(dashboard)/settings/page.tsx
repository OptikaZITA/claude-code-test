'use client'

import { Header } from '@/components/layout/header'
import { NotificationSettings } from '@/components/notifications/notification-settings'
import { IntegrationSettings } from '@/components/integrations/integration-settings'
import { Bell, User, Building2, Palette, Plug, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/contexts/theme-context'
import { cn } from '@/lib/utils/cn'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="h-full overflow-y-auto">
      <Header title="Nastavenia" />

      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-8 pb-8">
          {/* Notifications Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Push notifikácie</h2>
            </div>
            <NotificationSettings />
          </section>

          {/* Divider */}
          <div className="h-px bg-[var(--border-primary)]" />

          {/* Integrations Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Plug className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Integrácie</h2>
            </div>
            <IntegrationSettings />
          </section>

          {/* Divider */}
          <div className="h-px bg-[var(--border-primary)]" />

          {/* Profile Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Profil</h2>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Nastavenia profilu budú dostupné v budúcej verzii.
              </p>
            </div>
          </section>

          {/* Divider */}
          <div className="h-px bg-[var(--border-primary)]" />

          {/* Organization Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Organizácia</h2>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Nastavenia organizácie budú dostupné v budúcej verzii.
              </p>
            </div>
          </section>

          {/* Divider */}
          <div className="h-px bg-[var(--border-primary)]" />

          {/* Appearance Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Vzhľad</h2>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">Farebný režim</span>
                <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                      theme === 'light'
                        ? 'bg-white text-[var(--color-primary)] shadow-sm dark:bg-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
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
                        ? 'bg-white text-[var(--color-primary)] shadow-sm dark:bg-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
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
                        ? 'bg-white text-[var(--color-primary)] shadow-sm dark:bg-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
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
    </div>
  )
}
