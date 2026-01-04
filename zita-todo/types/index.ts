// User types
export interface User {
  id: string
  organization_id: string | null
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'member'
  is_active: boolean
  created_at: string
  updated_at: string
}

// Organization
export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
}

// Area types
export interface Area {
  id: string
  organization_id: string | null
  name: string
  description: string | null
  color: string | null
  is_private: boolean
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
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type KanbanColumn = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
export type InboxType = 'personal' | 'team' | null
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
  kanban_column: KanbanColumn | null
  priority: TaskPriority
  due_date: string | null
  start_date: string | null
  when_type: WhenType
  when_date: string | null
  deadline: string | null
  is_inbox: boolean
  completed_at: string | null
  created_by: string | null
  assignee_id: string | null
  inbox_type: InboxType
  inbox_user_id: string | null
  total_time_seconds: number
  sort_order: number
  archived_at: string | null
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
  entry_type: TimeEntryType
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
  role: 'admin' | 'member'
  invited_by: string | null
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

// Recurrence types
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number // Every X days/weeks/months/years
  weekDays?: WeekDay[] // For weekly: which days
  monthDay?: number // For monthly: which day of month (1-31)
  endDate?: string // When to stop recurring
  endAfterOccurrences?: number // Stop after X occurrences
}

export interface RecurringTask extends Task {
  recurrence_rule: RecurrenceRule | null
  parent_task_id: string | null // For recurring instances
  next_occurrence_at: string | null
  occurrences_count: number
}

// Kanban types
export interface KanbanColumnConfig {
  id: KanbanColumn
  title: string
  color: string
}

export const DEFAULT_KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { id: 'backlog', title: 'Backlog', color: '#8E8E93' },
  { id: 'todo', title: 'To Do', color: '#007AFF' },
  { id: 'in_progress', title: 'In Progress', color: '#FF9500' },
  { id: 'review', title: 'Review', color: '#AF52DE' },
  { id: 'done', title: 'Done', color: '#34C759' },
]

// Filter types
export interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assignee_id?: string
  tags?: string[]
  due_date_from?: string
  due_date_to?: string
  search?: string
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
