'use client'

import { Modal } from './modal'

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  category?: 'navigation' | 'actions' | 'other'
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: KeyboardShortcut[]
}

function KeyCombo({ shortcut }: { shortcut: KeyboardShortcut }) {
  const keys: string[] = []

  if (shortcut.ctrl) keys.push('Ctrl')
  if (shortcut.meta) keys.push('⌘')
  if (shortcut.shift) keys.push('Shift')
  if (shortcut.alt) keys.push('Alt')

  // Format special keys
  let displayKey = shortcut.key
  if (shortcut.key === 'Escape') displayKey = 'Esc'
  if (shortcut.key === '/') displayKey = '/'
  if (shortcut.key === '?') displayKey = '?'

  keys.push(displayKey.toUpperCase())

  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <span key={index}>
          <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-mono font-medium">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="mx-1 text-[var(--text-secondary)]">+</span>
          )}
        </span>
      ))}
    </div>
  )
}

const categoryLabels: Record<string, string> = {
  navigation: 'Navigácia',
  actions: 'Akcie',
  other: 'Ostatné',
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsModalProps) {
  // Filter out Escape from the display list
  const displayShortcuts = shortcuts.filter(s => s.key !== 'Escape')

  // Group shortcuts by category
  const groupedShortcuts = displayShortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  // Order categories
  const categoryOrder = ['navigation', 'actions', 'other']

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Klávesové skratky" size="sm">
      <div className="space-y-6">
        {categoryOrder.map((category) => {
          const shortcuts = groupedShortcuts[category]
          if (!shortcuts || shortcuts.length === 0) return null

          return (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-3">
                {categoryLabels[category]}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-[var(--text-primary)]">
                      {shortcut.description}
                    </span>
                    <KeyCombo shortcut={shortcut} />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-6 text-xs text-[var(--text-secondary)] text-center">
        Stlačte <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-mono">Esc</kbd> pre zatvorenie
      </p>
    </Modal>
  )
}
