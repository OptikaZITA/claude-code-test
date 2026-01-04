'use client'

import { useState } from 'react'
import { Mail, Check, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmailIntegration } from '@/types'
import { cn } from '@/lib/utils/cn'

interface EmailSettingsProps {
  integration: EmailIntegration
  onUpdate: (updates: Partial<EmailIntegration>) => void
  onTest: (email: string) => Promise<boolean>
}

export function EmailSettings({ integration, onUpdate, onTest }: EmailSettingsProps) {
  const [email, setEmail] = useState(integration.email)
  const [digestTime, setDigestTime] = useState(integration.digestTime || '09:00')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  const handleToggle = () => {
    onUpdate({ enabled: !integration.enabled })
  }

  const handleSaveEmail = () => {
    onUpdate({ email, digestTime })
  }

  const handleTest = async () => {
    if (!email) return

    setIsTesting(true)
    setTestResult(null)

    const success = await onTest(email)
    setTestResult(success ? 'success' : 'error')
    setIsTesting(false)

    // Clear result after 3 seconds
    setTimeout(() => setTestResult(null), 3000)
  }

  const handleNotificationToggle = (key: keyof EmailIntegration['notifications']) => {
    onUpdate({
      notifications: {
        ...integration.notifications,
        [key]: !integration.notifications[key],
      },
    })
  }

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

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
                  ? 'bg-[var(--color-primary)]/10'
                  : 'bg-[var(--bg-secondary)]'
              )}
            >
              <Mail
                className={cn(
                  'h-5 w-5',
                  integration.enabled ? 'text-[var(--color-primary)]' : 'text-[var(--text-secondary)]'
                )}
              />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Email</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {integration.enabled
                  ? 'Integracia je aktivna'
                  : 'Prijimajte notifikacie na email'}
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
          {/* Email Address */}
          <div className="rounded-lg border border-[var(--border-primary)] p-4">
            <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
              Emailova adresa
            </label>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="vas@email.sk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveEmail}
                  disabled={!email || !isValidEmail(email) || email === integration.email}
                >
                  Ulozit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTest}
                  disabled={!email || !isValidEmail(email) || isTesting}
                >
                  {isTesting ? 'Posielam...' : 'Poslat testovaci email'}
                </Button>
                {testResult === 'success' && (
                  <span className="flex items-center gap-1 text-sm text-[var(--color-success)]">
                    <Check className="h-4 w-4" />
                    Odoslane
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

          {/* Digest Time */}
          {integration.notifications.dailyDigest && (
            <div className="rounded-lg border border-[var(--border-primary)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Cas denneho prehľadu
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={digestTime}
                  onChange={(e) => setDigestTime(e.target.value)}
                  className="w-32"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onUpdate({ digestTime })}
                  disabled={digestTime === integration.digestTime}
                >
                  Ulozit
                </Button>
                <span className="text-sm text-[var(--text-secondary)]">
                  Denne o {digestTime}
                </span>
              </div>
            </div>
          )}

          {/* Notification Types */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">Typy notifikacii</p>
            <NotificationOption
              title="Denny prehlad"
              description="Sumar uloh na dany den kazde rano"
              checked={integration.notifications.dailyDigest}
              onChange={() => handleNotificationToggle('dailyDigest')}
            />
            <NotificationOption
              title="Priradene ulohy"
              description="Ked vam niekto priradi ulohu"
              checked={integration.notifications.taskAssigned}
              onChange={() => handleNotificationToggle('taskAssigned')}
            />
            <NotificationOption
              title="Bliziaci sa termin"
              description="Pripomienka den pred terminom"
              checked={integration.notifications.taskDueSoon}
              onChange={() => handleNotificationToggle('taskDueSoon')}
            />
            <NotificationOption
              title="Tyzdenny report"
              description="Sumar aktivit za tyzden"
              checked={integration.notifications.weeklyReport}
              onChange={() => handleNotificationToggle('weeklyReport')}
            />
            <NotificationOption
              title="Zmienky v komentaroch"
              description="Ked vas niekto oznaci v komentari"
              checked={integration.notifications.commentMentions}
              onChange={() => handleNotificationToggle('commentMentions')}
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
