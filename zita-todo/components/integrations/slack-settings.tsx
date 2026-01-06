'use client'

import { useState } from 'react'
import { MessageSquare, Check, X, ExternalLink, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SlackIntegration } from '@/types'
import { cn } from '@/lib/utils/cn'

interface SlackSettingsProps {
  integration: SlackIntegration
  onUpdate: (updates: Partial<SlackIntegration>) => void
  onTest: (webhookUrl: string) => Promise<boolean>
}

export function SlackSettings({ integration, onUpdate, onTest }: SlackSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState(integration.webhookUrl)
  const [channel, setChannel] = useState(integration.channel || '')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  const handleToggle = () => {
    onUpdate({ enabled: !integration.enabled })
  }

  const handleSaveWebhook = () => {
    onUpdate({ webhookUrl, channel })
  }

  const handleTest = async () => {
    if (!webhookUrl) return

    setIsTesting(true)
    setTestResult(null)

    const success = await onTest(webhookUrl)
    setTestResult(success ? 'success' : 'error')
    setIsTesting(false)

    // Clear result after 3 seconds
    setTimeout(() => setTestResult(null), 3000)
  }

  const handleNotificationToggle = (key: keyof SlackIntegration['notifications']) => {
    onUpdate({
      notifications: {
        ...integration.notifications,
        [key]: !integration.notifications[key],
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border border-[var(--border-primary)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                integration.enabled
                  ? 'bg-[#4A154B]/10'
                  : 'bg-[var(--bg-secondary)]'
              )}
            >
              <MessageSquare
                className={cn(
                  'h-5 w-5',
                  integration.enabled ? 'text-[#4A154B]' : 'text-[var(--text-secondary)]'
                )}
              />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Slack</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {integration.enabled
                  ? 'Integracia je aktivna'
                  : 'Prijimajte notifikacie do Slack kanalu'}
              </p>
            </div>
          </div>

          <Button
            variant={integration.enabled ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleToggle}
          >
            {integration.enabled ? 'Vypnut' : 'Zapnut'}
          </Button>
        </div>
      </div>

      {/* Configuration */}
      {integration.enabled && (
        <>
          {/* Webhook URL */}
          <div className="rounded-lg border border-[var(--border-primary)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Webhook URL
              </label>
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
              >
                Ako vytvorit webhook
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="space-y-3">
              <Input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Nazov kanalu (volitelne)"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveWebhook}
                  disabled={!webhookUrl || webhookUrl === integration.webhookUrl}
                >
                  Uložiť
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTest}
                  disabled={!webhookUrl || isTesting}
                >
                  {isTesting ? 'Testujem...' : 'Testovať spojenie'}
                </Button>
                {testResult === 'success' && (
                  <span className="flex items-center gap-1 text-sm text-[var(--color-success)]">
                    <Check className="h-4 w-4" />
                    Úspešne
                  </span>
                )}
                {testResult === 'error' && (
                  <span className="flex items-center gap-1 text-sm text-[var(--color-error)]">
                    <X className="h-4 w-4" />
                    Zlyhalo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CORS Warning */}
          <div className="flex items-start gap-3 rounded-lg bg-[var(--color-warning)]/10 p-4">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--color-warning)]" />
            <div className="text-sm">
              <p className="font-medium text-[var(--text-primary)]">Poznámka k CORS</p>
              <p className="text-[var(--text-secondary)]">
                Priame volanie Slack webhookov z prehliadača môže byť blokované kvôli CORS.
                Pre plnú funkčnosť je potrebná serverová implementácia.
              </p>
            </div>
          </div>

          {/* Notification Types */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">Typy notifikácií</p>
            <NotificationOption
              title="Vytvorené úlohy"
              description="Keď sa vytvorí nová úloha"
              checked={integration.notifications.taskCreated}
              onChange={() => handleNotificationToggle('taskCreated')}
            />
            <NotificationOption
              title="Dokončené úlohy"
              description="Keď sa úloha označí ako dokončená"
              checked={integration.notifications.taskCompleted}
              onChange={() => handleNotificationToggle('taskCompleted')}
            />
            <NotificationOption
              title="Priradené úlohy"
              description="Keď sa niekomu priradí úloha"
              checked={integration.notifications.taskAssigned}
              onChange={() => handleNotificationToggle('taskAssigned')}
            />
            <NotificationOption
              title="Blížiaci sa termín"
              description="Pripomienka pred termínom splnenia"
              checked={integration.notifications.taskDueSoon}
              onChange={() => handleNotificationToggle('taskDueSoon')}
            />
            <NotificationOption
              title="Komentáre"
              description="Nové komentáre k úlohám"
              checked={integration.notifications.commentAdded}
              onChange={() => handleNotificationToggle('commentAdded')}
            />
          </div>
        </>
      )}
    </div>
  )
}

interface NotificationOptionProps {
  title: string
  description: string
  checked: boolean
  onChange: () => void
}

function NotificationOption({ title, description, checked, onChange }: NotificationOptionProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-primary)] p-3 transition-colors hover:bg-[var(--bg-hover)]">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)]">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-[var(--border-primary)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
      />
    </label>
  )
}
