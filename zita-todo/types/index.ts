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
export interface Project {
  id: string
  organization_id: string | null
  area_id: string | null
  name: string
  description: string | null
  color: string | null
  is_private: boolean
  owner_id: string | null
  status: 'active' | 'completed' | 'archived'
  sort_order: number
  created_at: string
  updated_at: string
}

// Task types
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type KanbanColumn = 'backlog' | 'todo' | 'in_progress' | 'done'
export type InboxType = 'personal' | 'team' | null

export interface Task {
  id: string
  organization_id: string | null
  project_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  kanban_column: string
  priority: TaskPriority
  due_date: string | null
  start_date: string | null
  completed_at: string | null
  created_by: string | null
  assignee_id: string | null
  inbox_type: InboxType
  inbox_user_id: string | null
  total_time_seconds: number
  sort_order: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskWithRelations extends Task {
  assignee?: User | null
  creator?: User | null
  project?: Project | null
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

// Kanban types
export interface KanbanColumnConfig {
  id: KanbanColumn
  title: string
  color: string
}

export const DEFAULT_KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { id: 'backlog', title: 'Backlog', color: '#86868B' },
  { id: 'todo', title: 'To Do', color: '#007AFF' },
  { id: 'in_progress', title: 'In Progress', color: '#FF9500' },
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
