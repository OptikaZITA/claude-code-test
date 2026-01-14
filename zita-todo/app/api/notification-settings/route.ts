import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/notification-settings - Get notification settings
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found - this is OK, return defaults
      console.error('Get settings error:', error)
      return NextResponse.json({ error: 'Chyba pri načítaní nastavení' }, { status: 500 })
    }

    // Return data or defaults
    return NextResponse.json(data || {
      notify_assigned: true,
      notify_unassigned: true,
      notify_task_completed: true,
      notify_status_changed: true,
      notify_due_date_changed: true
    })
  } catch (error) {
    console.error('GET /api/notification-settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/notification-settings - Update notification settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Only allow specific fields
    const allowedFields = [
      'notify_assigned',
      'notify_unassigned',
      'notify_task_completed',
      'notify_status_changed',
      'notify_due_date_changed'
    ]

    const updates: Record<string, boolean> = {}
    for (const field of allowedFields) {
      if (typeof body[field] === 'boolean') {
        updates[field] = body[field]
      }
    }

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Update settings error:', error)
      return NextResponse.json({ error: 'Chyba pri ukladaní nastavení' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PUT /api/notification-settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
