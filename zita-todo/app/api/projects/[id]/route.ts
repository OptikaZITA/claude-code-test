import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nie ste prihlásení' },
        { status: 401 }
      )
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, area_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projekt nebol nájdený' },
        { status: 404 }
      )
    }

    // Soft delete - move project to trash
    const now = new Date().toISOString()

    // Also soft delete tasks in the project
    const { error: softDeleteTasksError } = await supabase
      .from('tasks')
      .update({ deleted_at: now, updated_at: now })
      .eq('project_id', projectId)
      .is('deleted_at', null)

    if (softDeleteTasksError) {
      console.error('Error soft deleting tasks:', softDeleteTasksError)
      return NextResponse.json(
        { error: 'Chyba pri mazaní úloh' },
        { status: 500 }
      )
    }

    // Soft delete the project
    const { error: deleteProjectError } = await supabase
      .from('projects')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', projectId)

    if (deleteProjectError) {
      console.error('Error deleting project:', deleteProjectError)
      return NextResponse.json(
        { error: 'Chyba pri mazaní projektu' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Projekt bol presunutý do koša'
    })

  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Interná chyba servera' },
      { status: 500 }
    )
  }
}
