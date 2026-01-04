'use client'

import { useState, useRef, useEffect } from 'react'
import { FolderOpen, Layers, Check, X, ChevronRight } from 'lucide-react'
import { Project, Area } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

interface AreaWithProjects extends Area {
  projects: Project[]
}

interface LocationValue {
  area?: Area | null
  project?: Project | null
}

interface InlineLocationSelectorProps {
  value: LocationValue
  onChange: (areaId: string | null, projectId: string | null) => void
}

export function InlineLocationSelector({
  value,
  onChange,
}: InlineLocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [areas, setAreas] = useState<AreaWithProjects[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const hasValue = !!value.area || !!value.project

  // Fetch areas with projects
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch areas with their projects
        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select(`
            *,
            projects (
              id,
              name,
              color,
              status,
              area_id
            )
          `)
          .is('archived_at', null)
          .order('sort_order', { ascending: true })

        if (areasError) throw areasError

        // Filter to only active projects
        const areasWithActiveProjects = (areasData || []).map(area => ({
          ...area,
          projects: (area.projects || []).filter((p: Project) => p.status === 'active')
        }))

        setAreas(areasWithActiveProjects)

        // Auto-expand area that contains current selection
        if (value.project?.area_id) {
          setExpandedAreas(new Set([value.project.area_id]))
        } else if (value.area?.id) {
          setExpandedAreas(new Set([value.area.id]))
        }
      } catch (error) {
        console.error('Error fetching areas:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchData()
    }
  }, [isOpen, supabase, value.project?.area_id, value.area?.id])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const toggleAreaExpand = (areaId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newExpanded = new Set(expandedAreas)
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId)
    } else {
      newExpanded.add(areaId)
    }
    setExpandedAreas(newExpanded)
  }

  // Filter areas and projects by search
  const filteredAreas = areas.map(area => ({
    ...area,
    projects: area.projects.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase())
    ),
    matchesSearch: area.name.toLowerCase().includes(search.toLowerCase())
  })).filter(area =>
    area.matchesSearch || area.projects.length > 0
  )

  const handleSelectNone = () => {
    onChange(null, null)
    setIsOpen(false)
    setSearch('')
  }

  const handleSelectArea = (area: Area) => {
    onChange(area.id, null)
    setIsOpen(false)
    setSearch('')
  }

  const handleSelectProject = (project: Project) => {
    onChange(project.area_id, project.id)
    setIsOpen(false)
    setSearch('')
  }

  // Determine display text
  const getDisplayTitle = () => {
    if (value.project) {
      return `Projekt: ${value.project.name}`
    }
    if (value.area) {
      return `Oddelenie: ${value.area.name}`
    }
    return 'Priradiť k oddeleniu/projektu'
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Icon trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2 rounded-lg transition-colors',
          hasValue
            ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
        )}
        title={getDisplayTitle()}
      >
        {value.project ? (
          <FolderOpen className="w-4 h-4" />
        ) : (
          <Layers className="w-4 h-4" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-xl z-50">
          {/* Search input */}
          <div className="p-2 border-b border-[var(--border-primary)]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať oddelenie alebo projekt..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {/* No location option */}
            <button
              onClick={handleSelectNone}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2',
                'hover:bg-[var(--bg-secondary)] transition-colors',
                !hasValue && 'bg-[var(--bg-secondary)]'
              )}
            >
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Bez priradenia
                </span>
              </div>
              {!hasValue && (
                <Check className="h-4 w-4 text-[var(--color-primary)]" />
              )}
            </button>

            {loading ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                Načítavam...
              </div>
            ) : filteredAreas.length === 0 ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                Žiadne výsledky
              </div>
            ) : (
              filteredAreas.map((area) => (
                <div key={area.id} className="mt-1">
                  {/* Area header - clickable to select area directly */}
                  <div
                    className={cn(
                      'flex items-center rounded-lg transition-colors',
                      value.area?.id === area.id && !value.project && 'bg-[var(--bg-secondary)]'
                    )}
                  >
                    {/* Expand toggle */}
                    {area.projects.length > 0 && (
                      <button
                        onClick={(e) => toggleAreaExpand(area.id, e)}
                        className="p-2 hover:bg-[var(--bg-hover)] rounded-lg"
                      >
                        <ChevronRight
                          className={cn(
                            'h-3 w-3 text-[var(--text-secondary)] transition-transform',
                            expandedAreas.has(area.id) && 'rotate-90'
                          )}
                        />
                      </button>
                    )}

                    {/* Area selection button */}
                    <button
                      onClick={() => handleSelectArea(area)}
                      className={cn(
                        'flex flex-1 items-center justify-between py-2 pr-3',
                        area.projects.length === 0 && 'pl-3',
                        'hover:bg-[var(--bg-secondary)] rounded-lg transition-colors'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: area.color || '#007AFF' }}
                        />
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {area.name}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          (oddelenie)
                        </span>
                      </div>
                      {value.area?.id === area.id && !value.project && (
                        <Check className="h-4 w-4 text-[var(--color-primary)]" />
                      )}
                    </button>
                  </div>

                  {/* Projects under area */}
                  {expandedAreas.has(area.id) && area.projects.length > 0 && (
                    <div className="ml-5 border-l-2 border-[var(--border-primary)] pl-2">
                      {area.projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleSelectProject(project)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg px-3 py-2',
                            'hover:bg-[var(--bg-secondary)] transition-colors',
                            value.project?.id === project.id && 'bg-[var(--bg-secondary)]'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-3 w-3 text-[var(--text-secondary)]" />
                            <span className="text-sm text-[var(--text-primary)]">
                              {project.name}
                            </span>
                          </div>
                          {value.project?.id === project.id && (
                            <Check className="h-4 w-4 text-[var(--color-primary)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Help text */}
          <div className="p-2 border-t border-[var(--border-primary)]">
            <p className="text-xs text-[var(--text-secondary)] text-center">
              Vyber oddelenie alebo konkrétny projekt
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
