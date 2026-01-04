'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heading } from '@/types'

export function useHeadings(projectId: string | null) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchHeadings = useCallback(async () => {
    if (!projectId) {
      setHeadings([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('headings')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setHeadings(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase, projectId])

  useEffect(() => {
    fetchHeadings()
  }, [fetchHeadings])

  const createHeading = async (title: string) => {
    if (!projectId) throw new Error('Project ID is required')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get max sort_order
    const maxOrder = headings.reduce((max, h) => Math.max(max, h.sort_order), -1)

    const { data, error } = await supabase
      .from('headings')
      .insert({
        project_id: projectId,
        user_id: user.id,
        title,
        sort_order: maxOrder + 1,
      })
      .select()
      .single()

    if (error) throw error
    await fetchHeadings()
    return data
  }

  const updateHeading = async (headingId: string, updates: Partial<Heading>) => {
    const { data, error } = await supabase
      .from('headings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', headingId)
      .select()
      .single()

    if (error) throw error
    await fetchHeadings()
    return data
  }

  const deleteHeading = async (headingId: string) => {
    // First, remove heading_id from tasks that reference this heading
    await supabase
      .from('tasks')
      .update({ heading_id: null })
      .eq('heading_id', headingId)

    const { error } = await supabase
      .from('headings')
      .delete()
      .eq('id', headingId)

    if (error) throw error
    await fetchHeadings()
  }

  const reorderHeadings = async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) => ({
      id,
      sort_order: index,
      updated_at: new Date().toISOString(),
    }))

    for (const update of updates) {
      await supabase
        .from('headings')
        .update({ sort_order: update.sort_order, updated_at: update.updated_at })
        .eq('id', update.id)
    }

    await fetchHeadings()
  }

  return {
    headings,
    loading,
    error,
    refetch: fetchHeadings,
    createHeading,
    updateHeading,
    deleteHeading,
    reorderHeadings,
  }
}
