'use client'

import { useState } from 'react'
import {
  Inbox,
  Star,
  Clock,
  Calendar,
  ChevronDown,
  X
} from 'lucide-react'
import { WhenType } from '@/types'
import { Dropdown } from '@/components/ui/dropdown'
import { cn } from '@/lib/utils/cn'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'

interface WhenPickerProps {
  value: WhenType | null  // null = Logbook
  whenDate?: string | null
  onChange: (whenType: WhenType, whenDate?: string | null) => void
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const whenOptions: { value: WhenType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'inbox',
    label: 'Inbox',
    icon: <Inbox className="w-4 h-4" />,
    description: 'Spracovať neskôr'
  },
  {
    value: 'today',
    label: 'Dnes',
    icon: <Star className="w-4 h-4 text-[var(--color-warning)]" />,
    description: 'Urobiť dnes'
  },
  {
    value: 'anytime',
    label: 'Kedykoľvek',
    icon: <Clock className="w-4 h-4 text-[var(--color-primary)]" />,
    description: 'Bez konkrétneho termínu'
  },
  {
    value: 'scheduled',
    label: 'Naplánované',
    icon: <Calendar className="w-4 h-4 text-[var(--color-success)]" />,
    description: 'Na konkrétny dátum'
  },
]

export function WhenPicker({
  value,
  whenDate,
  onChange,
  showLabel = true,
  size = 'md'
}: WhenPickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempDate, setTempDate] = useState(whenDate || '')

  // null = Logbook, show inbox as default
  const currentOption = whenOptions.find(opt => opt.value === (value || 'inbox')) || whenOptions[0]

  const handleOptionClick = (optionValue: WhenType) => {
    if (optionValue === 'scheduled') {
      setShowDatePicker(true)
    } else {
      onChange(optionValue, null)
      setShowDatePicker(false)
    }
  }

  const handleDateConfirm = () => {
    if (tempDate) {
      onChange('scheduled', tempDate)
    }
    setShowDatePicker(false)
  }

  const handleClearDate = () => {
    setTempDate('')
    onChange('anytime', null)
    setShowDatePicker(false)
  }

  const formatWhenDate = (date: string) => {
    try {
      return format(new Date(date), 'd. MMM yyyy', { locale: sk })
    } catch {
      return date
    }
  }

  return (
    <div className="relative">
      <Dropdown
        trigger={
          <button
            className={cn(
              "flex items-center gap-2 rounded-lg border border-[var(--bg-secondary)] bg-[var(--bg-primary)] transition-colors hover:border-[var(--color-primary)]",
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
            )}
          >
            {currentOption.icon}
            {showLabel && (
              <span className="text-[var(--text-primary)]">
                {value === 'scheduled' && whenDate
                  ? formatWhenDate(whenDate)
                  : currentOption.label
                }
              </span>
            )}
            <ChevronDown className={cn(
              "text-[var(--text-secondary)]",
              size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
            )} />
          </button>
        }
        align="left"
      >
        <div className="min-w-[200px]">
          {whenOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-[var(--bg-secondary)] transition-colors",
                value === option.value && "bg-[var(--bg-secondary)]"
              )}
            >
              {option.icon}
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {option.label}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {option.description}
                </p>
              </div>
            </button>
          ))}

          {/* Date picker for scheduled */}
          {showDatePicker && (
            <div className="border-t border-[var(--bg-secondary)] p-3">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                Vybrať dátum
              </label>
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--bg-secondary)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleDateConfirm}
                  disabled={!tempDate}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Potvrdiť
                </button>
                <button
                  onClick={handleClearDate}
                  className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Zrušiť
                </button>
              </div>
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  )
}

// Compact version for task items
export function WhenBadge({
  value,
  whenDate,
  size = 'sm'
}: {
  value: WhenType | null
  whenDate?: string | null
  size?: 'sm' | 'xs'
}) {
  // null = Logbook (dokončené úlohy), nezobrazuj badge
  if (!value) return null

  const option = whenOptions.find(opt => opt.value === value)
  if (!option || value === 'inbox') return null

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'd. MMM', { locale: sk })
    } catch {
      return date
    }
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full",
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]',
      value === 'today' && 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
      value === 'anytime' && 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
      value === 'scheduled' && 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
    )}>
      {option.icon}
      <span>
        {value === 'scheduled' && whenDate
          ? formatDate(whenDate)
          : option.label
        }
      </span>
    </span>
  )
}

// Area/Department badge for task items
export function AreaBadge({
  area,
  size = 'sm'
}: {
  area: { name: string; color: string | null } | null | undefined
  size?: 'sm' | 'xs'
}) {
  if (!area) return null

  const color = area.color || '#007AFF' // Default to primary color

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'
      )}
      style={{
        backgroundColor: `${color}20`, // 20 = ~12% opacity in hex
        color: color
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{area.name}</span>
    </span>
  )
}
