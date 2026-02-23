import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Check if user has Google Calendar connected
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection, error } = await supabase
      .from('google_calendar_connections')
      .select('id, google_email, selected_calendars, created_at')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error fetching connection:', error)
      return NextResponse.json({ error: 'Failed to fetch connection' }, { status: 500 })
    }

    return NextResponse.json({
      connected: !!connection,
      connection: connection || null,
    })
  } catch (error) {
    console.error('Error in GET /api/google/connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Disconnect Google Calendar
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client for delete to bypass RLS issues
    // We filter by user_id to ensure users can only delete their own connection
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('google_calendar_connections')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting connection:', error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/google/connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update selected calendars
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { selected_calendars } = body

    if (!Array.isArray(selected_calendars)) {
      return NextResponse.json(
        { error: 'selected_calendars must be an array' },
        { status: 400 }
      )
    }

    // Use admin client for update to bypass RLS issues
    // We filter by user_id to ensure users can only update their own connection
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('google_calendar_connections')
      .update({
        selected_calendars,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating connection:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true, connection: data })
  } catch (error) {
    console.error('Error in PATCH /api/google/connection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
