import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvitationEmail } from '@/lib/email'

// POST - Create a new invitation and send email
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

    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation using admin client (to ensure it works)
    const { data: invitation, error: insertError } = await adminSupabase
      .from('invitations')
      .insert({
        email,
        full_name,
        nickname,
        position: position || null,
        role,
        departments,
        token: crypto.randomUUID(), // Legacy token field
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

    // Get department names for email
    const { data: deptData } = await adminSupabase
      .from('areas')
      .select('name')
      .in('id', departments)

    const departmentNames = deptData?.map((d: any) => d.name) || []

    // Build invite URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const inviteUrl = `${appUrl}/invite/${invitation.id}`

    // Send invitation email
    const inviterName = currentUser.nickname || currentUser.full_name
    const { success: emailSent, error: emailError } = await sendInvitationEmail({
      to: email,
      inviteeName: nickname || full_name,
      inviterName: inviterName || undefined,
      inviteUrl,
      role,
      departments: departmentNames,
    })

    if (!emailSent) {
      console.error('Email sending failed:', emailError)
      // Don't fail the request - invitation was created successfully
      // Just note that email wasn't sent
    }

    return NextResponse.json({
      invitation,
      inviteUrl, // Return URL so admin can share manually if email fails
      emailSent,
      emailError: emailError || null,
    })
  } catch (error) {
    console.error('Create invitation error:', error)
    return NextResponse.json(
      { error: 'Nastala neočakávaná chyba' },
      { status: 500 }
    )
  }
}
