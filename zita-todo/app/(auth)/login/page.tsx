'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingRecovery, setCheckingRecovery] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Check for password recovery token in URL hash
  useEffect(() => {
    const handleRecoveryRedirect = async () => {
      // Check URL hash for recovery token (Supabase sends #access_token=...&type=recovery)
      const hash = window.location.hash
      if (hash && hash.includes('type=recovery')) {
        // Redirect to reset-password page with the hash intact
        router.replace('/reset-password' + hash)
        return
      }

      // Also listen for PASSWORD_RECOVERY event from Supabase
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          router.replace('/reset-password')
        }
      })

      setCheckingRecovery(false)

      return () => subscription.unsubscribe()
    }

    handleRecoveryRedirect()
  }, [router, supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/inbox')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri prihlásení')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking for recovery token
  if (checkingRecovery) {
    return (
      <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">ZITA TODO</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Prihláste sa do svojho účtu</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
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

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Heslo
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Zabudnuté heslo?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Prihlasujem...' : 'Prihlásiť sa'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        Máte pozvánku?{' '}
        <Link href="/signup" className="text-[var(--color-primary)] hover:underline">
          Prijať pozvánku
        </Link>
      </p>
    </div>
  )
}
