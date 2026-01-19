import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/inbox'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if this is a new user from invite (has user_metadata with our fields)
      const metadata = data.user.user_metadata
      if (metadata?.organization_id && metadata?.role) {
        // This is a new user from invite - create their profile
        const adminSupabase = createAdminClient()

        // Check if user profile already exists
        const { data: existingProfile } = await adminSupabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (!existingProfile) {
          // Create user profile
          const { error: profileError } = await adminSupabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              full_name: metadata.full_name || null,
              nickname: metadata.nickname || null,
              position: metadata.position || null,
              role: metadata.role,
              organization_id: metadata.organization_id,
              status: 'active',
              invited_by: metadata.invited_by || null,
              invited_at: new Date().toISOString(),
            })

          if (profileError) {
            console.error('Error creating user profile:', profileError)
          }

          // Create department memberships
          if (metadata.departments && metadata.departments.length > 0) {
            const memberships = metadata.departments.map((deptId: string) => ({
              user_id: data.user!.id,
              department_id: deptId,
              role: 'member',
            }))

            const { error: deptError } = await adminSupabase
              .from('department_members')
              .insert(memberships)

            if (deptError) {
              console.error('Error creating department memberships:', deptError)
            }
          }

          // Mark invitation as accepted
          const { error: inviteError } = await adminSupabase
            .from('invitations')
            .update({ accepted_at: new Date().toISOString() })
            .eq('email', data.user.email!)
            .is('accepted_at', null)

          if (inviteError) {
            console.error('Error updating invitation:', inviteError)
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
