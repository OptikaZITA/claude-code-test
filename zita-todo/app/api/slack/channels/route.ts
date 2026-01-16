import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { SlackClient } from '@/lib/slack'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user's organization
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    // Get Slack connection
    const { data: connection } = await supabaseAdmin
      .from('slack_workspace_connections')
      .select('slack_bot_token')
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .single()

    if (!connection?.slack_bot_token) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 404 })
    }

    // Get channels from Slack
    const slackClient = new SlackClient(connection.slack_bot_token)
    const channels = await slackClient.listChannels()

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Error fetching Slack channels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}
