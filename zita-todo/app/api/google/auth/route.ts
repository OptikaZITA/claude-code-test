import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !redirectUri) {
      console.error('Missing Google OAuth configuration')
      return NextResponse.json(
        { error: 'Google Calendar integration not configured' },
        { status: 500 }
      )
    }

    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/calendar.readonly ' +
      'https://www.googleapis.com/auth/calendar.events.readonly ' +
      'https://www.googleapis.com/auth/userinfo.email'
    )

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${scope}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating Google OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth' },
      { status: 500 }
    )
  }
}
