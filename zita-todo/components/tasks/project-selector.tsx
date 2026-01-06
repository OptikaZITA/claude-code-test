'use client'

import { useState, useRef, useEffect } from 'react'
import { FolderKanban, ChevronDown, Check, X } from 'lucide-react'
import { Project } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

interface ProjectSelectorProps {
  value?: Project | null
  onChange: (project: Project | null) => void
  className?: string
}

export function ProjectSelector({
  value,
  onChange,
  className,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('status', 'active')
          .order('name', { ascending: true })

        if (error) throw error
        setProjects(data || [])
      } catch (error) {
        console.error('Error fetching projects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [supabase])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (project: Project | null) => {
    onChange(project)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          'border border-[var(--border-primary)] bg-[var(--bg-primary)]',
          'hover:border-[var(--color-primary)]',
          !value && 'text-[var(--text-secondary)]'
        )}
      >
        <FolderKanban className="h-4 w-4" />
        <span className="flex-1 text-left truncate">
          {value ? value.name : 'Bez projektu'}
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-[var(--border-primary)]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hladaj projekt..."
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg',
                'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                'placeholder:text-[var(--text-secondary)]',
                'outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
              )}
            />
          </div>

          {/* Projects list */}
          <div className="max-h-48 overflow-y-auto p-2">
            {/* No project option */}
            <button
              onClick={() => handleSelect(null)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2',
                'hover:bg-[var(--bg-secondary)] transition-colors',
                !value && 'bg-[var(--bg-secondary)]'
              )}
            >
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Bez projektu
                </span>
              </div>
              {!value && (
                <Check className="h-4 w-4 text-[var(--color-primary)]" />
              )}
            </button>

            {loading ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                Načítavam...
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                Žiadne projekty
              </div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2',
                    'hover:bg-[var(--bg-secondary)] transition-colors',
                    value?.id === project.id && 'bg-[var(--bg-secondary)]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: project.color || '#007AFF' }}
                    />
                    <span className="text-sm text-[var(--text-primary)]">
                      {project.name}
                    </span>
                  </div>
                  {value?.id === project.id && (
                    <Check className="h-4 w-4 text-[var(--color-primary)]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
