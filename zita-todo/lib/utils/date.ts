import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, isPast } from 'date-fns'
import { sk } from 'date-fns/locale'

export function formatDate(date: string | Date): string {
  const d = new Date(date)

  if (isToday(d)) {
    return 'Dnes'
  }
  if (isTomorrow(d)) {
    return 'Zajtra'
  }
  if (isYesterday(d)) {
    return 'Včera'
  }

  return format(d, 'd. MMM yyyy', { locale: sk })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'd. MMM yyyy, HH:mm', { locale: sk })
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: sk })
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function formatDurationShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}`
  }
  return `${minutes}m`
}

export function isOverdue(date: string | Date): boolean {
  return isPast(new Date(date)) && !isToday(new Date(date))
}
