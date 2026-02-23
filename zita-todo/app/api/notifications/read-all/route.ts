import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PUT /api/notifications/read-all - Mark all notifications as read
export async function PUT() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client for update to bypass RLS issues
    // We still filter by user_id to ensure users can only mark their own notifications
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Mark all read error:', error)
      return NextResponse.json({ error: 'Chyba pri označovaní notifikácií' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/notifications/read-all error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
