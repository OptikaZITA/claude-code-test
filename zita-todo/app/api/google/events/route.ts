import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/google/refresh-token'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  htmlLink: string
  location?: string
  status: string
  calendarId: string
  calendarName?: string
}

interface GoogleEventsResponse {
  items: GoogleCalendarEvent[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    if (!timeMin || !timeMax) {
      return NextResponse.json(
        { error: 'timeMin and timeMax are required' },
        { status: 400 }
      )
    }

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
      // No connection is not an error, just return empty events
      return NextResponse.json({ events: [] })
    }

    // Get valid access token (refresh if needed)
    let accessToken: string
    try {
      accessToken = await getValidAccessToken(connection, supabase)
    } catch (error) {
      console.error('Failed to get valid access token:', error)
      // Token refresh failed, connection might be invalid
      return NextResponse.json({ events: [], error: 'token_refresh_failed' })
    }

    // Fetch events from each selected calendar
    const selectedCalendars = connection.selected_calendars || ['primary']
    const allEvents: GoogleCalendarEvent[] = []

    // First, get calendar names for display
    const calendarNamesResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const calendarList = calendarNamesResponse.ok
      ? (await calendarNamesResponse.json()).items
      : []
    const calendarNames: Record<string, string> = {}
    for (const cal of calendarList) {
      calendarNames[cal.id] = cal.summary
    }

    for (const calendarId of selectedCalendars) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
          `timeMin=${encodeURIComponent(timeMin)}&` +
          `timeMax=${encodeURIComponent(timeMax)}&` +
          `singleEvents=true&` +
          `orderBy=startTime&` +
          `maxResults=100`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (response.ok) {
          const data: GoogleEventsResponse = await response.json()
          const events = (data.items || [])
            .filter(event => event.status !== 'cancelled')
            .map(event => ({
              ...event,
              calendarId,
              calendarName: calendarNames[calendarId] || calendarId,
            }))
          allEvents.push(...events)
        } else {
          console.error(`Failed to fetch events for calendar ${calendarId}`)
        }
      } catch (error) {
        console.error(`Error fetching events for calendar ${calendarId}:`, error)
      }
    }

    // Sort all events by start time
    allEvents.sort((a, b) => {
      const aTime = a.start.dateTime || a.start.date || ''
      const bTime = b.start.dateTime || b.start.date || ''
      return aTime.localeCompare(bTime)
    })

    return NextResponse.json({ events: allEvents })
  } catch (error) {
    console.error('Error in GET /api/google/events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
