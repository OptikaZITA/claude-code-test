import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const limit = parseInt(searchParams.get('limit') || '5')

    // Minimum 2 characters required
    if (!query || query.length < 2) {
      return NextResponse.json({
        tasks: [],
        projects: [],
        areas: [],
        tags: [],
        users: [],
      })
    }

    // Parallel search queries using accent-insensitive RPC functions
    const [tasksResult, projectsResult, areasResult, tagsResult, usersResult] = await Promise.all([
      // Tasks - accent-insensitive search in title and notes
      supabase.rpc('search_tasks_unaccent', {
        search_query: query,
        result_limit: limit
      }),

      // Projects - accent-insensitive search in name and notes
      supabase.rpc('search_projects_unaccent', {
        search_query: query,
        result_limit: limit
      }),

      // Areas - accent-insensitive search in name (only departments)
      supabase.rpc('search_areas_unaccent', {
        search_query: query,
        result_limit: limit
      }),

      // Tags - accent-insensitive search in name
      supabase.rpc('search_tags_unaccent', {
        search_query: query,
        result_limit: limit
      }),

      // Users - accent-insensitive search in full_name, nickname, email
      supabase.rpc('search_users_unaccent', {
        search_query: query,
        result_limit: limit
      }),
    ])

    // Transform tasks result to match expected format
    const tasks = (tasksResult.data || []).map((t: {
      id: string
      title: string
      notes: string | null
      status: string
      due_date: string | null
      deadline: string | null
      when_type: string | null
      when_date: string | null
      area_id: string | null
      area_name: string | null
      area_color: string | null
      project_id: string | null
      project_name: string | null
      project_color: string | null
    }) => ({
      id: t.id,
      title: t.title,
      notes: t.notes,
      status: t.status,
      due_date: t.due_date,
      deadline: t.deadline,
      when_type: t.when_type,
      when_date: t.when_date,
      area: t.area_id ? { id: t.area_id, name: t.area_name, color: t.area_color } : null,
      project: t.project_id ? { id: t.project_id, name: t.project_name, color: t.project_color } : null,
    }))

    // Transform projects result to match expected format
    const projects = (projectsResult.data || []).map((p: {
      id: string
      name: string
      notes: string | null
      color: string | null
      status: string
      area_id: string | null
      area_name: string | null
      area_color: string | null
    }) => ({
      id: p.id,
      name: p.name,
      notes: p.notes,
      color: p.color,
      status: p.status,
      area: p.area_id ? { id: p.area_id, name: p.area_name, color: p.area_color } : null,
    }))

    return NextResponse.json({
      tasks,
      projects,
      areas: areasResult.data || [],
      tags: tagsResult.data || [],
      users: usersResult.data || [],
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Nastala neočakávaná chyba' }, { status: 500 })
  }
}
