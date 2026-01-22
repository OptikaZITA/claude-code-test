'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, parseISO, addDays } from 'date-fns'
import { sk } from 'date-fns/locale'

export interface TimeFilters {
  from: string
  to: string
  areaIds: string[]
  projectIds: string[]
  userIds: string[]
  tagIds: string[]
  onlyMine: boolean
  groupBy: 'user' | 'area' | 'project' | 'tag'
}

export type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'custom'

function getDateRange(period: TimePeriod, customFrom?: string, customTo?: string): { from: string; to: string } {
  const today = new Date()
  // "to" is exclusive, so tomorrow = today's data included
  const tomorrow = addDays(today, 1)
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd')

  switch (period) {
    case 'today':
      const todayStr = format(today, 'yyyy-MM-dd')
      return { from: todayStr, to: tomorrowStr }
    case 'week': {
      const weekStart = startOfWeek(today, { locale: sk, weekStartsOn: 1 })
      // End at tomorrow (today included), not end of week (which might be in the future)
      return {
        from: format(weekStart, 'yyyy-MM-dd'),
        to: tomorrowStr,
      }
    }
    case 'month': {
      // Start of month to tomorrow (today included)
      return {
        from: format(startOfMonth(today), 'yyyy-MM-dd'),
        to: tomorrowStr,
      }
    }
    case 'year': {
      // Start of year to tomorrow (today included)
      return {
        from: format(startOfYear(today), 'yyyy-MM-dd'),
        to: tomorrowStr,
      }
    }
    case 'custom':
      if (customFrom && customTo) {
        return { from: customFrom, to: customTo }
      }
      // Default to this week
      return {
        from: format(startOfWeek(today, { locale: sk, weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: tomorrowStr,
      }
    default:
      return {
        from: format(startOfWeek(today, { locale: sk, weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: tomorrowStr,
      }
  }
}

function detectPeriod(from: string, to: string): TimePeriod {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(today, { locale: sk, weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const yearStart = format(startOfYear(today), 'yyyy-MM-dd')

  // All periods now end at tomorrow (today included)
  if (from === todayStr && to === tomorrowStr) return 'today'
  if (from === weekStart && to === tomorrowStr) return 'week'
  if (from === monthStart && to === tomorrowStr) return 'month'
  if (from === yearStart && to === tomorrowStr) return 'year'
  return 'custom'
}

export function useTimeFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse filters from URL
  const filters: TimeFilters = useMemo(() => {
    const defaultRange = getDateRange('week')

    return {
      from: searchParams.get('from') || defaultRange.from,
      to: searchParams.get('to') || defaultRange.to,
      areaIds: searchParams.getAll('areaId'),
      projectIds: searchParams.getAll('projectId'),
      userIds: searchParams.getAll('userId'),
      tagIds: searchParams.getAll('tagId'),
      onlyMine: searchParams.get('onlyMine') === 'true',
      groupBy: (searchParams.get('groupBy') as 'user' | 'area' | 'project' | 'tag') || 'user',
    }
  }, [searchParams])

  // Get period from URL or detect from dates
  const period: TimePeriod = useMemo(() => {
    const urlPeriod = searchParams.get('period') as TimePeriod | null
    if (urlPeriod && ['today', 'week', 'month', 'year', 'custom'].includes(urlPeriod)) {
      return urlPeriod
    }
    return detectPeriod(filters.from, filters.to)
  }, [searchParams, filters.from, filters.to])

  // Update filters in URL (internal, without period)
  const updateUrlWithFilters = useCallback(
    (newFilters: Partial<TimeFilters>, newPeriod?: TimePeriod) => {
      const params = new URLSearchParams()

      const merged = { ...filters, ...newFilters }

      params.set('from', merged.from)
      params.set('to', merged.to)

      // Always include period in URL to differentiate between same date ranges
      if (newPeriod) {
        params.set('period', newPeriod)
      } else {
        // Preserve existing period if not changing
        const existingPeriod = searchParams.get('period')
        if (existingPeriod) {
          params.set('period', existingPeriod)
        }
      }

      if (merged.onlyMine) {
        params.set('onlyMine', 'true')
      }

      if (merged.groupBy && merged.groupBy !== 'user') {
        params.set('groupBy', merged.groupBy)
      }

      merged.areaIds.forEach(id => params.append('areaId', id))
      merged.projectIds.forEach(id => params.append('projectId', id))
      merged.userIds.forEach(id => params.append('userId', id))
      merged.tagIds.forEach(id => params.append('tagId', id))

      router.push(`${pathname}?${params.toString()}`)
    },
    [filters, pathname, router, searchParams]
  )

  // Update filters in URL (public API)
  const setFilters = useCallback(
    (newFilters: Partial<TimeFilters>) => {
      updateUrlWithFilters(newFilters)
    },
    [updateUrlWithFilters]
  )

  // Set period (convenience method)
  const setPeriod = useCallback(
    (newPeriod: TimePeriod, customFrom?: string, customTo?: string) => {
      const range = getDateRange(newPeriod, customFrom, customTo)
      updateUrlWithFilters({ from: range.from, to: range.to }, newPeriod)
    },
    [updateUrlWithFilters]
  )

  // Clear all filters
  const clearFilters = useCallback(() => {
    const defaultRange = getDateRange('week')
    router.push(`${pathname}?from=${defaultRange.from}&to=${defaultRange.to}&period=week`)
  }, [pathname, router])

  // Check if any filters are active (besides default period)
  const hasActiveFilters = useMemo(() => {
    return (
      filters.areaIds.length > 0 ||
      filters.projectIds.length > 0 ||
      filters.userIds.length > 0 ||
      filters.tagIds.length > 0 ||
      filters.onlyMine
    )
  }, [filters])

  return {
    filters,
    period,
    setFilters,
    setPeriod,
    clearFilters,
    hasActiveFilters,
  }
}

// Helper to format period label
export function formatPeriodLabel(period: TimePeriod, from: string, to: string): string {
  switch (period) {
    case 'today':
      return 'Dnes'
    case 'week':
      return 'Tento týždeň'
    case 'month':
      return 'Tento mesiac'
    case 'year':
      return 'Tento rok'
    case 'custom':
      try {
        const fromDate = parseISO(from)
        const toDate = parseISO(to)
        return `${format(fromDate, 'd.M.yyyy', { locale: sk })} - ${format(toDate, 'd.M.yyyy', { locale: sk })}`
      } catch {
        return 'Vlastné obdobie'
      }
    default:
      return ''
  }
}
