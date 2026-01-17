import { SupabaseClient } from '@supabase/supabase-js'

interface GoogleCalendarConnection {
  id: string
  user_id: string
  google_email: string
  access_token: string
  refresh_token: string
  token_expiry: string
  selected_calendars: string[]
}

export async function refreshGoogleToken(
  connection: GoogleCalendarConnection,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Token refresh failed:', errorData)
      throw new Error('Failed to refresh token')
    }

    const tokens = await response.json()
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Update the token in the database
    const { error } = await supabase
      .from('google_calendar_connections')
      .update({
        access_token: tokens.access_token,
        token_expiry: tokenExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    if (error) {
      console.error('Failed to update token in database:', error)
      throw new Error('Failed to save refreshed token')
    }

    return tokens.access_token
  } catch (error) {
    console.error('Error refreshing Google token:', error)
    throw error
  }
}

export async function getValidAccessToken(
  connection: GoogleCalendarConnection,
  supabase: SupabaseClient
): Promise<string> {
  // Check if token is expired (with 5 minute buffer)
  const expiryTime = new Date(connection.token_expiry).getTime()
  const bufferTime = 5 * 60 * 1000 // 5 minutes

  if (Date.now() >= expiryTime - bufferTime) {
    // Token is expired or about to expire, refresh it
    return await refreshGoogleToken(connection, supabase)
  }

  return connection.access_token
}
