import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecurrenceRule } from '@/types'

interface RecurrenceResponse {
  success: boolean
  task?: {
    id: string
    recurrence_rule: RecurrenceRule | null
  }
  message?: string
}

// PATCH - Set/update recurrence rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<RecurrenceResponse | { error: string }>> {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const recurrenceRule: RecurrenceRule | null = body.recurrence_rule

    // Validate recurrence rule if provided
    if (recurrenceRule !== null) {
      if (!recurrenceRule.type || !recurrenceRule.interval || !recurrenceRule.unit || !recurrenceRule.end_type) {
        return NextResponse.json({ error: 'Neplatné pravidlo opakovania' }, { status: 400 })
      }

      if (recurrenceRule.interval < 1) {
        return NextResponse.json({ error: 'Interval musí byť aspoň 1' }, { status: 400 })
      }
    }

    // Update task with recurrence rule
    const { data, error } = await supabase
      .from('tasks')
      .update({
        recurrence_rule: recurrenceRule,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, recurrence_rule')
      .single()

    if (error) {
      console.error('Error updating recurrence rule:', error)
      return NextResponse.json({ error: 'Chyba pri aktualizácii opakovania' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      task: data,
      message: recurrenceRule ? 'Opakovanie nastavené' : 'Opakovanie odstránené',
    })
  } catch (error) {
    console.error('Error in recurrence PATCH:', error)
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 })
  }
}

// DELETE - Remove recurrence rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<RecurrenceResponse | { error: string }>> {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 })
    }

    // Remove recurrence rule
    const { error } = await supabase
      .from('tasks')
      .update({
        recurrence_rule: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error removing recurrence rule:', error)
      return NextResponse.json({ error: 'Chyba pri odstraňovaní opakovania' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Opakovanie odstránené',
    })
  } catch (error) {
    console.error('Error in recurrence DELETE:', error)
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 })
  }
}

// GET - Get recurrence rule for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ recurrence_rule: RecurrenceRule | null } | { error: string }>> {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 })
    }

    // Get task recurrence rule
    const { data, error } = await supabase
      .from('tasks')
      .select('recurrence_rule')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error getting recurrence rule:', error)
      return NextResponse.json({ error: 'Úloha nenájdená' }, { status: 404 })
    }

    return NextResponse.json({
      recurrence_rule: data.recurrence_rule,
    })
  } catch (error) {
    console.error('Error in recurrence GET:', error)
    return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 })
  }
}
