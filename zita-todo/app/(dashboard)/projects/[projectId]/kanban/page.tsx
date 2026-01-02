'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LayoutList, LayoutGrid, FolderKanban } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { KanbanBoard } from '@/components/tasks/kanban-board'
import { Button } from '@/components/ui/button'
import { useProject, useProjectTasks } from '@/lib/hooks/use-projects'
import { useTasks } from '@/lib/hooks/use-tasks'
import { TaskWithRelations, KanbanColumn, TaskStatus } from '@/types'

export default function KanbanPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { project, loading: projectLoading } = useProject(projectId)
  const { tasks, loading: tasksLoading, refetch } = useProjectTasks(projectId)
  const { createTask, updateTask } = useTasks()

  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  const handleTaskMove = async (taskId: string, newColumn: KanbanColumn) => {
    try {
      // Map kanban column to task status
      const statusMap: Record<KanbanColumn, TaskStatus> = {
        backlog: 'todo',
        todo: 'todo',
        in_progress: 'in_progress',
        done: 'done',
      }

      await updateTask(taskId, {
        kanban_column: newColumn,
        status: statusMap[newColumn],
      })
      refetch()
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  const handleQuickAdd = async (title: string, column: KanbanColumn) => {
    try {
      const statusMap: Record<KanbanColumn, TaskStatus> = {
        backlog: 'todo',
        todo: 'todo',
        in_progress: 'in_progress',
        done: 'done',
      }

      await createTask({
        title,
        project_id: projectId,
        kanban_column: column,
        status: statusMap[column],
      })
      refetch()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  if (projectLoading || tasksLoading) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Načítavam..." />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#007AFF] border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col">
        <Header title="Projekt nenájdený" />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <FolderKanban className="mb-4 h-12 w-12 text-[#86868B]" />
          <p className="text-[#86868B]">Tento projekt neexistuje</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={project.name} />

      {/* View Toggle */}
      <div className="border-b border-[#E5E5E5] bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#86868B]">
            {project.description || 'Žiadny popis'}
          </p>
          <div className="flex gap-2">
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="sm">
                <LayoutList className="mr-1 h-4 w-4" />
                Zoznam
              </Button>
            </Link>
            <Button variant="secondary" size="sm">
              <LayoutGrid className="mr-1 h-4 w-4" />
              Kanban
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onTaskClick={setSelectedTask}
          onQuickAdd={handleQuickAdd}
        />
      </div>
    </div>
  )
}
