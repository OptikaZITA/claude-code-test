'use client'

import { Lock } from 'lucide-react'

interface ProfileInfoProps {
  fullName: string | null
  nickname: string | null
  email: string
  position: string | null
  role: string | null
}

export function ProfileInfo({
  fullName,
  nickname,
  email,
  position,
  role,
}: ProfileInfoProps) {
  const roleLabels: Record<string, string> = {
    admin: 'Administrátor',
    strategicka_rada: 'Strategická rada',
    hr: 'HR',
    member: 'Člen',
  }

  return (
    <div className="space-y-4">
      {/* Full name */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm text-muted-foreground">Meno</p>
          <p className="font-medium">{fullName || '—'}</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Nickname */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm text-muted-foreground">Prezývka</p>
          <p className="font-medium">{nickname || '—'}</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Email */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{email}</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Position */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm text-muted-foreground">Pozícia</p>
          <p className="font-medium">{position || '—'}</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Role */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm text-muted-foreground">Rola</p>
          <p className="font-medium">{role ? roleLabels[role] || role : '—'}</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Info message */}
      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
        ℹ️ Pre zmenu osobných údajov kontaktujte administrátora.
      </p>
    </div>
  )
}
