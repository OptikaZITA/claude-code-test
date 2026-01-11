'use client'

import { useState, useMemo } from 'react'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Checkbox } from '@/components/ui/checkbox'
import { UnifiedFilterBar, CascadingFilterBar } from '@/components/filters'
import { useTrashTasks } from '@/lib/hooks/use-tasks'
import { useTaskMoved } from '@/lib/hooks/use-task-moved'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'
import { useAreas } from '@/lib/hooks/use-areas'
import { useTags } from '@/lib/hooks/use-tags'
import { TaskWithRelations } from '@/types'
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns'
import { sk } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'

export default function TrashPage() {
  const { tasks, loading, refetch, restoreTask, emptyTrash } = useTrashTasks()
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false)
  const { filters, setFilter, clearFilters, clearFilter, hasActiveFilters } = useTaskFilters()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const { areas } = useAreas()
  const { tags: allTags } = useTags()

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return filterTasks(tasks, filters)
  }, [tasks, filters])

  // Apply tag filter
  const tagFilteredTasks = useMemo(() => {
    if (!selectedTag) return filteredTasks
    return filteredTasks.filter(task =>
      task.tags?.some(tag => tag.id === selectedTag)
    )
  }, [filteredTasks, selectedTag])

  // Listen for task:moved events to refresh the list
  useTaskMoved(refetch)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleRestore = async (taskId: string) => {
    try {
      setRestoringId(taskId)
      await restoreTask(taskId)
    } catch (error) {
      console.error('Error restoring task:', error)
    } finally {
      setRestoringId(null)
    }
  }

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash()
      setConfirmEmptyTrash(false)
    } catch (error) {
      console.error('Error emptying trash:', error)
    }
  }

  const getDaysUntilPermanentDelete = (deletedAt: string) => {
    const deleted = parseISO(deletedAt)
    const daysElapsed = differenceInDays(new Date(), deleted)
    return Math.max(0, 30 - daysElapsed)
  }

  if (loading) {
    return (
      <div className="h-full">
        <Header title="Kôš" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <Header title="Kôš">
        {tasks.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmEmptyTrash(true)}
            className="text-error hover:text-error hover:bg-error/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Vyprázdniť kôš
          </Button>
        )}
      </Header>

      <div className="flex-1 overflow-auto p-6">
        {/* Cascading Filter Bar - Desktop only */}
        <CascadingFilterBar
          tasks={tasks}
          filters={filters}
          onFilterChange={setFilter}
          onClearFilters={clearFilters}
          onClearFilter={clearFilter}
          hasActiveFilters={hasActiveFilters}
          areas={areas}
          allTags={allTags}
          className="mb-4"
        />

        {/* Unified Filter Bar - Mobile only */}
        <div className="lg:hidden">
          <UnifiedFilterBar
            tasks={filteredTasks}
            filters={filters}
            onFilterChange={setFilter}
            onClearFilters={clearFilters}
            onClearFilter={clearFilter}
            hasActiveFilters={hasActiveFilters}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            className="mb-4"
          />
        </div>

        {/* Info banner */}
        {tagFilteredTasks.length > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] bg-warning/10 p-4 border border-warning/20">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                {tagFilteredTasks.length} {tagFilteredTasks.length === 1 ? 'položka' : tagFilteredTasks.length < 5 ? 'položky' : 'položiek'} v koši
              </p>
              <p className="text-muted-foreground mt-1">
                Vymazané úlohy môžete obnoviť alebo budú automaticky odstránené po 30 dňoch.
              </p>
            </div>
          </div>
        )}

        {/* Task list */}
        {tagFilteredTasks.length === 0 && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trash2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium text-foreground">
              Kôš je prázdny
            </p>
            <p className="text-muted-foreground">
              Vymazané úlohy sa tu objavia
            </p>
          </div>
        ) : tagFilteredTasks.length === 0 && (hasActiveFilters || selectedTag) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trash2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium text-foreground">Žiadne úlohy nezodpovedajú filtrom</p>
            <button
              onClick={() => { clearFilters(); setSelectedTag(null); }}
              className="text-primary hover:underline"
            >
              Zrušiť filtre
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {tagFilteredTasks.map((task) => (
              <TrashTaskItem
                key={task.id}
                task={task}
                onRestore={() => handleRestore(task.id)}
                isRestoring={restoringId === task.id}
                daysRemaining={getDaysUntilPermanentDelete(task.deleted_at!)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm Empty Trash Modal */}
      <Modal
        isOpen={confirmEmptyTrash}
        onClose={() => setConfirmEmptyTrash(false)}
        title="Vyprázdniť kôš"
      >
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-error flex-shrink-0" />
            <div>
              <p className="text-foreground font-medium">
                Naozaj chcete vyprázdniť kôš?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Táto akcia je nevrátna. Všetky úlohy v koši budú trvalo vymazané.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => setConfirmEmptyTrash(false)}
            >
              Zrušiť
            </Button>
            <Button
              variant="primary"
              onClick={handleEmptyTrash}
              className="bg-error hover:bg-error/90"
            >
              Vyprázdniť kôš
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface TrashTaskItemProps {
  task: TaskWithRelations
  onRestore: () => void
  isRestoring: boolean
  daysRemaining: number
}

function TrashTaskItem({ task, onRestore, isRestoring, daysRemaining }: TrashTaskItemProps) {
  const deletedTimeAgo = task.deleted_at
    ? formatDistanceToNow(parseISO(task.deleted_at), { addSuffix: true, locale: sk })
    : ''

  return (
    <div className={cn(
      'group flex items-center gap-3 rounded-[var(--radius-lg)] bg-card p-4',
      'border border-[var(--border)] hover:border-primary/30',
      'transition-all duration-200'
    )}>
      {/* Checkbox (showing completed state, non-interactive) */}
      <div className="opacity-50 pointer-events-none">
        <Checkbox
          checked={task.status === 'done'}
          onChange={() => {}}
        />
      </div>

      {/* Task content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-foreground truncate',
          task.status === 'done' && 'line-through opacity-60'
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            Vymazané {deletedTimeAgo}
          </span>
          {daysRemaining <= 7 && (
            <span className="text-xs text-error">
              {daysRemaining === 0 ? 'Bude vymazané dnes' : `Ešte ${daysRemaining} dní`}
            </span>
          )}
        </div>
      </div>

      {/* Project badge */}
      {task.project && (
        <span
          className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-muted"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: task.project.color || 'var(--primary)' }}
          />
          {task.project.name}
        </span>
      )}

      {/* Restore button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRestore}
        disabled={isRestoring}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-primary"
      >
        {isRestoring ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Obnoviť
          </>
        )}
      </Button>
    </div>
  )
}
