'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setInviteToken(token)
    }
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            invite_token: inviteToken,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      if (inviteToken) {
        router.push('/inbox')
        router.refresh()
      } else {
        setError('Skontrolujte svoj email pre potvrdenie registrácie.')
      }
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri registrácii')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-[var(--bg-primary)] p-8 shadow-lg border border-[var(--border-primary)]">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">ZITA TODO</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {inviteToken ? 'Prijmite pozvánku' : 'Vytvorte si účet'}
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className={`rounded-lg p-3 text-sm ${error.includes('email') ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-error)]/10 text-[var(--color-error)]'}`}>
            {error}
          </div>
        )}

        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Celé meno
          </label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ján Novák"
            required
          />
        </div>

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
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Vytváram účet...' : 'Vytvoriť účet'}
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8 text-[var(--text-secondary)]">Načítavam...</div>}>
      <SignupForm />
    </Suspense>
  )
}
