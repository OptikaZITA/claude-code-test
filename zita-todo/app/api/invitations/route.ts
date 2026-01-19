import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST - Create a new invitation using Supabase Auth (sends email automatically)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Nie ste prihlásený' },
        { status: 401 }
      )
    }

    // Check if user is admin or HR
    const { data: currentUser } = await supabase
      .from('users')
      .select('organization_id, role, nickname, full_name')
      .eq('id', user.id)
      .single()

    if (!currentUser || !['admin', 'hr'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Nemáte oprávnenie vytvárať pozvánky' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, full_name, nickname, position, role, departments } = body

    if (!email || !full_name || !nickname || !role || !departments?.length) {
      return NextResponse.json(
        { error: 'Vyplňte všetky povinné polia' },
        { status: 400 }
      )
    }

    // Check if email already exists in users
    const { data: existingUser } = await adminSupabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Používateľ s týmto emailom už existuje' },
        { status: 400 }
      )
    }

    // Check if pending invitation exists in our table
    const { data: existingInvitation } = await adminSupabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .is('accepted_at', null)
      .single()

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Pozvánka pre tento email už existuje' },
        { status: 400 }
      )
    }

    // Build redirect URL for after email confirmation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const redirectTo = `${appUrl}/auth/callback`

    // Use Supabase Auth to invite user (sends email automatically)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          // Store our custom metadata in user_metadata
          full_name,
          nickname,
          position: position || null,
          role,
          departments,
          organization_id: currentUser.organization_id,
          invited_by: user.id,
        },
        redirectTo,
      }
    )

    if (authError) {
      console.error('Supabase invite error:', authError)

      if (authError.message?.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Používateľ s týmto emailom už existuje v systéme' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: `Chyba pri odosielaní pozvánky: ${authError.message}` },
        { status: 500 }
      )
    }

    // Also store in our invitations table for tracking
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invitation, error: insertError } = await adminSupabase
      .from('invitations')
      .insert({
        email,
        full_name,
        nickname,
        position: position || null,
        role,
        departments,
        token: authData.user?.id || crypto.randomUUID(), // Use auth user ID as token
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        organization_id: currentUser.organization_id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      // Don't fail - the Supabase invite was sent successfully
    }

    return NextResponse.json({
      invitation: invitation || { id: authData.user?.id, email },
      emailSent: true, // Supabase sends email automatically
      userId: authData.user?.id,
    })
  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json(
      { error: 'Nastala neočakávaná chyba' },
      { status: 500 }
    )
  }
}
