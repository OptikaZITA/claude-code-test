'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { CheckCircle, AlertTriangle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Check if we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      // Supabase automatically handles the recovery token from the URL
      // and creates a session if valid
      setIsValidSession(!!session)
    }
    checkSession()

    // Listen for auth state changes (when recovery token is processed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Hesla sa nezhoduju')
      return
    }

    if (password.length < 6) {
      setError('Heslo musi mat aspon 6 znakov')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri zmene hesla')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  // Invalid or expired token
  if (!isValidSession) {
    return (
      <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warning)]/10">
            <AlertTriangle className="h-6 w-6 text-[var(--color-warning)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Neplatny odkaz</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Odkaz na obnovenie hesla je neplatny alebo exspiroval.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-block text-sm text-[var(--color-primary)] hover:underline"
          >
            Poziadat o novy odkaz
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success)]/10">
            <CheckCircle className="h-6 w-6 text-[var(--color-success)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Heslo zmenene</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Vase heslo bolo uspesne zmenene. Presmeruvavame vas na prihlasenie...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Nove heslo</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Zadajte svoje nove heslo
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Nove heslo
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Potvrdte heslo
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Menim heslo...' : 'Zmenit heslo'}
        </Button>
      </form>
    </div>
  )
}
