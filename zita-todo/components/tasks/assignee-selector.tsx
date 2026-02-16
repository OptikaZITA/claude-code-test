'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { User as UserIcon, ChevronDown, Check, X } from 'lucide-react'
import { User } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { getDisplayName } from '@/lib/utils/user'

interface AssigneeSelectorProps {
  value?: User | null
  onChange: (user: User | null) => void
  className?: string
}

export function AssigneeSelector({
  value,
  onChange,
  className,
}: AssigneeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Fetch team members
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('is_active', true)
          .order('full_name', { ascending: true })

        if (error) throw error
        setUsers(data || [])
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [supabase])

  // Update dropdown position when opened
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect()
      const dropdownWidth = 256 // w-64 = 16rem = 256px

      let left = rect.left
      const top = rect.bottom + 8

      // Ensure dropdown doesn't go off-screen right
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8
      }
      // Ensure dropdown doesn't go off-screen left
      if (left < 8) left = 8

      setDropdownPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
      setDropdownPosition(null)
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const filteredUsers = users.filter((user) =>
    getDisplayName(user).toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (user: User | null) => {
    onChange(user)
    setIsOpen(false)
    setSearch('')
    setDropdownPosition(null)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false)
            setDropdownPosition(null)
          } else {
            setIsOpen(true)
          }
        }}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          'border border-[var(--border-primary)] bg-[var(--bg-primary)]',
          'hover:border-[var(--color-primary)]',
          !value && 'text-[var(--text-secondary)]'
        )}
      >
        {value ? (
          <Avatar
            src={value.avatar_url}
            name={getDisplayName(value)}
            size="xs"
          />
        ) : (
          <UserIcon className="h-4 w-4" />
        )}
        <span className="flex-1 text-left truncate">
          {value ? getDisplayName(value) : 'Nepriradené'}
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
      </button>

      {isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-64 rounded-xl border border-[var(--border)] bg-card shadow-xl z-[9999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-[var(--border-primary)]">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadaj používateľa..."
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg',
                'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                'placeholder:text-[var(--text-secondary)]',
                'outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
              )}
            />
          </div>

          {/* Users list */}
          <div className="max-h-48 overflow-y-auto p-2">
            {/* Unassigned option */}
            <button
              onClick={() => handleSelect(null)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2',
                'hover:bg-[var(--bg-secondary)] transition-colors',
                !value && 'bg-[var(--bg-secondary)]'
              )}
            >
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Nepriradené
                </span>
              </div>
              {!value && (
                <Check className="h-4 w-4 text-[var(--color-primary)]" />
              )}
            </button>

            {loading ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                Načítavam...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                Žiadni používatelia
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2',
                    'hover:bg-[var(--bg-secondary)] transition-colors',
                    value?.id === user.id && 'bg-[var(--bg-secondary)]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={user.avatar_url}
                      name={getDisplayName(user)}
                      size="xs"
                    />
                    <span className="text-sm text-[var(--text-primary)]">
                      {getDisplayName(user)}
                    </span>
                  </div>
                  {value?.id === user.id && (
                    <Check className="h-4 w-4 text-[var(--color-primary)]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
