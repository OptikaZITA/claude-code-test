'use client'

import { ReactNode, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useSidebarDrop, DropTarget } from '@/lib/contexts/sidebar-drop-context'
import { cn } from '@/lib/utils/cn'

interface SidebarDropItemProps {
  href: string
  isActive: boolean
  dropTarget: DropTarget
  icon: ReactNode
  label: string
  className?: string
  count?: number
  isDeadline?: boolean // Show red badge for deadline tasks
  onClick?: () => void
}

export function SidebarDropItem({
  href,
  isActive,
  dropTarget,
  icon,
  label,
  className,
  count,
  isDeadline,
  onClick,
}: SidebarDropItemProps) {
  const {
    isDragging,
    draggedTask,
    dropTarget: currentDropTarget,
    setDropTarget,
    handleDrop,
  } = useSidebarDrop()

  const isDropTarget =
    currentDropTarget &&
    JSON.stringify(currentDropTarget) === JSON.stringify(dropTarget)

  // Use pointer events for @dnd-kit compatibility
  const handlePointerEnter = useCallback(() => {
    if (isDragging) {
      setDropTarget(dropTarget)
    }
  }, [isDragging, setDropTarget, dropTarget])

  const handlePointerLeave = useCallback(() => {
    if (isDragging) {
      setDropTarget(null)
    }
  }, [isDragging, setDropTarget])

  // Keep drag events for native drag (DraggableTask)
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isDragging) {
        setDropTarget(dropTarget)
      }
    },
    [isDragging, setDropTarget, dropTarget]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      const { clientX, clientY } = e
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setDropTarget(null)
      }
    },
    [setDropTarget]
  )

  const handleDropEvent = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (draggedTask) {
        handleDrop(dropTarget)
      }
    },
    [draggedTask, handleDrop, dropTarget]
  )

  return (
    <Link
      href={href}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropEvent}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
        isActive
          ? 'bg-accent text-primary font-medium'
          : 'text-foreground hover:bg-accent/50',
        isDragging && 'cursor-copy',
        isDropTarget && 'ring-2 ring-primary bg-primary/10 scale-105',
        className
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {isDropTarget ? (
        <span className="text-xs text-primary font-medium">
          Pustiť sem
        </span>
      ) : count !== undefined && count > 0 ? (
        <span
          className={cn(
            'min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 text-xs font-medium',
            isDeadline
              ? 'bg-error text-white'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}

// Droppable area item (department)
interface SidebarDropAreaProps {
  areaId: string
  areaName: string
  areaColor: string | null
  isExpanded: boolean
  hasProjects: boolean
  onToggle: () => void
  onCreateProject: () => void
  onNavigate?: () => void
  children?: ReactNode
}

export function SidebarDropArea({
  areaId,
  areaName,
  areaColor,
  isExpanded,
  hasProjects,
  onToggle,
  onCreateProject,
  onNavigate,
  children,
}: SidebarDropAreaProps) {
  const pathname = usePathname()
  const {
    isDragging,
    draggedTask,
    dropTarget: currentDropTarget,
    setDropTarget,
    handleDrop,
  } = useSidebarDrop()

  const dropTarget: DropTarget = { type: 'area', areaId }
  const isActive = pathname === `/areas/${areaId}`

  const isDropTarget =
    currentDropTarget &&
    currentDropTarget.type === 'area' &&
    currentDropTarget.areaId === areaId

  // Use pointer events for @dnd-kit compatibility
  const handlePointerEnter = useCallback(() => {
    if (isDragging) {
      setDropTarget(dropTarget)
    }
  }, [isDragging, setDropTarget, dropTarget])

  const handlePointerLeave = useCallback(() => {
    if (isDragging) {
      setDropTarget(null)
    }
  }, [isDragging, setDropTarget])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isDragging) {
        setDropTarget(dropTarget)
      }
    },
    [isDragging, setDropTarget, dropTarget]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      const { clientX, clientY } = e
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setDropTarget(null)
      }
    },
    [setDropTarget]
  )

  const handleDropEvent = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (draggedTask) {
        handleDrop(dropTarget)
      }
    },
    [draggedTask, handleDrop, dropTarget]
  )

  return (
    <div>
      <div
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropEvent}
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
          isActive
            ? 'bg-accent text-primary font-medium'
            : 'text-foreground hover:bg-accent/50',
          isDragging && 'cursor-copy',
          isDropTarget && 'ring-2 ring-primary bg-primary/10 scale-[1.02]'
        )}
      >
        <button
          onClick={onToggle}
          className="p-0.5 hover:bg-accent rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        <Link
          href={`/areas/${areaId}`}
          onClick={onNavigate}
          className="flex flex-1 items-center gap-2 min-w-0"
        >
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: areaColor || 'var(--primary)' }}
          />
          <span className="flex-1 text-left truncate">{areaName}</span>
        </Link>
        {isDropTarget ? (
          <span className="text-xs text-primary font-medium">
            +
          </span>
        ) : (
          <span
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-muted shrink-0 cursor-pointer transition-all"
            onClick={(e) => {
              e.stopPropagation()
              onCreateProject()
            }}
          >
            <Plus className="h-3 w-3" />
          </span>
        )}
      </div>

      {isExpanded && children && (
        <div className="ml-4 space-y-1">
          {children}
        </div>
      )}
    </div>
  )
}

// Droppable project item
interface SidebarDropProjectProps {
  href: string
  isActive: boolean
  projectId: string
  icon: ReactNode
  label: string
  onClick?: () => void
}

export function SidebarDropProject({
  href,
  isActive,
  projectId,
  icon,
  label,
  onClick,
}: SidebarDropProjectProps) {
  const {
    isDragging,
    draggedTask,
    dropTarget: currentDropTarget,
    setDropTarget,
    handleDrop,
  } = useSidebarDrop()

  const dropTarget: DropTarget = { type: 'project', projectId }

  const isDropTarget =
    currentDropTarget &&
    currentDropTarget.type === 'project' &&
    currentDropTarget.projectId === projectId

  // Use pointer events for @dnd-kit compatibility
  const handlePointerEnter = useCallback(() => {
    if (isDragging) {
      setDropTarget(dropTarget)
    }
  }, [isDragging, setDropTarget, dropTarget])

  const handlePointerLeave = useCallback(() => {
    if (isDragging) {
      setDropTarget(null)
    }
  }, [isDragging, setDropTarget])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isDragging) {
        setDropTarget(dropTarget)
      }
    },
    [isDragging, setDropTarget, dropTarget]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      const { clientX, clientY } = e
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setDropTarget(null)
      }
    },
    [setDropTarget]
  )

  const handleDropEvent = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (draggedTask) {
        handleDrop(dropTarget)
      }
    },
    [draggedTask, handleDrop, dropTarget]
  )

  return (
    <Link
      href={href}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropEvent}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
        isActive
          ? 'bg-accent text-primary font-medium'
          : 'text-foreground hover:bg-accent/50',
        isDragging && 'cursor-copy',
        isDropTarget && 'ring-2 ring-primary bg-primary/10 scale-105'
      )}
    >
      {icon}
      <span>{label}</span>
      {isDropTarget && (
        <span className="ml-auto text-xs text-primary font-medium">
          +
        </span>
      )}
    </Link>
  )
}
