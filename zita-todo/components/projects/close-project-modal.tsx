'use client'

import { useState, useMemo, useEffect } from 'react'
import { Circle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useCloseProject, CloseProjectTaskAction } from '@/lib/hooks/use-projects'
import { TaskWithRelations } from '@/types'

type TaskAction = CloseProjectTaskAction | 'individual'

interface CloseProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  project: { id: string; name: string }
  activeTasks: TaskWithRelations[]
}

const BULK_OPTIONS: { value: Exclude<TaskAction, 'individual'>; label: string }[] = [
  { value: 'complete', label: 'Dokončiť všetky (označiť ako hotové)' },
  { value: 'inbox', label: 'Presunúť do Inboxu (bez projektu)' },
  { value: 'trash', label: 'Zrušiť všetky (presunúť do Koša)' },
]

const INDIVIDUAL_OPTIONS: { value: CloseProjectTaskAction; label: string }[] = [
  { value: 'complete', label: 'Dokončiť' },
  { value: 'inbox', label: 'Do Inboxu' },
  { value: 'trash', label: 'Zrušiť' },
]

export function CloseProjectModal({
  isOpen,
  onClose,
  onSuccess,
  project,
  activeTasks,
}: CloseProjectModalProps) {
  const { closeProject, loading, error } = useCloseProject()
  const [taskAction, setTaskAction] = useState<TaskAction>('complete')
  const [taskDecisions, setTaskDecisions] = useState<Record<string, CloseProjectTaskAction>>({})

  const hasActiveTasks = activeTasks.length > 0

  // Reset state when modal opens with new project
  useEffect(() => {
    if (isOpen) {
      setTaskAction('complete')
      const initial: Record<string, CloseProjectTaskAction> = {}
      activeTasks.forEach(t => { initial[t.id] = 'complete' })
      setTaskDecisions(initial)
    }
  }, [isOpen, activeTasks])

  const decisionsForSubmit = useMemo<Record<string, CloseProjectTaskAction>>(() => {
    if (!hasActiveTasks) return {}
    if (taskAction === 'individual') return taskDecisions
    const decisions: Record<string, CloseProjectTaskAction> = {}
    activeTasks.forEach(t => { decisions[t.id] = taskAction })
    return decisions
  }, [hasActiveTasks, taskAction, taskDecisions, activeTasks])

  const handleConfirm = async () => {
    const success = await closeProject(project.id, decisionsForSubmit)
    if (success) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Uzavrieť projekt "${project.name}"?`}
      size={hasActiveTasks ? 'lg' : 'sm'}
    >
      <div className="space-y-4">
        {!hasActiveTasks ? (
          <div className="flex items-start gap-3 rounded-lg bg-[var(--color-success)]/10 p-3">
            <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text-primary)]">
              Všetky úlohy v tomto projekte sú dokončené.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-primary)]">
              Tento projekt má <span className="font-medium">{activeTasks.length}</span>{' '}
              {activeTasks.length === 1 ? 'nedokončenú úlohu' : activeTasks.length < 5 ? 'nedokončené úlohy' : 'nedokončených úloh'}:
            </p>

            <ul className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
              {activeTasks.map(task => (
                <li key={task.id} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  <Circle className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
                  <span className="truncate">{task.title}</span>
                </li>
              ))}
            </ul>

            <p className="font-medium text-sm text-[var(--text-primary)]">Čo s nimi?</p>

            <div className="space-y-2">
              {BULK_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <input
                    type="radio"
                    name="task-action"
                    value={opt.value}
                    checked={taskAction === opt.value}
                    onChange={() => setTaskAction(opt.value)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{opt.label}</span>
                </label>
              ))}
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <input
                  type="radio"
                  name="task-action"
                  value="individual"
                  checked={taskAction === 'individual'}
                  onChange={() => setTaskAction('individual')}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">Nechaj ma vybrať jednotlivo</span>
              </label>
            </div>

            {taskAction === 'individual' && (
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-2"
                  >
                    <span className="text-sm text-[var(--text-primary)] truncate flex-1">{task.title}</span>
                    <select
                      value={taskDecisions[task.id] || 'complete'}
                      onChange={(e) => setTaskDecisions(prev => ({
                        ...prev,
                        [task.id]: e.target.value as CloseProjectTaskAction,
                      }))}
                      className="text-sm rounded border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-2 py-1"
                    >
                      {INDIVIDUAL_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-[var(--color-error)]">
            {error.message || 'Pri uzatváraní projektu nastala chyba.'}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Zrušiť
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Uzatváram...' : 'Uzavrieť projekt'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
