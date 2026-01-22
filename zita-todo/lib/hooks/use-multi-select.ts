'use client'

import { useState, useCallback, useEffect } from 'react'

interface UseMultiSelectOptions {
  /** All available item IDs in current view */
  items: string[]
  /** Called when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void
}

interface UseMultiSelectReturn {
  /** Currently selected item IDs */
  selectedIds: Set<string>
  /** Last clicked item ID (for shift-click range selection) */
  lastClickedId: string | null
  /** Number of selected items */
  selectedCount: number
  /** Whether any items are selected */
  hasSelection: boolean
  /** Check if a specific item is selected */
  isSelected: (id: string) => boolean
  /** Handle click on an item (with modifier key support) */
  handleClick: (id: string, event: React.MouseEvent | { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void
  /** Toggle selection of a single item */
  toggle: (id: string) => void
  /** Select a single item (clears others) */
  select: (id: string) => void
  /** Select multiple items */
  selectMany: (ids: string[]) => void
  /** Select all items */
  selectAll: () => void
  /** Clear all selection */
  clearSelection: () => void
  /** Select a range from last clicked to target */
  selectRange: (toId: string) => void
  /** Get array of selected IDs */
  getSelectedArray: () => string[]
}

export function useMultiSelect({
  items,
  onSelectionChange,
}: UseMultiSelectOptions): UseMultiSelectReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedId, setLastClickedId] = useState<string | null>(null)

  // Notify on selection change
  useEffect(() => {
    onSelectionChange?.(selectedIds)
  }, [selectedIds, onSelectionChange])

  // Clear selection when items change significantly (e.g., view change)
  useEffect(() => {
    // Remove selected IDs that are no longer in items
    setSelectedIds(prev => {
      const itemSet = new Set(items)
      const newSelection = new Set<string>()
      prev.forEach(id => {
        if (itemSet.has(id)) {
          newSelection.add(id)
        }
      })
      if (newSelection.size !== prev.size) {
        return newSelection
      }
      return prev
    })
  }, [items])

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id)
  }, [selectedIds])

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setLastClickedId(id)
  }, [])

  const select = useCallback((id: string) => {
    setSelectedIds(new Set([id]))
    setLastClickedId(id)
  }, [])

  const selectMany = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
    if (ids.length > 0) {
      setLastClickedId(ids[ids.length - 1])
    }
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items))
    if (items.length > 0) {
      setLastClickedId(items[items.length - 1])
    }
  }, [items])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastClickedId(null)
  }, [])

  const selectRange = useCallback((toId: string) => {
    if (!lastClickedId) {
      select(toId)
      return
    }

    const fromIndex = items.indexOf(lastClickedId)
    const toIndex = items.indexOf(toId)

    if (fromIndex === -1 || toIndex === -1) {
      select(toId)
      return
    }

    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    const rangeIds = items.slice(start, end + 1)

    setSelectedIds(prev => {
      const next = new Set(prev)
      rangeIds.forEach(id => next.add(id))
      return next
    })
    // Don't update lastClickedId for range selection to allow extending
  }, [items, lastClickedId, select])

  const handleClick = useCallback((
    id: string,
    event: React.MouseEvent | { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }
  ) => {
    const isShift = event.shiftKey
    const isMeta = 'metaKey' in event ? event.metaKey : false
    const isCtrl = 'ctrlKey' in event ? event.ctrlKey : false
    const isModifier = isMeta || isCtrl

    if (isShift && lastClickedId) {
      // Shift + click: select range
      selectRange(id)
    } else if (isModifier) {
      // Cmd/Ctrl + click: toggle individual
      toggle(id)
    } else {
      // Plain click: select only this one (or toggle if already only selected)
      if (selectedIds.size === 1 && selectedIds.has(id)) {
        clearSelection()
      } else {
        select(id)
      }
    }
  }, [lastClickedId, selectRange, toggle, selectedIds, clearSelection, select])

  const getSelectedArray = useCallback(() => {
    return Array.from(selectedIds)
  }, [selectedIds])

  return {
    selectedIds,
    lastClickedId,
    selectedCount: selectedIds.size,
    hasSelection: selectedIds.size > 0,
    isSelected,
    handleClick,
    toggle,
    select,
    selectMany,
    selectAll,
    clearSelection,
    selectRange,
    getSelectedArray,
  }
}
