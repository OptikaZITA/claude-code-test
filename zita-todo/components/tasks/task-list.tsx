'use client'

import { TaskWithRelations } from '@/types'
import { TaskItem } from './task-item'
import { TaskQuickAdd } from './task-quick-add'
import { DraggableTask } from './draggable-task'

interface TaskListProps {
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onTaskComplete: (taskId: string, completed: boolean) => void
  onQuickAdd: (title: string) => void
  emptyMessage?: string
  showQuickAdd?: boolean
  enableDrag?: boolean
}

export function TaskList({
  tasks,
  onTaskClick,
  onTaskComplete,
  onQuickAdd,
  emptyMessage = 'Ziadne ulohy',
  showQuickAdd = true,
  enableDrag = true,
}: TaskListProps) {
  return (
    <div className="space-y-2">
      {showQuickAdd && <TaskQuickAdd onAdd={onQuickAdd} />}

      {tasks.length === 0 ? (
        <div className="py-8 text-center text-[var(--text-secondary)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            enableDrag ? (
              <DraggableTask key={task.id} task={task}>
                <TaskItem
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onComplete={(completed) => onTaskComplete(task.id, completed)}
                />
              </DraggableTask>
            ) : (
              <TaskItem
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onComplete={(completed) => onTaskComplete(task.id, completed)}
              />
            )
          ))}
        </div>
      )}
    </div>
  )
}
