'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, Trash2 } from 'lucide-react'
import { TaskWithRelations, TaskPriority } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar } from '@/components/ui/avatar'
import { TagChipList } from '@/components/tags'
import { WhenBadge } from '@/components/tasks/when-picker'
import { DeadlineBadge } from '@/components/tasks/deadline-picker'
import { TaskItemExpanded } from '@/components/tasks/task-item-expanded'
import { cn } from '@/lib/utils/cn'
import { formatDurationShort } from '@/lib/utils/date'

const SWIPE_THRESHOLD = 80 // pixels to trigger delete action
const DELETE_BUTTON_WIDTH = 80 // width of delete button

interface TaskItemProps {
  task: TaskWithRelations
  isExpanded?: boolean
  onExpand?: () => void
  onCollapse?: () => void
  onClick?: () => void
  onComplete: (completed: boolean) => void
  onUpdate?: (updates: Partial<TaskWithRelations>) => void
  onDelete?: () => void
  enableInlineEdit?: boolean
}

const priorityColors: Record<TaskPriority, string> = {
  urgent: 'border-l-[var(--color-error)]',
  high: 'border-l-[var(--color-warning)]',
  medium: 'border-l-[var(--color-primary)]',
  low: 'border-l-[var(--text-secondary)]',
}

// Hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

export function TaskItem({
  task,
  isExpanded = false,
  onExpand,
  onCollapse,
  onClick,
  onComplete,
  onUpdate,
  onDelete,
  enableInlineEdit = true,
}: TaskItemProps) {
  const isCompleted = task.status === 'done'
  const isMobile = useIsMobile()

  // Swipe state
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isHorizontalSwipe = useRef<boolean | null>(null)

  const handleClick = useCallback(() => {
    // Don't trigger click if we just finished swiping
    if (swipeOffset !== 0) return

    if (enableInlineEdit && isMobile) {
      // Single click on mobile expands
      onExpand?.()
    } else {
      onClick?.()
    }
  }, [enableInlineEdit, isMobile, onExpand, onClick, swipeOffset])

  const handleDoubleClick = useCallback(() => {
    if (enableInlineEdit && !isMobile) {
      // Double click on desktop expands
      onExpand?.()
    }
  }, [enableInlineEdit, isMobile, onExpand])

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHorizontalSwipe.current = null
    setIsSwiping(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const diffX = touchStartX.current - currentX
    const diffY = Math.abs(touchStartY.current - currentY)

    // Determine if this is a horizontal or vertical swipe
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || diffY > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > diffY
      }
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current) {
      // Prevent vertical scroll while swiping horizontally
      e.preventDefault()

      // Only allow left swipe (positive diffX)
      if (diffX > 0) {
        // Add resistance as user swipes further
        const resistance = diffX > DELETE_BUTTON_WIDTH ? 0.3 : 1
        const offset = Math.min(diffX * resistance, DELETE_BUTTON_WIDTH + 40)
        setSwipeOffset(offset)
      } else {
        // Swiping right - reset
        setSwipeOffset(0)
      }
    }
  }, [isSwiping])

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false)
    isHorizontalSwipe.current = null

    if (swipeOffset > SWIPE_THRESHOLD) {
      // Keep delete button visible
      setSwipeOffset(DELETE_BUTTON_WIDTH)
    } else {
      // Snap back
      setSwipeOffset(0)
    }
  }, [swipeOffset])

  const handleDeleteClick = useCallback(() => {
    setSwipeOffset(0)
    onDelete?.()
  }, [onDelete])

  // Reset swipe when clicking outside
  useEffect(() => {
    if (swipeOffset === 0) return

    const handleClickOutside = () => {
      setSwipeOffset(0)
    }

    // Delay adding listener to avoid immediate trigger
    const timeoutId = setTimeout(() => {
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [swipeOffset])

  // If expanded, render the expanded view
  if (isExpanded && enableInlineEdit) {
    return (
      <TaskItemExpanded
        task={task}
        onUpdate={onUpdate || (() => {})}
        onComplete={onComplete}
        onCollapse={onCollapse || (() => {})}
        onDelete={onDelete}
      />
    )
  }

  // Collapsed view with swipe-to-delete
  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete button (revealed on swipe) */}
      {isMobile && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDeleteClick()
          }}
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-center bg-[var(--color-error)] text-white transition-opacity',
            swipeOffset > 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: DELETE_BUTTON_WIDTH }}
        >
          <div className="flex flex-col items-center gap-1">
            <Trash2 className="h-5 w-5" />
            <span className="text-xs font-medium">Vymazat</span>
          </div>
        </button>
      )}

      {/* Task content (swipeable) */}
      <div
        className={cn(
          'group flex items-start gap-3 rounded-lg border-l-4 bg-[var(--bg-primary)] p-3 cursor-pointer relative',
          priorityColors[task.priority],
          isCompleted && 'opacity-60',
          !isSwiping && 'transition-transform duration-200 ease-out',
          !isMobile && 'hover:bg-[var(--bg-hover)] transition-colors'
        )}
        style={{
          transform: isMobile ? `translateX(-${swipeOffset}px)` : undefined,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onTouchStart={isMobile && onDelete ? handleTouchStart : undefined}
        onTouchMove={isMobile && onDelete ? handleTouchMove : undefined}
        onTouchEnd={isMobile && onDelete ? handleTouchEnd : undefined}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isCompleted}
            onChange={(checked) => onComplete(checked)}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium text-[var(--text-primary)]',
              isCompleted && 'line-through text-[var(--text-secondary)]'
            )}
          >
            {task.title}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {task.project && (
              <span className="text-xs text-[var(--text-secondary)]">
                {task.project.name}
              </span>
            )}

            {/* When badge (Things 3 style) */}
            <WhenBadge value={task.when_type} whenDate={task.when_date} />

            {/* Deadline badge */}
            <DeadlineBadge value={task.deadline} />

            {task.total_time_seconds && task.total_time_seconds > 0 && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Clock className="h-3 w-3" />
                {formatDurationShort(task.total_time_seconds)}
              </span>
            )}

            {task.tags && task.tags.length > 0 && (
              <TagChipList tags={task.tags} size="sm" />
            )}
          </div>
        </div>

        {task.assignee && (
          <Avatar
            src={task.assignee.avatar_url}
            name={task.assignee.full_name}
            size="sm"
          />
        )}
      </div>
    </div>
  )
}
