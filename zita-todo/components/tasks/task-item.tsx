'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, Flag, FileText, Repeat, Tag as TagIcon } from 'lucide-react'
import { TaskWithRelations, TaskPriority } from '@/types'
import { isToday, parseISO } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar } from '@/components/ui/avatar'
import { DeadlineBadge } from '@/components/tasks/deadline-picker'
import { TaskItemExpanded } from '@/components/tasks/task-item-expanded'
import { InlineTimeTracker } from '@/components/tasks/inline-time-tracker'
import { TodayStarIndicator, NewTaskIndicator } from '@/components/indicators'
import { cn } from '@/lib/utils/cn'

const SWIPE_THRESHOLD = 80
const DELETE_BUTTON_WIDTH = 80

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
  /** Show star for tasks in "Today" (used on project/area pages) */
  showTodayStar?: boolean
  /** Is task "new" - show yellow dot (used only on Today page) */
  isNew?: boolean
  /** Current area ID - hide area name if matches */
  currentAreaId?: string
  /** Current project ID - hide project name if matches */
  currentProjectId?: string
  /** Show avatar only if multiple assignees in list */
  showAvatar?: boolean
}

// Priority flag colors: red (high), yellow (low)
const priorityFlagColors: Record<TaskPriority, string> = {
  high: 'text-red-500',
  low: 'text-yellow-500',
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
  currentAreaId,
  currentProjectId,
  showAvatar = true,
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

  // Smart display rules
  const shouldShowArea = task.area && task.area.id !== currentAreaId
  const shouldShowProject = task.project && task.project.id !== currentProjectId
  const shouldShowDeadline = !!task.deadline
  const shouldShowPriority = task.priority && ['high', 'low'].includes(task.priority)
  const shouldShowTimeTracker = (task.total_time_seconds ?? 0) > 0
  const hasTags = task.tags && task.tags.length > 0
  const hasNotes = !!task.notes
  const hasChecklist = task.checklist_items && task.checklist_items.length > 0

  const handleClick = useCallback(() => {
    if (swipeOffset !== 0) return

    if (enableInlineEdit && isMobile) {
      onExpand?.()
    } else {
      onClick?.()
    }
  }, [enableInlineEdit, isMobile, onExpand, onClick, swipeOffset])

  const handleDoubleClick = useCallback(() => {
    if (enableInlineEdit && !isMobile) {
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

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || diffY > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > diffY
      }
    }

    if (isHorizontalSwipe.current) {
      e.preventDefault()
      if (diffX > 0) {
        const resistance = diffX > DELETE_BUTTON_WIDTH ? 0.3 : 1
        const offset = Math.min(diffX * resistance, DELETE_BUTTON_WIDTH + 40)
        setSwipeOffset(offset)
      } else {
        setSwipeOffset(0)
      }
    }
  }, [isSwiping])

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false)
    isHorizontalSwipe.current = null

    if (swipeOffset > SWIPE_THRESHOLD) {
      setSwipeOffset(DELETE_BUTTON_WIDTH)
    } else {
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

  // Collapsed view with swipe-to-delete - COMPACT DESIGN
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-md)]">
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
            <Trash2 className="h-4 w-4" />
            <span className="text-[10px] font-medium">Vymazať</span>
          </div>
        </button>
      )}

      {/* Task content - COMPACT: py-2, single line, truncate */}
      <div
        className={cn(
          'group flex items-center gap-2 rounded-[var(--radius-md)] bg-card cursor-pointer relative',
          'py-[var(--task-padding-y)] px-[var(--task-padding-x)]',
          'transition-all duration-150',
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
        {/* Left side: Checkbox + indicators */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center gap-1">
          <NewTaskIndicator isNew={isNew} className="mr-0.5" />
          <Checkbox
            checked={isCompleted}
            onChange={(checked) => onComplete(checked)}
          />
        </div>

        {/* Priority flag - only if set */}
        {shouldShowPriority && (
          <Flag
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              priorityFlagColors[task.priority!]
            )}
            fill="currentColor"
          />
        )}

        {/* Today star indicator */}
        {showTodayStar && isTodayTask && (
          <TodayStarIndicator isInToday={true} size="sm" />
        )}

        {/* Title - truncate, compact font */}
        <span
          className={cn(
            'flex-1 min-w-0 truncate',
            'text-[var(--task-font-size)] font-medium text-foreground',
            isCompleted && 'line-through text-muted-foreground'
          )}
        >
          {task.title}
        </span>

        {/* Meta icons: notes, checklist, recurrence */}
        <div className="flex items-center gap-1 shrink-0">
          {(hasNotes || hasChecklist) && (
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {task.recurrence_rule && (
            <span title="Opakujúca sa úloha">
              <Repeat className="h-3 w-3 text-primary" />
            </span>
          )}
        </div>

        {/* Tags - desktop: max 2 + count, mobile: just icon */}
        {hasTags && (
          <>
            {/* Desktop: show tags */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              {task.tags!.slice(0, 2).map(tag => (
                <span
                  key={tag.id}
                  className="text-[var(--task-meta-font-size)] px-[var(--badge-padding-x)] py-[var(--badge-padding-y)] rounded-full border border-border text-muted-foreground whitespace-nowrap"
                >
                  {tag.name}
                </span>
              ))}
              {task.tags!.length > 2 && (
                <span className="text-[var(--task-meta-font-size)] text-muted-foreground">
                  +{task.tags!.length - 2}
                </span>
              )}
            </div>
            {/* Mobile: just tag icon */}
            <TagIcon className="h-3.5 w-3.5 text-muted-foreground md:hidden shrink-0" />
          </>
        )}

        {/* Area/Project name - only if not on that page */}
        {(shouldShowArea || shouldShowProject) && (
          <span className="hidden sm:inline text-[var(--task-meta-font-size)] text-muted-foreground truncate max-w-[100px] shrink-0">
            {shouldShowProject ? task.project?.name : task.area?.name}
          </span>
        )}

        {/* Right side: Time, Deadline, Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Time tracker - desktop only, only if has time */}
          {shouldShowTimeTracker && (
            <div className="hidden md:block">
              <InlineTimeTracker taskId={task.id} compact />
            </div>
          )}

          {/* Play button - desktop only */}
          {!shouldShowTimeTracker && (
            <div className="hidden md:block" onClick={(e) => e.stopPropagation()}>
              <InlineTimeTracker taskId={task.id} compact showPlayOnly />
            </div>
          )}

          {/* Deadline - only if set */}
          {shouldShowDeadline && (
            <DeadlineBadge value={task.deadline} size="xs" />
          )}

          {/* Avatar - only if showAvatar prop is true */}
          {showAvatar && task.assignee && (
            <Avatar
              src={task.assignee.avatar_url}
              name={task.assignee.full_name}
              size="xs"
            />
          )}
        </div>
      </div>
    </div>
  )
}
