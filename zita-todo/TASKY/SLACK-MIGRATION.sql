-- =====================================================
-- ZITA TODO - Slack Integrácia
-- SQL Migrácia
-- Dátum: 13. januára 2026
-- =====================================================

-- 1. Tabuľka pre konfiguráciu Slack kanálov
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_channel_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Slack identifikácia
  slack_channel_id text NOT NULL,           -- Slack channel ID (napr. C0948ASG3KN)
  slack_channel_name text NOT NULL,         -- Názov kanála (napr. #objednavky-ramov)
  
  -- Kam ukladať tasky v ZITA
  area_id uuid REFERENCES areas(id) ON DELETE SET NULL,        -- Oddelenie
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,  -- Projekt
  
  -- Default hodnoty pre nové tasky
  default_assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  default_deadline_days integer DEFAULT 7,
  default_priority text DEFAULT 'medium' 
    CHECK (default_priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- AI parsing
  use_ai_parsing boolean DEFAULT false,
  ai_prompt_template text,                  -- Vlastný prompt pre AI (voliteľné)
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unikátny kanál per organizácia
  UNIQUE(organization_id, slack_channel_id)
);

-- Index pre rýchle vyhľadávanie podľa channel_id
CREATE INDEX IF NOT EXISTS idx_slack_channel_configs_channel_id 
  ON slack_channel_configs(slack_channel_id);

-- RLS politiky
ALTER TABLE slack_channel_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org slack configs" ON slack_channel_configs
  FOR SELECT USING (organization_id = get_my_organization_id());

CREATE POLICY "Admins can manage slack configs" ON slack_channel_configs
  FOR ALL USING (
    organization_id = get_my_organization_id() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'strategicka_rada')
    )
  );


-- 2. Tabuľka pre prepojenie Slack správ s taskami
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_task_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Prepojenie na task
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  
  -- Slack identifikácia správy
  slack_channel_id text NOT NULL,
  slack_message_ts text NOT NULL,           -- Timestamp správy (unikátny ID v Slacku)
  slack_thread_ts text,                     -- Thread timestamp (ak je v threade)
  slack_team_id text,                       -- Workspace ID
  
  -- Metadáta
  slack_user_id text,                       -- Kto poslal správu
  slack_user_name text,                     -- Meno odosielateľa
  slack_permalink text,                     -- Priamy link na správu
  original_text text,                       -- Pôvodný text správy
  
  -- Sync tracking
  last_synced_at timestamptz DEFAULT now(),
  last_zita_status text,                    -- Posledný ZITA status
  last_slack_emoji text,                    -- Posledný emoji na správe
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(task_id),                          -- 1 task = 1 Slack správa
  UNIQUE(slack_channel_id, slack_message_ts) -- 1 správa = 1 task
);

-- Indexy
CREATE INDEX IF NOT EXISTS idx_slack_task_links_task_id 
  ON slack_task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_slack_task_links_message 
  ON slack_task_links(slack_channel_id, slack_message_ts);

-- RLS politiky
ALTER TABLE slack_task_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view linked tasks they can see" ON slack_task_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = slack_task_links.task_id 
      AND (
        tasks.user_id = auth.uid() 
        OR tasks.assignee_id = auth.uid()
        OR tasks.organization_id = get_my_organization_id()
      )
    )
  );

CREATE POLICY "System can manage slack task links" ON slack_task_links
  FOR ALL USING (true);  -- API routes použijú service role


-- 3. Tabuľka pre Slack workspace pripojenie
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_workspace_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Slack OAuth dáta
  slack_team_id text NOT NULL,              -- Workspace ID
  slack_team_name text,                     -- Workspace názov
  slack_bot_token text,                     -- Bot OAuth token (encrypted in production)
  slack_bot_user_id text,                   -- Bot user ID
  
  -- Status
  is_active boolean DEFAULT true,
  connected_by uuid REFERENCES users(id),
  connected_at timestamptz DEFAULT now(),
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id),                  -- 1 org = 1 Slack workspace
  UNIQUE(slack_team_id)                     -- 1 workspace = 1 org
);

-- RLS politiky
ALTER TABLE slack_workspace_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org slack connection" ON slack_workspace_connections
  FOR SELECT USING (organization_id = get_my_organization_id());

CREATE POLICY "Admins can manage slack connection" ON slack_workspace_connections
  FOR ALL USING (
    organization_id = get_my_organization_id() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'strategicka_rada')
    )
  );


-- 4. Rozšírenie tabuľky TASKS
-- =====================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
    CHECK (source IN ('manual', 'slack', 'email', 'api')),
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb DEFAULT '{}';

-- Index pre filtrovanie podľa zdroja
CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source);


-- 5. Tabuľka pre notifikačné logy (debugging)
-- =====================================================

CREATE TABLE IF NOT EXISTS slack_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Čo sa posielalo
  notification_type text NOT NULL,          -- 'task_created', 'deadline_warning', 'overdue', etc.
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Kam sa posielalo
  slack_channel_id text,
  slack_user_id text,                       -- Pre DM
  
  -- Obsah
  message_text text,
  
  -- Výsledok
  success boolean DEFAULT false,
  error_message text,
  slack_response jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Index pre debugging
CREATE INDEX IF NOT EXISTS idx_slack_notification_logs_task 
  ON slack_notification_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_slack_notification_logs_created 
  ON slack_notification_logs(created_at DESC);

-- RLS - len admini vidia logy
ALTER TABLE slack_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification logs" ON slack_notification_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'strategicka_rada')
    )
  );


-- 6. Funkcia pre aktualizáciu updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_slack_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER slack_channel_configs_updated_at
  BEFORE UPDATE ON slack_channel_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_config_updated_at();

CREATE TRIGGER slack_workspace_connections_updated_at
  BEFORE UPDATE ON slack_workspace_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_config_updated_at();


-- 7. Vloženie testovacích dát (voliteľné)
-- =====================================================

-- Odkomentuj ak chceš vložiť testovacie dáta:

/*
INSERT INTO slack_channel_configs (
  organization_id,
  slack_channel_id,
  slack_channel_name,
  default_deadline_days,
  default_priority,
  use_ai_parsing,
  is_active
) VALUES 
  (
    (SELECT id FROM organizations LIMIT 1),
    'C0948ASG3KN',
    '#testovaci-kanal',
    7,
    'medium',
    false,
    true
  );
*/


-- =====================================================
-- KONIEC MIGRÁCIE
-- =====================================================
