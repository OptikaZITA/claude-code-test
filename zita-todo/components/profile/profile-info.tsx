'use client'

import { useState } from 'react'
import { Lock, Pencil, Check, X, Loader2 } from 'lucide-react'

interface ProfileInfoProps {
  userId: string
  fullName: string | null
  nickname: string | null
  email: string
  position: string | null
  role: string | null
  onNicknameUpdate?: (newNickname: string) => void
}

export function ProfileInfo({
  userId,
  fullName,
  nickname,
  email,
  position,
  role,
  onNicknameUpdate,
}: ProfileInfoProps) {
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [nicknameValue, setNicknameValue] = useState(nickname || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleLabels: Record<string, string> = {
    admin: 'Administrátor',
    strategicka_rada: 'Strategická rada',
    hr: 'HR',
    member: 'Člen',
  }

  const handleSaveNickname = async () => {
    if (!nicknameValue.trim()) {
      setError('Prezývka nemôže byť prázdna')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nicknameValue.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Chyba pri ukladaní')
      }

      onNicknameUpdate?.(nicknameValue.trim())
      setIsEditingNickname(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setNicknameValue(nickname || '')
    setIsEditingNickname(false)
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Full name - locked */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm text-muted-foreground">Meno</p>
          <p className="font-medium">{fullName || '—'}</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Nickname - editable */}
      <div className="py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Prezývka</p>
            {isEditingNickname ? (
              <div className="mt-1">
                <input
                  type="text"
                  value={nicknameValue}
                  onChange={(e) => setNicknameValue(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Zadajte prezývku"
                  autoFocus
                  disabled={isSaving}
                />
                {error && (
                  <p className="text-xs text-destructive mt-1">{error}</p>
                )}
              </div>
            ) : (
              <p className="font-medium">{nickname || '—'}</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {isEditingNickname ? (
              <>
                <button
                  onClick={handleSaveNickname}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg hover:bg-accent text-primary disabled:opacity-50"
                  title="Uložiť"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground disabled:opacity-50"
                  title="Zrušiť"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingNickname(true)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary"
                title="Upraviť prezývku"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Email - locked */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{email}</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Position - locked */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm text-muted-foreground">Pozícia</p>
          <p className="font-medium">{position || '—'}</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Role - locked */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm text-muted-foreground">Rola</p>
          <p className="font-medium">{role ? roleLabels[role] || role : '—'}</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Info message */}
      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
        ℹ️ Pre zmenu ostatných údajov kontaktujte administrátora.
      </p>
    </div>
  )
}
