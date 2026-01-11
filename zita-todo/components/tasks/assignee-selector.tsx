'use client'

import { useState, useRef, useEffect } from 'react'
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
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

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg">
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
        </div>
      )}
    </div>
  )
}
