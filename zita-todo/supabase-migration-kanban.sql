-- KANBAN MIGRATION: Konsolidácia status a kanban_column
-- Verzia: 1.0
-- Dátum: 4. januára 2026

-- ============================================
-- FÁZA 1: Migrácia status hodnôt
-- ============================================

-- Rozšír status o nové hodnoty (backlog, in_progress, review)
-- Najprv zmeň existujúce hodnoty
UPDATE tasks SET status = 'todo' WHERE status = 'open';
UPDATE tasks SET status = 'done' WHERE status = 'completed';

-- ============================================
-- FÁZA 2: Preveď kanban_column do status
-- ============================================

-- Ak task má kanban_column nastavený, použi ho pre status
-- (len ak status ešte nie je nastavený na hodnotu z kanban)
UPDATE tasks
SET status = kanban_column
WHERE kanban_column IS NOT NULL
  AND kanban_column IN ('backlog', 'in_progress', 'review')
  AND status = 'todo';

-- ============================================
-- FÁZA 3: Odstráň kanban_column stĺpec
-- ============================================

ALTER TABLE tasks DROP COLUMN IF EXISTS kanban_column;

-- ============================================
-- FÁZA 4: Aktualizuj constraint pre status
-- ============================================

-- Odstráň starý constraint ak existuje
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Pridaj nový constraint s rozšírenými hodnotami
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done', 'canceled'));

-- ============================================
-- FÁZA 5: Index pre lepšiu performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status_project ON tasks(project_id, status);

-- ============================================
-- POZNÁMKA: Spusti túto migráciu v Supabase SQL Editor
-- alebo cez MCP: mcp__supabase__apply_migration
-- ============================================
