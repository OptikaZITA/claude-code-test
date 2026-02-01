'use client'

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
  const { deleteProject, loading } = useDeleteProject()

  const handleDelete = async () => {
    const success = await deleteProject(project.id)
    if (success) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Zmazať projekt" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-[var(--color-warning)]/10 p-3">
          <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-[var(--text-primary)]">
              Naozaj chcete zmazať projekt &quot;{project.name}&quot;?
            </p>
            <p className="mt-1 text-[var(--text-secondary)]">
              Projekt a jeho úlohy budú presunuté do koša. Môžete ich obnoviť do 30 dní.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
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
