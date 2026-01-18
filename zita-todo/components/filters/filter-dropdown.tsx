'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'

export interface FilterDropdownOption {
  value: string
  label: string
  count: number
  avatarUrl?: string | null
  color?: string | null
}

interface FilterDropdownProps {
  label: string
  options: FilterDropdownOption[]
  value: string | string[] | null
  onChange: (value: string | string[] | null) => void
  multiSelect?: boolean
  showCounts?: boolean
  className?: string
  allLabel?: string
  /** Hide the "All" option from dropdown (for assignee filter) */
  hideAllOption?: boolean
  /** Show selected option label on button when active (for assignee filter) */
  showSelectedLabelOnButton?: boolean
  /** Callback for clearing the filter - shows ✕ button */
  onClear?: () => void
  /** Special option at the bottom (e.g., "Nepriradené") */
  specialOption?: FilterDropdownOption
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  multiSelect = false,
  showCounts = true,
  className,
  allLabel = 'Všetky',
  hideAllOption = false,
  showSelectedLabelOnButton = false,
  onClear,
  specialOption,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determine if filter is active
  const isActive = multiSelect
    ? Array.isArray(value) && value.length > 0
    : value !== null

  // Get selected option label for button (when showSelectedLabelOnButton is true)
  const selectedLabel = showSelectedLabelOnButton && isActive && !multiSelect
    ? (options.find(o => o.value === value)?.label ||
       (specialOption?.value === value ? specialOption.label : null))
    : null

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleOptionClick = (optionValue: string) => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : []
      if (currentValues.includes(optionValue)) {
        const newValues = currentValues.filter(v => v !== optionValue)
        onChange(newValues.length > 0 ? newValues : null)
      } else {
        onChange([...currentValues, optionValue])
      }
    } else {
      onChange(optionValue)
      setIsOpen(false)
    }
  }

  const handleAllClick = () => {
    onChange(null)
    if (!multiSelect) {
      setIsOpen(false)
    }
  }

  const isOptionSelected = (optionValue: string): boolean => {
    if (multiSelect && Array.isArray(value)) {
      return value.includes(optionValue)
    }
    return value === optionValue
  }

  // Handle clear button click
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClear?.()
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
          'border',
          isActive
            ? 'bg-primary text-white border-primary'
            : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
          isOpen && !isActive && 'border-primary'
        )}
      >
        <span>{selectedLabel || label}</span>
        {isActive && onClear ? (
          <X
            className="h-3.5 w-3.5 hover:opacity-70"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 mt-2 z-50',
            'min-w-[200px] max-w-[280px] max-h-[320px] overflow-y-auto',
            'bg-card border border-border rounded-xl shadow-xl',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
        >
          <div className="p-1.5">
            {/* "All" option - hidden when hideAllOption is true */}
            {!hideAllOption && (
              <>
                <button
                  onClick={handleAllClick}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                    !isActive ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                >
                  {multiSelect ? (
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center',
                      !isActive ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                    )}>
                      {!isActive && <Check className="h-3 w-3 text-white" />}
                    </div>
                  ) : (
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      !isActive ? 'border-primary' : 'border-muted-foreground/30'
                    )}>
                      {!isActive && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                  )}
                  <span className="flex-1">{allLabel}</span>
                </button>

                {/* Divider after All option */}
                {options.length > 0 && <div className="my-1 border-t border-border" />}
              </>
            )}

            {/* Options */}
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                  isOptionSelected(option.value) ? 'bg-accent' : 'hover:bg-accent/50'
                )}
              >
                {/* Checkbox/Radio indicator */}
                {multiSelect ? (
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                    isOptionSelected(option.value) ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                  )}>
                    {isOptionSelected(option.value) && <Check className="h-3 w-3 text-white" />}
                  </div>
                ) : (
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    isOptionSelected(option.value) ? 'border-primary' : 'border-muted-foreground/30'
                  )}>
                    {isOptionSelected(option.value) && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                )}

                {/* Avatar (for assignees) */}
                {option.avatarUrl !== undefined && (
                  <Avatar
                    src={option.avatarUrl}
                    name={option.label}
                    size="xs"
                  />
                )}

                {/* Color dot (for tags/areas) */}
                {option.color && !option.avatarUrl && (
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                )}

                {/* Label */}
                <span className="flex-1 truncate">{option.label}</span>

                {/* Count */}
                {showCounts && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({option.count})
                  </span>
                )}
              </button>
            ))}

            {/* Special option at bottom (e.g., "Nepriradené") */}
            {specialOption && (
              <>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => handleOptionClick(specialOption.value)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                    isOptionSelected(specialOption.value) ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    isOptionSelected(specialOption.value) ? 'border-primary' : 'border-muted-foreground/30'
                  )}>
                    {isOptionSelected(specialOption.value) && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>

                  {/* Avatar (for assignees) */}
                  {specialOption.avatarUrl !== undefined && (
                    <Avatar
                      src={specialOption.avatarUrl}
                      name={specialOption.label}
                      size="xs"
                    />
                  )}

                  {/* Label */}
                  <span className="flex-1 truncate">{specialOption.label}</span>

                  {/* Count */}
                  {showCounts && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({specialOption.count})
                    </span>
                  )}
                </button>
              </>
            )}

            {/* Empty state */}
            {options.length === 0 && !specialOption && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Žiadne možnosti
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
