// User types
export type UserRole = 'admin' | 'strategicka_rada' | 'hr' | 'member'
export type UserStatus = 'active' | 'inactive' | 'invited'

// Roly ktoré vidia všetky oddelenia
export const FULL_ACCESS_ROLES: UserRole[] = ['admin', 'strategicka_rada', 'hr']

export function canSeeAllDepartments(role: UserRole): boolean {
  return FULL_ACCESS_ROLES.includes(role)
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}

export interface User {
  id: string
  organization_id: string | null
  email: string
  full_name: string | null
  nickname: string | null
  avatar_url: string | null
  position: string | null
  role: UserRole
  status: UserStatus
  is_active: boolean // legacy, use status instead
  invited_by: string | null
  invited_at: string | null
  last_login_at: string | null
  start_date: string | null
  created_at: string
  updated_at: string
}

// Department membership
export interface DepartmentMember {
  id: string
  user_id: string
  department_id: string
  created_at: string
  updated_at: string
}

export interface UserWithDepartments extends User {
  departments?: Area[]
}

// Organization
export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
}

// Area types (Oddelenia)
export interface Area {
  id: string
  organization_id: string | null
  name: string
  description: string | null
  color: string | null
  is_private: boolean
  is_global: boolean // Globálne oddelenia viditeľné pre všetkých
  owner_id: string | null
  sort_order: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface AreaWithProjects extends Area {
  projects: Project[]
}

// Project types
export type ProjectStatus = 'active' | 'completed' | 'archived' | 'someday' | 'canceled'
export type ProjectStartType = 'anytime' | 'someday' | 'on_date'

export interface Project {
  id: string
  organization_id: string | null
  area_id: string | null
  name: string
  description: string | null
  color: string | null
  is_private: boolean
  owner_id: string | null
  status: ProjectStatus
  start_type: ProjectStartType
  start_date: string | null
  deadline: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProjectWithHeadings extends Project {
  headings: Heading[]
}

// Heading types (Things 3 style sections within projects)
export interface Heading {
  id: string
  user_id: string
  project_id: string
  title: string
  sort_order: number
  created_at: string
  updated_at: string
}

// Task types
// TaskStatus = workflow fázy pre Kanban (5 stĺpcov + canceled)
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'canceled'
// Priority: high (red flag), low (yellow flag), null = no flag
export type TaskPriority = 'high' | 'low'
export type InboxType = 'personal' | 'team' | null
// WhenType = časové zaradenie pre List view (Things 3 štýl)
export type WhenType = 'inbox' | 'today' | 'anytime' | 'someday' | 'scheduled'

export interface Task {
  id: string
  organization_id: string | null
  project_id: string | null
  area_id: string | null
  heading_id: string | null
  title: string
  description: string | null
  notes: string | null
  status: TaskStatus
  // kanban_column removed - konsolidované do status
  priority: TaskPriority | null  // null = no priority (no flag)
  due_date: string | null
  start_date: string | null
  when_type: WhenType | null  // null = Logbook (dokončené úlohy)
  when_date: string | null
  deadline: string | null
  is_inbox: boolean
  is_private: boolean  // Súkromná úloha - viditeľná len pre vlastníka/assignee
  completed_at: string | null
  created_by: string | null
  assignee_id: string | null
  inbox_type: InboxType
  inbox_user_id: string | null
  total_time_seconds: number
  sort_order: number
  archived_at: string | null
  deleted_at: string | null
  added_to_today_at: string | null  // Timestamp kedy bol task pridany do Dnes (pre zltu bodku)
  checklist_items: ChecklistItem[]
  recurrence_rule: RecurrenceRule | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface TaskWithRelations extends Task {
  assignee?: User | null
  creator?: User | null
  project?: Project | null
  area?: Area | null
  heading?: Heading | null
  tags?: Tag[]
  time_entries?: TimeEntry[]
}

// Tag types
export interface Tag {
  id: string
  organization_id: string | null
  name: string
  color: string | null
  created_at: string
}

// Time entry types
export type TimeEntryType = 'task' | 'shift' | 'break'

export interface TimeEntry {
  id: string
  organization_id: string | null
  task_id: string | null
  user_id: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  note: string | null
  description: string | null  // For edit modal - optional description
  entry_type: TimeEntryType
  deleted_at: string | null   // Soft delete timestamp
  created_at: string
}

export interface ActiveTimer extends TimeEntry {
  task?: Task
}

// Invitation types
export interface Invitation {
  id: string
  organization_id: string | null
  email: string
  full_name: string | null
  nickname: string | null
  position: string | null
  role: UserRole
  departments: string[] // Array of department/area IDs
  invited_by: string | null
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface InvitationWithDetails extends Invitation {
  inviter?: User
  department_list?: Area[]
}

// Recurrence types - Things 3 style
export type RecurrenceType = 'after_completion' | 'scheduled'
export type RecurrenceUnit = 'day' | 'week' | 'month' | 'year'
export type RecurrenceEndType = 'never' | 'after_count' | 'on_date'

export interface RecurrenceRule {
  // Typ opakovania
  type: RecurrenceType

  // Interval a jednotka
  interval: number           // 1, 2, 3...
  unit: RecurrenceUnit

  // Kedy skončiť opakovanie
  end_type: RecurrenceEndType
  end_after_count?: number   // po X opakovaniach
  end_on_date?: string       // ISO date string

  // Pre scheduled - ďalšie dátumy
  next_date?: string         // ISO date - kedy je ďalší výskyt
  completed_count?: number   // počet dokončených opakovaní

  // Voliteľné
  reminder_time?: string     // "12:00" - čas pripomienky
  deadline_days_before?: number // deadline X dní pred
}

// Helper pre formátovanie recurrence rule do čitateľného textu
export function formatRecurrenceRule(rule: RecurrenceRule): string {
  const unitLabels: Record<RecurrenceUnit, { singular: string; plural: string }> = {
    day: { singular: 'deň', plural: 'dni' },
    week: { singular: 'týždeň', plural: 'týždne' },
    month: { singular: 'mesiac', plural: 'mesiace' },
    year: { singular: 'rok', plural: 'roky' },
  }

  const unit = unitLabels[rule.unit]
  const intervalText = rule.interval === 1
    ? unit.singular
    : `${rule.interval} ${unit.plural}`

  if (rule.type === 'after_completion') {
    return `Každý ${intervalText} po dokončení`
  }

  return `Každý ${intervalText}`
}

// Kanban types - používa TaskStatus namiesto samostatného KanbanColumn
export interface KanbanColumnConfig {
  id: TaskStatus
  title: string
  color: string
  icon?: string
}

// 5 stĺpcov pre Kanban board (bez 'canceled')
export const DEFAULT_KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { id: 'backlog', title: 'Backlog', color: '#8E8E93', icon: '📥' },
  { id: 'todo', title: 'To Do', color: '#007AFF', icon: '📋' },
  { id: 'in_progress', title: 'In Progress', color: '#FF9500', icon: '🔄' },
  { id: 'review', title: 'Review', color: '#AF52DE', icon: '👁️' },
  { id: 'done', title: 'Done', color: '#34C759', icon: '✅' },
]

// Filter types
export type DueDateFilter = 'today' | 'this_week' | 'this_month' | 'overdue' | 'no_date'
export type SortOption = 'default' | 'deadline_asc' | 'deadline_desc'

export interface TaskFilters {
  status: TaskStatus | null
  assigneeIds: string[]
  dueDate: DueDateFilter | null
  priority: TaskPriority | null
  tagIds: string[]
  projectId: string | null
  areaId: string | null  // Oddelenie filter
  when: WhenType | null
  search?: string
  sortBy: SortOption
}

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  status: null,
  assigneeIds: [],
  dueDate: null,
  priority: null,
  tagIds: [],
  projectId: null,
  areaId: null,
  when: null,
  search: '',
  sortBy: 'default',
}

// Integration types
export type IntegrationType = 'slack' | 'email'

export interface SlackIntegration {
  type: 'slack'
  enabled: boolean
  webhookUrl: string
  channel?: string
  notifications: {
    taskCreated: boolean
    taskCompleted: boolean
    taskAssigned: boolean
    taskDueSoon: boolean
    commentAdded: boolean
  }
}

export interface EmailIntegration {
  type: 'email'
  enabled: boolean
  email: string
  notifications: {
    dailyDigest: boolean
    taskAssigned: boolean
    taskDueSoon: boolean
    weeklyReport: boolean
    commentMentions: boolean
  }
  digestTime?: string // e.g., "09:00"
}

export type Integration = SlackIntegration | EmailIntegration

export interface UserIntegrations {
  slack?: SlackIntegration
  email?: EmailIntegration
}
