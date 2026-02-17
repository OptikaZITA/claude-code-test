'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Trash2 } from 'lucide-react'
import { AvatarUploadModal } from '@/components/profile/avatar-upload-modal'
import { ProfileInfo } from '@/components/profile/profile-info'
import { useAvatarUpload } from '@/lib/hooks/use-avatar-upload'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  full_name: string | null
  nickname: string | null
  email: string
  avatar_url: string | null
  position: string | null
  role: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const { deleteAvatar, uploading: deleting } = useAvatarUpload()

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
          router.push('/login')
          return
        }

        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, nickname, email, avatar_url, position, role')
          .eq('id', authUser.id)
          .single()

        if (error) throw error
        setUser(data)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router, supabase])

  const handleAvatarSuccess = (newUrl: string) => {
    setUser((prev) => prev ? { ...prev, avatar_url: newUrl } : prev)
  }

  const handleDeleteAvatar = async () => {
    if (!user) return

    const confirmed = window.confirm('Naozaj chcete odstrániť profilovú fotku?')
    if (!confirmed) return

    const success = await deleteAvatar(user.id)
    if (success) {
      setUser((prev) => prev ? { ...prev, avatar_url: null } : prev)
    }
  }

  const getInitials = () => {
    if (user?.nickname) {
      return user.nickname.substring(0, 2).toUpperCase()
    }
    if (user?.full_name) {
      const parts = user.full_name.split(' ')
      return parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase()
    }
    return user?.email?.substring(0, 2).toUpperCase() || '?'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Používateľ nenájdený</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        {/* Avatar section */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Profilová fotka
          </h3>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profilová fotka"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-semibold text-primary">
                  {getInitials()}
                </span>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-4 w-4" />
                Zmeniť fotku
              </button>

              {user.avatar_url && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-destructive hover:text-white hover:border-destructive transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Odstrániť
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-border mb-8" />

        {/* Profile info */}
        <ProfileInfo
          userId={user.id}
          fullName={user.full_name}
          nickname={user.nickname}
          email={user.email}
          position={user.position}
          role={user.role}
          onNicknameUpdate={(newNickname) => {
            setUser((prev) => prev ? { ...prev, nickname: newNickname } : prev)
          }}
        />
      </div>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        userId={user.id}
        currentAvatarUrl={user.avatar_url}
        userInitials={getInitials()}
        onSuccess={handleAvatarSuccess}
      />
    </div>
  )
}
