'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  CheckCircle,
  Star,
  Trash2,
  User,
  Calendar,
  Tag,
  LayoutList,
} from 'lucide-react'
import { useMultiSelectContext } from '@/lib/contexts/multi-select-context'
import { useTasks } from '@/lib/hooks/use-tasks'
import { useOrganizationUsers } from '@/lib/hooks/use-organization-users'
import { useTags } from '@/lib/hooks/use-tags'
import { TaskStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Dropdown } from '@/components/ui/dropdown'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'
import { format, addDays } from 'date-fns'

interface BulkActionToolbarProps {
  onComplete?: () => void
}

const statusOptions: { value: TaskStatus; label: string; key: string }[] = [
  { value: 'backlog', label: 'Backlog', key: '1' },
  { value: 'todo', label: 'Todo', key: '2' },
  { value: 'in_progress', label: 'In Progress', key: '3' },
  { value: 'review', label: 'Review', key: '4' },
  { value: 'done', label: 'Done', key: '5' },
]

export function BulkActionToolbar({ onComplete }: BulkActionToolbarProps) {
  const {
    selectedCount,
    hasSelection,
    getSelectedTasks,
    clearSelection,
  } = useMultiSelectContext()

  const { updateTask, completeTask, softDelete } = useTasks()
  const { users } = useOrganizationUsers()
  const { tags } = useTags()

  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [showDeadlineDropdown, setShowDeadlineDropdown] = useState(false)
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    if (!hasSelection) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element).tagName)) return

      switch (e.key) {
        case 'Escape':
          clearSelection()
          break
        case 'd':
        case 'D':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            handleMarkAsDone()
          }
          break
        case 't':
        case 'T':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            handleAddToToday()
          }
          break
        case 'Delete':
        case 'Backspace':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            handleDelete()
          }
          break
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            const status = statusOptions.find(s => s.key === e.key)
            if (status) {
              handleStatusChange(status.value)
            }
          }
          break
        case 'a':
        case 'A':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            setShowAssigneeDropdown(true)
          }
          break
        case 'l':
        case 'L':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            setShowDeadlineDropdown(true)
          }
          break
        case 'g':
        case 'G':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            setShowTagDropdown(true)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hasSelection, clearSelection])

  const handleMarkAsDone = useCallback(async () => {
    const tasks = getSelectedTasks()
    if (tasks.length === 0) return

    setIsProcessing(true)
    try {
      await Promise.all(tasks.map(task => completeTask(task.id, true)))
      clearSelection()
      onComplete?.()
    } catch (error) {
      console.error('Error completing tasks:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [getSelectedTasks, completeTask, clearSelection, onComplete])

  const handleAddToToday = useCallback(async () => {
    const tasks = getSelectedTasks()
    if (tasks.length === 0) return

    setIsProcessing(true)
    try {
      await Promise.all(tasks.map(task =>
        updateTask(task.id, { when_type: 'today', when_date: null })
      ))
      clearSelection()
      onComplete?.()
    } catch (error) {
      console.error('Error updating tasks:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [getSelectedTasks, updateTask, clearSelection, onComplete])

  const handleDelete = useCallback(async () => {
    const tasks = getSelectedTasks()
    if (tasks.length === 0) return

    // Confirm deletion
    if (!confirm(`Vymazať ${tasks.length} ${tasks.length === 1 ? 'úlohu' : tasks.length < 5 ? 'úlohy' : 'úloh'}?`)) {
      return
    }

    setIsProcessing(true)
    try {
      await Promise.all(tasks.map(task => softDelete(task.id)))
      clearSelection()
      onComplete?.()
    } catch (error) {
      console.error('Error deleting tasks:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [getSelectedTasks, softDelete, clearSelection, onComplete])

  const handleStatusChange = useCallback(async (status: TaskStatus) => {
    const tasks = getSelectedTasks()
    if (tasks.length === 0) return

    setIsProcessing(true)
    try {
      const updates: any = { status }
      if (status === 'done') {
        updates.completed_at = new Date().toISOString()
        updates.when_type = null
      }
      await Promise.all(tasks.map(task => updateTask(task.id, updates)))
      clearSelection()
      onComplete?.()
    } catch (error) {
      console.error('Error updating tasks:', error)
    } finally {
      setIsProcessing(false)
      setShowStatusDropdown(false)
    }
  }, [getSelectedTasks, updateTask, clearSelection, onComplete])

  const handleAssigneeChange = useCallback(async (assigneeId: string | null) => {
    const tasks = getSelectedTasks()
    if (tasks.length === 0) return

    setIsProcessing(true)
    try {
      await Promise.all(tasks.map(task =>
        updateTask(task.id, { assignee_id: assigneeId })
      ))
      clearSelection()
      onComplete?.()
    } catch (error) {
      console.error('Error updating tasks:', error)
    } finally {
      setIsProcessing(false)
      setShowAssigneeDropdown(false)
    }
  }, [getSelectedTasks, updateTask, clearSelection, onComplete])

  const handleDeadlineChange = useCallback(async (days: number | null) => {
    const tasks = getSelectedTasks()
    if (tasks.length === 0) return

    setIsProcessing(true)
    try {
      const deadline = days !== null
        ? format(addDays(new Date(), days), 'yyyy-MM-dd')
        : null
      await Promise.all(tasks.map(task =>
        updateTask(task.id, { deadline })
      ))
      clearSelection()
      onComplete?.()
    } catch (error) {
      console.error('Error updating tasks:', error)
    } finally {
      setIsProcessing(false)
      setShowDeadlineDropdown(false)
    }
  }, [getSelectedTasks, updateTask, clearSelection, onComplete])

  const handleTagAdd = useCallback(async (tagId: string) => {
    const tasks = getSelectedTasks()
    if (tasks.length === 0) return

    setIsProcessing(true)
    try {
      // For each task, add the tag if not already present
      await Promise.all(tasks.map(async task => {
        const currentTagIds = task.tags?.map(t => t.id) || []
        if (!currentTagIds.includes(tagId)) {
          // This would need a dedicated API endpoint for adding tags
          // For now, we'll skip this or implement later
        }
      }))
      clearSelection()
      onComplete?.()
    } catch (error) {
      console.error('Error adding tags:', error)
    } finally {
      setIsProcessing(false)
      setShowTagDropdown(false)
    }
  }, [getSelectedTasks, clearSelection, onComplete])

  if (!hasSelection) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl shadow-xl">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} {selectedCount === 1 ? 'označená' : selectedCount < 5 ? 'označené' : 'označených'}
          </span>
          <button
            onClick={clearSelection}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Zrušiť výber (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Mark as Done */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAsDone}
            disabled={isProcessing}
            className="gap-2"
            title="Označiť ako hotové (D)"
          >
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Hotovo</span>
          </Button>

          {/* Add to Today */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddToToday}
            disabled={isProcessing}
            className="gap-2"
            title="Pridať do Dnes (T)"
          >
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Dnes</span>
          </Button>

          {/* Status dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              disabled={isProcessing}
              className="gap-2"
              title="Zmeniť status (1-5)"
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Status</span>
            </Button>
            {showStatusDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-40 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between"
                  >
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.key}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
              disabled={isProcessing}
              className="gap-2"
              title="Priradiť osobe (A)"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Osoba</span>
            </Button>
            {showAssigneeDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50 max-h-60 overflow-auto">
                <button
                  onClick={() => handleAssigneeChange(null)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  Nepriradené
                </button>
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleAssigneeChange(user.id)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  >
                    <Avatar
                      src={user.avatar_url}
                      name={user.full_name}
                      size="xs"
                    />
                    <span>{user.nickname || user.full_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Deadline dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeadlineDropdown(!showDeadlineDropdown)}
              disabled={isProcessing}
              className="gap-2"
              title="Nastaviť deadline (L)"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Deadline</span>
            </Button>
            {showDeadlineDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-40 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={() => handleDeadlineChange(null)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  Bez deadlinu
                </button>
                <button
                  onClick={() => handleDeadlineChange(0)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  Dnes
                </button>
                <button
                  onClick={() => handleDeadlineChange(1)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  Zajtra
                </button>
                <button
                  onClick={() => handleDeadlineChange(7)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  O týždeň
                </button>
              </div>
            )}
          </div>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isProcessing}
            className="gap-2 text-error hover:text-error hover:bg-error/10"
            title="Vymazať (Delete)"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Vymazať</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
