'use client'

import { useState, useEffect, useCallback } from 'react'

export interface TimeEntry {
  id: string
  date: string
  startedAt: string  // Full timestamp for time display
  endedAt: string | null  // Full timestamp for end time
  userId: string
  userName: string
  userNickname: string
  areaId: string | null
  areaName: string | null
  projectId: string | null
  projectName: string | null
  taskId: string
  taskTitle: string
  tags: string[]
  durationSeconds: number
  description: string | null
}

export interface SummaryItem {
  id: string
  label: string
  type: 'user' | 'area' | 'project' | 'tag'
  totalSeconds: number
  percent: number
}

export interface DayEntry {
  date: string
  totalSeconds: number
}

export interface TimeReportData {
  totalSeconds: number
  entryCount: number
  avgPerDay: number
  summary: SummaryItem[]
  byDay: DayEntry[]
  entries: TimeEntry[]
}

export interface TimeReportFilters {
  from: string
  to: string
  userIds?: string[]
  areaIds?: string[]
  projectIds?: string[]
  tagIds?: string[]
  onlyMine?: boolean
  groupBy?: 'user' | 'area' | 'project' | 'tag' | 'none'
}

export function useTimeReport(filters: TimeReportFilters) {
  const [data, setData] = useState<TimeReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('from', filters.from)
      params.set('to', filters.to)

      if (filters.groupBy) {
        params.set('groupBy', filters.groupBy)
      }

      if (filters.onlyMine) {
        params.set('onlyMine', 'true')
      }

      filters.userIds?.forEach(id => params.append('userId', id))
      filters.areaIds?.forEach(id => params.append('areaId', id))
      filters.projectIds?.forEach(id => params.append('projectId', id))
      filters.tagIds?.forEach(id => params.append('tagId', id))

      // Add cache-busting parameter to ensure fresh data
      params.set('_t', Date.now().toString())
      const response = await fetch(`/api/time/report?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chyba pri načítaní reportu')
      }

      const reportData = await response.json()
      setData(reportData)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [
    filters.from,
    filters.to,
    filters.groupBy,
    filters.onlyMine,
    JSON.stringify(filters.userIds),
    JSON.stringify(filters.areaIds),
    JSON.stringify(filters.projectIds),
    JSON.stringify(filters.tagIds),
  ])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const exportCSV = useCallback(async () => {
    const params = new URLSearchParams()
    params.set('from', filters.from)
    params.set('to', filters.to)

    if (filters.onlyMine) {
      params.set('onlyMine', 'true')
    }

    filters.userIds?.forEach(id => params.append('userId', id))
    filters.areaIds?.forEach(id => params.append('areaId', id))
    filters.projectIds?.forEach(id => params.append('projectId', id))
    filters.tagIds?.forEach(id => params.append('tagId', id))

    try {
      const response = await fetch(`/api/time/report/export?${params}`)

      if (!response.ok) {
        throw new Error('Chyba pri exporte')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `time-report-${filters.from}-${filters.to}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export error:', err)
      throw err
    }
  }, [
    filters.from,
    filters.to,
    filters.onlyMine,
    JSON.stringify(filters.userIds),
    JSON.stringify(filters.areaIds),
    JSON.stringify(filters.projectIds),
    JSON.stringify(filters.tagIds),
  ])

  return { data, loading, error, refetch: fetchReport, exportCSV }
}
