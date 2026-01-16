'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SlackWorkspaceConnection, SlackChannelConfig } from '@/types'

// =====================================================
// useSlackConnection - Workspace connection state
// =====================================================

interface UseSlackConnectionResult {
  isConnected: boolean
  workspace: SlackWorkspaceConnection | null
  isLoading: boolean
  error: Error | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  refetch: () => Promise<void>
}

export function useSlackConnection(): UseSlackConnectionResult {
  const [workspace, setWorkspace] = useState<SlackWorkspaceConnection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchConnection = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setWorkspace(null)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!userData?.organization_id) {
        setWorkspace(null)
        return
      }

      // Get workspace connection
      const { data: connection, error: fetchError } = await supabase
        .from('slack_workspace_connections')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .eq('is_active', true)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      setWorkspace(connection)
    } catch (err) {
      console.error('Error fetching Slack connection:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch connection'))
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchConnection()
  }, [fetchConnection])

  const connect = useCallback(async () => {
    try {
      setError(null)

      // Get OAuth URL from API
      const response = await fetch('/api/slack/oauth', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth')
      }

      const { url } = await response.json()

      // Redirect to Slack OAuth
      window.location.href = url
    } catch (err) {
      console.error('Error connecting Slack:', err)
      setError(err instanceof Error ? err : new Error('Failed to connect'))
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      setError(null)

      const response = await fetch('/api/slack/oauth', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setWorkspace(null)
    } catch (err) {
      console.error('Error disconnecting Slack:', err)
      setError(err instanceof Error ? err : new Error('Failed to disconnect'))
    }
  }, [])

  return {
    isConnected: !!workspace,
    workspace,
    isLoading,
    error,
    connect,
    disconnect,
    refetch: fetchConnection,
  }
}

// =====================================================
// useSlackChannelConfigs - Channel configurations CRUD
// =====================================================

interface UseSlackChannelConfigsResult {
  configs: SlackChannelConfig[]
  isLoading: boolean
  error: Error | null
  createConfig: (config: Partial<SlackChannelConfig>) => Promise<SlackChannelConfig>
  updateConfig: (id: string, config: Partial<SlackChannelConfig>) => Promise<void>
  deleteConfig: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useSlackChannelConfigs(): UseSlackChannelConfigsResult {
  const [configs, setConfigs] = useState<SlackChannelConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchConfigs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setConfigs([])
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!userData?.organization_id) {
        setConfigs([])
        return
      }

      const { data, error: fetchError } = await supabase
        .from('slack_channel_configs')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .order('slack_channel_name', { ascending: true })

      if (fetchError) throw fetchError

      setConfigs(data || [])
    } catch (err) {
      console.error('Error fetching Slack configs:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch configs'))
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const createConfig = useCallback(async (config: Partial<SlackChannelConfig>): Promise<SlackChannelConfig> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) throw new Error('No organization')

    const { data, error } = await supabase
      .from('slack_channel_configs')
      .insert({
        ...config,
        organization_id: userData.organization_id,
      })
      .select()
      .single()

    if (error) throw error

    await fetchConfigs()
    return data
  }, [supabase, fetchConfigs])

  const updateConfig = useCallback(async (id: string, config: Partial<SlackChannelConfig>) => {
    const { error } = await supabase
      .from('slack_channel_configs')
      .update({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await fetchConfigs()
  }, [supabase, fetchConfigs])

  const deleteConfig = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('slack_channel_configs')
      .delete()
      .eq('id', id)

    if (error) throw error

    await fetchConfigs()
  }, [supabase, fetchConfigs])

  return {
    configs,
    isLoading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    refetch: fetchConfigs,
  }
}

// =====================================================
// useSlackChannels - List available Slack channels
// =====================================================

interface SlackChannel {
  id: string
  name: string
}

interface UseSlackChannelsResult {
  channels: SlackChannel[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useSlackChannels(): UseSlackChannelsResult {
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchChannels = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/slack/channels')
      if (!response.ok) {
        if (response.status === 404) {
          // Slack not connected
          setChannels([])
          return
        }
        throw new Error('Failed to fetch channels')
      }

      const data = await response.json()
      setChannels(data.channels || [])
    } catch (err) {
      console.error('Error fetching Slack channels:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch channels'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    channels,
    isLoading,
    error,
    refetch: fetchChannels,
  }
}
