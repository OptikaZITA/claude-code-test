-- ZITA TODO - Tasks RLS Fix for Member Role
-- Bug: Member users (NATY) cannot reorder tasks in Kanban/List view
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 0: CREATE HELPER FUNCTION (if not exists)
-- ============================================

-- This function uses SECURITY DEFINER to avoid infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$;

-- ============================================
-- STEP 1: DIAGNOSTICS - Run these first
-- ============================================

-- 1.1 Check all UPDATE policies on tasks table
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'tasks' AND cmd = 'UPDATE';

-- 1.2 Check user roles (find NATY)
SELECT id, email, role, full_name, organization_id
FROM users
WHERE email ILIKE '%naty%' OR full_name ILIKE '%naty%';

-- 1.3 Check if organization_id is set correctly
SELECT id, email, role, organization_id
FROM users
WHERE organization_id IS NOT NULL
LIMIT 10;

-- ============================================
-- STEP 2: FIX - Run after reviewing diagnostics
-- ============================================

-- Drop all existing task UPDATE policies (there might be conflicts)
DROP POLICY IF EXISTS "Users can update organization tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "org_members_can_update_tasks" ON tasks;

-- Create new comprehensive UPDATE policy
-- This allows ANY authenticated user in the same organization to update tasks
-- Uses helper function to avoid recursion and improve performance
CREATE POLICY "Users can update tasks" ON tasks
  FOR UPDATE
  USING (
    -- Task creator can always update
    created_by = auth.uid()
    -- Assignee can update
    OR assignee_id = auth.uid()
    -- Personal inbox owner can update
    OR inbox_user_id = auth.uid()
    -- Organization members can update organization tasks (using helper function)
    OR (
      organization_id IS NOT NULL
      AND organization_id = public.get_my_organization_id()
    )
    -- Team inbox tasks can be updated by any authenticated user
    OR (inbox_type = 'team' AND auth.uid() IS NOT NULL)
  )
  WITH CHECK (
    -- Same conditions for the new row values
    -- This is CRITICAL - without WITH CHECK, UPDATE may fail silently
    created_by = auth.uid()
    OR assignee_id = auth.uid()
    OR inbox_user_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND organization_id = public.get_my_organization_id()
    )
    OR (inbox_type = 'team' AND auth.uid() IS NOT NULL)
  );

-- ============================================
-- STEP 3: VERIFICATION - Run after fix
-- ============================================

-- 3.1 Verify the new policy exists
SELECT policyname, cmd, qual IS NOT NULL as has_using, with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'tasks' AND cmd = 'UPDATE';

-- 3.2 Test query - this simulates what a member sees
-- Replace 'NATY_USER_ID' with actual user ID from step 1.2
-- SELECT COUNT(*) FROM tasks WHERE organization_id = (SELECT organization_id FROM users WHERE id = 'NATY_USER_ID');
