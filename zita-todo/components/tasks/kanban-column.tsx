'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskWithRelations, KanbanColumnConfig } from '@/types'
import { KanbanCard } from './kanban-card'
import { TaskQuickAdd } from './task-quick-add'
import { cn } from '@/lib/utils/cn'

interface KanbanColumnProps {
  column: KanbanColumnConfig
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onQuickAdd: (title: string) => void
}

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onQuickAdd,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full w-72 flex-shrink-0 flex-col rounded-xl bg-[var(--bg-secondary)]/50',
        isOver && 'bg-[var(--color-primary)]/5'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-medium text-[var(--text-primary)]">{column.title}</h3>
          <span className="rounded-full bg-[var(--bg-primary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 overflow-y-auto p-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex h-24 items-center justify-center text-sm text-[var(--text-secondary)]">
            Presuňte úlohy sem
          </div>
        )}
      </div>

      {/* Quick Add */}
      <div className="p-2">
        <TaskQuickAdd
          onAdd={onQuickAdd}
          placeholder="+ Pridať úlohu"
          className="w-full"
        />
      </div>
    </div>
  )
}
