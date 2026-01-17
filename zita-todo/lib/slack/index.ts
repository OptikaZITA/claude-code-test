import crypto from 'crypto'
import { TaskStatus } from '@/types'

// =====================================================
// Slack Request Verification
// =====================================================

/**
 * Verifies that the request came from Slack by checking the signature
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackRequest(
  signature: string,
  timestamp: string,
  body: string,
  signingSecret: string
): boolean {
  // Check timestamp is within 5 minutes
  const time = Math.floor(Date.now() / 1000)
  if (Math.abs(time - parseInt(timestamp)) > 60 * 5) {
    return false
  }

  // Create the signature base string
  const sigBasestring = `v0:${timestamp}:${body}`

  // Create HMAC SHA256
  const mySignature =
    'v0=' +
    crypto
      .createHmac('sha256', signingSecret)
      .update(sigBasestring, 'utf8')
      .digest('hex')

  // Compare signatures using timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    )
  } catch {
    return false
  }
}

// =====================================================
// Message Parsing
// =====================================================

/**
 * Extracts Slack user IDs from message text
 * Format: <@U12345678> or <@U12345678|username>
 * Returns array of user IDs (without < @ > characters)
 */
export function extractSlackUserMentions(messageText: string): string[] {
  const regex = /<@([A-Z0-9]+)(\|[^>]+)?>/g
  const userIds: string[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(messageText)) !== null) {
    userIds.push(match[1])
  }

  return userIds
}

/**
 * Parses task title from Slack message text
 * Tries to extract meaningful title from the message
 */
export function parseTaskTitle(
  messageText: string,
  channelName: string
): string {
  if (!messageText) {
    return `Nová úloha z #${channelName}`
  }

  // Remove Slack formatting
  let text = messageText
    .replace(/<@[A-Z0-9]+>/g, '') // Remove user mentions
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1') // Convert channel mentions
    .replace(/<(https?:\/\/[^|>]+)\|?([^>]*)>/g, '$2 $1') // Convert links
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()

  // Take first line or first 100 chars
  const firstLine = text.split('\n')[0]
  if (firstLine.length > 100) {
    return firstLine.substring(0, 97) + '...'
  }

  return firstLine || `Nová úloha z #${channelName}`
}

/**
 * Formats task notes from Slack message
 */
export function formatTaskNotes(
  messageText: string,
  permalink: string | null,
  slackUserName: string | null
): string {
  const parts: string[] = []

  if (slackUserName) {
    parts.push(`**Zo Slacku od:** ${slackUserName}`)
  }

  if (permalink) {
    parts.push(`**Slack odkaz:** ${permalink}`)
  }

  if (messageText) {
    parts.push(`\n---\n\n${messageText}`)
  }

  return parts.join('\n')
}

// =====================================================
// Emoji <-> Status Mapping
// =====================================================

/**
 * Maps Slack emoji to task status
 * Returns null if emoji doesn't map to any status
 */
export function emojiToStatus(emoji: string): TaskStatus | null {
  const mapping: Record<string, TaskStatus> = {
    // Backlog
    clipboard: 'backlog',
    inbox_tray: 'backlog',

    // Todo
    memo: 'todo',
    spiral_note_pad: 'todo',

    // In Progress
    arrows_counterclockwise: 'in_progress',
    arrow_right: 'in_progress',
    hourglass_flowing_sand: 'in_progress',
    hourglass: 'in_progress',

    // Review
    eyes: 'review',
    mag: 'review',

    // Done
    white_check_mark: 'done',
    heavy_check_mark: 'done',
    ballot_box_with_check: 'done',

    // Canceled
    x: 'canceled',
    no_entry: 'canceled',
    no_entry_sign: 'canceled',
  }

  return mapping[emoji] || null
}

/**
 * Maps task status to Slack emoji
 */
export function statusToEmoji(status: TaskStatus): string {
  const mapping: Record<TaskStatus, string> = {
    backlog: 'clipboard',
    todo: 'memo',
    in_progress: 'arrows_counterclockwise',
    review: 'eyes',
    done: 'white_check_mark',
    canceled: 'x',
  }

  return mapping[status]
}

// =====================================================
// Slack API Client
// =====================================================

interface SlackApiResponse {
  ok: boolean
  error?: string
  [key: string]: unknown
}

interface PostMessageResponse extends SlackApiResponse {
  ts?: string
  channel?: string
}

interface PermalinkResponse extends SlackApiResponse {
  permalink?: string
}

export class SlackClient {
  private botToken: string
  private baseUrl = 'https://slack.com/api'

  constructor(botToken: string) {
    this.botToken = botToken
  }

  private async request<T extends SlackApiResponse>(
    method: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json() as T

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error || 'Unknown error'}`)
    }

    return data
  }

  /**
   * Posts a message to a channel
   */
  async postMessage(
    channel: string,
    text: string,
    threadTs?: string
  ): Promise<{ ts: string; channel: string }> {
    const body: Record<string, unknown> = {
      channel,
      text,
    }

    if (threadTs) {
      body.thread_ts = threadTs
    }

    const response = await this.request<PostMessageResponse>('chat.postMessage', body)

    return {
      ts: response.ts || '',
      channel: response.channel || channel,
    }
  }

  /**
   * Adds a reaction (emoji) to a message
   */
  async addReaction(
    channel: string,
    timestamp: string,
    emoji: string
  ): Promise<void> {
    await this.request('reactions.add', {
      channel,
      timestamp,
      name: emoji,
    })
  }

  /**
   * Removes a reaction (emoji) from a message
   */
  async removeReaction(
    channel: string,
    timestamp: string,
    emoji: string
  ): Promise<void> {
    await this.request('reactions.remove', {
      channel,
      timestamp,
      name: emoji,
    })
  }

  /**
   * Gets permanent link to a message
   */
  async getPermalink(channel: string, timestamp: string): Promise<string> {
    const response = await this.request<PermalinkResponse>('chat.getPermalink', {
      channel,
      message_ts: timestamp,
    })

    return response.permalink || ''
  }

  /**
   * Opens a modal view
   */
  async openView(triggerId: string, view: Record<string, unknown>): Promise<void> {
    await this.request('views.open', {
      trigger_id: triggerId,
      view,
    })
  }

  /**
   * Gets user info including display_name from profile
   */
  async getUserInfo(userId: string): Promise<{
    id: string
    name: string
    real_name: string
    display_name: string
  }> {
    const response = await this.request<SlackApiResponse & {
      user?: {
        id: string
        name: string
        real_name: string
        profile?: {
          display_name?: string
          real_name?: string
        }
      }
    }>('users.info', {
      user: userId,
    })

    const user = response.user
    return {
      id: user?.id || userId,
      name: user?.name || '',
      real_name: user?.real_name || '',
      display_name: user?.profile?.display_name || '',
    }
  }

  /**
   * Lists channels the bot has access to
   */
  async listChannels(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.request<SlackApiResponse & {
      channels?: Array<{ id: string; name: string }>
    }>('conversations.list', {
      types: 'public_channel,private_channel',
      limit: 1000,
    })

    return response.channels || []
  }
}

// =====================================================
// Notification Message Builders
// =====================================================

export interface NotificationContext {
  taskTitle: string
  taskUrl: string
  deadline?: string
  assigneeName?: string
  oldStatus?: TaskStatus
  newStatus?: TaskStatus
  daysUntilDeadline?: number
  daysOverdue?: number
  daysWithoutActivity?: number
}

/**
 * Builds notification message based on type
 */
export function buildNotificationMessage(
  type: 'task_created' | 'status_changed' | 'deadline_warning' | 'overdue' | 'no_activity',
  context: NotificationContext
): string {
  const { taskTitle, taskUrl, deadline, assigneeName } = context

  switch (type) {
    case 'task_created':
      return `✅ *Task vytvorený:* <${taskUrl}|${taskTitle}>${
        assigneeName ? `\n👤 Priradený: ${assigneeName}` : ''
      }${deadline ? `\n📅 Deadline: ${deadline}` : ''}`

    case 'status_changed':
      return `🔄 *Status zmenený:* <${taskUrl}|${taskTitle}>\n` +
        `${statusToEmoji(context.oldStatus!)} ${context.oldStatus} → ` +
        `${statusToEmoji(context.newStatus!)} ${context.newStatus}`

    case 'deadline_warning':
      return `⚠️ *Blíži sa deadline!* <${taskUrl}|${taskTitle}>\n` +
        `📅 Deadline o ${context.daysUntilDeadline} ${context.daysUntilDeadline === 1 ? 'deň' : 'dní'}${
          assigneeName ? `\n👤 Priradený: ${assigneeName}` : ''
        }`

    case 'overdue':
      return `🚨 *Task je po deadline!* <${taskUrl}|${taskTitle}>\n` +
        `📅 ${context.daysOverdue} ${context.daysOverdue === 1 ? 'deň' : 'dní'} po termíne${
          assigneeName ? `\n👤 Priradený: ${assigneeName}` : ''
        }`

    case 'no_activity':
      return `💤 *Bez aktivity:* <${taskUrl}|${taskTitle}>\n` +
        `Žiadna aktivita už ${context.daysWithoutActivity} ${context.daysWithoutActivity === 1 ? 'deň' : 'dní'}${
          assigneeName ? `\n👤 Priradený: ${assigneeName}` : ''
        }`

    default:
      return `📋 <${taskUrl}|${taskTitle}>`
  }
}

// =====================================================
// Error Modal Builder
// =====================================================

/**
 * Builds an error modal view for Slack
 */
export function buildErrorModal(title: string, message: string): Record<string, unknown> {
  return {
    type: 'modal',
    title: {
      type: 'plain_text',
      text: title,
      emoji: true,
    },
    close: {
      type: 'plain_text',
      text: 'Zavrieť',
      emoji: true,
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
    ],
  }
}

/**
 * Builds a success modal view for Slack
 */
export function buildSuccessModal(
  title: string,
  taskTitle: string,
  taskUrl: string
): Record<string, unknown> {
  return {
    type: 'modal',
    title: {
      type: 'plain_text',
      text: title,
      emoji: true,
    },
    close: {
      type: 'plain_text',
      text: 'OK',
      emoji: true,
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ Task bol úspešne vytvorený!\n\n*${taskTitle}*`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Otvoriť v ZITA',
            emoji: true,
          },
          url: taskUrl,
          action_id: 'open_task',
        },
      },
    ],
  }
}
