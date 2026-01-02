'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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

  return (
    <div className="rounded-xl bg-white p-8 shadow-lg">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">ZITA TODO</h1>
        <p className="mt-2 text-[#86868B]">Prihláste sa do svojho účtu</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[#FF3B30]/10 p-3 text-sm text-[#FF3B30]">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#1D1D1F]">
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
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#1D1D1F]">
            Heslo
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Prihlasujem...' : 'Prihlásiť sa'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#86868B]">
        Máte pozvánku?{' '}
        <Link href="/signup" className="text-[#007AFF] hover:underline">
          Prijať pozvánku
        </Link>
      </p>
    </div>
  )
}
