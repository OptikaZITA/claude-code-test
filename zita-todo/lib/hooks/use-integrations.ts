'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserIntegrations, SlackIntegration, EmailIntegration } from '@/types'

const STORAGE_KEY = 'zita-todo-integrations'

const DEFAULT_SLACK_INTEGRATION: SlackIntegration = {
  type: 'slack',
  enabled: false,
  webhookUrl: '',
  channel: '',
  notifications: {
    taskCreated: true,
    taskCompleted: true,
    taskAssigned: true,
    taskDueSoon: true,
    commentAdded: false,
  },
}

const DEFAULT_EMAIL_INTEGRATION: EmailIntegration = {
  type: 'email',
  enabled: false,
  email: '',
  notifications: {
    dailyDigest: true,
    taskAssigned: true,
    taskDueSoon: true,
    weeklyReport: false,
    commentMentions: true,
  },
  digestTime: '09:00',
}

interface UseIntegrationsReturn {
  integrations: UserIntegrations
  isLoading: boolean
  updateSlackIntegration: (updates: Partial<SlackIntegration>) => void
  updateEmailIntegration: (updates: Partial<EmailIntegration>) => void
  testSlackWebhook: (webhookUrl: string) => Promise<boolean>
  sendTestEmail: (email: string) => Promise<boolean>
  resetIntegrations: () => void
}

export function useIntegrations(): UseIntegrationsReturn {
  const [integrations, setIntegrations] = useState<UserIntegrations>({
    slack: DEFAULT_SLACK_INTEGRATION,
    email: DEFAULT_EMAIL_INTEGRATION,
  })
  const [isLoading, setIsLoading] = useState(true)

  // Load integrations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as UserIntegrations
        setIntegrations({
          slack: { ...DEFAULT_SLACK_INTEGRATION, ...parsed.slack },
          email: { ...DEFAULT_EMAIL_INTEGRATION, ...parsed.email },
        })
      }
    } catch (error) {
      console.error('Error loading integrations:', error)
    }
    setIsLoading(false)
  }, [])

  // Save integrations to localStorage
  const saveIntegrations = useCallback((newIntegrations: UserIntegrations) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newIntegrations))
    } catch (error) {
      console.error('Error saving integrations:', error)
    }
  }, [])

  const updateSlackIntegration = useCallback((updates: Partial<SlackIntegration>) => {
    setIntegrations((prev) => {
      const newSlack = {
        ...DEFAULT_SLACK_INTEGRATION,
        ...prev.slack,
        ...updates,
        notifications: {
          ...DEFAULT_SLACK_INTEGRATION.notifications,
          ...prev.slack?.notifications,
          ...(updates.notifications || {}),
        },
      }
      const newIntegrations = { ...prev, slack: newSlack }
      saveIntegrations(newIntegrations)
      return newIntegrations
    })
  }, [saveIntegrations])

  const updateEmailIntegration = useCallback((updates: Partial<EmailIntegration>) => {
    setIntegrations((prev) => {
      const newEmail = {
        ...DEFAULT_EMAIL_INTEGRATION,
        ...prev.email,
        ...updates,
        notifications: {
          ...DEFAULT_EMAIL_INTEGRATION.notifications,
          ...prev.email?.notifications,
          ...(updates.notifications || {}),
        },
      }
      const newIntegrations = { ...prev, email: newEmail }
      saveIntegrations(newIntegrations)
      return newIntegrations
    })
  }, [saveIntegrations])

  const testSlackWebhook = useCallback(async (webhookUrl: string): Promise<boolean> => {
    if (!webhookUrl) return false

    try {
      // Send a test message to Slack webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'ZITA TODO - Test spojenia',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*ZITA TODO*\nToto je testovacia sprava. Vasa Slack integracia funguje spravne!',
              },
            },
          ],
        }),
      })

      return response.ok
    } catch (error) {
      console.error('Error testing Slack webhook:', error)
      return false
    }
  }, [])

  const sendTestEmail = useCallback(async (email: string): Promise<boolean> => {
    if (!email) return false

    // In a real implementation, this would call a server endpoint
    // For now, we'll simulate a successful test
    console.log(`Test email would be sent to: ${email}`)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return true
  }, [])

  const resetIntegrations = useCallback(() => {
    const defaultIntegrations = {
      slack: DEFAULT_SLACK_INTEGRATION,
      email: DEFAULT_EMAIL_INTEGRATION,
    }
    setIntegrations(defaultIntegrations)
    saveIntegrations(defaultIntegrations)
  }, [saveIntegrations])

  return {
    integrations,
    isLoading,
    updateSlackIntegration,
    updateEmailIntegration,
    testSlackWebhook,
    sendTestEmail,
    resetIntegrations,
  }
}

// Helper function to send Slack notification
export async function sendSlackNotification(
  webhookUrl: string,
  message: {
    title: string
    text: string
    color?: string
    fields?: { title: string; value: string; short?: boolean }[]
  }
): Promise<boolean> {
  if (!webhookUrl) return false

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attachments: [
          {
            color: message.color || '#007AFF',
            title: message.title,
            text: message.text,
            fields: message.fields?.map((f) => ({
              title: f.title,
              value: f.value,
              short: f.short ?? true,
            })),
            footer: 'ZITA TODO',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Error sending Slack notification:', error)
    return false
  }
}
