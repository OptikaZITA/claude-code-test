'use client'

import { Header } from '@/components/layout/header'
import { NotificationSettings } from '@/components/notifications/notification-settings'
import { IntegrationSettings } from '@/components/integrations/integration-settings'
import { Bell, User, Building2, Palette, Plug } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <Header title="Nastavenia" />

      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-8 pb-8">
          {/* Notifications Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Push notifikacie</h2>
            </div>
            <NotificationSettings />
          </section>

          {/* Divider */}
          <div className="h-px bg-[var(--border-primary)]" />

          {/* Integrations Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Plug className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Integracie</h2>
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
                Nastavenia profilu budu dostupne v buducej verzii.
              </p>
            </div>
          </section>

          {/* Divider */}
          <div className="h-px bg-[var(--border-primary)]" />

          {/* Organization Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Organizacia</h2>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Nastavenia organizacie budu dostupne v buducej verzii.
              </p>
            </div>
          </section>

          {/* Divider */}
          <div className="h-px bg-[var(--border-primary)]" />

          {/* Appearance Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Vzhlad</h2>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] p-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Prepinanie medzi svetlym a tmavym rezimom najdete v bocnom paneli.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
