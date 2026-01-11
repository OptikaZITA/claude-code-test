'use client'

import { Button } from '@/components/ui/button'
import { Circle } from 'lucide-react'

interface NewTasksBannerProps {
  count: number
  onAcknowledge: () => void
  loading?: boolean
}

/**
 * Banner zobrazujuci pocet novych taskov s OK tlacidlom
 * Zobrazuje sa len na stranke Dnes ak count > 0
 */
export function NewTasksBanner({
  count,
  onAcknowledge,
  loading = false
}: NewTasksBannerProps) {
  if (count <= 0) return null

  const taskWord = count === 1
    ? 'nová úloha'
    : count < 5
      ? 'nové úlohy'
      : 'nových úloh'

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-2">
        <Circle className="h-3 w-3 fill-amber-500 text-amber-500" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Máte {count} {taskWord}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onAcknowledge}
        disabled={loading}
        className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-semibold"
      >
        {loading ? 'Potvrdzujem...' : 'OK'}
      </Button>
    </div>
  )
}
