import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  verifySlackRequest,
  emojiToStatus,
  statusToEmoji,
  SlackClient,
  parseTaskTitle,
  formatTaskNotes,
} from '@/lib/slack'
import { SlackEventPayload, TaskStatus, SlackChannelConfig } from '@/types'
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
    const payload: SlackEventPayload = JSON.parse(rawBody)

    // Handle URL verification challenge (Slack sends this when setting up Events API)
    if (payload.type === 'url_verification') {
      return NextResponse.json({ challenge: payload.challenge })
    }

    // Verify Slack signature for all other requests
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

    // Handle event callbacks
    if (payload.type === 'event_callback' && payload.event) {
      const event = payload.event

      // Handle new message - auto-create task
      if (event.type === 'message' && !event.subtype) {
        await handleNewMessage(
          payload.team_id,
          event.channel,
          event.ts,
          event.text || '',
          event.user,
          event.bot_id
        )
      }

      // Handle reaction added
      if (event.type === 'reaction_added' && event.item && event.reaction) {
        await handleReactionAdded(
          payload.team_id,
          event.item.channel,
          event.item.ts,
          event.reaction,
          event.user
        )
      }

      // Handle reaction removed
      if (event.type === 'reaction_removed' && event.item && event.reaction) {
        await handleReactionRemoved(
          payload.team_id,
          event.item.channel,
          event.item.ts,
          event.reaction,
          event.user
        )
      }
    }

    // Always return 200 OK quickly to avoid Slack retries
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Slack events error:', error)
    // Still return 200 to prevent Slack retries
    return NextResponse.json({ ok: true })
  }
}

// =====================================================
// Handle New Message - Auto-create Task
// =====================================================

async function handleNewMessage(
  teamId: string,
  channelId: string,
  messageTs: string,
  messageText: string,
  userId: string,
  botId?: string
) {
  const supabase = getSupabase()

  try {
    // Ignore bot messages (vrátane našich vlastných)
    if (botId) {
      return
    }

    // Check if channel is configured for auto-task creation
    const { data: channelConfig, error: configError } = await supabase
      .from('slack_channel_configs')
      .select('*')
      .eq('slack_channel_id', channelId)
      .eq('is_active', true)
      .single()

    if (configError || !channelConfig) {
      // Channel not configured, ignore
      return
    }

    // Check if message already has a linked task (first check)
    const { data: existingLink } = await supabase
      .from('slack_task_links')
      .select('task_id')
      .eq('slack_channel_id', channelId)
      .eq('slack_message_ts', messageTs)
      .single()

    if (existingLink) {
      // Task already exists for this message
      return
    }

    // Get Slack client for API calls
    const slackClient = await getSlackClient(teamId)
    if (!slackClient) {
      console.error('Could not get Slack client for team:', teamId)
      return
    }

    // Get message permalink
    let permalink: string | null = null
    try {
      permalink = await slackClient.getPermalink(channelId, messageTs)
    } catch (e) {
      console.warn('Could not get permalink:', e)
    }

    // Get Slack user info
    let slackUserName: string | null = null
    try {
      const userInfo = await slackClient.getUserInfo(userId)
      slackUserName = userInfo.real_name || userInfo.name
    } catch (e) {
      console.warn('Could not get user info:', e)
    }

    // Create task
    const config = channelConfig as SlackChannelConfig
    const taskTitle = parseTaskTitle(messageText, config.slack_channel_name)
    const taskNotes = formatTaskNotes(messageText, permalink, slackUserName)
    const deadline = addDays(new Date(), config.default_deadline_days || 7)

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
      return
    }

    // Try to create slack_task_link - this will fail on duplicate due to unique constraint
    const { error: linkError } = await supabase.from('slack_task_links').insert({
      task_id: task.id,
      slack_channel_id: channelId,
      slack_message_ts: messageTs,
      slack_thread_ts: null,
      slack_team_id: teamId,
      slack_user_id: userId,
      slack_user_name: slackUserName,
      slack_permalink: permalink,
      original_text: messageText,
      last_zita_status: 'todo',
      last_slack_emoji: statusToEmoji('todo'),
    })

    // If link insert failed (duplicate), delete the task we just created and exit
    if (linkError) {
      console.log(`Duplicate message detected (${channelId}:${messageTs}), rolling back task creation`)
      await supabase.from('tasks').delete().eq('id', task.id)
      return
    }

    // Add reaction to the original message
    try {
      await slackClient.addReaction(channelId, messageTs, statusToEmoji('todo'))
    } catch (e) {
      console.warn('Could not add reaction:', e)
    }

    // Reply in thread with task link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const taskUrl = `${appUrl}/tasks/${task.id}`
    try {
      await slackClient.postMessage(
        channelId,
        `✅ Task vytvorený: <${taskUrl}|${taskTitle}>`,
        messageTs
      )
    } catch (e) {
      console.warn('Could not post thread reply:', e)
    }

    // Log notification
    await supabase.from('slack_notification_logs').insert({
      notification_type: 'task_created',
      task_id: task.id,
      slack_channel_id: channelId,
      slack_user_id: userId,
      message_text: `Auto-created task: ${taskTitle}`,
      success: true,
    })

    console.log(`Auto-created task "${taskTitle}" from Slack message in #${config.slack_channel_name}`)
  } catch (error) {
    console.error('Error handling new message:', error)
  }
}

async function handleReactionAdded(
  teamId: string,
  channelId: string,
  messageTs: string,
  emoji: string,
  userId: string
) {
  const supabase = getSupabase()

  try {
    // Check if emoji maps to a status
    const newStatus = emojiToStatus(emoji)
    if (!newStatus) {
      // Emoji doesn't map to any status, ignore
      return
    }

    // Find the task linked to this message
    const { data: taskLink, error: linkError } = await supabase
      .from('slack_task_links')
      .select('task_id, last_zita_status')
      .eq('slack_channel_id', channelId)
      .eq('slack_message_ts', messageTs)
      .single()

    if (linkError || !taskLink) {
      // No linked task found, ignore
      return
    }

    // Don't update if status is the same
    if (taskLink.last_zita_status === newStatus) {
      return
    }

    const oldStatus = taskLink.last_zita_status as TaskStatus

    // Update task status
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // If marking as done, set completed_at and move to logbook
    if (newStatus === 'done') {
      updates.completed_at = new Date().toISOString()
      updates.when_type = null // Move to logbook
    } else if (oldStatus === 'done') {
      // If un-completing, clear completed_at
      updates.completed_at = null
      updates.when_type = 'today' // Return to today
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskLink.task_id)

    if (updateError) {
      console.error('Failed to update task:', updateError)
      return
    }

    // Update slack_task_link
    await supabase
      .from('slack_task_links')
      .update({
        last_zita_status: newStatus,
        last_slack_emoji: emoji,
        last_synced_at: new Date().toISOString(),
      })
      .eq('task_id', taskLink.task_id)

    // Remove old status emoji and add new one
    const slackClient = await getSlackClient(teamId)
    if (slackClient && oldStatus) {
      try {
        // Remove old emoji
        await slackClient.removeReaction(channelId, messageTs, statusToEmoji(oldStatus))
      } catch (e) {
        // Ignore if emoji doesn't exist
      }
    }

    // Log the status change
    await supabase.from('slack_notification_logs').insert({
      notification_type: 'status_changed',
      task_id: taskLink.task_id,
      slack_channel_id: channelId,
      slack_user_id: userId,
      message_text: `Status changed: ${oldStatus} -> ${newStatus}`,
      success: true,
    })
  } catch (error) {
    console.error('Error handling reaction added:', error)
  }
}

async function handleReactionRemoved(
  teamId: string,
  channelId: string,
  messageTs: string,
  emoji: string,
  userId: string
) {
  const supabase = getSupabase()

  try {
    // Check if emoji maps to a status
    const removedStatus = emojiToStatus(emoji)
    if (!removedStatus) {
      return
    }

    // Find the task linked to this message
    const { data: taskLink } = await supabase
      .from('slack_task_links')
      .select('task_id, last_zita_status, last_slack_emoji')
      .eq('slack_channel_id', channelId)
      .eq('slack_message_ts', messageTs)
      .single()

    if (!taskLink) {
      return
    }

    // Only revert if the removed emoji matches the current status
    if (taskLink.last_slack_emoji !== emoji) {
      return
    }

    // Revert to previous status (default to 'todo')
    const newStatus: TaskStatus = 'todo'

    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // If reverting from done, clear completed_at
    if (removedStatus === 'done') {
      updates.completed_at = null
      updates.when_type = 'today'
    }

    await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskLink.task_id)

    // Update slack_task_link
    await supabase
      .from('slack_task_links')
      .update({
        last_zita_status: newStatus,
        last_slack_emoji: statusToEmoji(newStatus),
        last_synced_at: new Date().toISOString(),
      })
      .eq('task_id', taskLink.task_id)

    // Add the new status emoji
    const slackClient = await getSlackClient(teamId)
    if (slackClient) {
      try {
        await slackClient.addReaction(channelId, messageTs, statusToEmoji(newStatus))
      } catch (e) {
        // Ignore errors
      }
    }
  } catch (error) {
    console.error('Error handling reaction removed:', error)
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
