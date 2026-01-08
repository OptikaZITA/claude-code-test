'use client'

import { useState, useCallback } from 'react'
import Cropper, { Area, Point } from 'react-easy-crop'
import { Minus, Plus } from 'lucide-react'

interface AvatarEditorProps {
  image: string
  onCropComplete: (croppedAreaPixels: Area) => void
}

export function AvatarEditor({ image, onCropComplete }: AvatarEditorProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      onCropComplete(croppedAreaPixels)
    },
    [onCropComplete]
  )

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 1))
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Cropper container */}
      <div className="relative w-64 h-64 rounded-full overflow-hidden bg-muted">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          disabled={zoom <= 1}
        >
          <Minus className="h-4 w-4" />
        </button>

        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />

        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          disabled={zoom >= 3}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Potiahni fotku pre posun, použi slider pre priblíženie
      </p>
    </div>
  )
}

// Helper function to create cropped image blob
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Set canvas size to desired crop size
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // Return as blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas is empty'))
        }
      },
      'image/jpeg',
      0.9
    )
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}
