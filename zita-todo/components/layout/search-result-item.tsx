'use client'

import { CheckCircle, FolderOpen, Layers, Tag, User, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Avatar } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'

export type SearchResultType = 'task' | 'project' | 'area' | 'tag' | 'user'

interface SearchResultItemProps {
  type: SearchResultType
  item: any
  isSelected: boolean
  onClick: () => void
}

export function SearchResultItem({ type, item, isSelected, onClick }: SearchResultItemProps) {
  const getIcon = () => {
    switch (type) {
      case 'task':
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />
      case 'project':
        return <FolderOpen className="h-4 w-4 text-muted-foreground" />
      case 'area':
        return <Layers className="h-4 w-4 text-muted-foreground" />
      case 'tag':
        return <Tag className="h-4 w-4 text-muted-foreground" />
      case 'user':
        return item.avatar_url ? (
          <Avatar src={item.avatar_url} name={item.full_name || item.email} size="xs" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )
      default:
        return null
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'task':
        return item.title
      case 'project':
        return item.name
      case 'area':
        return item.name
      case 'tag':
        return item.name
      case 'user':
        return item.nickname || item.full_name || item.email
      default:
        return ''
    }
  }

  const getSubtitle = () => {
    switch (type) {
      case 'task':
        const parts = []
        if (item.area?.name) parts.push(item.area.name)
        if (item.project?.name) parts.push(item.project.name)
        return parts.join(' / ')
      case 'project':
        return item.area?.name || ''
      case 'area':
        return 'Oddelenie'
      case 'tag':
        return 'Tag'
      case 'user':
        return item.email
      default:
        return ''
    }
  }

  const getDate = () => {
    if (type !== 'task') return null

    const dateStr = item.deadline || item.due_date || item.when_date
    if (!dateStr) return null

    try {
      const date = new Date(dateStr)
      return format(date, 'd.M.', { locale: sk })
    } catch {
      return null
    }
  }

  const getColorDot = () => {
    let color = null
    if (type === 'project' || type === 'area') {
      color = item.color
    } else if (type === 'tag') {
      color = item.color
    }

    if (!color) return null

    return (
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
    )
  }

  const date = getDate()

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-2 flex items-center gap-3 rounded-md transition-colors text-left',
        isSelected
          ? 'bg-primary/10 text-foreground'
          : 'hover:bg-accent text-foreground'
      )}
    >
      <span className="shrink-0">{getIcon()}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {getColorDot()}
          <span className="text-[14px] font-normal truncate">{getTitle()}</span>
        </div>
        {getSubtitle() && (
          <span className="text-[12px] text-muted-foreground truncate block">
            {getSubtitle()}
          </span>
        )}
      </div>

      {date && (
        <span className="text-[12px] text-muted-foreground shrink-0 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {date}
        </span>
      )}
    </button>
  )
}
