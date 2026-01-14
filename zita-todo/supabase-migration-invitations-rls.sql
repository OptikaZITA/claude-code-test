-- =============================================================================
-- ZITA TODO - Migrácia: RLS politiky pre tabuľku INVITATIONS
-- Dátum: 14. januára 2026
-- Problém: invitations má zapnuté RLS ale žiadne politiky -> všetko blokované
-- =============================================================================

-- 1. SELECT - Admin a HR môžu vidieť pozvánky v organizácii
DROP POLICY IF EXISTS "Admins can view invitations" ON invitations;
CREATE POLICY "Admins can view invitations"
  ON invitations FOR SELECT
  USING (
    organization_id = public.get_my_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr')
    )
  );

-- 2. INSERT - Admin a HR môžu vytvárať pozvánky
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    organization_id = public.get_my_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr')
    )
  );

-- 3. UPDATE - Admin a HR môžu aktualizovať pozvánky (napr. predĺžiť platnosť)
DROP POLICY IF EXISTS "Admins can update invitations" ON invitations;
CREATE POLICY "Admins can update invitations"
  ON invitations FOR UPDATE
  USING (
    organization_id = public.get_my_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr')
    )
  );

-- 4. DELETE - Admin a HR môžu mazať pozvánky
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  USING (
    organization_id = public.get_my_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'hr')
    )
  );

-- =============================================================================
-- KONIEC MIGRÁCIE
-- =============================================================================
