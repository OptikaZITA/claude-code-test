import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const deleteTasks = searchParams.get('deleteTasks') === 'true'

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

    if (deleteTasks) {
      // Delete all tasks in the project
      const { error: deleteTasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId)

      if (deleteTasksError) {
        console.error('Error deleting tasks:', deleteTasksError)
        return NextResponse.json(
          { error: 'Chyba pri mazaní úloh' },
          { status: 500 }
        )
      }
    } else {
      // Move tasks to area (set project_id to NULL, keep area_id)
      const { error: updateTasksError } = await supabase
        .from('tasks')
        .update({
          project_id: null,
          heading_id: null, // Clear heading since it belongs to the project
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)

      if (updateTasksError) {
        console.error('Error updating tasks:', updateTasksError)
        return NextResponse.json(
          { error: 'Chyba pri presúvaní úloh' },
          { status: 500 }
        )
      }
    }

    // Delete all headings in the project
    const { error: deleteHeadingsError } = await supabase
      .from('headings')
      .delete()
      .eq('project_id', projectId)

    if (deleteHeadingsError) {
      console.error('Error deleting headings:', deleteHeadingsError)
      // Continue anyway - headings are not critical
    }

    // Delete the project
    const { error: deleteProjectError } = await supabase
      .from('projects')
      .delete()
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
      message: deleteTasks
        ? 'Projekt a úlohy boli zmazané'
        : 'Projekt bol zmazaný, úlohy presunuté do oddelenia'
    })

  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Interná chyba servera' },
      { status: 500 }
    )
  }
}
