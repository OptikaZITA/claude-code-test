'use client'

import { useMemo } from 'react'
import { User, TaskWithRelations } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'

interface ColleagueWithCount extends User {
  taskCount: number
}

interface ColleagueFilterBarProps {
  tasks: TaskWithRelations[]
  selectedColleague: string | null  // null = all, 'unassigned' = no assignee, uuid = specific colleague
  onSelectColleague: (colleagueId: string | null) => void
  showUnassigned?: boolean
}

export function ColleagueFilterBar({
  tasks,
  selectedColleague,
  onSelectColleague,
  showUnassigned = true,
}: ColleagueFilterBarProps) {
  // Extract unique colleagues from tasks with task counts
  const { colleagues, unassignedCount } = useMemo(() => {
    const colleagueMap = new Map<string, ColleagueWithCount>()
    let unassigned = 0

    tasks.forEach(task => {
      if (task.assignee && task.assignee_id) {
        const existing = colleagueMap.get(task.assignee_id)
        if (existing) {
          existing.taskCount++
        } else {
          colleagueMap.set(task.assignee_id, {
            ...task.assignee,
            taskCount: 1,
          })
        }
      } else {
        unassigned++
      }
    })

    // Sort alphabetically by name
    const sortedColleagues = Array.from(colleagueMap.values()).sort((a, b) => {
      const nameA = a.nickname || a.full_name || a.email || ''
      const nameB = b.nickname || b.full_name || b.email || ''
      return nameA.localeCompare(nameB, 'sk')
    })

    return {
      colleagues: sortedColleagues,
      unassignedCount: unassigned,
    }
  }, [tasks])

  // Don't render if no colleagues and no unassigned tasks
  if (colleagues.length === 0 && unassignedCount === 0) return null

  // Don't render if only one option (no filtering needed)
  if (colleagues.length === 0 && !showUnassigned) return null

  const getDisplayName = (user: User) => {
    return user.nickname || user.full_name || user.email || 'Neznámy'
  }

  return (
    <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
      {/* All button */}
      <button
        onClick={() => onSelectColleague(null)}
        className={cn(
          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2',
          selectedColleague === null
            ? 'bg-primary text-white'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        Všetci
      </button>

      {/* Colleague buttons */}
      {colleagues.map(colleague => (
        <button
          key={colleague.id}
          onClick={() => onSelectColleague(colleague.id)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2',
            selectedColleague === colleague.id
              ? 'bg-primary text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <Avatar
            src={colleague.avatar_url}
            name={getDisplayName(colleague)}
            size="xs"
            className={cn(
              selectedColleague === colleague.id && 'ring-2 ring-white'
            )}
          />
          <span>{getDisplayName(colleague)}</span>
          <span className={cn(
            'text-xs',
            selectedColleague === colleague.id
              ? 'text-white/80'
              : 'text-muted-foreground/60'
          )}>
            ({colleague.taskCount})
          </span>
        </button>
      ))}

      {/* Unassigned button */}
      {showUnassigned && unassignedCount > 0 && (
        <button
          onClick={() => onSelectColleague('unassigned')}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2',
            selectedColleague === 'unassigned'
              ? 'bg-primary text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <span>Nepriradené</span>
          <span className={cn(
            'text-xs',
            selectedColleague === 'unassigned'
              ? 'text-white/80'
              : 'text-muted-foreground/60'
          )}>
            ({unassignedCount})
          </span>
        </button>
      )}
    </div>
  )
}

// Helper function to filter tasks by colleague
export function filterTasksByColleague(
  tasks: TaskWithRelations[],
  selectedColleague: string | null
): TaskWithRelations[] {
  if (selectedColleague === null) return tasks
  if (selectedColleague === 'unassigned') {
    return tasks.filter(task => !task.assignee_id)
  }
  return tasks.filter(task => task.assignee_id === selectedColleague)
}
