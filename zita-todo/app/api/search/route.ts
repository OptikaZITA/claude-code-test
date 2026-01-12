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

    const searchPattern = `%${query}%`

    // Parallel search queries
    const [tasksResult, projectsResult, areasResult, tagsResult, usersResult] = await Promise.all([
      // Tasks - search in title and notes
      supabase
        .from('tasks')
        .select(`
          id,
          title,
          notes,
          status,
          due_date,
          deadline,
          when_type,
          when_date,
          area:areas(id, name, color),
          project:projects(id, name, color)
        `)
        .is('deleted_at', null)
        .or(`title.ilike.${searchPattern},notes.ilike.${searchPattern}`)
        .order('created_at', { ascending: false })
        .limit(limit),

      // Projects - search in title and notes
      supabase
        .from('projects')
        .select(`
          id,
          name,
          notes,
          color,
          status,
          area:areas(id, name, color)
        `)
        .or(`name.ilike.${searchPattern},notes.ilike.${searchPattern}`)
        .order('created_at', { ascending: false })
        .limit(limit),

      // Areas - search in name (only global areas = departments)
      supabase
        .from('areas')
        .select('id, name, color, icon')
        .eq('is_global', true)
        .ilike('name', searchPattern)
        .order('name', { ascending: true })
        .limit(limit),

      // Tags - search in name
      supabase
        .from('tags')
        .select('id, name, color')
        .ilike('name', searchPattern)
        .order('name', { ascending: true })
        .limit(limit),

      // Users - search in full_name, nickname, email
      supabase
        .from('users')
        .select('id, full_name, nickname, email, avatar_url')
        .or(`full_name.ilike.${searchPattern},nickname.ilike.${searchPattern},email.ilike.${searchPattern}`)
        .order('full_name', { ascending: true })
        .limit(limit),
    ])

    return NextResponse.json({
      tasks: tasksResult.data || [],
      projects: projectsResult.data || [],
      areas: areasResult.data || [],
      tags: tagsResult.data || [],
      users: usersResult.data || [],
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Nastala neočakávaná chyba' }, { status: 500 })
  }
}
