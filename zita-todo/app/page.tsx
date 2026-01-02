'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/inbox')
      } else {
        router.push('/login')
      }
    }
    checkUser()
  }, [router, supabase])

  return (
    <div className="flex h-screen items-center justify-center bg-[#F5F5F7]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#007AFF] border-t-transparent" />
    </div>
  )
}
