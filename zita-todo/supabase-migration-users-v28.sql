-- =============================================================================
-- ZITA TODO - Migrácia v2.8: Správa používateľov a Oddelení
-- Dátum: 5. januára 2026
-- =============================================================================

-- =============================================================================
-- 1. ROZŠÍRENIE TABUĽKY USERS
-- =============================================================================

-- Pridaj nové stĺpce
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS start_date DATE;

-- Pridaj CHECK constraint pre status
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'inactive', 'invited'));

-- Rozšír role enum (4 hodnoty)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'strategicka_rada', 'hr', 'member'));

-- Migrácia existujúcich používateľov
-- is_active = true → status = 'active'
-- is_active = false → status = 'inactive'
UPDATE users SET status = CASE
  WHEN is_active = true THEN 'active'
  ELSE 'inactive'
END WHERE status IS NULL;

-- =============================================================================
-- 2. ROZŠÍRENIE TABUĽKY AREAS (is_global flag)
-- =============================================================================

ALTER TABLE areas ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Označ existujúce fixné oddelenia ako globálne
UPDATE areas SET is_global = true
WHERE name IN ('Prevádzka', 'Rámy', 'Financie', 'Marketing', 'New Biz', 'Inovácie', 'Facility', 'HR');

-- =============================================================================
-- 3. VYTVORENIE TABUĽKY DEPARTMENT_MEMBERS
-- (Nová tabuľka pre členstvo v oddeleniach - oddelená od area_members)
-- =============================================================================

CREATE TABLE IF NOT EXISTS department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, department_id)
);

-- RLS politiky pre department_members
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;

-- Všetci prihlásení používatelia môžu vidieť členstvo
DROP POLICY IF EXISTS "Users can view department memberships" ON department_members;
CREATE POLICY "Users can view department memberships"
  ON department_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Len admin môže spravovať členstvo
DROP POLICY IF EXISTS "Admins can insert department memberships" ON department_members;
CREATE POLICY "Admins can insert department memberships"
  ON department_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update department memberships" ON department_members;
CREATE POLICY "Admins can update department memberships"
  ON department_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete department memberships" ON department_members;
CREATE POLICY "Admins can delete department memberships"
  ON department_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexy pre rýchle vyhľadávanie
CREATE INDEX IF NOT EXISTS idx_department_members_user
  ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_department_members_department
  ON department_members(department_id);

-- =============================================================================
-- 4. ROZŠÍRENIE TABUĽKY INVITATIONS
-- =============================================================================

ALTER TABLE invitations ADD COLUMN IF NOT EXISTS departments JSONB DEFAULT '[]';
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Token už existuje, len overíme UNIQUE constraint
-- ALTER TABLE invitations ADD COLUMN IF NOT EXISTS token TEXT UNIQUE;

-- Rozšír role v invitations
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE invitations ADD CONSTRAINT invitations_role_check
  CHECK (role IN ('admin', 'strategicka_rada', 'hr', 'member'));

-- =============================================================================
-- 5. HELPER FUNKCIA PRE ZÍSKANIE ROLE POUŽÍVATEĽA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- =============================================================================
-- 6. HELPER FUNKCIA PRE KONTROLU ČI USER VIDÍ VŠETKY ODDELENIA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_see_all_departments()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'strategicka_rada', 'hr')
  )
$$;

-- =============================================================================
-- 7. AKTUALIZÁCIA RLS POLITÍK PRE AREAS (oddelenia)
-- =============================================================================

-- Používatelia vidia oddelenia kde sú členmi ALEBO ak majú full access role
DROP POLICY IF EXISTS "Users can view areas" ON areas;
CREATE POLICY "Users can view areas"
  ON areas FOR SELECT
  USING (
    -- Globálne oddelenia vidí každý prihlásený
    (is_global = true AND auth.uid() IS NOT NULL)
    OR
    -- Full access roles vidia všetko
    public.can_see_all_departments()
    OR
    -- Členovia vidia svoje oddelenia
    EXISTS (
      SELECT 1 FROM department_members
      WHERE department_members.department_id = areas.id
      AND department_members.user_id = auth.uid()
    )
    OR
    -- Owner vidí svoje
    owner_id = auth.uid()
  );

-- =============================================================================
-- 8. INDEXY PRE OPTIMALIZÁCIU
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_areas_is_global ON areas(is_global);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- =============================================================================
-- 9. TRIGGER PRE AUTOMATICKÚ AKTUALIZÁCIU updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_department_members_updated_at ON department_members;
CREATE TRIGGER update_department_members_updated_at
  BEFORE UPDATE ON department_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- KONIEC MIGRÁCIE
-- =============================================================================
