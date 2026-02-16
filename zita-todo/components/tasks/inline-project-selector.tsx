'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FolderOpen, Check, X } from 'lucide-react'
import { Project } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

interface InlineProjectSelectorProps {
  value?: Project | null
  onChange: (projectId: string | null) => void
}

export function InlineProjectSelector({
  value,
  onChange,
}: InlineProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const hasValue = !!value

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

    if (isOpen) {
      fetchProjects()
    }
  }, [isOpen, supabase])

  // Update dropdown position when opened
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const dropdownWidth = 256 // w-64 = 16rem = 256px

      // Position below the trigger, aligned to the right
      let left = rect.right - dropdownWidth
      const top = rect.bottom + 8

      // Ensure dropdown doesn't go off-screen left
      if (left < 8) left = 8

      setDropdownPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
      setDropdownPosition(null)
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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
    onChange(project?.id || null)
    setIsOpen(false)
    setSearch('')
    setDropdownPosition(null)
  }

  return (
    <>
      {/* Icon trigger */}
      <button
        ref={triggerRef}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false)
            setDropdownPosition(null)
          } else {
            setIsOpen(true)
          }
        }}
        className={cn(
          'p-2 rounded-lg transition-colors',
          hasValue
            ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
        )}
        title={hasValue ? `Projekt: ${value.name}` : 'Priradiť k projektu'}
      >
        <FolderOpen className="w-4 h-4" />
      </button>

      {/* Dropdown via Portal */}
      {isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-64 rounded-xl border border-[var(--border)] bg-card shadow-xl z-[9999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-[var(--border-primary)]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať projekt..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
        </div>,
        document.body
      )}
    </>
  )
}
