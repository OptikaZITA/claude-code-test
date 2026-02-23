import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // Use admin client for all operations to bypass RLS issues
    const adminClient = createAdminClient()

    // Verify project exists
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, name, area_id, user_id, organization_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projekt nebol nájdený' },
        { status: 404 }
      )
    }

    // Check ownership - user must own the project or be in same organization
    const { data: currentUser } = await adminClient
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    const isOwner = project.user_id === user.id
    const isSameOrg = currentUser?.organization_id === project.organization_id

    if (!isOwner && !isSameOrg) {
      return NextResponse.json(
        { error: 'Nemáte oprávnenie vymazať tento projekt' },
        { status: 403 }
      )
    }

    // Soft delete - move project to trash
    const now = new Date().toISOString()

    // Also soft delete tasks in the project
    const { error: softDeleteTasksError } = await adminClient
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
    const { error: deleteProjectError } = await adminClient
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
