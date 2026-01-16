import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SlackClient,
  buildNotificationMessage,
  statusToEmoji,
  NotificationContext,
} from '@/lib/slack'
import { TaskStatus, SlackNotificationType } from '@/types'
import { format, differenceInDays } from 'date-fns'
import { sk } from 'date-fns/locale'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface NotifyRequest {
  type: SlackNotificationType
  task_id: string
  channel_id?: string
  user_id?: string
  old_status?: TaskStatus
  new_status?: TaskStatus
}

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key or authentication
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.INTERNAL_API_KEY

    // If INTERNAL_API_KEY is set, require it
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: NotifyRequest = await request.json()
    const { type, task_id, channel_id, user_id, old_status, new_status } = body

    if (!task_id || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: task_id, type' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Get task with relations
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(id, full_name, nickname),
        project:projects(id, name),
        area:areas(id, name)
      `)
      .eq('id', task_id)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get slack_task_link
    const { data: taskLink } = await supabase
      .from('slack_task_links')
      .select('*')
      .eq('task_id', task_id)
      .single()

    if (!taskLink) {
      return NextResponse.json(
        { error: 'Task not linked to Slack' },
        { status: 400 }
      )
    }

    // Get Slack client
    const { data: connection } = await supabase
      .from('slack_workspace_connections')
      .select('slack_bot_token, slack_team_id')
      .eq('organization_id', task.organization_id)
      .eq('is_active', true)
      .single()

    if (!connection?.slack_bot_token) {
      return NextResponse.json(
        { error: 'Slack not connected' },
        { status: 400 }
      )
    }

    const slackClient = new SlackClient(connection.slack_bot_token)
    const targetChannelId = channel_id || taskLink.slack_channel_id
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const taskUrl = `${appUrl}/tasks/${task_id}`

    // Build notification context
    const context: NotificationContext = {
      taskTitle: task.title,
      taskUrl,
      assigneeName: task.assignee?.nickname || task.assignee?.full_name || undefined,
    }

    // Add type-specific context
    if (task.deadline) {
      context.deadline = format(new Date(task.deadline), 'd. MMMM yyyy', { locale: sk })
      const daysUntil = differenceInDays(new Date(task.deadline), new Date())
      if (daysUntil > 0) {
        context.daysUntilDeadline = daysUntil
      } else if (daysUntil < 0) {
        context.daysOverdue = Math.abs(daysUntil)
      }
    }

    if (old_status && new_status) {
      context.oldStatus = old_status
      context.newStatus = new_status
    }

    if (task.updated_at) {
      context.daysWithoutActivity = differenceInDays(new Date(), new Date(task.updated_at))
    }

    // Build and send message
    const message = buildNotificationMessage(type, context)
    let success = false
    let errorMessage: string | null = null

    try {
      // Post message as thread reply
      await slackClient.postMessage(
        targetChannelId,
        message,
        taskLink.slack_message_ts
      )

      // For status changes, update emoji
      if (type === 'status_changed' && new_status) {
        // Remove old emoji
        if (old_status) {
          try {
            await slackClient.removeReaction(
              targetChannelId,
              taskLink.slack_message_ts,
              statusToEmoji(old_status)
            )
          } catch {
            // Ignore if emoji doesn't exist
          }
        }

        // Add new emoji
        try {
          await slackClient.addReaction(
            targetChannelId,
            taskLink.slack_message_ts,
            statusToEmoji(new_status)
          )
        } catch {
          // Ignore if already added
        }

        // Update task link
        await supabase
          .from('slack_task_links')
          .update({
            last_zita_status: new_status,
            last_slack_emoji: statusToEmoji(new_status),
            last_synced_at: new Date().toISOString(),
          })
          .eq('task_id', task_id)
      }

      success = true
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
    }

    // Log notification
    await supabase.from('slack_notification_logs').insert({
      notification_type: type,
      task_id,
      slack_channel_id: targetChannelId,
      slack_user_id: user_id || null,
      message_text: message,
      success,
      error_message: errorMessage,
    })

    if (success) {
      return NextResponse.json({ ok: true })
    } else {
      return NextResponse.json(
        { error: errorMessage || 'Failed to send notification' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Slack notify error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
