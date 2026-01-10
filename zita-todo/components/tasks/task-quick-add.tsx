'use client'

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Plus, Star, Tag as TagIcon, FolderOpen, User as UserIcon, Flag, X, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WhenType, Area, Project, User, Tag } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths } from 'date-fns'
import { sk } from 'date-fns/locale'

interface AreaWithProjects extends Area {
  projects: Project[]
}

// Context for default values
export interface TaskQuickAddContext {
  defaultWhenType?: WhenType
  defaultAreaId?: string
  defaultProjectId?: string
  defaultAssigneeId?: string
}

export interface TaskQuickAddData {
  title: string
  notes?: string
  when_type?: WhenType
  when_date?: string
  area_id?: string
  project_id?: string
  assignee_id?: string
  deadline?: string
  tag_ids?: string[]
}

export interface TaskQuickAddHandle {
  activate: () => void
  deactivate: () => void
  isActive: boolean
}

interface TaskQuickAddProps {
  /** Handler for new task */
  onAdd: (task: TaskQuickAddData) => void
  placeholder?: string
  className?: string
  context?: TaskQuickAddContext
  /** Variant: 'button' shows just a button, 'inline' shows the form */
  variant?: 'button' | 'inline'
}

// When options
const whenOptions: { value: WhenType; label: string; color: string }[] = [
  { value: 'today', label: 'Dnes', color: 'text-[var(--color-warning)]' },
  { value: 'anytime', label: 'Kedykoľvek', color: 'text-[var(--color-primary)]' },
  { value: 'someday', label: 'Niekedy', color: 'text-muted-foreground' },
]

export const TaskQuickAdd = forwardRef<TaskQuickAddHandle, TaskQuickAddProps>(function TaskQuickAdd({
  onAdd,
  placeholder = 'Nová úloha...',
  className,
  context,
  variant = 'button',
}, ref) {
  const [isActive, setIsActive] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

  // Picker states
  const [whenType, setWhenType] = useState<WhenType | null>(context?.defaultWhenType || null)
  const [whenDate, setWhenDate] = useState<string | null>(null)
  const [areaId, setAreaId] = useState<string | null>(context?.defaultAreaId || null)
  const [projectId, setProjectId] = useState<string | null>(context?.defaultProjectId || null)
  const [assigneeId, setAssigneeId] = useState<string | null>(context?.defaultAssigneeId || null)
  const [deadline, setDeadline] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Dropdown states
  const [showWhenPicker, setShowWhenPicker] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)

  // Data
  const [areas, setAreas] = useState<AreaWithProjects[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    activate: () => setIsActive(true),
    deactivate: () => handleCancel(),
    isActive,
  }))

  // Fetch data when active
  useEffect(() => {
    if (!isActive) return

    const fetchData = async () => {
      try {
        // Fetch areas with projects
        const { data: areasData } = await supabase
          .from('areas')
          .select(`*, projects (id, name, color, status, area_id)`)
          .is('archived_at', null)
          .order('sort_order', { ascending: true })

        if (areasData) {
          setAreas(areasData.map(a => ({
            ...a,
            projects: (a.projects || []).filter((p: Project) => p.status === 'active')
          })))
        }

        // Fetch users
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .order('full_name', { ascending: true })

        if (usersData) setUsers(usersData)

        // Fetch tags
        const { data: tagsData } = await supabase
          .from('tags')
          .select('*')
          .order('name', { ascending: true })

        if (tagsData) setTags(tagsData)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [isActive, supabase])

  // Focus input when activated
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isActive])

  // Listen for keyboard shortcut
  useEffect(() => {
    const handleKeyboardNewTask = () => setIsActive(true)
    window.addEventListener('keyboard:newTask', handleKeyboardNewTask)
    return () => window.removeEventListener('keyboard:newTask', handleKeyboardNewTask)
  }, [])

  // Click outside handler - only for inline variant
  useEffect(() => {
    if (!isActive || variant !== 'inline') return

    const handleClickOutside = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        if (title.trim()) {
          handleSubmit()
        } else {
          handleCancel()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isActive, title, variant])

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return

    onAdd({
      title: title.trim(),
      notes: notes.trim() || undefined,
      when_type: whenType || undefined,
      when_date: whenDate || undefined,
      area_id: areaId || undefined,
      project_id: projectId || undefined,
      assignee_id: assigneeId || undefined,
      deadline: deadline || undefined,
      tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    })

    // Reset form
    setTitle('')
    setNotes('')
    setWhenType(context?.defaultWhenType || null)
    setWhenDate(null)
    setAreaId(context?.defaultAreaId || null)
    setProjectId(context?.defaultProjectId || null)
    setAssigneeId(context?.defaultAssigneeId || null)
    setDeadline(null)
    setSelectedTagIds([])
    setIsActive(false)
  }, [title, notes, whenType, whenDate, areaId, projectId, assigneeId, deadline, selectedTagIds, onAdd, context])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleCancel = () => {
    setTitle('')
    setNotes('')
    setWhenType(context?.defaultWhenType || null)
    setWhenDate(null)
    setAreaId(context?.defaultAreaId || null)
    setProjectId(context?.defaultProjectId || null)
    setAssigneeId(context?.defaultAssigneeId || null)
    setDeadline(null)
    setSelectedTagIds([])
    setIsActive(false)
    closeAllPickers()
  }

  const closeAllPickers = () => {
    setShowWhenPicker(false)
    setShowLocationPicker(false)
    setShowAssigneePicker(false)
    setShowDeadlinePicker(false)
    setShowTagPicker(false)
  }

  // Helper to get selected area/project names
  const selectedArea = areas.find(a => a.id === areaId)
  const selectedProject = areas.flatMap(a => a.projects).find(p => p.id === projectId)
  const selectedAssignee = users.find(u => u.id === assigneeId)
  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id))

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

  // Button variant - just render a button
  if (variant === 'button') {
    return (
      <Button
        onClick={() => setIsActive(true)}
        className={cn(
          'bg-primary text-white hover:bg-primary/90 hidden lg:flex',
          className
        )}
      >
        <Plus className="h-4 w-4 mr-2" />
        Pridať úlohu
      </Button>
    )
  }

  // Inline variant - render nothing when inactive
  if (!isActive) {
    return null
  }

  // Inline variant - active form
  return (
    <div
      ref={formRef}
      className={cn(
        'bg-card rounded-xl border border-border shadow-sm mb-4',
        className
      )}
    >
      {/* Main inputs */}
      <div className="p-4 space-y-3">
        {/* Title with checkbox circle */}
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 mt-0.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-foreground text-sm font-medium placeholder:text-muted-foreground outline-none"
            autoFocus
          />
        </div>

        {/* Notes */}
        <div className="pl-8">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Poznámky..."
            rows={2}
            className="w-full bg-transparent text-muted-foreground text-sm placeholder:text-muted-foreground outline-none resize-none"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Action bar with pickers */}
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
        {/* When picker */}
        <div className="relative">
          <button
            onClick={() => {
              closeAllPickers()
              setShowWhenPicker(!showWhenPicker)
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              whenType
                ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <Star className="w-4 h-4" />
            <span>{whenType === 'today' ? 'Dnes' : whenType === 'scheduled' && whenDate ? format(new Date(whenDate), 'd. MMM', { locale: sk }) : whenType ? whenOptions.find(o => o.value === whenType)?.label : 'Kedy'}</span>
          </button>

          {showWhenPicker && (
            <div className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl z-50">
              <div className="p-2 space-y-1">
                {whenOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setWhenType(opt.value)
                      setWhenDate(null)
                      setShowWhenPicker(false)
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors',
                      whenType === opt.value ? 'bg-accent' : 'hover:bg-accent/50'
                    )}
                  >
                    <Star className={cn('w-4 h-4', opt.color)} />
                    <span>{opt.label}</span>
                    {whenType === opt.value && <span className="ml-auto text-primary">✓</span>}
                  </button>
                ))}
              </div>
              <div className="border-t border-border p-3">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-accent rounded">‹</button>
                  <span className="text-sm font-medium capitalize">{format(currentMonth, 'LLLL yyyy', { locale: sk })}</span>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-accent rounded">›</button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekDays.map((d, i) => (
                    <div key={i} className="text-center text-[10px] text-muted-foreground">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(day => (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        setWhenType('scheduled')
                        setWhenDate(format(day, 'yyyy-MM-dd'))
                        setShowWhenPicker(false)
                      }}
                      disabled={!isSameMonth(day, currentMonth)}
                      className={cn(
                        'h-7 w-7 rounded text-xs transition-colors',
                        !isSameMonth(day, currentMonth) && 'opacity-30',
                        isSameMonth(day, currentMonth) && 'hover:bg-accent',
                        isToday(day) && 'bg-primary text-white',
                        whenDate && isSameDay(day, new Date(whenDate)) && !isToday(day) && 'ring-2 ring-primary'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  ))}
                </div>
              </div>
              {whenType && (
                <div className="border-t border-border p-2">
                  <button
                    onClick={() => {
                      setWhenType(null)
                      setWhenDate(null)
                      setShowWhenPicker(false)
                    }}
                    className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Zrušiť
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags picker */}
        <div className="relative">
          <button
            onClick={() => {
              closeAllPickers()
              setShowTagPicker(!showTagPicker)
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              selectedTagIds.length > 0
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <TagIcon className="w-4 h-4" />
            <span>{selectedTagIds.length > 0 ? `${selectedTagIds.length} tagov` : 'Tagy'}</span>
          </button>

          {showTagPicker && (
            <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-xl z-50 max-h-64 overflow-y-auto">
              <div className="p-2 space-y-1">
                {tags.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Žiadne tagy</p>
                ) : (
                  tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedTagIds(prev =>
                          prev.includes(tag.id)
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        )
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm hover:bg-accent/50 transition-colors"
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || '#007AFF' }} />
                      <span className="flex-1">{tag.name}</span>
                      {selectedTagIds.includes(tag.id) && <span className="text-primary">✓</span>}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Location picker (Area/Project) */}
        <div className="relative">
          <button
            onClick={() => {
              closeAllPickers()
              setShowLocationPicker(!showLocationPicker)
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              (areaId || projectId)
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <FolderOpen className="w-4 h-4" />
            <span>{selectedProject?.name || selectedArea?.name || 'Kam'}</span>
          </button>

          {showLocationPicker && (
            <div className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl z-50 max-h-64 overflow-y-auto">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setAreaId(null)
                    setProjectId(null)
                    setShowLocationPicker(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm hover:bg-accent/50 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Inbox (bez priradenia)</span>
                </button>
                {areas.map(area => (
                  <div key={area.id}>
                    <button
                      onClick={() => {
                        setAreaId(area.id)
                        setProjectId(null)
                        setShowLocationPicker(false)
                      }}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm hover:bg-accent/50 transition-colors',
                        areaId === area.id && !projectId && 'bg-accent'
                      )}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: area.color || '#007AFF' }} />
                      <span className="font-medium">{area.name}</span>
                      {areaId === area.id && !projectId && <span className="ml-auto text-primary">✓</span>}
                    </button>
                    {area.projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setAreaId(area.id)
                          setProjectId(project.id)
                          setShowLocationPicker(false)
                        }}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-2 pl-8 rounded-lg text-left text-sm hover:bg-accent/50 transition-colors',
                          projectId === project.id && 'bg-accent'
                        )}
                      >
                        <FolderOpen className="w-3 h-3 text-muted-foreground" />
                        <span>{project.name}</span>
                        {projectId === project.id && <span className="ml-auto text-primary">✓</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assignee picker */}
        <div className="relative">
          <button
            onClick={() => {
              closeAllPickers()
              setShowAssigneePicker(!showAssigneePicker)
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              assigneeId
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <UserIcon className="w-4 h-4" />
            <span>{selectedAssignee?.nickname || selectedAssignee?.full_name || 'Kto'}</span>
          </button>

          {showAssigneePicker && (
            <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-xl z-50 max-h-64 overflow-y-auto">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setAssigneeId(null)
                    setShowAssigneePicker(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm hover:bg-accent/50 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Nepriradené</span>
                </button>
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setAssigneeId(user.id)
                      setShowAssigneePicker(false)
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm hover:bg-accent/50 transition-colors',
                      assigneeId === user.id && 'bg-accent'
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {(user.nickname || user.full_name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <span>{user.nickname || user.full_name || user.email}</span>
                    {assigneeId === user.id && <span className="ml-auto text-primary">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Deadline picker */}
        <div className="relative">
          <button
            onClick={() => {
              closeAllPickers()
              setShowDeadlinePicker(!showDeadlinePicker)
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              deadline
                ? 'bg-[var(--color-error)]/10 text-[var(--color-error)]'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>{deadline ? format(new Date(deadline), 'd. MMM', { locale: sk }) : 'Deadline'}</span>
          </button>

          {showDeadlinePicker && (
            <div className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl z-50">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-accent rounded">‹</button>
                  <span className="text-sm font-medium capitalize">{format(currentMonth, 'LLLL yyyy', { locale: sk })}</span>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-accent rounded">›</button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekDays.map((d, i) => (
                    <div key={i} className="text-center text-[10px] text-muted-foreground">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(day => (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        setDeadline(format(day, 'yyyy-MM-dd'))
                        setShowDeadlinePicker(false)
                      }}
                      disabled={!isSameMonth(day, currentMonth)}
                      className={cn(
                        'h-7 w-7 rounded text-xs transition-colors',
                        !isSameMonth(day, currentMonth) && 'opacity-30',
                        isSameMonth(day, currentMonth) && 'hover:bg-accent',
                        isToday(day) && 'bg-primary text-white',
                        deadline && isSameDay(day, new Date(deadline)) && !isToday(day) && 'ring-2 ring-[var(--color-error)]'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  ))}
                </div>
              </div>
              {deadline && (
                <div className="border-t border-border p-2">
                  <button
                    onClick={() => {
                      setDeadline(null)
                      setShowDeadlinePicker(false)
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                    <span>Zrušiť deadline</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cancel button */}
        <button
          onClick={handleCancel}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
        >
          Zrušiť
        </button>
      </div>

      {/* Selected items preview */}
      {selectedTags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
              style={{ borderColor: tag.color || '#007AFF', color: tag.color || '#007AFF' }}
            >
              {tag.name}
              <button
                onClick={() => setSelectedTagIds(prev => prev.filter(id => id !== tag.id))}
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
})
