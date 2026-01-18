'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TaskWithRelations } from '@/types'
import { TaskItemExpanded } from '@/components/tasks/task-item-expanded'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.taskId as string

  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTask() {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name, color),
          area:areas(id, name, color),
          assignee:users!tasks_assignee_id_fkey(id, full_name, nickname, avatar_url, status),
          tags:task_tags(tag:tags(id, name, color))
        `)
        .eq('id', taskId)
        .single()

      if (error) {
        console.error('Error fetching task:', error)
        setError('Task sa nenašiel')
        setLoading(false)
        return
      }

      // Transform tags
      const transformedTask = {
        ...data,
        tags: data.tags?.map((t: { tag: { id: string; name: string; color: string } }) => t.tag) || []
      } as TaskWithRelations

      setTask(transformedTask)
      setLoading(false)
    }

    fetchTask()
  }, [taskId])

  const handleTaskUpdate = async (updates: Partial<TaskWithRelations>) => {
    if (!task) return

    const supabase = createClient()
    const { error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', task.id)

    if (!error) {
      setTask({ ...task, ...updates })
    }
  }

  const handleTaskComplete = async () => {
    if (!task) return

    const newStatus = task.status === 'done' ? 'todo' : 'done'
    const updates: Partial<TaskWithRelations> = {
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    }

    await handleTaskUpdate(updates)
  }

  const getBackLink = () => {
    if (!task) return '/today'

    if (task.project_id) return `/projects/${task.project_id}`
    if (task.area_id) return `/areas/${task.area_id}`
    if (task.when_type === 'today') return '/today'
    if (task.when_type === 'inbox') return '/inbox'
    if (task.when_type === 'anytime') return '/anytime'
    if (task.when_type === 'someday') return '/someday'
    if (task.when_type === 'scheduled') return '/upcoming'

    return '/today'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/today"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Späť
          </Link>
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            {error || 'Task sa nenašiel'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href={getBackLink()}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Späť
        </Link>

        <div className="bg-card rounded-lg border p-4">
          <TaskItemExpanded
            task={task}
            onUpdate={handleTaskUpdate}
            onComplete={handleTaskComplete}
            onCollapse={() => router.push(getBackLink())}
          />
        </div>

        {task.source === 'slack' && task.source_url && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Vytvorené zo Slacku: </span>
            <a
              href={task.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Otvoriť pôvodnú správu
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
