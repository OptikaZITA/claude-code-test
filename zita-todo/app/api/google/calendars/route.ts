import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/google/refresh-token'

interface GoogleCalendar {
  id: string
  summary: string
  description?: string
  primary?: boolean
  backgroundColor?: string
  foregroundColor?: string
  accessRole: string
}

interface GoogleCalendarListResponse {
  items: GoogleCalendar[]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get connection
    const { data: connection, error: connectionError } = await supabase
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 404 }
      )
    }

    // Get valid access token (refresh if needed)
    const accessToken = await getValidAccessToken(connection, supabase)

    // Fetch calendars from Google
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Google API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to fetch calendars' },
        { status: 500 }
      )
    }

    const data: GoogleCalendarListResponse = await response.json()

    // Format calendars for frontend
    const calendars = data.items.map((cal) => ({
      id: cal.id,
      name: cal.summary,
      description: cal.description,
      primary: cal.primary || false,
      color: cal.backgroundColor,
      selected: connection.selected_calendars?.includes(cal.id) || false,
    }))

    // Sort: primary first, then alphabetically
    calendars.sort((a, b) => {
      if (a.primary && !b.primary) return -1
      if (!a.primary && b.primary) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ calendars })
  } catch (error) {
    console.error('Error in GET /api/google/calendars:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
