'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tag } from '@/types'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setTags(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const createTag = async (name: string, color?: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get user's organization_id
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const { data, error } = await supabase
      .from('tags')
      .insert({
        name,
        color: color || '#007AFF',
        organization_id: userData?.organization_id,
      })
      .select()
      .single()

    if (error) throw error
    await fetchTags()
    return data
  }

  const updateTag = async (tagId: string, updates: Partial<Tag>) => {
    const { data, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', tagId)
      .select()
      .single()

    if (error) throw error
    await fetchTags()
    return data
  }

  const deleteTag = async (tagId: string) => {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)

    if (error) throw error
    await fetchTags()
  }

  return {
    tags,
    loading,
    error,
    refetch: fetchTags,
    createTag,
    updateTag,
    deleteTag,
  }
}

export function useTaskTags(taskId: string) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTaskTags = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('item_tags')
        .select(`
          tag:tags(*)
        `)
        .eq('item_type', 'task')
        .eq('item_id', taskId)

      if (error) throw error

      const taskTags = data
        ?.map((item: any) => item.tag)
        .filter(Boolean) as Tag[]

      setTags(taskTags || [])
    } catch (err) {
      console.error('Error fetching task tags:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, taskId])

  useEffect(() => {
    if (taskId) {
      fetchTaskTags()
    }
  }, [taskId, fetchTaskTags])

  const addTag = async (tagId: string) => {
    const { error } = await supabase
      .from('item_tags')
      .insert({
        tag_id: tagId,
        item_type: 'task',
        item_id: taskId,
      })

    if (error && error.code !== '23505') throw error // Ignore duplicate key error
    await fetchTaskTags()
  }

  const removeTag = async (tagId: string) => {
    const { error } = await supabase
      .from('item_tags')
      .delete()
      .eq('tag_id', tagId)
      .eq('item_type', 'task')
      .eq('item_id', taskId)

    if (error) throw error
    await fetchTaskTags()
  }

  const setTaskTags = async (tagIds: string[]) => {
    // Remove all existing tags
    await supabase
      .from('item_tags')
      .delete()
      .eq('item_type', 'task')
      .eq('item_id', taskId)

    // Add new tags
    if (tagIds.length > 0) {
      const { error } = await supabase
        .from('item_tags')
        .insert(
          tagIds.map((tagId) => ({
            tag_id: tagId,
            item_type: 'task',
            item_id: taskId,
          }))
        )

      if (error) throw error
    }

    await fetchTaskTags()
  }

  return {
    tags,
    loading,
    refetch: fetchTaskTags,
    addTag,
    removeTag,
    setTaskTags,
  }
}
