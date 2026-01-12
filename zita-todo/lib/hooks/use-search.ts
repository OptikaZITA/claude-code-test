'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SearchResult {
  tasks: Array<{
    id: string
    title: string
    notes: string | null
    status: string | null
    due_date: string | null
    deadline: string | null
    when_type: string | null
    when_date: string | null
    area: { id: string; name: string; color: string | null } | null
    project: { id: string; name: string; color: string | null } | null
  }>
  projects: Array<{
    id: string
    name: string
    notes: string | null
    color: string | null
    status: string | null
    area: { id: string; name: string; color: string | null } | null
  }>
  areas: Array<{
    id: string
    name: string
    color: string | null
    icon: string | null
  }>
  tags: Array<{
    id: string
    name: string
    color: string | null
  }>
  users: Array<{
    id: string
    full_name: string | null
    nickname: string | null
    email: string
    avatar_url: string | null
  }>
}

const emptyResults: SearchResult = {
  tasks: [],
  projects: [],
  areas: [],
  tags: [],
  users: [],
}

export function useSearch(query: string, debounceMs: number = 300) {
  const [results, setResults] = useState<SearchResult>(emptyResults)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Fetch results when debounced query changes
  useEffect(() => {
    const fetchResults = async () => {
      // Minimum 2 characters
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults(emptyResults)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`)

        if (!res.ok) {
          throw new Error('Search failed')
        }

        const data = await res.json()
        setResults(data)
      } catch (err) {
        setError(err as Error)
        setResults(emptyResults)
      } finally {
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [debouncedQuery])

  // Calculate total results count
  const totalResults =
    results.tasks.length +
    results.projects.length +
    results.areas.length +
    results.tags.length +
    results.users.length

  return {
    results,
    isLoading,
    error,
    totalResults,
    hasResults: totalResults > 0,
  }
}
