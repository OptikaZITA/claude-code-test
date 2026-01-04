'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface HeadingFormProps {
  onSubmit: (title: string) => Promise<void>
  placeholder?: string
}

export function HeadingForm({ onSubmit, placeholder = 'Nová sekcia...' }: HeadingFormProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    try {
      await onSubmit(title.trim())
      setTitle('')
      setIsAdding(false)
    } catch (error) {
      console.error('Failed to create heading:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsAdding(false)
      setTitle('')
    }
  }

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-2 w-full py-2 px-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Pridať sekciu
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 py-2 px-3">
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1"
        autoFocus
        disabled={isLoading}
      />
      <Button type="submit" size="sm" disabled={!title.trim() || isLoading}>
        {isLoading ? 'Pridávam...' : 'Pridať'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsAdding(false)
          setTitle('')
        }}
        disabled={isLoading}
      >
        Zrušiť
      </Button>
    </form>
  )
}
