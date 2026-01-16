import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  SlackClient,
  buildNotificationMessage,
  NotificationContext,
} from '@/lib/slack'
import { differenceInDays, format } from 'date-fns'
import { sk } from 'date-fns/locale'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Configuration
const INACTIVITY_DAYS = 2 // Send notification after X days without activity
const DEADLINE_WARNING_DAYS = 5 // Send notification X days before deadline

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel Cron or external scheduler)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const results = {
    processed: 0,
    deadlineWarnings: 0,
    overdueNotifications: 0,
    inactivityNotifications: 0,
    errors: 0,
  }

  const supabase = getSupabase()

  try {
    // Get all tasks with Slack links that are not done
    const { data: tasksWithLinks, error: fetchError } = await supabase
      .from('slack_task_links')
      .select(`
        task_id,
        slack_channel_id,
        slack_message_ts,
        task:tasks(
          id,
          title,
          status,
          deadline,
          updated_at,
          organization_id,
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname)
        )
      `)

    if (fetchError) {
      console.error('Error fetching tasks:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const link of tasksWithLinks || []) {
      const task = link.task as any
      if (!task || task.status === 'done' || task.status === 'canceled') {
        continue
      }

      results.processed++

      try {
        // Get Slack client for this task's organization
        const slackClient = await getSlackClient(task.organization_id)
        if (!slackClient) {
          continue
        }

        const taskUrl = `${appUrl}/tasks/${task.id}`
        const assigneeName = task.assignee?.nickname || task.assignee?.full_name || undefined

        // Check deadline
        if (task.deadline) {
          const deadline = new Date(task.deadline)
          deadline.setHours(0, 0, 0, 0)
          const daysUntilDeadline = differenceInDays(deadline, today)

          // Overdue notification
          if (daysUntilDeadline < 0) {
            const context: NotificationContext = {
              taskTitle: task.title,
              taskUrl,
              deadline: format(deadline, 'd. MMMM yyyy', { locale: sk }),
              assigneeName,
              daysOverdue: Math.abs(daysUntilDeadline),
            }

            const message = buildNotificationMessage('overdue', context)
            await sendNotification(
              slackClient,
              link.slack_channel_id,
              link.slack_message_ts,
              message,
              'overdue',
              task.id
            )
            results.overdueNotifications++
          }
          // Deadline warning
          else if (daysUntilDeadline > 0 && daysUntilDeadline <= DEADLINE_WARNING_DAYS) {
            const context: NotificationContext = {
              taskTitle: task.title,
              taskUrl,
              deadline: format(deadline, 'd. MMMM yyyy', { locale: sk }),
              assigneeName,
              daysUntilDeadline,
            }

            const message = buildNotificationMessage('deadline_warning', context)
            await sendNotification(
              slackClient,
              link.slack_channel_id,
              link.slack_message_ts,
              message,
              'deadline_warning',
              task.id
            )
            results.deadlineWarnings++
          }
        }

        // Check inactivity
        if (task.updated_at) {
          const updatedAt = new Date(task.updated_at)
          const daysSinceUpdate = differenceInDays(today, updatedAt)

          if (daysSinceUpdate >= INACTIVITY_DAYS) {
            // Check if we already sent an inactivity notification today
            const { data: recentLog } = await supabase
              .from('slack_notification_logs')
              .select('id')
              .eq('task_id', task.id)
              .eq('notification_type', 'no_activity')
              .gte('created_at', today.toISOString())
              .single()

            if (!recentLog) {
              const context: NotificationContext = {
                taskTitle: task.title,
                taskUrl,
                assigneeName,
                daysWithoutActivity: daysSinceUpdate,
              }

              const message = buildNotificationMessage('no_activity', context)
              await sendNotification(
                slackClient,
                link.slack_channel_id,
                link.slack_message_ts,
                message,
                'no_activity',
                task.id
              )
              results.inactivityNotifications++
            }
          }
        }
      } catch (err) {
        console.error(`Error processing task ${task.id}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({
      ok: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getSlackClient(organizationId: string): Promise<SlackClient | null> {
  const supabase = getSupabase()
  const { data: connection } = await supabase
    .from('slack_workspace_connections')
    .select('slack_bot_token')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (!connection?.slack_bot_token) {
    return null
  }

  return new SlackClient(connection.slack_bot_token)
}

async function sendNotification(
  slackClient: SlackClient,
  channelId: string,
  messageTs: string,
  message: string,
  notificationType: string,
  taskId: string
) {
  const supabase = getSupabase()
  let success = false
  let errorMessage: string | null = null

  try {
    await slackClient.postMessage(channelId, message, messageTs)
    success = true
  } catch (err) {
    console.error('Failed to send notification:', err)
    errorMessage = err instanceof Error ? err.message : 'Unknown error'
  }

  // Log the notification
  await supabase.from('slack_notification_logs').insert({
    notification_type: notificationType,
    task_id: taskId,
    slack_channel_id: channelId,
    message_text: message,
    success,
    error_message: errorMessage,
  })
}
