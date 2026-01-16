import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface SlackOAuthResponse {
  ok: boolean
  error?: string
  access_token?: string
  token_type?: string
  scope?: string
  bot_user_id?: string
  app_id?: string
  team?: {
    id: string
    name: string
  }
  authed_user?: {
    id: string
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Handle OAuth errors from Slack
  if (error) {
    console.error('Slack OAuth error:', error)
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?slack=error&message=${encodeURIComponent(error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?slack=error&message=missing_code`
    )
  }

  try {
    // Get current user from session
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        `${appUrl}/login?redirect=/settings/integrations`
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user's organization
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.redirect(
        `${appUrl}/settings/integrations?slack=error&message=no_organization`
      )
    }

    // Exchange code for access token
    const clientId = process.env.SLACK_CLIENT_ID
    const clientSecret = process.env.SLACK_CLIENT_SECRET
    const redirectUri = `${appUrl}/api/slack/oauth`

    if (!clientId || !clientSecret) {
      console.error('Slack OAuth credentials not configured')
      return NextResponse.redirect(
        `${appUrl}/settings/integrations?slack=error&message=server_config_error`
      )
    }

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData: SlackOAuthResponse = await tokenResponse.json()

    if (!tokenData.ok || !tokenData.access_token || !tokenData.team) {
      console.error('Slack token exchange failed:', tokenData.error)
      return NextResponse.redirect(
        `${appUrl}/settings/integrations?slack=error&message=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`
      )
    }

    // Check if this workspace is already connected to another organization
    const { data: existingConnection } = await supabaseAdmin
      .from('slack_workspace_connections')
      .select('organization_id')
      .eq('slack_team_id', tokenData.team.id)
      .single()

    if (existingConnection && existingConnection.organization_id !== userData.organization_id) {
      return NextResponse.redirect(
        `${appUrl}/settings/integrations?slack=error&message=workspace_already_connected`
      )
    }

    // Upsert workspace connection
    const { error: upsertError } = await supabaseAdmin
      .from('slack_workspace_connections')
      .upsert(
        {
          organization_id: userData.organization_id,
          slack_team_id: tokenData.team.id,
          slack_team_name: tokenData.team.name,
          slack_bot_token: tokenData.access_token,
          slack_bot_user_id: tokenData.bot_user_id || null,
          is_active: true,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'organization_id',
        }
      )

    if (upsertError) {
      console.error('Failed to save Slack connection:', upsertError)
      return NextResponse.redirect(
        `${appUrl}/settings/integrations?slack=error&message=save_failed`
      )
    }

    // Success - redirect to settings
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?slack=connected&workspace=${encodeURIComponent(tokenData.team.name)}`
    )
  } catch (error) {
    console.error('Slack OAuth error:', error)
    return NextResponse.redirect(
      `${appUrl}/settings/integrations?slack=error&message=internal_error`
    )
  }
}

// POST endpoint to initiate OAuth flow (returns authorization URL)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = process.env.SLACK_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUri = `${appUrl}/api/slack/oauth`

    if (!clientId) {
      return NextResponse.json({ error: 'Slack not configured' }, { status: 500 })
    }

    // Required scopes for the bot
    const scopes = [
      'channels:history',
      'channels:read',
      'chat:write',
      'commands',
      'reactions:read',
      'reactions:write',
      'users:read',
    ].join(',')

    // Generate state for CSRF protection
    const state = crypto.randomUUID()

    const authUrl = new URL('https://slack.com/oauth/v2/authorize')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('state', state)

    return NextResponse.json({ url: authUrl.toString(), state })
  } catch (error) {
    console.error('Error initiating Slack OAuth:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE endpoint to disconnect Slack
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user's organization
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Only admins can disconnect
    if (userData.role !== 'admin' && userData.role !== 'strategicka_rada') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Deactivate the connection
    const { error } = await supabaseAdmin
      .from('slack_workspace_connections')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', userData.organization_id)

    if (error) {
      console.error('Failed to disconnect Slack:', error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error disconnecting Slack:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
