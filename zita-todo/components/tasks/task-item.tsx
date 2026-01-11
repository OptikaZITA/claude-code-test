'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, Flag, FileText, Repeat, Lock } from 'lucide-react'
import { TaskWithRelations, TaskPriority } from '@/types'
import { isToday, parseISO } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar } from '@/components/ui/avatar'
import { DeadlineBadge } from '@/components/tasks/deadline-picker'
import { TaskItemExpanded } from '@/components/tasks/task-item-expanded'
import { InlineTimeTracker } from '@/components/tasks/inline-time-tracker'
import { TodayStarIndicator, NewTaskIndicator } from '@/components/indicators'
import { cn } from '@/lib/utils/cn'
import { getDisplayName } from '@/lib/utils/user'

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
  /** Zobrazit hviezdicku pre tasky v "Dnes" (pouziva sa na strankach projektov/oddeleni) */
  showTodayStar?: boolean
  /** Je task "novy" - zobrazit zltu bodku (pouziva sa len na Today stranke) */
  isNew?: boolean
}

// Priority flag colors: red (high), yellow (low)
const priorityFlagColors: Record<TaskPriority, string> = {
  high: 'text-red-500',     // #EF4444 - Červená
  low: 'text-yellow-500',   // #EAB308 - Žltá
}

// Helper to check if task is "today"
function isTaskToday(task: TaskWithRelations): boolean {
  if (task.when_type === 'today') return true
  if (task.when_type === 'scheduled' && task.when_date) {
    try {
      return isToday(parseISO(task.when_date))
    } catch {
      return false
    }
  }
  return false
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
  showTodayStar = false,
  isNew = false,
}: TaskItemProps) {
  const isCompleted = task.status === 'done'
  const isMobile = useIsMobile()
  const isTodayTask = isTaskToday(task)

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
    <div className="relative overflow-hidden rounded-[var(--radius-lg)]">
      {/* Delete button (revealed on swipe) */}
      {isMobile && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDeleteClick()
          }}
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-center bg-error text-white transition-opacity',
            swipeOffset > 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: DELETE_BUTTON_WIDTH }}
        >
          <div className="flex flex-col items-center gap-1">
            <Trash2 className="h-5 w-5" />
            <span className="text-xs font-medium">Vymazať</span>
          </div>
        </button>
      )}

      {/* Task content (swipeable) */}
      <div
        className={cn(
          'group rounded-[var(--radius-lg)] bg-card px-3 py-2 cursor-pointer relative',
          'transition-all duration-200',
          isCompleted && 'opacity-60',
          !isSwiping && 'transition-transform',
          !isMobile && 'hover:bg-accent/50'
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
        {/* DESKTOP LAYOUT */}
        <div className="hidden md:flex items-center gap-2">
          {/* Checkbox */}
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <Checkbox
              checked={isCompleted}
              onChange={(checked) => onComplete(checked)}
            />
          </div>

          {/* Žltá bodka - za checkboxom */}
          <NewTaskIndicator isNew={isNew} />

          {/* Priority flag */}
          {task.priority && ['high', 'low'].includes(task.priority) && (
            <Flag
              className={cn('h-4 w-4 shrink-0', priorityFlagColors[task.priority])}
              fill="currentColor"
            />
          )}

          {/* Today star */}
          {showTodayStar && isTodayTask && (
            <TodayStarIndicator isInToday={true} size="md" />
          )}

          {/* Title + Notes icon */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={cn(
                'text-sm font-medium text-foreground truncate',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </span>
            {task.notes && (
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            {task.recurrence_rule && (
              <span title="Opakujúca sa úloha">
                <Repeat className="h-3.5 w-3.5 text-primary shrink-0" />
              </span>
            )}
            {task.is_private && (
              <span title="Súkromná úloha">
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </span>
            )}
          </div>

          {/* Tags - inline on desktop */}
          <div className="flex items-center gap-1 shrink-0">
            {task.tags?.slice(0, 3).map(tag => (
              <span
                key={tag.id}
                className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground whitespace-nowrap"
              >
                {tag.name}
              </span>
            ))}
            {(task.tags?.length || 0) > 3 && (
              <span className="text-xs text-muted-foreground">+{(task.tags?.length || 0) - 3}</span>
            )}
          </div>

          {/* Time tracker */}
          <InlineTimeTracker taskId={task.id} />

          {/* Deadline */}
          <DeadlineBadge value={task.deadline} />

          {/* Avatar */}
          {task.assignee && (
            <Avatar
              src={task.assignee.avatar_url}
              name={getDisplayName(task.assignee)}
              size="sm"
            />
          )}
        </div>

        {/* Area - desktop (below title) */}
        {task.area && (
          <div className="hidden md:block text-xs text-muted-foreground mt-0.5 ml-7">
            {task.area.name}
          </div>
        )}

        {/* MOBILE LAYOUT */}
        <div className="md:hidden">
          {/* Row 1: Checkbox + Title + Deadline */}
          <div className="flex items-center gap-2">
            {/* Checkbox */}
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              <Checkbox
                checked={isCompleted}
                onChange={(checked) => onComplete(checked)}
              />
            </div>

            {/* Žltá bodka - za checkboxom */}
            <NewTaskIndicator isNew={isNew} />

            {/* Priority flag */}
            {task.priority && ['high', 'low'].includes(task.priority) && (
              <Flag
                className={cn('h-4 w-4 shrink-0', priorityFlagColors[task.priority])}
                fill="currentColor"
              />
            )}

            {/* Today star */}
            {showTodayStar && isTodayTask && (
              <TodayStarIndicator isInToday={true} size="md" />
            )}

            {/* Title */}
            <span
              className={cn(
                'text-sm font-medium text-foreground truncate flex-1',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </span>

            {task.notes && (
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            {task.is_private && (
              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}

            {/* Deadline - mobile */}
            <DeadlineBadge value={task.deadline} />
          </div>

          {/* Row 2: Tags (if any) */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {task.tags.map(tag => (
                <span
                  key={tag.id}
                  className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Row 3: Area/Department */}
          {task.area && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {task.area.name}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
