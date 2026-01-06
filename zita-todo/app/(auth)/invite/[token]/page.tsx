'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Invitation, UserRole } from '@/types'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  strategicka_rada: 'Strategická rada',
  hr: 'HR',
  member: 'Člen',
}

export default function InviteAcceptPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const supabase = createClient()

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'accepted' | 'not_found'>('loading')

  // Form state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load invitation by token (id)
      const { data: inv, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', token)
        .single()

      if (invError || !inv) {
        setStatus('not_found')
        return
      }

      setInvitation(inv as Invitation)

      // Check if already accepted
      if (inv.accepted_at) {
        setStatus('accepted')
        return
      }

      // Check if expired
      if (new Date(inv.expires_at) < new Date()) {
        setStatus('expired')
        return
      }

      // Load department names if departments array exists
      if (inv.departments && inv.departments.length > 0) {
        const { data: depts } = await supabase
          .from('areas')
          .select('id, name')
          .in('id', inv.departments)

        setDepartments(depts || [])
      }

      setStatus('valid')
    } catch (err) {
      setError('Nastala chyba pri načítaní pozvánky')
      setStatus('not_found')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (password.length < 6) {
      setSubmitError('Heslo musí mať aspoň 6 znakov')
      return
    }

    if (password !== confirmPassword) {
      setSubmitError('Heslá sa nezhodujú')
      return
    }

    try {
      setSubmitting(true)

      // Call the accept invitation API
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Nastala chyba pri prijímaní pozvánky')
      }

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation!.email,
        password,
      })

      if (signInError) {
        throw new Error('Účet bol vytvorený, ale prihlásenie zlyhalo. Skúste sa prihlásiť.')
      }

      // Redirect to inbox
      router.push('/inbox')
      router.refresh()
    } catch (err: any) {
      setSubmitError(err.message || 'Nastala chyba')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          <p className="mt-4 text-[var(--text-secondary)]">Načítavam pozvánku...</p>
        </div>
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <XCircle className="h-12 w-12 text-[var(--color-error)]" />
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
            Pozvánka nenájdená
          </h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Táto pozvánka neexistuje alebo bola zrušená.
          </p>
          <Link href="/login">
            <Button className="mt-6">Prihlásiť sa</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-12 w-12 text-[var(--color-warning)]" />
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
            Pozvánka vypršala
          </h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Táto pozvánka už nie je platná. Kontaktujte administrátora pre novú pozvánku.
          </p>
          <Link href="/login">
            <Button className="mt-6">Prihlásiť sa</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="h-12 w-12 text-[var(--color-success)]" />
          <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
            Pozvánka už bola použitá
          </h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Táto pozvánka už bola prijatá. Môžete sa prihlásiť.
          </p>
          <Link href="/login">
            <Button className="mt-6">Prihlásiť sa</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">ZITA TODO</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Prijmite pozvánku a vytvorte si účet</p>
      </div>

      {/* Invitation Details */}
      <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-lg">
        <h3 className="font-medium text-[var(--text-primary)] mb-3">Detaily pozvánky</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Email:</span>
            <span className="text-[var(--text-primary)] font-medium">{invitation?.email}</span>
          </div>
          {invitation?.full_name && (
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Meno:</span>
              <span className="text-[var(--text-primary)]">{invitation.full_name}</span>
            </div>
          )}
          {invitation?.nickname && (
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Prezývka:</span>
              <span className="text-[var(--text-primary)]">{invitation.nickname}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Rola:</span>
            <span className="text-[var(--text-primary)]">
              {ROLE_LABELS[invitation?.role as UserRole] || invitation?.role}
            </span>
          </div>
          {departments.length > 0 && (
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Oddelenia:</span>
              <span className="text-[var(--text-primary)]">
                {departments.map((d) => d.name).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="rounded-lg bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            {submitError}
          </div>
        )}

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Heslo
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimálne 6 znakov"
            required
            minLength={6}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Potvrdiť heslo
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Zopakujte heslo"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Vytváram účet...' : 'Vytvoriť účet'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        Už máte účet?{' '}
        <Link href="/login" className="text-[var(--color-primary)] hover:underline">
          Prihlásiť sa
        </Link>
      </p>
    </div>
  )
}
