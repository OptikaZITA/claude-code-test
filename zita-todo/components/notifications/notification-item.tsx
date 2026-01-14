'use client'

import {
  UserPlus,
  UserMinus,
  CheckCircle,
  ArrowRightCircle,
  Calendar,
  Bell
} from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { sk } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'

export interface NotificationData {
  id: string
  type: string
  is_read: boolean
  created_at: string
  task_id: string | null
  payload: {
    task_title?: string
    actor_nickname?: string
    old_status?: string
    new_status?: string
    old_deadline?: string
    new_deadline?: string
  }
  task?: {
    id: string
    title: string
    status: string
  } | null
  actor?: {
    id: string
    nickname: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

const iconMap: Record<string, { icon: typeof Bell; className: string }> = {
  ASSIGNED: { icon: UserPlus, className: 'text-blue-500' },
  UNASSIGNED: { icon: UserMinus, className: 'text-gray-400' },
  TASK_COMPLETED_CREATOR: { icon: CheckCircle, className: 'text-green-500' },
  TASK_COMPLETED_ASSIGNER: { icon: CheckCircle, className: 'text-green-500' },
  STATUS_CHANGED: { icon: ArrowRightCircle, className: 'text-purple-500' },
  DUE_DATE_CHANGED: { icon: Calendar, className: 'text-orange-500' },
}

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

function getNotificationMessage(notification: NotificationData): string {
  const actorName = notification.payload.actor_nickname ||
    notification.actor?.nickname ||
    notification.actor?.full_name ||
    'Niekto'

  switch (notification.type) {
    case 'ASSIGNED':
      return `${actorName} ti priradil úlohu`
    case 'UNASSIGNED':
      return `${actorName} ti odobral úlohu`
    case 'TASK_COMPLETED_CREATOR':
      return `${actorName} dokončil úlohu, ktorú si vytvoril`
    case 'TASK_COMPLETED_ASSIGNER':
      return `${actorName} dokončil úlohu, ktorú si mu priradil`
    case 'STATUS_CHANGED':
      const newStatus = statusLabels[notification.payload.new_status || ''] || notification.payload.new_status
      return `${actorName} zmenil status úlohy na "${newStatus}"`
    case 'DUE_DATE_CHANGED':
      const newDeadline = notification.payload.new_deadline
        ? format(new Date(notification.payload.new_deadline), 'd.M.yyyy', { locale: sk })
        : 'bez termínu'
      return `${actorName} zmenil deadline úlohy na ${newDeadline}`
    default:
      return 'Nová notifikácia'
  }
}

function formatNotificationTime(dateStr: string): string {
  const date = new Date(dateStr)

  if (isToday(date)) {
    return `pred ${formatDistanceToNow(date, { locale: sk })}`
  }

  if (isYesterday(date)) {
    return `včera o ${format(date, 'HH:mm', { locale: sk })}`
  }

  return format(date, 'd. MMMM', { locale: sk })
}

interface NotificationItemProps {
  notification: NotificationData
  onMarkRead: (id: string) => void
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const router = useRouter()
  const config = iconMap[notification.type] || { icon: Bell, className: 'text-gray-500' }
  const Icon = config.icon

  const taskTitle = notification.payload.task_title || notification.task?.title || 'Neznáma úloha'
  const actorName = notification.payload.actor_nickname ||
    notification.actor?.nickname ||
    notification.actor?.full_name ||
    '?'
  const initials = actorName.slice(0, 2).toUpperCase()

  const handleClick = async () => {
    // Mark as read
    if (!notification.is_read) {
      onMarkRead(notification.id)
    }

    // Navigate to task if exists
    if (notification.task_id) {
      // For now, just go to today - in future could open task detail
      router.push('/today')
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-muted/50',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      {/* Unread indicator */}
      <div className="w-2 pt-2 flex-shrink-0">
        {!notification.is_read && (
          <div className="w-2 h-2 rounded-full bg-primary" />
        )}
      </div>

      {/* Avatar */}
      <Avatar
        src={notification.actor?.avatar_url}
        name={actorName}
        size="md"
        className="flex-shrink-0"
      />

      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">
        <Icon className={cn('h-5 w-5', config.className)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          {getNotificationMessage(notification)}
        </p>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          "{taskTitle}"
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatNotificationTime(notification.created_at)}
        </p>
      </div>
    </button>
  )
}
