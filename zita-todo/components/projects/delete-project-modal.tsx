'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useDeleteProject } from '@/lib/hooks/use-projects'
import { AlertTriangle } from 'lucide-react'

interface DeleteProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  project: {
    id: string
    name: string
  }
}

export function DeleteProjectModal({
  isOpen,
  onClose,
  onSuccess,
  project,
}: DeleteProjectModalProps) {
  const [deleteTasks, setDeleteTasks] = useState(false)
  const { deleteProject, loading } = useDeleteProject()

  const handleDelete = async () => {
    const success = await deleteProject(project.id, deleteTasks)
    if (success) {
      onSuccess()
      onClose()
    }
  }

  const handleClose = () => {
    setDeleteTasks(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Zmazať projekt" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-[var(--color-warning)]/10 p-3">
          <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-[var(--text-primary)]">
              Naozaj chcete zmazať projekt &quot;{project.name}&quot;?
            </p>
            <p className="mt-1 text-[var(--text-secondary)]">
              Táto akcia je nezvratná.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Čo sa má stať s úlohami v projekte?
          </p>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
            <input
              type="radio"
              name="deleteTasks"
              checked={!deleteTasks}
              onChange={() => setDeleteTasks(false)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
            />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Presunúť do oddelenia
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Úlohy zostanú zachované v oddelení bez projektu
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
            <input
              type="radio"
              name="deleteTasks"
              checked={deleteTasks}
              onChange={() => setDeleteTasks(true)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-error)]"
            />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Zmazať všetky úlohy
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Úlohy budú natrvalo odstránené spolu s projektom
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            Zrušiť
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Mazanie...' : 'Zmazať projekt'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
