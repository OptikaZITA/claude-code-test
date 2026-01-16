'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  MessageSquare,
  Check,
  X,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSlackConnection, useSlackChannelConfigs } from '@/lib/hooks/use-slack-integration'
import { SlackChannelConfig } from '@/types'
import { cn } from '@/lib/utils/cn'
import { SlackChannelConfigModal } from './slack-channel-config-modal'

export function SlackIntegrationSettings() {
  const searchParams = useSearchParams()
  const { isConnected, workspace, isLoading, connect, disconnect } = useSlackConnection()
  const { configs, isLoading: configsLoading, deleteConfig, refetch } = useSlackChannelConfigs()

  const [showConfigModal, setShowConfigModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SlackChannelConfig | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Check URL params for OAuth result
  useEffect(() => {
    const slackStatus = searchParams.get('slack')
    const workspaceName = searchParams.get('workspace')
    const errorMessage = searchParams.get('message')

    if (slackStatus === 'connected') {
      setNotification({
        type: 'success',
        message: `Úspešne pripojené k workspace ${workspaceName}`,
      })
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname)
    } else if (slackStatus === 'error') {
      setNotification({
        type: 'error',
        message: getErrorMessage(errorMessage || 'unknown'),
      })
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Clear notification after 5 seconds
    if (slackStatus) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const handleConnect = async () => {
    await connect()
  }

  const handleDisconnect = async () => {
    if (confirm('Naozaj chcete odpojiť Slack? Všetky konfigurácie kanálov budú zachované.')) {
      await disconnect()
      setNotification({
        type: 'success',
        message: 'Slack bol odpojený',
      })
    }
  }

  const handleDeleteConfig = async (id: string) => {
    if (confirm('Naozaj chcete odstrániť túto konfiguráciu kanála?')) {
      await deleteConfig(id)
    }
  }

  const handleEditConfig = (config: SlackChannelConfig) => {
    setEditingConfig(config)
    setShowConfigModal(true)
  }

  const handleCloseModal = () => {
    setShowConfigModal(false)
    setEditingConfig(null)
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Notification */}
      {notification && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg p-4',
            notification.type === 'success'
              ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
              : 'bg-[var(--color-error)]/10 text-[var(--color-error)]'
          )}
        >
          {notification.type === 'success' ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm">{notification.message}</span>
        </div>
      )}

      {/* Connection Status */}
      <div className="rounded-lg border border-[var(--border-primary)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                isConnected ? 'bg-[#4A154B]/10' : 'bg-[var(--bg-secondary)]'
              )}
            >
              <MessageSquare
                className={cn(
                  'h-5 w-5',
                  isConnected ? 'text-[#4A154B]' : 'text-[var(--text-secondary)]'
                )}
              />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Slack</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {isConnected
                  ? `Pripojené k ${workspace?.slack_team_name}`
                  : 'Pripojte Slack workspace pre vytvaranie úloh zo správ'}
              </p>
            </div>
          </div>

          <Button
            variant={isConnected ? 'secondary' : 'primary'}
            size="sm"
            onClick={isConnected ? handleDisconnect : handleConnect}
          >
            {isConnected ? 'Odpojiť' : 'Pripojiť Slack'}
          </Button>
        </div>
      </div>

      {/* Channel Configurations */}
      {isConnected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Sledované kanály
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfigModal(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Pridať kanál
            </Button>
          </div>

          {configsLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
            </div>
          ) : configs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border-primary)] p-6 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-[var(--text-secondary)]" />
              <p className="text-sm text-[var(--text-secondary)]">
                Zatiaľ nemáte nakonfigurované žiadne kanály
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Pridajte kanál pre automatické vytváranie úloh zo Slack správ
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {configs.map((config) => (
                <ChannelConfigItem
                  key={config.id}
                  config={config}
                  onEdit={() => handleEditConfig(config)}
                  onDelete={() => handleDeleteConfig(config.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help Link */}
      {isConnected && (
        <div className="pt-2">
          <a
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
          >
            Spravovať Slack App
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <SlackChannelConfigModal
          isOpen={showConfigModal}
          onClose={handleCloseModal}
          config={editingConfig || undefined}
        />
      )}
    </div>
  )
}

interface ChannelConfigItemProps {
  config: SlackChannelConfig
  onEdit: () => void
  onDelete: () => void
}

function ChannelConfigItem({ config, onEdit, onDelete }: ChannelConfigItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text-primary)]">
            #{config.slack_channel_name}
          </span>
          {!config.is_active && (
            <span className="rounded bg-[var(--bg-secondary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
              Neaktívne
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-[var(--text-secondary)]">
          Deadline: +{config.default_deadline_days} dní • Priorita: {config.default_priority}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-[var(--color-error)]" />
        </Button>
      </div>
    </div>
  )
}

function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    missing_code: 'Chýba autorizačný kód',
    token_exchange_failed: 'Nepodarilo sa získať prístupový token',
    workspace_already_connected: 'Tento workspace je už pripojený k inej organizácii',
    no_organization: 'Nie ste členom žiadnej organizácie',
    save_failed: 'Nepodarilo sa uložiť pripojenie',
    internal_error: 'Nastala interná chyba',
    access_denied: 'Prístup bol zamietnutý',
  }
  return messages[code] || 'Nastala neznáma chyba'
}
