'use client'

import { TaskWithRelations } from '@/types'
import { TaskItem } from './task-item'
import { TaskQuickAdd } from './task-quick-add'

interface TaskListProps {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onTaskComplete: (taskId: string, completed: boolean) => void
  onQuickAdd: (title: string) => void
  emptyMessage?: string
  showQuickAdd?: boolean
}

export function TaskList({
  tasks,
  onTaskClick,
  onTaskComplete,
  onQuickAdd,
  emptyMessage = 'Žiadne úlohy',
  showQuickAdd = true,
}: TaskListProps) {
  return (
    <div className="space-y-2">
      {showQuickAdd && <TaskQuickAdd onAdd={onQuickAdd} />}

      {tasks.length === 0 ? (
        <div className="py-8 text-center text-[#86868B]">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onComplete={(completed) => onTaskComplete(task.id, completed)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
