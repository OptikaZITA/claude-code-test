import { RecurrenceRule, WeekDay } from '@/types'
import { addDays, addWeeks, addMonths, addYears, setDate, getDay, nextDay } from 'date-fns'

const WEEKDAY_MAP: Record<WeekDay, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const WEEKDAY_REVERSE_MAP: Record<number, WeekDay> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

export function getNextOccurrence(
  rule: RecurrenceRule,
  fromDate: Date = new Date()
): Date | null {
  // Check if we've reached the end
  if (rule.endDate && fromDate >= new Date(rule.endDate)) {
    return null
  }

  let nextDate: Date

  switch (rule.frequency) {
    case 'daily':
      nextDate = addDays(fromDate, rule.interval)
      break

    case 'weekly':
      if (!rule.weekDays || rule.weekDays.length === 0) {
        nextDate = addWeeks(fromDate, rule.interval)
      } else {
        // Find the next matching weekday
        const currentDay = getDay(fromDate)
        const sortedDays = [...rule.weekDays]
          .map(d => WEEKDAY_MAP[d])
          .sort((a, b) => a - b)

        // Find next day in current week
        let nextDayIndex = sortedDays.find(d => d > currentDay)

        if (nextDayIndex !== undefined) {
          // Next occurrence is this week
          nextDate = addDays(fromDate, nextDayIndex - currentDay)
        } else {
          // Next occurrence is next week (+ interval - 1 weeks)
          const daysUntilFirstDay = 7 - currentDay + sortedDays[0]
          nextDate = addDays(fromDate, daysUntilFirstDay + (rule.interval - 1) * 7)
        }
      }
      break

    case 'monthly':
      const targetDay = rule.monthDay || fromDate.getDate()
      nextDate = addMonths(fromDate, rule.interval)

      // Handle months with fewer days
      const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
      nextDate = setDate(nextDate, Math.min(targetDay, daysInMonth))
      break

    case 'yearly':
      nextDate = addYears(fromDate, rule.interval)
      break

    default:
      return null
  }

  // Check if we've exceeded the end date
  if (rule.endDate && nextDate > new Date(rule.endDate)) {
    return null
  }

  return nextDate
}

export function formatRecurrenceRule(rule: RecurrenceRule): string {
  const frequencyLabels: Record<string, string> = {
    daily: 'denne',
    weekly: 'týždenne',
    monthly: 'mesačne',
    yearly: 'ročne',
  }

  let description = ''

  if (rule.interval === 1) {
    description = frequencyLabels[rule.frequency] || ''
    description = description.charAt(0).toUpperCase() + description.slice(1)
  } else {
    const intervalLabels: Record<string, string> = {
      daily: rule.interval === 1 ? 'deň' : 'dní',
      weekly: rule.interval === 1 ? 'týždeň' : 'týždňov',
      monthly: rule.interval === 1 ? 'mesiac' : 'mesiacov',
      yearly: rule.interval === 1 ? 'rok' : 'rokov',
    }
    description = `Každých ${rule.interval} ${intervalLabels[rule.frequency]}`
  }

  if (rule.frequency === 'weekly' && rule.weekDays && rule.weekDays.length > 0) {
    const dayLabels: Record<WeekDay, string> = {
      monday: 'Po',
      tuesday: 'Ut',
      wednesday: 'St',
      thursday: 'Št',
      friday: 'Pi',
      saturday: 'So',
      sunday: 'Ne',
    }
    const days = rule.weekDays.map(d => dayLabels[d]).join(', ')
    description += ` (${days})`
  }

  if (rule.frequency === 'monthly' && rule.monthDay) {
    description += ` ${rule.monthDay}. dňa`
  }

  if (rule.endDate) {
    description += ` do ${new Date(rule.endDate).toLocaleDateString('sk')}`
  }

  if (rule.endAfterOccurrences) {
    description += ` (${rule.endAfterOccurrences}x)`
  }

  return description
}

export function shouldCreateNextOccurrence(
  rule: RecurrenceRule,
  currentOccurrences: number
): boolean {
  // Check occurrence limit
  if (rule.endAfterOccurrences && currentOccurrences >= rule.endAfterOccurrences) {
    return false
  }

  // Check date limit
  if (rule.endDate && new Date() >= new Date(rule.endDate)) {
    return false
  }

  return true
}
