'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Star, Tag as TagIcon, FolderOpen, User as UserIcon, Flag, X, Calendar } from 'lucide-react'
import { WhenType, Area, Project, User, Tag } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths } from 'date-fns'
import { sk } from 'date-fns/locale'
import { FabButton } from './fab-button'
import { BottomSheet } from '@/components/ui/bottom-sheet'

interface AreaWithProjects extends Area {
  projects: Project[]
}

// Context for default values
export interface TaskQuickAddMobileContext {
  defaultWhenType?: WhenType
  defaultAreaId?: string
  defaultProjectId?: string
  defaultAssigneeId?: string
}

interface TaskQuickAddMobileProps {
  onAdd: (task: {
    title: string
    notes?: string
    when_type?: WhenType
    when_date?: string
    area_id?: string
    project_id?: string
    assignee_id?: string
    deadline?: string
    tag_ids?: string[]
  }) => void
  context?: TaskQuickAddMobileContext
}

// When options
const whenOptions: { value: WhenType; label: string; color: string }[] = [
  { value: 'today', label: 'Dnes', color: 'text-[var(--color-warning)]' },
  { value: 'anytime', label: 'Kedykoľvek', color: 'text-[var(--color-primary)]' },
  { value: 'someday', label: 'Niekedy', color: 'text-muted-foreground' },
]

export function TaskQuickAddMobile({
  onAdd,
  context,
}: TaskQuickAddMobileProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

  // Picker states
  const [whenType, setWhenType] = useState<WhenType | null>(context?.defaultWhenType || null)
  const [whenDate, setWhenDate] = useState<string | null>(null)
  const [deadline, setDeadline] = useState<string | null>(null)
  const [areaId, setAreaId] = useState<string | null>(context?.defaultAreaId || null)
  const [projectId, setProjectId] = useState<string | null>(context?.defaultProjectId || null)
  const [assigneeId, setAssigneeId] = useState<string | null>(context?.defaultAssigneeId || null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Modal states (mobile uses full-screen modals)
  const [showWhenModal, setShowWhenModal] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showAssigneeModal, setShowAssigneeModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)

  // Data
  const [areas, setAreas] = useState<AreaWithProjects[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Fetch data when sheet opens
  useEffect(() => {
    if (!isOpen) return

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
  }, [isOpen, supabase])

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

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

    // Reset and close
    resetForm()
    setIsOpen(false)
  }, [title, notes, whenType, whenDate, areaId, projectId, assigneeId, deadline, selectedTagIds, onAdd])

  const resetForm = () => {
    setTitle('')
    setNotes('')
    setWhenType(context?.defaultWhenType || null)
    setWhenDate(null)
    setDeadline(null)
    setAreaId(context?.defaultAreaId || null)
    setProjectId(context?.defaultProjectId || null)
    setAssigneeId(context?.defaultAssigneeId || null)
    setSelectedTagIds([])
  }

  const handleClose = () => {
    resetForm()
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Helper to get selected names
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

  return (
    <>
      {/* FAB Button - only visible on mobile */}
      <FabButton onClick={() => setIsOpen(true)} />

      {/* Bottom Sheet */}
      <BottomSheet isOpen={isOpen} onClose={handleClose} title="Nová úloha">
        <div className="p-4 space-y-4">
          {/* Title input */}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 mt-0.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nová úloha..."
              className="flex-1 bg-transparent text-foreground text-base font-medium placeholder:text-muted-foreground outline-none"
            />
          </div>

          {/* Notes */}
          <div className="pl-8">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Poznámky..."
              rows={2}
              className="w-full bg-transparent text-muted-foreground text-sm placeholder:text-muted-foreground outline-none resize-none"
            />
          </div>

          {/* Selected tags preview */}
          {selectedTags.length > 0 && (
            <div className="pl-8 flex flex-wrap gap-1.5">
              {selectedTags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
                  style={{ borderColor: tag.color || '#007AFF', color: tag.color || '#007AFF' }}
                >
                  {tag.name}
                  <button onClick={() => setSelectedTagIds(prev => prev.filter(id => id !== tag.id))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Action buttons - 4 icons for mobile (When+Deadline combined, Tags, Location, Assignee) */}
          <div className="flex items-center justify-around py-2">
            {/* When picker (includes Deadline on mobile) */}
            <button
              onClick={() => setShowWhenModal(true)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl transition-colors',
                (whenType || deadline)
                  ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                  : 'text-muted-foreground'
              )}
            >
              <Star className="w-6 h-6" />
              <span className="text-xs">
                {whenType === 'today' ? 'Dnes' : whenType === 'scheduled' && whenDate ? format(new Date(whenDate), 'd.M.', { locale: sk }) : 'Kedy'}
              </span>
            </button>

            {/* Tags */}
            <button
              onClick={() => setShowTagModal(true)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl transition-colors',
                selectedTagIds.length > 0
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'text-muted-foreground'
              )}
            >
              <TagIcon className="w-6 h-6" />
              <span className="text-xs">{selectedTagIds.length > 0 ? `${selectedTagIds.length}` : 'Tagy'}</span>
            </button>

            {/* Location */}
            <button
              onClick={() => setShowLocationModal(true)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl transition-colors',
                (areaId || projectId)
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'text-muted-foreground'
              )}
            >
              <FolderOpen className="w-6 h-6" />
              <span className="text-xs truncate max-w-[60px]">{selectedProject?.name || selectedArea?.name || 'Kam'}</span>
            </button>

            {/* Assignee */}
            <button
              onClick={() => setShowAssigneeModal(true)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl transition-colors',
                assigneeId
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'text-muted-foreground'
              )}
            >
              <UserIcon className="w-6 h-6" />
              <span className="text-xs truncate max-w-[60px]">{selectedAssignee?.nickname || selectedAssignee?.full_name || 'Kto'}</span>
            </button>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="w-full py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            Vytvoriť úlohu
          </button>
        </div>
      </BottomSheet>

      {/* When Modal (includes Deadline on mobile) */}
      {showWhenModal && (
        <div className="fixed inset-0 z-[60] bg-background">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={() => setShowWhenModal(false)} className="text-muted-foreground">
                Zrušiť
              </button>
              <h2 className="text-lg font-semibold">Kedy?</h2>
              <button
                onClick={() => setShowWhenModal(false)}
                className="text-primary font-medium"
              >
                Hotovo
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Quick options */}
              <div className="space-y-2">
                {whenOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setWhenType(opt.value)
                      setWhenDate(null)
                    }}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors',
                      whenType === opt.value ? 'bg-accent' : 'bg-card'
                    )}
                  >
                    <Star className={cn('w-5 h-5', opt.color)} />
                    <span className="flex-1">{opt.label}</span>
                    {whenType === opt.value && <span className="text-primary">✓</span>}
                  </button>
                ))}
              </div>

              {/* Calendar */}
              <div className="bg-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2">‹</button>
                  <span className="font-medium capitalize">{format(currentMonth, 'LLLL yyyy', { locale: sk })}</span>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2">›</button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((d, i) => (
                    <div key={i} className="text-center text-xs text-muted-foreground py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(day => (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        setWhenType('scheduled')
                        setWhenDate(format(day, 'yyyy-MM-dd'))
                      }}
                      disabled={!isSameMonth(day, currentMonth)}
                      className={cn(
                        'h-10 w-full rounded-lg text-sm transition-colors',
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

              {/* Deadline section */}
              <div className="bg-card rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Flag className="w-5 h-5 text-[var(--color-error)]" />
                  <span className="font-medium">Deadline</span>
                </div>
                {deadline ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-error)]">
                      {format(new Date(deadline), 'd. MMMM yyyy', { locale: sk })}
                    </span>
                    <button
                      onClick={() => setDeadline(null)}
                      className="text-muted-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      // Default to current calendar month first day as deadline
                      setDeadline(format(new Date(), 'yyyy-MM-dd'))
                    }}
                    className="text-muted-foreground"
                  >
                    Nastaviť deadline
                  </button>
                )}
              </div>

              {/* Clear button */}
              {(whenType || deadline) && (
                <button
                  onClick={() => {
                    setWhenType(null)
                    setWhenDate(null)
                    setDeadline(null)
                  }}
                  className="w-full py-3 text-center text-muted-foreground"
                >
                  Vymazať všetko
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tags Modal */}
      {showTagModal && (
        <div className="fixed inset-0 z-[60] bg-background">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={() => setShowTagModal(false)} className="text-muted-foreground">
                Zrušiť
              </button>
              <h2 className="text-lg font-semibold">Tagy</h2>
              <button onClick={() => setShowTagModal(false)} className="text-primary font-medium">
                Hotovo
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {tags.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Žiadne tagy</p>
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
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors',
                      selectedTagIds.includes(tag.id) ? 'bg-accent' : 'bg-card'
                    )}
                  >
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color || '#007AFF' }} />
                    <span className="flex-1">{tag.name}</span>
                    {selectedTagIds.includes(tag.id) && <span className="text-primary">✓</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[60] bg-background">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={() => setShowLocationModal(false)} className="text-muted-foreground">
                Zrušiť
              </button>
              <h2 className="text-lg font-semibold">Kam uložiť?</h2>
              <button onClick={() => setShowLocationModal(false)} className="text-primary font-medium">
                Hotovo
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <button
                onClick={() => {
                  setAreaId(null)
                  setProjectId(null)
                }}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors',
                  !areaId && !projectId ? 'bg-accent' : 'bg-card'
                )}
              >
                <X className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1">Inbox (bez priradenia)</span>
                {!areaId && !projectId && <span className="text-primary">✓</span>}
              </button>
              {areas.map(area => (
                <div key={area.id}>
                  <button
                    onClick={() => {
                      setAreaId(area.id)
                      setProjectId(null)
                    }}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors',
                      areaId === area.id && !projectId ? 'bg-accent' : 'bg-card'
                    )}
                  >
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: area.color || '#007AFF' }} />
                    <span className="flex-1 font-medium">{area.name}</span>
                    {areaId === area.id && !projectId && <span className="text-primary">✓</span>}
                  </button>
                  {area.projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setAreaId(area.id)
                        setProjectId(project.id)
                      }}
                      className={cn(
                        'flex items-center gap-3 w-full px-4 py-3 pl-12 rounded-xl text-left transition-colors',
                        projectId === project.id ? 'bg-accent' : 'bg-card'
                      )}
                    >
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1">{project.name}</span>
                      {projectId === project.id && <span className="text-primary">✓</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assignee Modal */}
      {showAssigneeModal && (
        <div className="fixed inset-0 z-[60] bg-background">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={() => setShowAssigneeModal(false)} className="text-muted-foreground">
                Zrušiť
              </button>
              <h2 className="text-lg font-semibold">Komu priradiť?</h2>
              <button onClick={() => setShowAssigneeModal(false)} className="text-primary font-medium">
                Hotovo
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <button
                onClick={() => setAssigneeId(null)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors',
                  !assigneeId ? 'bg-accent' : 'bg-card'
                )}
              >
                <X className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1">Nepriradené</span>
                {!assigneeId && <span className="text-primary">✓</span>}
              </button>
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => setAssigneeId(user.id)}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-colors',
                    assigneeId === user.id ? 'bg-accent' : 'bg-card'
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {(user.nickname || user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1">{user.nickname || user.full_name || user.email}</span>
                  {assigneeId === user.id && <span className="text-primary">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
