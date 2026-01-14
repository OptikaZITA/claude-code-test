'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useSearch } from '@/lib/hooks/use-search'
import { SearchResultItem, SearchResultType } from './search-result-item'
import { cn } from '@/lib/utils/cn'

interface FlatResult {
  type: SearchResultType
  item: any
  id: string
}

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { results, isLoading, hasResults } = useSearch(query)

  // Flatten results for keyboard navigation
  const flatResults: FlatResult[] = [
    ...results.tasks.map(t => ({ type: 'task' as SearchResultType, item: t, id: t.id })),
    ...results.projects.map(p => ({ type: 'project' as SearchResultType, item: p, id: p.id })),
    ...results.areas.map(a => ({ type: 'area' as SearchResultType, item: a, id: a.id })),
    ...results.tags.map(t => ({ type: 'tag' as SearchResultType, item: t, id: t.id })),
    ...results.users.map(u => ({ type: 'user' as SearchResultType, item: u, id: u.id })),
  ]

  // Keyboard shortcut: /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on "/" key (not in inputs)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as Element).tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Handle result selection
  const handleSelect = useCallback((result: FlatResult) => {
    switch (result.type) {
      case 'task':
        // For now, navigate to today page where task might be
        // In future: open task detail panel
        window.dispatchEvent(new CustomEvent('search:select-task', { detail: result.item }))
        break
      case 'project':
        router.push(`/projects/${result.id}`)
        break
      case 'area':
        router.push(`/areas/${result.id}`)
        break
      case 'tag':
        // Could filter by tag - for now just close
        break
      case 'user':
        // Could filter by assignee - for now just close
        break
    }
    setIsOpen(false)
    setQuery('')
  }, [router])

  // Keyboard navigation in dropdown
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && query.length >= 2) {
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setQuery('')
        inputRef.current?.blur()
        break
    }
  }, [isOpen, flatResults, selectedIndex, handleSelect, query.length])

  const clearSearch = () => {
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const showDropdown = isOpen && query.length >= 2

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Hľadať úlohy, projekty..."
          className="w-64 pl-9 pr-8 bg-background"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 w-full min-w-[350px] max-w-[400px] bg-card text-foreground border border-border rounded-lg shadow-xl z-[100] max-h-[70vh] overflow-auto"
        >
          {isLoading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-muted-foreground text-[13px]">
              Žiadne výsledky pre "{query}"
            </div>
          ) : (
            <div className="py-2">
              {/* Tasks Section */}
              {results.tasks.length > 0 && (
                <div className="px-2 pb-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                    Úlohy
                  </div>
                  {results.tasks.map((task, i) => {
                    const globalIndex = i
                    return (
                      <SearchResultItem
                        key={task.id}
                        type="task"
                        item={task}
                        isSelected={selectedIndex === globalIndex}
                        onClick={() => handleSelect({ type: 'task', item: task, id: task.id })}
                      />
                    )
                  })}
                </div>
              )}

              {/* Projects Section */}
              {results.projects.length > 0 && (
                <div className="px-2 pb-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                    Projekty
                  </div>
                  {results.projects.map((project, i) => {
                    const globalIndex = results.tasks.length + i
                    return (
                      <SearchResultItem
                        key={project.id}
                        type="project"
                        item={project}
                        isSelected={selectedIndex === globalIndex}
                        onClick={() => handleSelect({ type: 'project', item: project, id: project.id })}
                      />
                    )
                  })}
                </div>
              )}

              {/* Areas Section */}
              {results.areas.length > 0 && (
                <div className="px-2 pb-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                    Oddelenia
                  </div>
                  {results.areas.map((area, i) => {
                    const globalIndex = results.tasks.length + results.projects.length + i
                    return (
                      <SearchResultItem
                        key={area.id}
                        type="area"
                        item={area}
                        isSelected={selectedIndex === globalIndex}
                        onClick={() => handleSelect({ type: 'area', item: area, id: area.id })}
                      />
                    )
                  })}
                </div>
              )}

              {/* Tags Section */}
              {results.tags.length > 0 && (
                <div className="px-2 pb-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                    Tagy
                  </div>
                  {results.tags.map((tag, i) => {
                    const globalIndex = results.tasks.length + results.projects.length + results.areas.length + i
                    return (
                      <SearchResultItem
                        key={tag.id}
                        type="tag"
                        item={tag}
                        isSelected={selectedIndex === globalIndex}
                        onClick={() => handleSelect({ type: 'tag', item: tag, id: tag.id })}
                      />
                    )
                  })}
                </div>
              )}

              {/* Users Section */}
              {results.users.length > 0 && (
                <div className="px-2 pb-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                    Používatelia
                  </div>
                  {results.users.map((user, i) => {
                    const globalIndex = results.tasks.length + results.projects.length + results.areas.length + results.tags.length + i
                    return (
                      <SearchResultItem
                        key={user.id}
                        type="user"
                        item={user}
                        isSelected={selectedIndex === globalIndex}
                        onClick={() => handleSelect({ type: 'user', item: user, id: user.id })}
                      />
                    )
                  })}
                </div>
              )}

              {/* Footer hint */}
              <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>↑↓ navigácia</span>
                <span>Enter výber</span>
                <span>Esc zavrieť</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
