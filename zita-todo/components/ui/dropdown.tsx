'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
}

export function Dropdown({ trigger, children, align = 'left' }: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            'absolute z-[9999] mt-2 min-w-[160px] rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] py-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, {
                onClick: (e: React.MouseEvent) => {
                  (child.props as any).onClick?.(e)
                  setIsOpen(false)
                }
              })
            }
            return child
          })}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export function DropdownItem({ children, onClick, className }: DropdownItemProps) {
  return (
    <button
      className={cn(
        'w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
