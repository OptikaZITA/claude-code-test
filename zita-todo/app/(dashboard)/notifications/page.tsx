'use client'

import { Bell } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { NotificationList } from '@/components/notifications'

export default function NotificationsPage() {
  return (
    <div className="h-full flex flex-col">
      <Header title="Notifikácie" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-heading font-semibold text-foreground">
              Notifikácie
            </h2>
          </div>

          <NotificationList />
        </div>
      </div>
    </div>
  )
}
