'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface TaskQuickAddProps {
  onAdd: (title: string) => void
  placeholder?: string
  className?: string
}

export function TaskQuickAdd({
  onAdd,
  placeholder = 'Názov novej úlohy...',
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

  // Listen for keyboard shortcut to open quick add
  useEffect(() => {
    const handleKeyboardNewTask = () => {
      setIsActive(true)
    }
    window.addEventListener('keyboard:newTask', handleKeyboardNewTask)
    return () => window.removeEventListener('keyboard:newTask', handleKeyboardNewTask)
  }, [])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (title.trim()) {
      onAdd(title.trim())
      setTitle('')
      setIsActive(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsActive(false)
      setTitle('')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleCancel = () => {
    setIsActive(false)
    setTitle('')
  }

  if (!isActive) {
    return (
      <Button
        onClick={() => setIsActive(true)}
        className={cn(
          'bg-primary text-white hover:bg-primary/90',
          className
        )}
      >
        <Plus className="h-4 w-4 mr-2" />
        Pridať úlohu
      </Button>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 p-4 border-b border-[var(--border)] bg-card rounded-lg', className)}>
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 text-sm rounded-lg border-2 border-secondary focus:border-secondary focus:outline-none bg-background text-foreground placeholder:text-muted-foreground"
        autoFocus
      />
      <Button onClick={handleSubmit} size="sm" className="bg-primary text-white hover:bg-primary/90">
        Pridať
      </Button>
      <button
        onClick={handleCancel}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Zrušiť
      </button>
    </div>
  )
}
