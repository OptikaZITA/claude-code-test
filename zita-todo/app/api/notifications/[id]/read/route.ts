import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PUT /api/notifications/[id]/read - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Use admin client for update to bypass RLS issues
    // We still filter by user_id to ensure users can only mark their own notifications
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Mark read error:', error)
      return NextResponse.json({ error: 'Chyba pri označovaní notifikácie' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/notifications/[id]/read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
