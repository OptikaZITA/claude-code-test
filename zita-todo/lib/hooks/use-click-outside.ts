import { useEffect, useRef, useCallback, RefObject } from 'react'

interface UseClickOutsideOptions {
  /** Whether the click-outside detection is active */
  active?: boolean
  /** Also close on Escape key press */
  escapeToClose?: boolean
}

/**
 * Hook to detect clicks outside of an element and trigger a callback.
 * Also optionally handles Escape key to close.
 *
 * Ignores clicks on portal elements (modals, dropdowns, date pickers, etc.)
 * to prevent accidental closure when interacting with overlays.
 *
 * @param onClickOutside - Callback to run when clicking outside
 * @param options - Configuration options
 * @returns RefObject to attach to the element to monitor
 */
export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  onClickOutside: () => void,
  options: UseClickOutsideOptions = {}
): RefObject<T | null> {
  const { active = true, escapeToClose = false } = options
  const ref = useRef<T>(null)

  // Memoize callback to prevent unnecessary effect re-runs
  const stableCallback = useCallback(() => {
    onClickOutside()
  }, [onClickOutside])

  useEffect(() => {
    if (!active) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if click is on a portal element (should not close)
      const isPortal =
        // Radix UI portals (shadcn/ui uses these)
        target.closest('[data-radix-portal]') ||
        target.closest('[data-radix-popper-content-wrapper]') ||
        // Dialog/Modal
        target.closest('[role="dialog"]') ||
        // Listbox (Select, Combobox)
        target.closest('[role="listbox"]') ||
        // Menu (DropdownMenu)
        target.closest('[role="menu"]') ||
        // React Day Picker (calendar)
        target.closest('.rdp') ||
        target.closest('[data-rdp]') ||
        // Floating UI portals
        target.closest('[data-floating-ui-portal]') ||
        // Generic popover content
        target.closest('[data-state="open"]') && target.closest('[data-radix-popper-content-wrapper]') ||
        // Toast notifications
        target.closest('[data-sonner-toast]') ||
        target.closest('[data-toaster]')

      if (isPortal) {
        return
      }

      // Check if click is outside the ref element
      if (ref.current && !ref.current.contains(target)) {
        stableCallback()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && escapeToClose) {
        // Don't handle if user is typing in an input
        const target = e.target as HTMLElement
        const isTyping =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable

        // For inputs/textareas, we still want to close but let them handle blur first
        // The blur will save the data, then we close
        if (isTyping) {
          // Blur the element first to trigger save
          ;(target as HTMLInputElement | HTMLTextAreaElement).blur()
        }

        stableCallback()
      }
    }

    // Use 'click' instead of 'mousedown' so that blur events fire first
    // This ensures autosave happens before closing
    // Use setTimeout to avoid immediate trigger on the same click that opened
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClick)
      if (escapeToClose) {
        document.addEventListener('keydown', handleKeyDown)
      }
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClick)
      if (escapeToClose) {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [active, escapeToClose, stableCallback])

  return ref
}
