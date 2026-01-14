'use client'

import { Bell, Plug, BellRing } from 'lucide-react'
import { NotificationSettings } from '@/components/notifications/notification-settings'
import { NotificationSettingsForm } from '@/components/notifications'
import { IntegrationSettings } from '@/components/integrations/integration-settings'

export default function IntegrationsPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Push Notifications Section */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Push notifikácie</h2>
          </div>
          <NotificationSettings />
        </section>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Notification Preferences Section */}
        <section>
          <NotificationSettingsForm />
        </section>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Integrations Section */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Plug className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Integrácie</h2>
          </div>
          <IntegrationSettings />
        </section>
      </div>
    </div>
  )
}
