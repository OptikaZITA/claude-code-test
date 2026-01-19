import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET invitation by ID - public endpoint for accepting invitations
// Uses admin client to bypass RLS since users aren't authenticated yet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID pozvánky je povinné' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch invitation by ID
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('id, email, full_name, nickname, position, role, departments, expires_at, accepted_at, organization_id')
      .eq('id', id)
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Pozvánka nenájdená' },
        { status: 404 }
      )
    }

    // Fetch department names if departments exist
    let departmentNames: { id: string; name: string }[] = []
    if (invitation.departments && invitation.departments.length > 0) {
      const { data: depts } = await supabase
        .from('areas')
        .select('id, name')
        .in('id', invitation.departments)

      departmentNames = (depts || []).map((d: any) => ({
        id: d.id,
        name: d.name,
      }))
    }

    return NextResponse.json({
      invitation,
      departments: departmentNames,
    })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Nastala neočakávaná chyba' },
      { status: 500 }
    )
  }
}
