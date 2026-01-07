import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AcknowledgeResponse {
  success: boolean
  acknowledged_at: string
  tasks_acknowledged: number
}

export async function POST(request: NextRequest): Promise<NextResponse<AcknowledgeResponse | { error: string }>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Get current last_acknowledged to count new tasks
    const { data: settings } = await supabase
      .from('user_settings')
      .select('last_acknowledged')
      .eq('user_id', user.id)
      .single()

    // Count tasks that will be acknowledged
    let countQuery = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('when_type', 'today')
      .is('deleted_at', null)
      .not('status', 'in', '("done","canceled")')

    // Filter by added_to_today_at > last_acknowledged if exists
    if (settings?.last_acknowledged) {
      countQuery = countQuery.gt('added_to_today_at', settings.last_acknowledged)
    } else {
      // If no last_acknowledged, count all tasks in Today with added_to_today_at
      countQuery = countQuery.not('added_to_today_at', 'is', null)
    }

    const { count } = await countQuery

    // Upsert user_settings with new last_acknowledged
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        last_acknowledged: now,
        updated_at: now,
      }, {
        onConflict: 'user_id',
      })

    if (upsertError) {
      console.error('Error upserting user_settings:', upsertError)
      return NextResponse.json({ error: 'Chyba pri aktualizácii nastavení' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      acknowledged_at: now,
      tasks_acknowledged: count || 0,
    })
  } catch (error) {
    console.error('Error acknowledging tasks:', error)
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 })
  }
}

// GET endpoint to retrieve new tasks count
export async function GET(request: NextRequest): Promise<NextResponse<{ count: number; last_acknowledged: string | null } | { error: string }>> {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 })
    }

    // Get last_acknowledged
    const { data: settings } = await supabase
      .from('user_settings')
      .select('last_acknowledged')
      .eq('user_id', user.id)
      .single()

    // Count new tasks
    let countQuery = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('when_type', 'today')
      .is('deleted_at', null)
      .not('status', 'in', '("done","canceled")')
      .not('added_to_today_at', 'is', null)

    if (settings?.last_acknowledged) {
      countQuery = countQuery.gt('added_to_today_at', settings.last_acknowledged)
    }

    const { count } = await countQuery

    return NextResponse.json({
      count: count || 0,
      last_acknowledged: settings?.last_acknowledged || null,
    })
  } catch (error) {
    console.error('Error getting new tasks count:', error)
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 })
  }
}
