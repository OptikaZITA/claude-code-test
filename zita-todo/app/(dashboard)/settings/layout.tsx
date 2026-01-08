'use client'

import { Header } from '@/components/layout/header'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full flex flex-col">
      <Header title="Nastavenia" />

      <div className="px-6 pt-4">
        <SettingsTabs />
      </div>

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
