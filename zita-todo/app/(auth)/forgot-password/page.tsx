'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri odosielaní emailu')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success)]/10">
            <Mail className="h-6 w-6 text-[var(--color-success)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Skontrolujte svoj email</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Ak existuje ucet s emailom <strong>{email}</strong>, poslali sme vam odkaz na obnovenie hesla.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Spat na prihlasenie
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Zabudnute heslo</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Zadajte svoj email a posleme vam odkaz na obnovenie hesla
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vas@email.sk"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Odosielam...' : 'Odoslat odkaz na obnovenie'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Spat na prihlasenie
        </Link>
      </p>
    </div>
  )
}
