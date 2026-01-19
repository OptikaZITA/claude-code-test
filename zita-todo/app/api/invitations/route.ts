import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST - Create a new invitation (no automatic email - admin shares link manually)
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

    // Check if email already exists in auth.users
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
    const existingAuthUser = authUsers?.users?.find(u => u.email === email)

    if (existingAuthUser) {
      return NextResponse.json(
        { error: 'Používateľ s týmto emailom už existuje v systéme' },
        { status: 400 }
      )
    }

    // Check if pending invitation exists
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

    // Create invitation record (no automatic email)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    const { data: invitation, error: insertError } = await adminSupabase
      .from('invitations')
      .insert({
        email,
        full_name,
        nickname,
        position: position || null,
        role,
        departments,
        token: crypto.randomUUID(), // Generate unique token
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        organization_id: currentUser.organization_id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Chyba pri vytváraní pozvánky' },
        { status: 500 }
      )
    }

    // Build the invitation URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const inviteUrl = `${appUrl}/invite/${invitation.id}`

    return NextResponse.json({
      invitation,
      inviteUrl,
      emailSent: false, // No automatic email
    })
  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json(
      { error: 'Nastala neočakávaná chyba' },
      { status: 500 }
    )
  }
}
