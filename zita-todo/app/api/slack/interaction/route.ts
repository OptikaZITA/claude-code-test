import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  verifySlackRequest,
  parseTaskTitle,
  formatTaskNotes,
  statusToEmoji,
  SlackClient,
  buildErrorModal,
  buildSuccessModal,
} from '@/lib/slack'
import { SlackInteractionPayload, SlackChannelConfig } from '@/types'
import { addDays } from 'date-fns'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify Slack signature
    const signature = request.headers.get('x-slack-signature') || ''
    const timestamp = request.headers.get('x-slack-request-timestamp') || ''
    const signingSecret = process.env.SLACK_SIGNING_SECRET

    if (!signingSecret) {
      console.error('SLACK_SIGNING_SECRET not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (!verifySlackRequest(signature, timestamp, rawBody, signingSecret)) {
      console.error('Slack signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse the payload (Slack sends form-urlencoded with payload JSON)
    const params = new URLSearchParams(rawBody)
    const payloadString = params.get('payload')

    if (!payloadString) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    }

    const payload: SlackInteractionPayload = JSON.parse(payloadString)

    // Handle message action (shortcut on a message)
    if (payload.type === 'message_action' && payload.callback_id === 'send_to_zita') {
      return handleSendToZita(payload)
    }

    // Handle view submission (modal form submit)
    if (payload.type === 'view_submission') {
      // Future: Handle modal form submissions
      return NextResponse.json({ response_action: 'clear' })
    }

    // Unknown interaction type
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Slack interaction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleSendToZita(payload: SlackInteractionPayload) {
  const { channel, message, team, user, trigger_id } = payload

  if (!channel || !message) {
    return NextResponse.json({ error: 'Missing channel or message' }, { status: 400 })
  }

  const supabase = getSupabase()

  try {
    // Get channel configuration
    const { data: channelConfig, error: configError } = await supabase
      .from('slack_channel_configs')
      .select('*')
      .eq('slack_channel_id', channel.id)
      .eq('is_active', true)
      .single()

    if (configError || !channelConfig) {
      // Channel not configured - show error modal
      const slackClient = await getSlackClient(team.id)
      if (slackClient) {
        await slackClient.openView(
          trigger_id,
          buildErrorModal(
            'Kanál nie je nastavený',
            `Kanál #${channel.name} nie je nakonfigurovaný pre ZITA TODO.\n\nKontaktujte administrátora pre nastavenie integrácie.`
          )
        )
      }
      return NextResponse.json({ ok: true })
    }

    // Check if message already has a linked task
    const { data: existingLink } = await supabase
      .from('slack_task_links')
      .select('task_id')
      .eq('slack_channel_id', channel.id)
      .eq('slack_message_ts', message.ts)
      .single()

    if (existingLink) {
      const slackClient = await getSlackClient(team.id)
      if (slackClient) {
        const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tasks/${existingLink.task_id}`
        await slackClient.openView(
          trigger_id,
          buildErrorModal(
            'Task už existuje',
            `Táto správa už má priradený task.\n\n<${taskUrl}|Otvoriť task v ZITA>`
          )
        )
      }
      return NextResponse.json({ ok: true })
    }

    // Get Slack client for API calls
    const slackClient = await getSlackClient(team.id)
    if (!slackClient) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 })
    }

    // Get message permalink
    let permalink: string | null = null
    try {
      permalink = await slackClient.getPermalink(channel.id, message.ts)
    } catch (e) {
      console.warn('Could not get permalink:', e)
    }

    // Get Slack user info
    let slackUserName: string | null = null
    try {
      const userInfo = await slackClient.getUserInfo(message.user)
      slackUserName = userInfo.real_name || userInfo.name
    } catch (e) {
      console.warn('Could not get user info:', e)
    }

    // Create task
    const config = channelConfig as SlackChannelConfig
    const taskTitle = parseTaskTitle(message.text, channel.name)
    const taskNotes = formatTaskNotes(message.text, permalink, slackUserName)
    const deadline = addDays(new Date(), config.default_deadline_days)

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: taskTitle,
        notes: taskNotes,
        organization_id: config.organization_id,
        area_id: config.area_id,
        project_id: config.project_id,
        assignee_id: config.default_assignee_id,
        priority: config.default_priority === 'high' || config.default_priority === 'low'
          ? config.default_priority
          : null,
        when_type: 'today',
        deadline: deadline.toISOString().split('T')[0],
        source: 'slack',
        source_url: permalink,
        status: 'todo',
        is_inbox: false,
      })
      .select()
      .single()

    if (taskError || !task) {
      console.error('Failed to create task:', taskError)
      await slackClient.openView(
        trigger_id,
        buildErrorModal('Chyba', 'Nepodarilo sa vytvoriť task. Skúste to znova.')
      )
      return NextResponse.json({ ok: true })
    }

    // Create slack_task_link
    await supabase.from('slack_task_links').insert({
      task_id: task.id,
      slack_channel_id: channel.id,
      slack_message_ts: message.ts,
      slack_thread_ts: null,
      slack_team_id: team.id,
      slack_user_id: message.user,
      slack_user_name: slackUserName,
      slack_permalink: permalink,
      original_text: message.text,
      last_zita_status: 'todo',
      last_slack_emoji: statusToEmoji('todo'),
    })

    // Add reaction to the original message
    try {
      await slackClient.addReaction(channel.id, message.ts, statusToEmoji('todo'))
    } catch (e) {
      console.warn('Could not add reaction:', e)
    }

    // Reply in thread
    try {
      await slackClient.postMessage(
        channel.id,
        `✅ Task vytvorený v ZITA TODO`,
        message.ts
      )
    } catch (e) {
      console.warn('Could not post thread reply:', e)
    }

    // Show success modal
    const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tasks/${task.id}`
    await slackClient.openView(
      trigger_id,
      buildSuccessModal('Task vytvorený', taskTitle, taskUrl)
    )

    // Log notification
    await supabase.from('slack_notification_logs').insert({
      notification_type: 'task_created',
      task_id: task.id,
      slack_channel_id: channel.id,
      slack_user_id: user.id,
      message_text: `Task created: ${taskTitle}`,
      success: true,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error in handleSendToZita:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

async function getSlackClient(teamId: string): Promise<SlackClient | null> {
  const supabase = getSupabase()
  const { data: connection } = await supabase
    .from('slack_workspace_connections')
    .select('slack_bot_token')
    .eq('slack_team_id', teamId)
    .eq('is_active', true)
    .single()

  if (!connection?.slack_bot_token) {
    return null
  }

  return new SlackClient(connection.slack_bot_token)
}
