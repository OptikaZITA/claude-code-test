'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload, ImageIcon } from 'lucide-react'
import { Area } from 'react-easy-crop'
import { AvatarEditor, getCroppedImg } from './avatar-editor'
import { useAvatarUpload } from '@/lib/hooks/use-avatar-upload'

interface AvatarUploadModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  currentAvatarUrl?: string | null
  userInitials: string
  onSuccess?: (newUrl: string) => void
}

export function AvatarUploadModal({
  isOpen,
  onClose,
  userId,
  currentAvatarUrl,
  userInitials,
  onSuccess,
}: AvatarUploadModalProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Client-side mount check for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  const { uploading, progress, error, uploadAvatar } = useAvatarUpload({
    onSuccess: (url) => {
      onSuccess?.(url)
      handleClose()
    },
  })

  const handleClose = () => {
    setSelectedImage(null)
    setCroppedAreaPixels(null)
    setIsDragging(false)
    onClose()
  }

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      alert('Neplatný formát súboru. Povolené sú JPG, PNG a WEBP.')
      return
    }

    // Validate file size (max 1MB before compression)
    if (file.size > 1024 * 1024) {
      alert('Súbor je príliš veľký. Maximálna veľkosť je 1 MB.')
      return
    }

    // Create preview URL
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleSave = async () => {
    if (!selectedImage || !croppedAreaPixels) return

    try {
      // Get cropped image as blob
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels)

      // Upload the cropped image
      await uploadAvatar(userId, croppedBlob)
    } catch (err) {
      console.error('Error saving avatar:', err)
    }
  }

  const handleSelectOther = () => {
    setSelectedImage(null)
    setCroppedAreaPixels(null)
    fileInputRef.current?.click()
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-[9999] bg-card rounded-lg shadow-xl w-full max-w-md mx-4 animate-scale-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-heading font-semibold">Profilová fotka</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Current avatar preview */}
          <div className="flex justify-center mb-6">
            {selectedImage ? null : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt="Profilová fotka"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-primary">
                    {userInitials}
                  </span>
                )}
              </div>
            )}
          </div>

          {selectedImage ? (
            /* Editor mode */
            <div className="space-y-4">
              <AvatarEditor
                image={selectedImage}
                onCropComplete={setCroppedAreaPixels}
              />

              <button
                type="button"
                onClick={handleSelectOther}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                Vybrať inú fotku
              </button>
            </div>
          ) : (
            /* Upload zone */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Klikni alebo pretiahni súbor sem
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP (max 1 MB)
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Nahrávam... {progress}%
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
            disabled={uploading}
          >
            Zrušiť
          </button>
          {selectedImage && (
            <button
              type="button"
              onClick={handleSave}
              disabled={uploading || !croppedAreaPixels}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Uložiť
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
