import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/users/[id] - Update user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const body = await request.json()

    // Check if current user is admin
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's role
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (currentUserError || !currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only admins can update other users
    if (currentUserData.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update users' }, { status: 403 })
    }

    // Validate update data
    const { full_name, nickname, position, role, status } = body
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (full_name !== undefined) updateData.full_name = full_name
    if (nickname !== undefined) updateData.nickname = nickname
    if (position !== undefined) updateData.position = position
    if (role !== undefined) updateData.role = role
    if (status !== undefined) updateData.status = status

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PATCH /api/users/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
