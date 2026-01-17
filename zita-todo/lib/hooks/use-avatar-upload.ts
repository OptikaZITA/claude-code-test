'use client'

import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

interface UseAvatarUploadOptions {
  onSuccess?: (url: string) => void
  onError?: (error: Error) => void
}

interface UseAvatarUploadReturn {
  uploading: boolean
  progress: number
  error: string | null
  uploadAvatar: (userId: string, file: File | Blob) => Promise<string | null>
  deleteAvatar: (userId: string) => Promise<boolean>
  compressImage: (file: File) => Promise<File>
}

export function useAvatarUpload(options: UseAvatarUploadOptions = {}): UseAvatarUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const compressImage = async (file: File): Promise<File> => {
    const compressionOptions = {
      maxSizeMB: 0.5, // Max 500KB
      maxWidthOrHeight: 400, // Max 400x400px
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
    }

    try {
      setProgress(10)
      const compressedFile = await imageCompression(file, compressionOptions)
      setProgress(30)
      return compressedFile
    } catch (err) {
      console.error('Compression failed:', err)
      throw new Error('Nepodarilo sa komprimovať obrázok')
    }
  }

  const uploadAvatar = async (userId: string, file: File | Blob): Promise<string | null> => {
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      // Convert Blob to File if needed
      let fileToUpload: File
      if (file instanceof Blob && !(file instanceof File)) {
        fileToUpload = new File([file], 'avatar.jpg', { type: 'image/jpeg' })
      } else {
        fileToUpload = file as File
      }

      // Validate file size (max 1MB before compression)
      if (fileToUpload.size > 1024 * 1024) {
        throw new Error('Súbor je príliš veľký. Maximálna veľkosť je 1 MB.')
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(fileToUpload.type)) {
        throw new Error('Neplatný formát súboru. Povolené sú JPG, PNG a WEBP.')
      }

      // Compress the image
      setProgress(10)
      const compressed = await compressImage(fileToUpload)
      setProgress(40)

      // Upload to Supabase Storage
      const path = `${userId}/avatar.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, {
          upsert: true,
          contentType: 'image/jpeg',
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error('Nepodarilo sa nahrať obrázok')
      }

      setProgress(70)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      // Add cache-busting query param
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

      setProgress(85)

      // Update users table via API route (bypasses RLS for admin editing other users)
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: urlWithCacheBust }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Update error:', errorData)
        throw new Error(errorData.error || 'Nepodarilo sa aktualizovať profil')
      }

      setProgress(100)
      options.onSuccess?.(urlWithCacheBust)
      return urlWithCacheBust
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nastala neočakávaná chyba'
      setError(message)
      options.onError?.(err instanceof Error ? err : new Error(message))
      return null
    } finally {
      setUploading(false)
    }
  }

  const deleteAvatar = async (userId: string): Promise<boolean> => {
    setUploading(true)
    setError(null)

    try {
      // Delete file from storage
      const path = `${userId}/avatar.jpg`
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([path])

      if (deleteError) {
        console.error('Delete error:', deleteError)
        // Don't throw - file might not exist
      }

      // Update users table via API route (bypasses RLS for admin editing other users)
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: null }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Update error:', errorData)
        throw new Error(errorData.error || 'Nepodarilo sa aktualizovať profil')
      }

      options.onSuccess?.('')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nastala neočakávaná chyba'
      setError(message)
      options.onError?.(err instanceof Error ? err : new Error(message))
      return false
    } finally {
      setUploading(false)
    }
  }

  return {
    uploading,
    progress,
    error,
    uploadAvatar,
    deleteAvatar,
    compressImage,
  }
}
