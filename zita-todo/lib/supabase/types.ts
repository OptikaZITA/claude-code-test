export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      users: {
        Row: {
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
        Insert: {
          id: string
          organization_id?: string | null
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'member'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'member'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      areas: {
        Row: {
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
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          description?: string | null
          color?: string | null
          is_private?: boolean
          owner_id?: string | null
          sort_order?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          description?: string | null
          color?: string | null
          is_private?: boolean
          owner_id?: string | null
          sort_order?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
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
        Insert: {
          id?: string
          organization_id?: string | null
          area_id?: string | null
          name: string
          description?: string | null
          color?: string | null
          is_private?: boolean
          owner_id?: string | null
          status?: 'active' | 'completed' | 'archived'
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          area_id?: string | null
          name?: string
          description?: string | null
          color?: string | null
          is_private?: boolean
          owner_id?: string | null
          status?: 'active' | 'completed' | 'archived'
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          organization_id: string | null
          project_id: string | null
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'done'
          kanban_column: string
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          start_date: string | null
          completed_at: string | null
          created_by: string | null
          assignee_id: string | null
          inbox_type: 'personal' | 'team' | null
          inbox_user_id: string | null
          total_time_seconds: number
          sort_order: number
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          project_id?: string | null
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'done'
          kanban_column?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          start_date?: string | null
          completed_at?: string | null
          created_by?: string | null
          assignee_id?: string | null
          inbox_type?: 'personal' | 'team' | null
          inbox_user_id?: string | null
          total_time_seconds?: number
          sort_order?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          project_id?: string | null
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'done'
          kanban_column?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          start_date?: string | null
          completed_at?: string | null
          created_by?: string | null
          assignee_id?: string | null
          inbox_type?: 'personal' | 'team' | null
          inbox_user_id?: string | null
          total_time_seconds?: number
          sort_order?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          color?: string | null
          created_at?: string
        }
      }
      task_tags: {
        Row: {
          task_id: string
          tag_id: string
        }
        Insert: {
          task_id: string
          tag_id: string
        }
        Update: {
          task_id?: string
          tag_id?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          organization_id: string | null
          task_id: string | null
          user_id: string | null
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
          note: string | null
          entry_type: 'task' | 'shift' | 'break'
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          task_id?: string | null
          user_id?: string | null
          started_at: string
          ended_at?: string | null
          duration_seconds?: number | null
          note?: string | null
          entry_type?: 'task' | 'shift' | 'break'
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          task_id?: string | null
          user_id?: string | null
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          note?: string | null
          entry_type?: 'task' | 'shift' | 'break'
          created_at?: string
        }
      }
      invitations: {
        Row: {
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
        Insert: {
          id?: string
          organization_id?: string | null
          email: string
          role?: 'admin' | 'member'
          invited_by?: string | null
          token: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          email?: string
          role?: 'admin' | 'member'
          invited_by?: string | null
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
      area_members: {
        Row: {
          area_id: string
          user_id: string
          can_edit: boolean
          added_at: string
        }
        Insert: {
          area_id: string
          user_id: string
          can_edit?: boolean
          added_at?: string
        }
        Update: {
          area_id?: string
          user_id?: string
          can_edit?: boolean
          added_at?: string
        }
      }
      project_members: {
        Row: {
          project_id: string
          user_id: string
          can_edit: boolean
          added_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          can_edit?: boolean
          added_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          can_edit?: boolean
          added_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
