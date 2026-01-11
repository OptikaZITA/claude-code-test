'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { Timer } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { TimeDashboardFilters } from '@/components/time-tracking/time-dashboard-filters'
import { TimeDashboardSummary } from '@/components/time-tracking/time-dashboard-summary'
import { TimeDashboardCharts } from '@/components/time-tracking/time-dashboard-charts'
import { TimeDashboardTable } from '@/components/time-tracking/time-dashboard-table'
import { useTimeFilters, TimeFilters } from '@/lib/hooks/use-time-filters'
import { useTimeReport } from '@/lib/hooks/use-time-report'
import { useCascadingTimeFilters } from '@/lib/hooks/use-cascading-time-filters'
import { useTags } from '@/lib/hooks/use-tags'
import { useTasks } from '@/lib/hooks/use-tasks'
import { createClient } from '@/lib/supabase/client'

function TimeDashboardContent() {
  const { filters, period, setFilters, setPeriod } = useTimeFilters()
  const { data, loading, error, exportCSV, refetch } = useTimeReport({
    from: filters.from,
    to: filters.to,
    userIds: filters.userIds,
    areaIds: filters.areaIds,
    projectIds: filters.projectIds,
    tagIds: filters.tagIds,
    onlyMine: filters.onlyMine,
    groupBy: filters.groupBy,
  })

  // Use cascading filters hook for filtered options
  const cascadingOptions = useCascadingTimeFilters({ filters })
  const { tags, loading: tagsLoading } = useTags()
  const { tasks } = useTasks()

  const [isExporting, setIsExporting] = useState(false)
  const [tableMode, setTableMode] = useState<'summary' | 'detailed'>('summary')
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()
  const [isAdmin, setIsAdmin] = useState(false)

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        // Check if admin
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        setIsAdmin(userData?.role === 'admin')
      }
    }
    fetchCurrentUser()
  }, [])

  // Handle cascading filter changes
  const handleCascadingFilterChange = useCallback((newFilters: Partial<TimeFilters>) => {
    // When area changes, reset project if it doesn't belong to selected areas
    if ('areaIds' in newFilters) {
      const newAreaIds = newFilters.areaIds || []

      if (newAreaIds.length > 0 && filters.projectIds.length > 0) {
        // Filter out projects that don't belong to selected areas
        const validProjectIds = filters.projectIds.filter(projectId => {
          const project = cascadingOptions.projects.find(p => p.id === projectId)
          return project && project.area_id && newAreaIds.includes(project.area_id)
        })

        if (validProjectIds.length !== filters.projectIds.length) {
          newFilters.projectIds = validProjectIds
        }
      }
    }

    // When project changes, auto-set area if not already set
    if ('projectIds' in newFilters && newFilters.projectIds && newFilters.projectIds.length > 0) {
      const firstProjectId = newFilters.projectIds[0]
      const project = cascadingOptions.projects.find(p => p.id === firstProjectId)

      if (project?.area_id && filters.areaIds.length === 0) {
        newFilters.areaIds = [project.area_id]
      }
    }

    setFilters(newFilters)
  }, [filters, cascadingOptions.projects, setFilters])

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

  const isLoadingFilters = cascadingOptions.loading || tagsLoading

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
          onFiltersChange={handleCascadingFilterChange}
          onPeriodChange={setPeriod}
          onExport={handleExport}
          areas={cascadingOptions.areas}
          projects={cascadingOptions.projects}
          users={cascadingOptions.users}
          tags={tags.map(t => ({ id: t.id, name: t.name, color: t.color }))}
          isExporting={isExporting}
          isLoading={isLoadingFilters}
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
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              tasks={tasks}
              onRefresh={refetch}
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
