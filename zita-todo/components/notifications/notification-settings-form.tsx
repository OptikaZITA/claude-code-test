'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface NotificationSettings {
  notify_assigned: boolean
  notify_unassigned: boolean
  notify_task_completed: boolean
  notify_status_changed: boolean
  notify_due_date_changed: boolean
}

const defaultSettings: NotificationSettings = {
  notify_assigned: true,
  notify_unassigned: true,
  notify_task_completed: true,
  notify_status_changed: true,
  notify_due_date_changed: true
}

const settingLabels: Record<keyof NotificationSettings, string> = {
  notify_assigned: 'Niekto mi priradí úlohu',
  notify_unassigned: 'Niekto mi odoberie úlohu',
  notify_task_completed: 'Niekto dokončí úlohu, ktorú som vytvoril/priradil',
  notify_status_changed: 'Niekto zmení status úlohy, ktorú som priradil',
  notify_due_date_changed: 'Niekto zmení deadline úlohy, ktorú som priradil'
}

export function NotificationSettingsForm() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/notification-settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({
          notify_assigned: data.notify_assigned ?? true,
          notify_unassigned: data.notify_unassigned ?? true,
          notify_task_completed: data.notify_task_completed ?? true,
          notify_status_changed: data.notify_status_changed ?? true,
          notify_due_date_changed: data.notify_due_date_changed ?? true
        })
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key: keyof NotificationSettings) => {
    const newValue = !settings[key]
    const newSettings = { ...settings, [key]: newValue }
    setSettings(newSettings)
    setSaving(true)

    try {
      const res = await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue })
      })
      if (!res.ok) {
        // Revert on error
        setSettings(settings)
      }
    } catch (error) {
      console.error('Error saving notification settings:', error)
      // Revert on error
      setSettings(settings)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium">Notifikácie</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Chcem dostávať notifikácie keď:
      </p>

      <div className="space-y-2">
        {(Object.keys(settingLabels) as Array<keyof NotificationSettings>).map((key) => (
          <label
            key={key}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border border-border',
              'hover:bg-muted/50 cursor-pointer transition-colors',
              saving && 'opacity-50 pointer-events-none'
            )}
          >
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={() => handleToggle(key)}
              className={cn(
                'h-5 w-5 rounded border-border',
                'text-primary focus:ring-primary focus:ring-offset-0'
              )}
            />
            <span className="text-sm text-foreground">
              {settingLabels[key]}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
