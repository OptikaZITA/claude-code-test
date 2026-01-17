import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')
    const error = request.nextUrl.searchParams.get('error')

    // Get the app URL for redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(`${appUrl}/settings?google=error&message=${encodeURIComponent(error)}`)
    }

    if (!code) {
      return NextResponse.redirect(`${appUrl}/settings?google=error&message=no_code`)
    }

    // Verify state for CSRF protection
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${appUrl}/login?redirect=/settings`)
    }

    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(decodeURIComponent(state), 'base64').toString())
        if (stateData.userId !== user.id) {
          return NextResponse.redirect(`${appUrl}/settings?google=error&message=invalid_state`)
        }
        // Check if state is not too old (30 minutes)
        if (Date.now() - stateData.timestamp > 30 * 60 * 1000) {
          return NextResponse.redirect(`${appUrl}/settings?google=error&message=expired_state`)
        }
      } catch {
        console.error('Invalid state parameter')
        return NextResponse.redirect(`${appUrl}/settings?google=error&message=invalid_state`)
      }
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(`${appUrl}/settings?google=error&message=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()

    // Get user email from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    )

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info')
      return NextResponse.redirect(`${appUrl}/settings?google=error&message=userinfo_failed`)
    }

    const userInfo = await userInfoResponse.json()

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Save to database (upsert to handle reconnection)
    const { error: dbError } = await supabase
      .from('google_calendar_connections')
      .upsert({
        user_id: user.id,
        google_email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokenExpiry,
        selected_calendars: ['primary'],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.redirect(`${appUrl}/settings?google=error&message=db_error`)
    }

    return NextResponse.redirect(`${appUrl}/settings?google=success`)
  } catch (error) {
    console.error('Error in Google OAuth callback:', error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    return NextResponse.redirect(`${appUrl}/settings?google=error&message=unknown_error`)
  }
}
