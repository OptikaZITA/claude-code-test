'use client'

import { ReactNode, useCallback } from 'react'
import Link from 'next/link'
import { useSidebarDrop, DropTarget } from '@/lib/contexts/sidebar-drop-context'
import { cn } from '@/lib/utils/cn'

interface SidebarDropItemProps {
  href: string
  isActive: boolean
  dropTarget: DropTarget
  icon: ReactNode
  label: string
  className?: string
}

export function SidebarDropItem({
  href,
  isActive,
  dropTarget,
  icon,
  label,
  className,
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
      // Only clear if we're leaving this specific element
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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropEvent}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
        isActive
          ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
        isDragging && 'cursor-copy',
        isDropTarget && 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-105',
        className
      )}
    >
      {icon}
      <span>{label}</span>
      {isDropTarget && (
        <span className="ml-auto text-xs text-[var(--color-primary)] font-medium">
          Pustiť sem
        </span>
      )}
    </Link>
  )
}

// Droppable project item
interface SidebarDropProjectProps {
  href: string
  isActive: boolean
  projectId: string
  icon: ReactNode
  label: string
}

export function SidebarDropProject({
  href,
  isActive,
  projectId,
  icon,
  label,
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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropEvent}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
        isActive
          ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
        isDragging && 'cursor-copy',
        isDropTarget && 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-105'
      )}
    >
      {icon}
      <span>{label}</span>
      {isDropTarget && (
        <span className="ml-auto text-xs text-[var(--color-primary)] font-medium">
          +
        </span>
      )}
    </Link>
  )
}
