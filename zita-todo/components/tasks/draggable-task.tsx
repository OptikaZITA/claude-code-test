'use client'

import { ReactNode, useCallback } from 'react'
import { TaskWithRelations } from '@/types'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { cn } from '@/lib/utils/cn'

interface DraggableTaskProps {
  task: TaskWithRelations
  children: ReactNode
  className?: string
}

export function DraggableTask({ task, children, className }: DraggableTaskProps) {
  const { setDraggedTask, isDragging, draggedTask } = useSidebarDrop()

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      // Set custom drag image
      const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
      dragImage.style.opacity = '0.8'
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-1000px'
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, 0, 0)
      setTimeout(() => document.body.removeChild(dragImage), 0)

      // Set data transfer
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', task.id)

      // Set dragged task in context
      setDraggedTask(task)
    },
    [task, setDraggedTask]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedTask(null)
  }, [setDraggedTask])

  const isBeingDragged = draggedTask?.id === task.id

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all',
        isBeingDragged && 'opacity-50 scale-95',
        isDragging && !isBeingDragged && 'opacity-75',
        className
      )}
    >
      {children}
    </div>
  )
}
