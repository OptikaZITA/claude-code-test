'use client'

import { Bell, BellOff, BellRing, Check, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/lib/hooks/use-push-notifications'
import { cn } from '@/lib/utils/cn'

export function NotificationSettings() {
  const {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications()

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-[var(--border-primary)] p-4">
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <BellOff className="h-5 w-5" />
          <div>
            <p className="font-medium text-[var(--text-primary)]">Push notifikácie nie sú podporované</p>
            <p className="text-sm">Váš prehliadač nepodporuje push notifikácie.</p>
          </div>
        </div>
      </div>
    )
  }

  const handleEnable = async () => {
    if (permission === 'default') {
      const granted = await requestPermission()
      if (granted) {
        await subscribe()
      }
    } else if (permission === 'granted' && !isSubscribed) {
      await subscribe()
    }
  }

  const handleDisable = async () => {
    await unsubscribe()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border-primary)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {permission === 'granted' && isSubscribed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-success)]/10">
                <BellRing className="h-5 w-5 text-[var(--color-success)]" />
              </div>
            ) : permission === 'denied' ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-error)]/10">
                <BellOff className="h-5 w-5 text-[var(--color-error)]" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
                <Bell className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
            )}
            <div>
              <p className="font-medium text-[var(--text-primary)]">Push notifikácie</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {permission === 'granted' && isSubscribed
                  ? 'Notifikácie sú zapnuté'
                  : permission === 'denied'
                  ? 'Notifikácie sú zablokované v prehliadači'
                  : 'Dostávajte upozornenia o úlohách'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {permission === 'granted' && isSubscribed ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={sendTestNotification}
                  disabled={isLoading}
                >
                  Test
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDisable}
                  disabled={isLoading}
                >
                  Vypnúť
                </Button>
              </>
            ) : permission === 'denied' ? (
              <span className="text-sm text-[var(--color-error)]">Zablokované</span>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleEnable}
                disabled={isLoading}
              >
                {isLoading ? 'Načítavam...' : 'Povoliť'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {permission === 'denied' && (
        <div className="flex items-start gap-3 rounded-lg bg-[var(--color-warning)]/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--color-warning)]" />
          <div className="text-sm">
            <p className="font-medium text-[var(--text-primary)]">Notifikácie sú zablokované</p>
            <p className="text-[var(--text-secondary)]">
              Pre povolenie notifikácií kliknite na ikonu zámku v adresnom riadku prehliadača
              a povoľte notifikácie pre túto stránku.
            </p>
          </div>
        </div>
      )}

      {permission === 'granted' && isSubscribed && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">Typy notifikácií</p>
          <NotificationOption
            title="Pripomienky úloh"
            description="Upozornenia pred termínom splnenia"
            defaultChecked
          />
          <NotificationOption
            title="Priradené úlohy"
            description="Keď vám niekto priradí úlohu"
            defaultChecked
          />
          <NotificationOption
            title="Komentáre"
            description="Nové komentáre k vašim úlohám"
            defaultChecked
          />
          <NotificationOption
            title="Tímové aktualizácie"
            description="Zmeny v tímových projektoch"
          />
        </div>
      )}
    </div>
  )
}

interface NotificationOptionProps {
  title: string
  description: string
  defaultChecked?: boolean
}

function NotificationOption({ title, description, defaultChecked = false }: NotificationOptionProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-primary)] p-3 transition-colors hover:bg-[var(--bg-hover)]">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-secondary)]">{description}</p>
      </div>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-[var(--border-primary)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
      />
    </label>
  )
}
