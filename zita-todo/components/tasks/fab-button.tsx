'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface FabButtonProps {
  onClick: () => void
  className?: string
}

export function FabButton({ onClick, className }: FabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed right-4 bottom-20 z-40',
        'flex items-center justify-center',
        'w-14 h-14 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg hover:shadow-xl',
        'transition-all duration-200',
        'active:scale-95',
        'lg:hidden', // Hide on desktop
        className
      )}
      aria-label="Pridať úlohu"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
