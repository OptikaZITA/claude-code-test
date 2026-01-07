'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, X, Download, Users, FolderKanban, Tag, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimeFilters, TimePeriod, formatPeriodLabel } from '@/lib/hooks/use-time-filters'
import { format, parseISO } from 'date-fns'
import { sk } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'

interface FilterOption {
  id: string
  name: string
  color?: string | null
  area_id?: string | null
}

interface TimeDashboardFiltersProps {
  filters: TimeFilters
  period: TimePeriod
  onFiltersChange: (filters: Partial<TimeFilters>) => void
  onPeriodChange: (period: TimePeriod, from?: string, to?: string) => void
  onExport: () => void
  areas: FilterOption[]
  projects: FilterOption[]
  users: FilterOption[]
  tags: FilterOption[]
  isExporting?: boolean
  isLoading?: boolean
}

function MultiSelectDropdown<T extends { id: string }>({
  label,
  icon: Icon,
  items,
  selectedIds,
  onChange,
  getLabel,
  emptyMessage = 'Žiadne položky',
}: {
  label: string
  icon: React.ElementType
  items: T[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  getLabel: (item: T) => string
  emptyMessage?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedCount = selectedIds.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border',
          selectedCount > 0
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
        {selectedCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-xs">
            {selectedCount}
          </span>
        )}
        <ChevronDown className="h-4 w-4 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 max-h-64 overflow-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg">
          {items.length === 0 ? (
            <div className="p-3 text-sm text-[var(--text-secondary)]">{emptyMessage}</div>
          ) : (
            <>
              {selectedCount > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="w-full px-3 py-2 text-left text-sm text-[var(--color-primary)] hover:bg-[var(--bg-hover)] border-b border-[var(--border-primary)]"
                >
                  Zrušiť výber ({selectedCount})
                </button>
              )}
              {items.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        onChange([...selectedIds, item.id])
                      } else {
                        onChange(selectedIds.filter(id => id !== item.id))
                      }
                    }}
                    className="rounded border-[var(--border-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)] truncate">
                    {getLabel(item)}
                  </span>
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PeriodDropdown({
  period,
  filters,
  onChange,
}: {
  period: TimePeriod
  filters: TimeFilters
  onChange: (period: TimePeriod, from?: string, to?: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(filters.from)
  const [customTo, setCustomTo] = useState(filters.to)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const periods: { value: TimePeriod; label: string }[] = [
    { value: 'today', label: 'Dnes' },
    { value: 'week', label: 'Tento týždeň' },
    { value: 'month', label: 'Tento mesiac' },
    { value: 'year', label: 'Tento rok' },
    { value: 'custom', label: 'Vlastné obdobie' },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
      >
        <Calendar className="h-4 w-4" />
        <span>{formatPeriodLabel(period, filters.from, filters.to)}</span>
        <ChevronDown className="h-4 w-4 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => {
                if (p.value !== 'custom') {
                  onChange(p.value)
                  setIsOpen(false)
                }
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)]',
                period === p.value ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--text-primary)]'
              )}
            >
              {p.label}
            </button>
          ))}

          <div className="border-t border-[var(--border-primary)] p-3">
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">Vlastné obdobie</div>
            <div className="flex gap-2 mb-2">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="flex-1 px-2 py-1 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              />
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="flex-1 px-2 py-1 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                onChange('custom', customFrom, customTo)
                setIsOpen(false)
              }}
              className="w-full"
            >
              Použiť
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function TimeDashboardFilters({
  filters,
  period,
  onFiltersChange,
  onPeriodChange,
  onExport,
  areas,
  projects,
  users,
  tags,
  isExporting,
  isLoading,
}: TimeDashboardFiltersProps) {
  // Check if there are any active filters
  const hasActiveFilters =
    filters.areaIds.length > 0 ||
    filters.projectIds.length > 0 ||
    filters.userIds.length > 0 ||
    filters.tagIds.length > 0 ||
    filters.onlyMine

  // Clear all entity filters (not period)
  const handleClearFilters = () => {
    onFiltersChange({
      areaIds: [],
      projectIds: [],
      userIds: [],
      tagIds: [],
      onlyMine: false,
    })
  }

  return (
    <div className="space-y-3">
      {/* First row: Period and multi-selects */}
      <div className="flex flex-wrap items-center gap-2">
        <PeriodDropdown period={period} filters={filters} onChange={onPeriodChange} />

        <MultiSelectDropdown
          label="Oddelenie"
          icon={Building2}
          items={areas}
          selectedIds={filters.areaIds}
          onChange={ids => onFiltersChange({ areaIds: ids })}
          getLabel={item => item.name}
          emptyMessage={isLoading ? 'Načítavam...' : 'Žiadne oddelenia s časom'}
        />

        <MultiSelectDropdown
          label="Projekt"
          icon={FolderKanban}
          items={projects}
          selectedIds={filters.projectIds}
          onChange={ids => onFiltersChange({ projectIds: ids })}
          getLabel={item => item.name}
          emptyMessage={
            isLoading
              ? 'Načítavam...'
              : filters.areaIds.length > 0
              ? 'Žiadne projekty v oddelení'
              : 'Žiadne projekty s časom'
          }
        />

        <MultiSelectDropdown
          label="Kolega"
          icon={Users}
          items={users}
          selectedIds={filters.userIds}
          onChange={ids => onFiltersChange({ userIds: ids })}
          getLabel={item => item.name}
          emptyMessage={
            isLoading
              ? 'Načítavam...'
              : filters.areaIds.length > 0 || filters.projectIds.length > 0
              ? 'Žiadni kolegovia s časom'
              : 'Žiadni kolegovia'
          }
        />

        <MultiSelectDropdown
          label="Tag"
          icon={Tag}
          items={tags}
          selectedIds={filters.tagIds}
          onChange={ids => onFiltersChange({ tagIds: ids })}
          getLabel={item => item.name}
          emptyMessage={isLoading ? 'Načítavam...' : 'Žiadne tagy'}
        />

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Zrušiť filtre</span>
          </button>
        )}
      </div>

      {/* Second row: Toggle and export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.onlyMine}
              onChange={e => onFiltersChange({ onlyMine: e.target.checked })}
              className="rounded border-[var(--border-primary)]"
            />
            <span className="text-sm text-[var(--text-primary)]">Len môj čas</span>
          </label>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exportujem...' : 'Exportovať CSV'}
        </Button>
      </div>
    </div>
  )
}
