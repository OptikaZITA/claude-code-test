-- ZITA TODO - RLS Policy Fix
-- Run this in Supabase SQL Editor to fix 500 errors

-- ============================================
-- OPTION 1: Temporarily disable RLS for testing
-- ============================================
-- Uncomment these lines to disable RLS (NOT recommended for production)

-- ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE areas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;

-- ============================================
-- OPTION 2: Fix RLS policies (RECOMMENDED)
-- ============================================

-- Drop existing task policies
DROP POLICY IF EXISTS "Users can view organization tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update organization tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Create new, more permissive task policies

-- SELECT: Users can view their own tasks OR organization tasks
CREATE POLICY "Users can view tasks" ON tasks
  FOR SELECT USING (
    -- Personal inbox tasks
    inbox_user_id = auth.uid()
    -- Tasks created by user
    OR created_by = auth.uid()
    -- Tasks assigned to user
    OR assignee_id = auth.uid()
    -- Organization tasks (only if user has an organization)
    OR (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND organization_id IS NOT NULL
      )
    )
    -- Team inbox tasks (visible to all authenticated users)
    OR (inbox_type = 'team' AND auth.uid() IS NOT NULL)
  );

-- INSERT: Authenticated users can create tasks
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR created_by IS NULL
    )
  );

-- UPDATE: Users can update their own tasks, organization tasks, or team inbox tasks
CREATE POLICY "Users can update tasks" ON tasks
  FOR UPDATE USING (
    created_by = auth.uid()
    OR assignee_id = auth.uid()
    OR inbox_user_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND organization_id IS NOT NULL
      )
    )
    -- Team inbox tasks can be updated by any authenticated user
    OR (inbox_type = 'team' AND auth.uid() IS NOT NULL)
  );

-- DELETE: Users can delete their own tasks or team inbox tasks
CREATE POLICY "Users can delete tasks" ON tasks
  FOR DELETE USING (
    created_by = auth.uid()
    OR inbox_user_id = auth.uid()
    -- Team inbox tasks can be deleted by any authenticated user
    OR (inbox_type = 'team' AND auth.uid() IS NOT NULL)
  );

-- ============================================
-- Fix Users table policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view organization members" ON users;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- Users can view organization members (if they have an organization)
CREATE POLICY "Users can view organization members" ON users
  FOR SELECT USING (
    organization_id IS NOT NULL
    AND organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND organization_id IS NOT NULL
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- Users can insert their own profile (for trigger)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================
-- Fix Projects policies
-- ============================================

DROP POLICY IF EXISTS "Users can view organization projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update organization projects" ON projects;

CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (
    owner_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND organization_id IS NOT NULL
      )
    )
    OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (owner_id = auth.uid() OR owner_id IS NULL)
  );

CREATE POLICY "Users can update projects" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can delete projects" ON projects
  FOR DELETE USING (owner_id = auth.uid());

-- ============================================
-- Fix Time Entries policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete own time entries" ON time_entries;

CREATE POLICY "Users can view time entries" ON time_entries
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND organization_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can create time entries" ON time_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

CREATE POLICY "Users can update time entries" ON time_entries
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete time entries" ON time_entries
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- Fix Areas policies
-- ============================================

DROP POLICY IF EXISTS "Users can view organization areas" ON areas;
DROP POLICY IF EXISTS "Users can view areas" ON areas;

-- Areas/Departments - public ones visible to all authenticated users
CREATE POLICY "Users can view areas" ON areas
  FOR SELECT USING (
    -- Public areas (departments) visible to all authenticated users
    (is_private = false AND auth.uid() IS NOT NULL)
    -- Or owner
    OR owner_id = auth.uid()
    -- Or organization member
    OR (
      organization_id IS NOT NULL
      AND organization_id = public.get_my_organization_id()
    )
    -- Or area member
    OR id IN (SELECT area_id FROM area_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create areas" ON areas
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (owner_id = auth.uid() OR owner_id IS NULL)
  );

CREATE POLICY "Users can update areas" ON areas
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND organization_id IS NOT NULL
      )
    )
  );

-- ============================================
-- Fix Tags policies
-- ============================================

DROP POLICY IF EXISTS "Users can view organization tags" ON tags;

CREATE POLICY "Users can view tags" ON tags
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "Users can create tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Fix Organizations policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own organization" ON organizations;

CREATE POLICY "Users can view organizations" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Verify user exists in users table
-- ============================================
-- If the trigger didn't create the user, run this manually:

-- INSERT INTO users (id, email)
-- SELECT id, email FROM auth.users
-- WHERE id NOT IN (SELECT id FROM users);
