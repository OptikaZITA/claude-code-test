'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

interface TaskQuickAddProps {
  onAdd: (title: string) => void
  placeholder?: string
  className?: string
}

export function TaskQuickAdd({
  onAdd,
  placeholder = 'Pridať úlohu...',
  className,
}: TaskQuickAddProps) {
  const [isActive, setIsActive] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isActive])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onAdd(title.trim())
      setTitle('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsActive(false)
      setTitle('')
    }
  }

  if (!isActive) {
    return (
      <button
        onClick={() => setIsActive(true)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border border-dashed border-[#E5E5E5] p-3 text-sm text-[#86868B] transition-colors hover:border-[#007AFF] hover:text-[#007AFF]',
          className
        )}
      >
        <Plus className="h-4 w-4" />
        <span>{placeholder}</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (!title.trim()) setIsActive(false)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pr-20"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#86868B]">
        Enter
      </span>
    </form>
  )
}
