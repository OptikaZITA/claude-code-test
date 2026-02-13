-- FIX: Oprava taskov s organization_id = NULL
-- Tento skript opraví tasky, ktoré boli vytvorené bez organization_id
-- Spusti v Supabase SQL Editor

-- 1. Najprv zobraziť koľko taskov má problém
SELECT
  COUNT(*) as tasks_with_null_org,
  (SELECT COUNT(*) FROM tasks WHERE organization_id IS NOT NULL) as tasks_with_org
FROM tasks
WHERE organization_id IS NULL;

-- 2. Ukázať konkrétne tasky s NULL organization_id
SELECT
  t.id,
  t.title,
  t.organization_id,
  t.created_by,
  u.full_name as creator_name,
  u.organization_id as creator_org
FROM tasks t
LEFT JOIN users u ON t.created_by = u.id
WHERE t.organization_id IS NULL
ORDER BY t.created_at DESC
LIMIT 20;

-- 3. OPRAVA: Nastaviť organization_id podľa vytvoriteľa tasku
-- Toto aktualizuje všetky tasky kde organization_id je NULL
-- na organization_id používateľa, ktorý task vytvoril

UPDATE tasks t
SET organization_id = u.organization_id
FROM users u
WHERE t.created_by = u.id
  AND t.organization_id IS NULL
  AND u.organization_id IS NOT NULL;

-- 4. Potvrdiť opravu
SELECT
  COUNT(*) as tasks_still_with_null_org
FROM tasks
WHERE organization_id IS NULL;

-- Ak sú ešte nejaké tasky s NULL org, môžu to byť tasky:
-- - vytvorené systémom (bez created_by)
-- - vytvorené používateľom bez organizácie
-- Tieto treba riešiť ručne podľa situácie
