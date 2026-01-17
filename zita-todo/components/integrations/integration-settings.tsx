'use client'

import { useSearchParams } from 'next/navigation'
import { useIntegrations } from '@/lib/hooks/use-integrations'
import { SlackSettings } from './slack-settings'
import { EmailSettings } from './email-settings'
import { GoogleCalendarSettings } from './google-calendar-settings'

export function IntegrationSettings() {
  const searchParams = useSearchParams()
  const googleStatus = searchParams.get('google')
  const showGoogleSuccess = googleStatus === 'success'

  const {
    integrations,
    isLoading,
    updateSlackIntegration,
    updateEmailIntegration,
    testSlackWebhook,
    sendTestEmail,
  } = useIntegrations()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Google Calendar Integration */}
      <div>
        <GoogleCalendarSettings showSuccessMessage={showGoogleSuccess} />
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border-primary)]" />

      {/* Slack Integration */}
      <div>
        <SlackSettings
          integration={integrations.slack!}
          onUpdate={updateSlackIntegration}
          onTest={testSlackWebhook}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border-primary)]" />

      {/* Email Integration */}
      <div>
        <EmailSettings
          integration={integrations.email!}
          onUpdate={updateEmailIntegration}
          onTest={sendTestEmail}
        />
      </div>
    </div>
  )
}
