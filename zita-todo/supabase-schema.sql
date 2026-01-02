-- ZITA TODO - Supabase Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Areas table
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_private BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_private BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  kanban_column TEXT DEFAULT 'backlog',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  start_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  inbox_type TEXT CHECK (inbox_type IN ('personal', 'team')),
  inbox_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  total_time_seconds INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task-Tags junction table
CREATE TABLE task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Time entries table
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  note TEXT,
  entry_type TEXT DEFAULT 'task' CHECK (entry_type IN ('task', 'shift', 'break')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Area members table
CREATE TABLE area_members (
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (area_id, user_id)
);

-- Project members table
CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Indexes for better performance
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_inbox_type ON tasks(inbox_type);
CREATE INDEX idx_tasks_inbox_user_id ON tasks(inbox_user_id);
CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_projects_area_id ON projects(area_id);
CREATE INDEX idx_users_organization_id ON users(organization_id);

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating user profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view organization members" ON users
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Tasks policies
CREATE POLICY "Users can view organization tasks" ON tasks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR inbox_user_id = auth.uid()
  );

CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Users can update organization tasks" ON tasks
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (created_by = auth.uid());

-- Projects policies
CREATE POLICY "Users can view organization projects" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
  );

CREATE POLICY "Users can update organization projects" ON projects
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Time entries policies
CREATE POLICY "Users can view own time entries" ON time_entries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create time entries" ON time_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time entries" ON time_entries
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own time entries" ON time_entries
  FOR DELETE USING (user_id = auth.uid());

-- Tags policies
CREATE POLICY "Users can view organization tags" ON tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Areas policies
CREATE POLICY "Users can view organization areas" ON areas
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Organizations policies
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
