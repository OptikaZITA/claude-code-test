'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { isToday, isYesterday, parseISO } from 'date-fns'
import { NotificationItem, NotificationData } from './notification-item'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface NotificationListProps {
  initialNotifications?: NotificationData[]
}

type GroupedNotifications = {
  today: NotificationData[]
  yesterday: NotificationData[]
  older: NotificationData[]
}

function groupNotifications(notifications: NotificationData[]): GroupedNotifications {
  const groups: GroupedNotifications = {
    today: [],
    yesterday: [],
    older: []
  }

  for (const notification of notifications) {
    const date = parseISO(notification.created_at)
    if (isToday(date)) {
      groups.today.push(notification)
    } else if (isYesterday(date)) {
      groups.yesterday.push(notification)
    } else {
      groups.older.push(notification)
    }
  }

  return groups
}

export function NotificationList({ initialNotifications = [] }: NotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>(initialNotifications)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 50
  const supabase = createClient()

  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset
      const res = await fetch(`/api/notifications?limit=${limit}&offset=${currentOffset}`)
      if (res.ok) {
        const data = await res.json()
        if (reset) {
          setNotifications(data)
          setOffset(limit)
        } else {
          setNotifications(prev => [...prev, ...data])
          setOffset(prev => prev + limit)
        }
        setHasMore(data.length === limit)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [offset])

  useEffect(() => {
    fetchNotifications(true)
  }, [])

  // Listen for realtime updates
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel('notifications-list')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Add new notification to the top
            setNotifications(prev => [payload.new as NotificationData, ...prev])
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    getUser()
  }, [supabase])

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT'
      })
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
        // Dispatch event for bell to update
        window.dispatchEvent(new CustomEvent('notification:read'))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PUT'
      })
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        )
        // Dispatch event for bell to update
        window.dispatchEvent(new CustomEvent('notification:read-all'))
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleLoadMore = () => {
    setLoadingMore(true)
    fetchNotifications(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">Žiadne notifikácie</p>
        <p className="text-muted-foreground mt-1">
          Keď sa niečo stane, uvidíš to tu.
        </p>
      </div>
    )
  }

  const hasUnread = notifications.some(n => !n.is_read)
  const grouped = groupNotifications(notifications)

  return (
    <div className="space-y-6">
      {/* Header with Mark All Read button */}
      {hasUnread && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-primary hover:text-primary/80"
          >
            Označiť všetky ako prečítané
          </Button>
        </div>
      )}

      {/* Today */}
      {grouped.today.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-3">
            DNES
          </h3>
          <div className="space-y-1">
            {grouped.today.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        </div>
      )}

      {/* Yesterday */}
      {grouped.yesterday.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-3">
            VČERA
          </h3>
          <div className="space-y-1">
            {grouped.yesterday.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        </div>
      )}

      {/* Older */}
      {grouped.older.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-3">
            STARŠIE
          </h3>
          <div className="space-y-1">
            {grouped.older.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Načítavam...' : 'Načítať staršie'}
          </Button>
        </div>
      )}
    </div>
  )
}
