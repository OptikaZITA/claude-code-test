import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token a heslo sú povinné' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Heslo musí mať aspoň 6 znakov' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Load and validate invitation
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', token)
      .single()

    if (invError || !invitation) {
      return NextResponse.json(
        { error: 'Pozvánka nenájdená' },
        { status: 404 }
      )
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'Táto pozvánka už bola použitá' },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Pozvánka vypršala' },
        { status: 400 }
      )
    }

    // 2. Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Auto-confirm email since they have an invitation
    })

    if (authError) {
      console.error('Auth error:', authError)
      console.error('Auth error details:', JSON.stringify(authError, null, 2))

      // Check if user already exists
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'Používateľ s týmto emailom už existuje. Skúste sa prihlásiť.' },
          { status: 400 }
        )
      }

      if (authError.message?.includes('password')) {
        return NextResponse.json(
          { error: 'Heslo nespĺňa požiadavky. Musí mať aspoň 6 znakov.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: `Chyba pri vytváraní účtu: ${authError.message || 'Neznáma chyba'}` },
        { status: 500 }
      )
    }

    const userId = authUser.user.id

    // 3. Create/Update users table entry
    // Note: A trigger (handle_new_user) may have already created a basic record,
    // so we use UPSERT to update it with full invitation data
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: invitation.email,
        full_name: invitation.full_name || null,
        nickname: invitation.nickname || null,
        position: invitation.position || null,
        role: invitation.role,
        organization_id: invitation.organization_id,
        status: 'active',
        invited_by: invitation.invited_by,
        invited_at: invitation.created_at,
      }, {
        onConflict: 'id',
      })

    if (userError) {
      console.error('User creation error:', userError)
      console.error('User creation error details:', JSON.stringify(userError, null, 2))

      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(userId)

      // Return more specific error message
      let errorMessage = 'Chyba pri vytváraní používateľského profilu'
      if (userError.code === '23503') {
        errorMessage = 'Neplatná referencia na organizáciu alebo oddelenie'
      } else if (userError.message) {
        errorMessage = `Chyba: ${userError.message}`
      }

      return NextResponse.json(
        { error: errorMessage, details: userError.message },
        { status: 500 }
      )
    }

    // 4. Create department_members entries
    if (invitation.departments && invitation.departments.length > 0) {
      const departmentMemberships = invitation.departments.map((deptId: string) => ({
        user_id: userId,
        department_id: deptId,
        role: 'member',
      }))

      const { error: deptError } = await supabase
        .from('department_members')
        .insert(departmentMemberships)

      if (deptError) {
        console.error('Department membership error:', deptError)
        // Don't rollback - user is created, departments can be added later
      }
    }

    // 5. Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', token)

    if (updateError) {
      console.error('Invitation update error:', updateError)
      // Don't fail - user is created successfully
    }

    return NextResponse.json({
      success: true,
      userId,
    })
  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: 'Nastala neočakávaná chyba' },
      { status: 500 }
    )
  }
}
