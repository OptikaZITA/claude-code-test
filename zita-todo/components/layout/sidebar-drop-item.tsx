'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDroppable } from '@dnd-kit/core'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useSidebarDrop, DropTarget } from '@/lib/contexts/sidebar-drop-context'
import { SidebarStarBadge } from '@/components/indicators'
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

/**
 * Get the droppable ID for a drop target.
 * These IDs are recognized by GlobalDndContext.
 */
function getDroppableId(target: DropTarget): string {
  switch (target.type) {
    case 'inbox':
      return 'sidebar-inbox'
    case 'today':
      return 'sidebar-today'
    case 'upcoming':
      return 'sidebar-upcoming'
    case 'logbook':
      return 'sidebar-logbook'
    case 'trash':
      return 'sidebar-trash'
    case 'calendar':
      return 'sidebar-calendar'
    case 'area':
      return `sidebar-area-${target.areaId}`
    case 'project':
      return `sidebar-project-${target.projectId}`
    default:
      return 'sidebar-unknown'
  }
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
  const { isDragging } = useSidebarDrop()

  // Use @dnd-kit's useDroppable for proper drag detection
  const { setNodeRef, isOver } = useDroppable({
    id: getDroppableId(dropTarget),
  })

  return (
    <Link
      ref={setNodeRef}
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
        isActive
          ? 'bg-accent text-foreground font-medium'
          : 'text-foreground hover:bg-accent/50',
        isDragging && 'cursor-copy',
        isOver && 'ring-2 ring-primary bg-primary/10 scale-105',
        className
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {count !== undefined && count > 0 && (
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
      )}
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
  /** Pocet taskov v "Dnes" pre toto oddelenie */
  todayTasksCount?: number
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
  todayTasksCount = 0,
}: SidebarDropAreaProps) {
  const pathname = usePathname()
  const { isDragging } = useSidebarDrop()

  // Use @dnd-kit's useDroppable for proper drag detection
  const { setNodeRef, isOver } = useDroppable({
    id: `sidebar-area-${areaId}`,
  })

  const isActive = pathname === `/areas/${areaId}`

  return (
    <div>
      <div
        ref={setNodeRef}
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
          isActive
            ? 'bg-accent text-foreground font-medium'
            : 'text-foreground hover:bg-accent/50',
          isDragging && 'cursor-copy',
          isOver && 'ring-2 ring-primary bg-primary/10 scale-[1.02]'
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
          <SidebarStarBadge todayTasksCount={todayTasksCount} />
        </Link>
        <span
          className={cn(
            "h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-muted shrink-0 cursor-pointer transition-all",
            isOver ? "opacity-0" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onCreateProject()
          }}
        >
          <Plus className="h-3 w-3" />
        </span>
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
  onDelete?: () => void
  /** Pocet taskov v "Dnes" pre tento projekt */
  todayTasksCount?: number
}

export function SidebarDropProject({
  href,
  isActive,
  projectId,
  icon,
  label,
  onClick,
  onDelete,
  todayTasksCount = 0,
}: SidebarDropProjectProps) {
  const {
    isDragging,
    draggedProject,
    setDraggedProject,
    setDropTarget,
  } = useSidebarDrop()

  // Use @dnd-kit's useDroppable for proper drag detection
  const { setNodeRef, isOver } = useDroppable({
    id: `sidebar-project-${projectId}`,
  })

  const isDraggingThis = draggedProject?.id === projectId

  // Native HTML5 drag for project dragging (separate from task dragging)
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', projectId)
    setDraggedProject({ id: projectId, name: label })
  }

  const handleDragEnd = () => {
    setDraggedProject(null)
    setDropTarget(null)
  }

  return (
    <div
      ref={setNodeRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
        isActive
          ? 'bg-accent text-foreground font-medium'
          : 'text-foreground hover:bg-accent/50',
        isDragging && !isDraggingThis && 'cursor-copy',
        isDraggingThis && 'opacity-50',
        isOver && 'ring-2 ring-primary bg-primary/10 scale-105'
      )}
    >
      <Link
        href={href}
        onClick={onClick}
        className="flex flex-1 items-center gap-2 min-w-0"
      >
        {icon}
        <span className="flex-1 truncate">{label}</span>
      </Link>
      <div className={cn(
        "flex items-center gap-1 shrink-0",
        isOver && "opacity-0"
      )}>
        <SidebarStarBadge todayTasksCount={todayTasksCount} />
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete()
            }}
            className="h-5 w-5 p-0.5 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            title="Zmazať projekt"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
