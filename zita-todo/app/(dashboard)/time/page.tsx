'use client'

import { useState, useEffect, Suspense } from 'react'
import { Timer } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { TimeDashboardFilters } from '@/components/time-tracking/time-dashboard-filters'
import { TimeDashboardSummary } from '@/components/time-tracking/time-dashboard-summary'
import { TimeDashboardCharts } from '@/components/time-tracking/time-dashboard-charts'
import { TimeDashboardTable } from '@/components/time-tracking/time-dashboard-table'
import { useTimeFilters } from '@/lib/hooks/use-time-filters'
import { useTimeReport } from '@/lib/hooks/use-time-report'
import { useAreas } from '@/lib/hooks/use-areas'
import { useTags } from '@/lib/hooks/use-tags'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  full_name: string | null
  nickname: string | null
}

interface Project {
  id: string
  name: string
}

function TimeDashboardContent() {
  const { filters, period, setFilters, setPeriod } = useTimeFilters()
  const { data, loading, error, exportCSV } = useTimeReport({
    from: filters.from,
    to: filters.to,
    userIds: filters.userIds,
    areaIds: filters.areaIds,
    projectIds: filters.projectIds,
    tagIds: filters.tagIds,
    onlyMine: filters.onlyMine,
    groupBy: filters.groupBy,
  })

  const { areas, loading: areasLoading } = useAreas()
  const { tags, loading: tagsLoading } = useTags()

  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [tableMode, setTableMode] = useState<'summary' | 'detailed'>('summary')

  // Fetch users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, nickname')
          .eq('status', 'active')
          .order('nickname', { ascending: true })

        if (error) throw error
        setUsers(data || [])
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setUsersLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Fetch projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .eq('status', 'active')
          .order('name', { ascending: true })

        if (error) throw error
        setProjects(data || [])
      } catch (err) {
        console.error('Error fetching projects:', err)
      } finally {
        setProjectsLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportCSV()
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDrilldown = (id: string, type: string) => {
    // Could navigate to user drilldown page
    console.log('Drilldown:', id, type)
  }

  const isLoadingFilters = areasLoading || tagsLoading || usersLoading || projectsLoading

  if (loading && !data) {
    return (
      <div className="h-full">
        <Header title="Časovač" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full">
        <Header title="Časovač" />
        <div className="p-6">
          <div className="text-center py-12">
            <Timer className="mx-auto h-12 w-12 text-[var(--text-secondary)] mb-4" />
            <p className="text-[var(--color-error)]">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Header title="Časovač" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Filters */}
        <TimeDashboardFilters
          filters={filters}
          period={period}
          onFiltersChange={setFilters}
          onPeriodChange={setPeriod}
          onExport={handleExport}
          areas={areas.map(a => ({ id: a.id, name: a.name }))}
          projects={projects}
          users={users}
          tags={tags.map(t => ({ id: t.id, name: t.name, color: t.color }))}
          isExporting={isExporting}
        />

        {/* Summary cards */}
        {data && (
          <>
            <TimeDashboardSummary
              totalSeconds={data.totalSeconds}
              entryCount={data.entryCount}
              avgPerDay={data.avgPerDay}
            />

            {/* Charts */}
            <TimeDashboardCharts
              byDay={data.byDay}
              summary={data.summary}
              groupBy={filters.groupBy}
              onGroupByChange={groupBy => setFilters({ groupBy })}
              onDrilldown={handleDrilldown}
            />

            {/* Table */}
            <TimeDashboardTable
              summary={data.summary}
              entries={data.entries}
              mode={tableMode}
              onModeChange={setTableMode}
              onUserClick={(userId) => handleDrilldown(userId, 'user')}
              totalSeconds={data.totalSeconds}
            />
          </>
        )}

        {!data && !loading && (
          <div className="text-center py-12">
            <Timer className="mx-auto h-12 w-12 text-[var(--text-secondary)] mb-4" />
            <p className="text-[var(--text-secondary)]">Žiadne dáta pre vybrané obdobie</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TimeDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full">
          <Header title="Časovač" />
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
          </div>
        </div>
      }
    >
      <TimeDashboardContent />
    </Suspense>
  )
}
