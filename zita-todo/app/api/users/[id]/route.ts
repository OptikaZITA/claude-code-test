import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Fields that regular users can update on their own profile
const SELF_UPDATABLE_FIELDS = ['avatar_url', 'nickname']

// Fields that only admins can update
const ADMIN_ONLY_FIELDS = ['full_name', 'position', 'role', 'status']

// PATCH /api/users/[id] - Update user
// - Users can update their own avatar_url and nickname
// - Admins can update any field for any user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const body = await request.json()

    // Get current authenticated user
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 })
    }

    // Use admin client to fetch user role to bypass RLS issues
    const adminClient = createAdminClient()

    // Get current user's role
    const { data: currentUserData, error: currentUserError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (currentUserError || !currentUserData) {
      return NextResponse.json({ error: 'Používateľ nenájdený' }, { status: 404 })
    }

    const isAdmin = currentUserData.role === 'admin'
    const isUpdatingSelf = currentUser.id === userId

    // Extract fields from body
    const { full_name, nickname, position, role, status, avatar_url } = body

    // Check which fields are being updated
    const requestedFields: string[] = []
    if (full_name !== undefined) requestedFields.push('full_name')
    if (nickname !== undefined) requestedFields.push('nickname')
    if (position !== undefined) requestedFields.push('position')
    if (role !== undefined) requestedFields.push('role')
    if (status !== undefined) requestedFields.push('status')
    if (avatar_url !== undefined) requestedFields.push('avatar_url')

    // Check if user is trying to update admin-only fields
    const adminOnlyFieldsRequested = requestedFields.filter(f => ADMIN_ONLY_FIELDS.includes(f))

    // Permission check
    if (!isAdmin) {
      // Not admin - can only update own profile with limited fields
      if (!isUpdatingSelf) {
        return NextResponse.json(
          { error: 'Len administrátor môže meniť údaje iných používateľov' },
          { status: 403 }
        )
      }

      if (adminOnlyFieldsRequested.length > 0) {
        return NextResponse.json(
          { error: 'Len administrátor môže meniť tieto údaje' },
          { status: 403 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (full_name !== undefined) updateData.full_name = full_name
    if (nickname !== undefined) updateData.nickname = nickname
    if (position !== undefined) updateData.position = position
    if (role !== undefined) updateData.role = role
    if (status !== undefined) updateData.status = status
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url

    // Use admin client (already created above) to bypass RLS
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
      { error: 'Interná chyba servera' },
      { status: 500 }
    )
  }
}
