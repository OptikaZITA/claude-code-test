# ZITA TODO - Kompletná dokumentácia (MERGED)

## Prehľad projektu

ZITA TODO je tímová produktivita aplikácia inšpirovaná Things 3 s Kanban zobrazením, sledovaním času a Toggl-style time trackingom. Určená pre ~20 členný tím s podporou osobnej aj tímovej produktivity.

**Dátum vytvorenia**: 2. januára 2026
**Posledná aktualizácia**: 4. januára 2026
**Verzia špecifikácie**: 2.1 (all features implemented)

---

## Technológie

- **Frontend**: Next.js 16+ (App Router), TypeScript, Tailwind CSS
- **UI komponenty**: shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Real-time subscriptions)
- **Drag & Drop**: @dnd-kit
- **Dátumy**: date-fns (slovenský locale)
- **Ikony**: lucide-react
- **Deployment**: Vercel
- **PWA**: Service Worker, Web Push API

---

## Dátový model (Supabase Tables)

### Existujúce tabuľky (z ZITA TODO)

#### ORGANIZATIONS
```sql
id (uuid PK)
name (text NOT NULL)
slug (text UNIQUE)
created_at (timestamptz)
updated_at (timestamptz)
```

#### USERS
```sql
id (uuid PK, FK → auth.users)
email (text NOT NULL)
full_name (text)
avatar_url (text)
organization_id (uuid FK → organizations, nullable)
role (text: 'admin' | 'member')
created_at (timestamptz)
updated_at (timestamptz)
```

#### AREAS
```sql
id (uuid PK)
user_id (uuid FK → users)
organization_id (uuid FK → organizations, nullable)
title (text NOT NULL)
notes (text)
icon (text)
color (text)
sort_order (integer DEFAULT 0)
created_at (timestamptz)
updated_at (timestamptz)
```

#### PROJECTS
```sql
id (uuid PK)
user_id (uuid FK → users)
organization_id (uuid FK → organizations, nullable)
area_id (uuid FK → areas, nullable)
title (text NOT NULL)
notes (text)
status (text: 'active' | 'someday' | 'completed' | 'canceled' DEFAULT 'active')
start_type (text: 'anytime' | 'someday' | 'on_date' DEFAULT 'anytime')  -- NOVÉ
start_date (date, nullable)  -- NOVÉ
deadline (date, nullable)
sort_order (integer DEFAULT 0)
created_at (timestamptz)
updated_at (timestamptz)
completed_at (timestamptz, nullable)
```

#### HEADINGS ⭐ NOVÁ TABUĽKA
```sql
id (uuid PK)
user_id (uuid FK → users)
project_id (uuid FK → projects NOT NULL)
title (text NOT NULL)
sort_order (integer DEFAULT 0)
created_at (timestamptz)
updated_at (timestamptz)
```

#### TASKS (rozšírené)
```sql
id (uuid PK)
user_id (uuid FK → users)
organization_id (uuid FK → organizations, nullable)
project_id (uuid FK → projects, nullable)
area_id (uuid FK → areas, nullable)
heading_id (uuid FK → headings, nullable)  -- NOVÉ

-- Pôvodné polia
title (text NOT NULL)
notes (text)
status (text: 'open' | 'completed' | 'canceled' DEFAULT 'open')
priority (text: 'low' | 'medium' | 'high' | 'urgent')
due_date (date, nullable)

-- Things 3 štýl - NOVÉ
when_type (text: 'inbox' | 'today' | 'anytime' | 'someday' | 'scheduled' DEFAULT 'inbox')
when_date (date, nullable)  -- Pre scheduled úlohy
deadline (date, nullable)   -- Tvrdý deadline (iné ako due_date)
is_inbox (boolean DEFAULT true)

-- Kanban - ROZŠÍRENÉ
kanban_column (text: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done', nullable)

-- Tímové funkcie (existujúce)
inbox_type (text: 'personal' | 'team' DEFAULT 'personal')
inbox_user_id (uuid FK → users, nullable)
created_by (uuid FK → users)
assignee_id (uuid FK → users, nullable)

-- Checklist a metadáta
checklist_items (jsonb DEFAULT '[]')
recurrence_rule (jsonb, nullable)

created_at (timestamptz)
updated_at (timestamptz)
completed_at (timestamptz, nullable)
```

#### TIME_ENTRIES
```sql
id (uuid PK)
user_id (uuid FK → users NOT NULL)
todo_id (uuid FK → tasks NOT NULL)
project_id (uuid FK → projects, nullable)  -- Denormalizované pre rýchle query
area_id (uuid FK → areas, nullable)        -- Denormalizované pre rýchle query
organization_id (uuid FK → organizations, nullable)

description (text, nullable)
started_at (timestamptz NOT NULL)
stopped_at (timestamptz, nullable)
duration_seconds (bigint, nullable)  -- Computed pri STOP
is_running (boolean DEFAULT false)

created_at (timestamptz)
updated_at (timestamptz)

-- CONSTRAINT: MAX 1 is_running=TRUE per user_id
CONSTRAINT one_running_timer_per_user UNIQUE (user_id) WHERE is_running = true
```

#### TAGS
```sql
id (uuid PK)
user_id (uuid FK → users)
organization_id (uuid FK → organizations, nullable)
title (text NOT NULL)
color (text)
created_at (timestamptz)
updated_at (timestamptz)
```

#### ITEM_TAGS (polymorfné - ROZŠÍRENÉ)
```sql
id (uuid PK)
tag_id (uuid FK → tags NOT NULL)
item_type (text: 'area' | 'project' | 'task' | 'heading' NOT NULL)
item_id (uuid NOT NULL)

UNIQUE(tag_id, item_type, item_id)
```

#### INVITATIONS (existujúce)
```sql
id (uuid PK)
organization_id (uuid FK → organizations)
email (text NOT NULL)
role (text: 'admin' | 'member')
invited_by (uuid FK → users)
accepted_at (timestamptz, nullable)
expires_at (timestamptz)
created_at (timestamptz)
```

#### AREA_MEMBERS (existujúce)
```sql
area_id (uuid FK → areas)
user_id (uuid FK → users)
role (text: 'owner' | 'editor' | 'viewer')
PRIMARY KEY (area_id, user_id)
```

#### PROJECT_MEMBERS (existujúce)
```sql
project_id (uuid FK → projects)
user_id (uuid FK → users)
role (text: 'owner' | 'editor' | 'viewer')
PRIMARY KEY (project_id, user_id)
```

#### USER_INTEGRATIONS (existujúce)
```sql
id (uuid PK)
user_id (uuid FK → users)
type (text: 'slack' | 'email')
config (jsonb)
enabled (boolean DEFAULT true)
created_at (timestamptz)
updated_at (timestamptz)
```

### RLS Politiky

Všetky tabuľky používajú Row Level Security. Kľúčová helper funkcia:

```sql
-- SECURITY DEFINER funkcia - obchádza RLS, zabraňuje rekurzii
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$;
```

**Pravidlo pre všetky politiky:**
- User vidí svoje záznamy (`user_id = auth.uid()`)
- User vidí záznamy svojej organizácie (`organization_id = get_my_organization_id()`)
- Špeciálne pravidlá pre tímový inbox a assignees

---

## API Endpoints

### CRUD Endpoints

```
POST   /api/areas                    → Create area
GET    /api/areas                    → List areas
PUT    /api/areas/:id                → Update area
DELETE /api/areas/:id                → Delete area

POST   /api/projects                 → Create project
GET    /api/projects                 → List projects
PUT    /api/projects/:id             → Update project
DELETE /api/projects/:id             → Delete project

POST   /api/headings                 → Create heading (NOVÉ)
PUT    /api/headings/:id             → Update heading (NOVÉ)
DELETE /api/headings/:id             → Delete heading (NOVÉ)

POST   /api/tasks                    → Create task
GET    /api/tasks                    → List tasks (s filtrami)
PUT    /api/tasks/:id                → Update task
DELETE /api/tasks/:id                → Delete task

POST   /api/tags                     → Create tag
GET    /api/tags                     → List tags
PUT    /api/tags/:id                 → Update tag
DELETE /api/tags/:id                 → Delete tag
```

### Task Filtering Query Params
```
GET /api/tasks?
  area_id=uuid&
  project_id=uuid&
  heading_id=uuid&
  tag_id=uuid&
  when_type=today|anytime|someday|scheduled|inbox&
  status=open|completed|canceled&
  assignee_id=uuid&
  inbox_type=personal|team&
  kanban_column=backlog|todo|in_progress|review|done
```

### Time Tracking Endpoints

```
POST /api/time/start
  Body: { todo_id: uuid, description?: string }
  → Zastaví existujúci bežiaci timer
  → Vytvorí nový time_entry s is_running=true
  → Returns: { time_entry_id: uuid, started_at: timestamp }

POST /api/time/stop
  Body: { time_entry_id: uuid }
  → Nastaví stopped_at = NOW()
  → Vypočíta duration_seconds
  → Nastaví is_running = false
  → Returns: { duration_seconds: number }

GET /api/time/current
  → Returns aktuálny bežiaci timer pre usera (alebo null)

GET /api/time/totals?todo_id=&project_id=&area_id=&period=day|week|month
  → Returns: { total_seconds: number, entries: TimeEntry[] }

GET /api/time/entries?todo_id=&project_id=&from=&to=
  → Returns: TimeEntry[]
```

### Kanban Endpoint

```
PUT /api/tasks/:id/kanban
  Body: { column: "in_progress", sort_order?: number }
  → Updates kanban_column a sort_order
```

---

## Views / UX Flows

### Sidebar (permanent left)

```
📥 Inbox (personal)
👥 Team Inbox
─────────────
📅 Today        ← when_type = 'today' OR (scheduled + when_date = today)
🔮 Upcoming     ← when_type = 'scheduled' + budúce deadlines (NOVÉ)
⏳ Anytime      ← when_type = 'anytime' AND status = 'open' (NOVÉ)
💭 Someday      ← when_type = 'someday' (NOVÉ)
📚 Logbook      ← status = 'completed' ORDER BY completed_at DESC (NOVÉ)
📆 Calendar
─────────────
📁 Areas
  └─ 💼 Práca
      └─ Projekt A
      └─ Projekt B
  └─ 🏃 Zdravie
─────────────
⚙️ Settings
```

### Main Content Views

| View | URL | Filter/Query |
|------|-----|--------------|
| **Inbox (osobný)** | `/inbox` | `inbox_type='personal' AND inbox_user_id=me AND is_inbox=true` |
| **Team Inbox** | `/inbox/team` | `inbox_type='team' AND organization_id=my_org` |
| **Today** | `/today` | `when_type='today' OR (when_type='scheduled' AND when_date=today) OR overdue` |
| **Upcoming** | `/upcoming` | `when_type='scheduled' AND when_date > today` + budúce deadlines |
| **Anytime** | `/anytime` | `when_type='anytime' AND status='open'` |
| **Someday** | `/someday` | `when_type='someday' AND status='open'` |
| **Logbook** | `/logbook` | `status='completed' ORDER BY completed_at DESC` |
| **Calendar** | `/calendar` | Všetky úlohy s dátumom (mesačný pohľad) |
| **Area Detail** | `/areas/[id]` | Projekty + voľné úlohy v danej oblasti |
| **Project List** | `/projects/[id]` | Úlohy + headings v projekte (list view) |
| **Project Kanban** | `/projects/[id]/kanban` | Úlohy v projekte (kanban view) |

### View Toggle

V headeri projektov: `[📋 List ↔ 🗂️ Kanban]` button

### Kanban Board (per Project/Area)

**Stĺpce:**
```
| Backlog | Todo | In Progress | Review | Done |
```

**Karta zobrazuje:**
- Priorita badge (farba)
- Title
- ⏰ Tracked time (napr. "2h 23m")
- 📅 Due date / deadline
- 🏷️ Tags
- 👤 Assignee avatar

**Funkcie:**
- Drag & drop medzi stĺpcami → updates `kanban_column`
- Realtime sync cez Supabase subscriptions
- Klik na kartu → otvára Task Detail panel

### Task Detail Panel (slide-over right)

```
┌─────────────────────────────────────┐
│ ☐ Task title                    [×] │
├─────────────────────────────────────┤
│ 📝 Notes (markdown editor)          │
│                                     │
├─────────────────────────────────────┤
│ 📁 Project: [Dropdown]              │
│ 📑 Heading: [Dropdown]     (NOVÉ)   │
│ 🏷️ Tags: [chip] [chip] [+]          │
├─────────────────────────────────────┤
│ 📅 When: [Today ▼]         (NOVÉ)   │
│    ├─ Inbox                         │
│    ├─ Today                         │
│    ├─ Anytime                       │
│    ├─ Someday                       │
│    └─ Scheduled → [Date picker]     │
│                                     │
│ 🎯 Deadline: [Date picker]          │
│ 🔄 Repeat: [Recurrence config]      │
├─────────────────────────────────────┤
│ 👤 Assignee: [User dropdown]        │
│ 🚦 Priority: [Low|Med|High|Urgent]  │
│ 🗂️ Kanban: [Column dropdown]        │
├─────────────────────────────────────┤
│ ✅ Checklist                        │
│    ☐ Subtask 1                      │
│    ☑ Subtask 2                      │
│    [+ Add item]                     │
├─────────────────────────────────────┤
│ ⏱️ TIME TRACKER                     │
│ ┌─────────────────────────────────┐ │
│ │ [▶️ Start Timer]  alebo         │ │
│ │ [⏹️ Stop 00:12:34] (ak beží)    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Total: 2h 23m                       │
│ ─────────────────                   │
│ Today:     45m                      │
│ Yesterday: 1h 38m                   │
│                                     │
│ Recent entries:                     │
│ • 1h 30m (10:00 - 11:30)           │
│ • 45m (09:00 - 09:45)              │
└─────────────────────────────────────┘
```

### Filters (aplikuje sa na List aj Kanban)

```
[Area ▼] [Project ▼] [Tags ▼] [Status ▼] [When ▼] [Assignee ▼] [Priority ▼]
```

Filtre sa ukladajú do URL query params pre zdieľateľnosť.

---

## Time Tracking Logic (Toggl-style)

### Pravidlá

1. **MAX 1 aktívny timer na používateľa** (globálne, nie per-task)
2. Timer sa viaže na konkrétnu úlohu (todo_id)
3. Všetky časy sa ukladajú v UTC

### Start Timer Flow

```typescript
async function startTimer(todoId: string, description?: string) {
  // 1. Zastav existujúci bežiaci timer
  const running = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('is_running', true)
    .single();
  
  if (running) {
    await stopTimer(running.id);
  }
  
  // 2. Získaj project_id a area_id z úlohy (pre denormalizáciu)
  const task = await supabase
    .from('tasks')
    .select('project_id, area_id')
    .eq('id', todoId)
    .single();
  
  // 3. Vytvor nový time_entry
  const entry = await supabase
    .from('time_entries')
    .insert({
      user_id: userId,
      todo_id: todoId,
      project_id: task.project_id,
      area_id: task.area_id,
      description,
      started_at: new Date().toISOString(),
      is_running: true
    })
    .select()
    .single();
  
  return entry;
}
```

### Stop Timer Flow

```typescript
async function stopTimer(timeEntryId: string) {
  const stoppedAt = new Date();
  
  // 1. Získaj started_at
  const entry = await supabase
    .from('time_entries')
    .select('started_at')
    .eq('id', timeEntryId)
    .single();
  
  // 2. Vypočítaj duration
  const startedAt = new Date(entry.started_at);
  const durationSeconds = Math.floor((stoppedAt - startedAt) / 1000);
  
  // 3. Update entry
  await supabase
    .from('time_entries')
    .update({
      stopped_at: stoppedAt.toISOString(),
      duration_seconds: durationSeconds,
      is_running: false
    })
    .eq('id', timeEntryId);
  
  return { durationSeconds };
}
```

### Totals Computation

```sql
-- Total pre úlohu
SELECT SUM(duration_seconds) as total_seconds
FROM time_entries
WHERE todo_id = $1 AND user_id = $2;

-- Total pre projekt
SELECT SUM(duration_seconds) as total_seconds
FROM time_entries
WHERE project_id = $1;

-- Total pre obdobie
SELECT SUM(duration_seconds) as total_seconds
FROM time_entries
WHERE user_id = $1
  AND started_at >= $2  -- period start
  AND started_at < $3;  -- period end
```

### UI Komponenty

```
components/time-tracking/
├── timer.tsx              # Start/Stop button + live countdown
├── time-entries-list.tsx  # História záznamov
├── time-summary.tsx       # Súhrn (today, week, total)
└── timer-indicator.tsx    # Globálny indikátor v headeri (ak beží timer)
```

### Keyboard Shortcut

`Cmd/Ctrl + T` = Toggle timer na aktuálne vybranej úlohe

---

## Štruktúra projektu

```
zita-todo/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── auth/callback/route.ts
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── inbox/
│   │   │   ├── page.tsx              # Osobný inbox
│   │   │   └── team/page.tsx         # Tímový inbox
│   │   ├── today/page.tsx            # NOVÉ
│   │   ├── upcoming/page.tsx         # NOVÉ
│   │   ├── anytime/page.tsx          # NOVÉ
│   │   ├── someday/page.tsx          # NOVÉ
│   │   ├── logbook/page.tsx          # NOVÉ
│   │   ├── calendar/page.tsx
│   │   ├── areas/
│   │   │   └── [areaId]/page.tsx     # NOVÉ
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [projectId]/
│   │   │       ├── page.tsx
│   │   │       └── kanban/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── areas/route.ts
│   │   ├── projects/route.ts
│   │   ├── headings/route.ts         # NOVÉ
│   │   ├── tasks/route.ts
│   │   ├── tags/route.ts
│   │   └── time/
│   │       ├── start/route.ts
│   │       ├── stop/route.ts
│   │       ├── current/route.ts
│   │       └── totals/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── calendar/
│   │   ├── calendar-view.tsx
│   │   └── calendar-day.tsx
│   ├── export/
│   │   └── export-menu.tsx
│   ├── headings/                      # NOVÉ
│   │   ├── heading-item.tsx
│   │   └── heading-form.tsx
│   ├── integrations/
│   │   ├── integration-settings.tsx
│   │   ├── slack-settings.tsx
│   │   └── email-settings.tsx
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── mobile-nav.tsx
│   │   ├── connection-status.tsx
│   │   ├── offline-indicator.tsx
│   │   └── error-display.tsx
│   ├── notifications/
│   │   └── notification-settings.tsx
│   ├── organization/
│   │   └── organization-setup.tsx
│   ├── projects/
│   │   ├── project-card.tsx
│   │   ├── project-form.tsx
│   │   └── project-list.tsx
│   ├── tasks/
│   │   ├── task-list.tsx
│   │   ├── task-item.tsx
│   │   ├── task-quick-add.tsx
│   │   ├── task-detail.tsx
│   │   ├── task-filters.tsx
│   │   ├── when-picker.tsx           # NOVÉ - Today/Anytime/Someday/Scheduled
│   │   ├── recurrence-config.tsx
│   │   ├── kanban-board.tsx
│   │   ├── kanban-column.tsx
│   │   └── kanban-card.tsx
│   ├── time-tracking/
│   │   ├── timer.tsx
│   │   ├── timer-indicator.tsx       # NOVÉ - globálny indikátor v headeri
│   │   ├── time-entries-list.tsx
│   │   └── time-summary.tsx          # NOVÉ
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── textarea.tsx
│       ├── modal.tsx
│       ├── checkbox.tsx
│       ├── badge.tsx
│       ├── dropdown.tsx
│       ├── avatar.tsx
│       ├── toast.tsx
│       ├── toast-container.tsx
│       ├── theme-toggle.tsx
│       └── keyboard-shortcuts-modal.tsx
├── lib/
│   ├── contexts/
│   │   ├── toast-context.tsx
│   │   └── theme-context.tsx
│   ├── hooks/
│   │   ├── use-tasks.ts              # + useTodayTasks, useUpcomingTasks, useAnytimeTasks, useSomedayTasks, useLogbookTasks
│   │   ├── use-projects.ts
│   │   ├── use-areas.ts              # NOVÉ - useArea, useAreaProjects, useAreaTasks, useAreas
│   │   ├── use-headings.ts           # NOVÉ
│   │   ├── use-time-tracking.ts      # + useGlobalTimer, useTimeTotals
│   │   ├── use-organization.ts
│   │   ├── use-task-filters.ts
│   │   ├── use-realtime.ts
│   │   ├── use-realtime-tasks.ts
│   │   ├── use-toast.ts
│   │   ├── use-debounce.ts
│   │   ├── use-keyboard-shortcuts.ts # Rozšírené o Things 3 navigáciu
│   │   ├── use-service-worker.ts
│   │   ├── use-push-notifications.ts
│   │   └── use-integrations.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   └── utils/
│       ├── cn.ts
│       ├── date.ts
│       ├── recurrence.ts
│       └── export.ts
├── public/
│   ├── sw.js
│   ├── manifest.json
│   └── icons/
├── types/
│   └── index.ts
├── supabase-schema.sql
├── supabase-rls-fix.sql
└── supabase-migration-v2.sql         # NOVÉ - migrácia pre nové polia
```

---

## Implementované funkcie

### ✅ MVP funkcie (z ZITA TODO)

- [x] Autentifikácia (login, signup, logout)
- [x] Osobný a tímový inbox
- [x] Projekty so zoznamom a kanban zobrazením
- [x] Drag & drop pre úlohy
- [x] Sledovanie času
- [x] RLS politiky pre produkciu
- [x] Organizácie a pozvánky
- [x] Projekty CRUD
- [x] Filtrovanie úloh
- [x] Real-time updates
- [x] Toast notifikácie
- [x] Mobilná optimalizácia

### ✅ Rozšírené funkcie (z ZITA TODO)

- [x] Dark mode
- [x] Keyboard shortcuts
- [x] Offline podpora (Service Worker)
- [x] Recurring tasks
- [x] Kalendárové zobrazenie
- [x] Export dát (CSV, PDF)
- [x] Push notifikácie
- [x] Integrácie (Slack, Email)

### ✅ Nové funkcie (z Things 3 špecifikácie) - VŠETKY IMPLEMENTOVANÉ

- [x] **Headings** - sekcie v rámci projektov (`components/headings/`, `lib/hooks/use-headings.ts`)
- [x] **When picker** - Today/Anytime/Someday/Scheduled workflow (`components/tasks/when-picker.tsx`)
- [x] **Today view** - dnešné úlohy + overdue (`app/(dashboard)/today/page.tsx`)
- [x] **Upcoming view** - naplánované úlohy s kalendárom (`app/(dashboard)/upcoming/page.tsx`)
- [x] **Anytime view** - úlohy "kedykoľvek" (`app/(dashboard)/anytime/page.tsx`)
- [x] **Someday view** - úlohy "niekedy" (`app/(dashboard)/someday/page.tsx`)
- [x] **Logbook view** - dokončené úlohy (`app/(dashboard)/logbook/page.tsx`)
- [x] **Area detail view** - projekty a úlohy v oblasti (`app/(dashboard)/areas/[areaId]/page.tsx`)
- [x] **Definované Kanban stĺpce** - Backlog/Todo/In Progress/Review/Done
- [x] **Vylepšený Time Tracking** - totals per project/area, globálny indikátor (`components/time-tracking/timer-indicator.tsx`)

---

## Migračný SQL skript

```sql
-- supabase-migration-v2.sql
-- Migrácia pre Things 3 funkcie

-- 1. Pridať HEADINGS tabuľku
CREATE TABLE IF NOT EXISTS headings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS pre headings
ALTER TABLE headings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own headings" ON headings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own headings" ON headings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own headings" ON headings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own headings" ON headings
  FOR DELETE USING (user_id = auth.uid());

-- 2. Rozšíriť TASKS tabuľku
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS heading_id uuid REFERENCES headings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS when_type text DEFAULT 'inbox' 
    CHECK (when_type IN ('inbox', 'today', 'anytime', 'someday', 'scheduled')),
  ADD COLUMN IF NOT EXISTS when_date date,
  ADD COLUMN IF NOT EXISTS is_inbox boolean DEFAULT true;

-- Update kanban_column s novými hodnotami
ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_kanban_column_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_kanban_column_check 
  CHECK (kanban_column IN ('backlog', 'todo', 'in_progress', 'review', 'done'));

-- 3. Rozšíriť PROJECTS tabuľku
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS start_type text DEFAULT 'anytime'
    CHECK (start_type IN ('anytime', 'someday', 'on_date')),
  ADD COLUMN IF NOT EXISTS start_date date;

-- 4. Rozšíriť ITEM_TAGS pre polymorfné tagovanie
-- Najprv premenovať task_tags ak existuje
ALTER TABLE IF EXISTS task_tags RENAME TO item_tags;

-- Alebo vytvoriť novú
CREATE TABLE IF NOT EXISTS item_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('area', 'project', 'task', 'heading')),
  item_id uuid NOT NULL,
  UNIQUE(tag_id, item_type, item_id)
);

ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage item_tags" ON item_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tags WHERE tags.id = item_tags.tag_id AND tags.user_id = auth.uid()
    )
  );

-- 5. Indexy pre performance
CREATE INDEX IF NOT EXISTS idx_tasks_when_type ON tasks(when_type);
CREATE INDEX IF NOT EXISTS idx_tasks_when_date ON tasks(when_date);
CREATE INDEX IF NOT EXISTS idx_tasks_heading_id ON tasks(heading_id);
CREATE INDEX IF NOT EXISTS idx_headings_project_id ON headings(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_todo_id ON time_entries(todo_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);

-- 6. Migrovať existujúce úlohy do nového when_type
UPDATE tasks SET when_type = 'inbox', is_inbox = true WHERE project_id IS NULL AND area_id IS NULL;
UPDATE tasks SET when_type = 'anytime', is_inbox = false WHERE project_id IS NOT NULL;
```

---

## Keyboard Shortcuts

### Navigácia
| Skratka | Akcia |
|---------|-------|
| `I` | Inbox |
| `Y` | Dnes (Today) |
| `U` | Nadchádzajúce (Upcoming) |
| `A` | Kedykoľvek (Anytime) |
| `S` | Niekedy (Someday) |
| `L` | Logbook |
| `C` | Kalendár |
| `T` | Tímový Inbox |

### Akcie
| Skratka | Akcia |
|---------|-------|
| `N` | Nová úloha |
| `/` | Vyhľadávanie |
| `D` | Prepnúť dark mode |
| `⌘T` | Prepnúť časovač |

### Ostatné
| Skratka | Akcia |
|---------|-------|
| `Shift + ?` | Zobraziť skratky |
| `Escape` | Zavrieť modal |

---

## Design systém

### Farby (CSS Variables)

**Light Mode:**
```css
--bg-primary: #ffffff;
--bg-secondary: #f5f5f7;
--text-primary: #1D1D1F;
--text-secondary: #86868B;
--color-primary: #007AFF;
--color-success: #34C759;
--color-warning: #FF9500;
--color-error: #FF3B30;
```

**Dark Mode:**
```css
--bg-primary: #0a0a0a;
--bg-secondary: #1c1c1e;
--text-primary: #ededed;
--text-secondary: #a1a1a6;
--color-primary: #0A84FF;
--color-success: #30D158;
--color-warning: #FF9F0A;
--color-error: #FF453A;
```

### Kanban Column Colors

```css
--kanban-backlog: #8E8E93;
--kanban-todo: #007AFF;
--kanban-in-progress: #FF9500;
--kanban-review: #AF52DE;
--kanban-done: #34C759;
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Pre MCP (development only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## Príkazy

```bash
# Inštalácia
npm install

# Vývoj
npm run dev

# Build
npm run build

# Lint
npm run lint

# Migrácia databázy
psql $DATABASE_URL -f supabase-migration-v2.sql
```

---

## Quality Checklist

### Pôvodné (z ZITA TODO)
- [x] Auth funguje (login/logout/session)
- [x] Organizácie a pozvánky
- [x] Osobný a tímový inbox
- [x] Projekty CRUD + Kanban
- [x] Real-time sync
- [x] Time tracking (start/stop)
- [x] Filters fungujú
- [x] Mobile responsive
- [x] Dark mode
- [x] Keyboard shortcuts
- [x] PWA / Offline
- [x] Push notifikácie
- [x] Integrácie (Slack, Email)
- [x] Export (CSV, PDF)

### Nové (z Things 3 špecifikácie) - VŠETKY DOKONČENÉ ✅
- [x] Headings v projektoch
- [x] When picker (Today/Anytime/Someday/Scheduled)
- [x] Views: Today, Upcoming, Anytime, Someday, Logbook
- [x] Area detail view
- [x] Definované Kanban stĺpce (5)
- [x] Time tracking totals per project/area
- [x] Globálny timer indikátor
- [x] Hierarchia: Area → Project → Heading → Todo

---

## Známe problémy a riešenia

### 1. RLS Error 500 - Infinite Recursion
**Problém:** Supabase vracala 500 error pri query na users
**Riešenie:** `SECURITY DEFINER` funkcia `get_my_organization_id()`

### 2. Falošný "Ste offline" banner
**Problém:** `navigator.onLine` je nespoľahlivé
**Riešenie:** Predpokladáme online, meníme len na `offline` event

### 3. TypeScript Uint8Array error
**Problém:** VAPID key conversion
**Riešenie:** Return type `ArrayBuffer`

---

## Changelog

### v2.1 (4. januára 2026)
**Všetky Things 3 funkcie implementované:**
- ✅ Headings v projektoch s drag & drop
- ✅ When picker komponent (Today/Anytime/Someday/Scheduled)
- ✅ Today view s overdue sekciou
- ✅ Upcoming view so zoskupením podľa dátumu
- ✅ Anytime view pre úlohy bez termínu
- ✅ Someday view pre nápady na neskôr
- ✅ Logbook view s groupovaním podľa obdobia (Dnes, Včera, Tento týždeň, atď.)
- ✅ Area detail view s projektmi a voľnými úlohami
- ✅ Kanban s 5 stĺpcami (Backlog, Todo, In Progress, Review, Done)
- ✅ Globálny timer indikátor v headeri
- ✅ useGlobalTimer a useTimeTotals hooks
- ✅ Rozšírené keyboard shortcuts s kategóriami
- ✅ Mobilná navigácia s novými views

**Nové súbory:**
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/upcoming/page.tsx`
- `app/(dashboard)/anytime/page.tsx`
- `app/(dashboard)/someday/page.tsx`
- `app/(dashboard)/logbook/page.tsx`
- `app/(dashboard)/areas/[areaId]/page.tsx`
- `components/tasks/when-picker.tsx`
- `components/headings/heading-item.tsx`
- `components/headings/heading-form.tsx`
- `components/time-tracking/timer-indicator.tsx`
- `lib/hooks/use-areas.ts`
- `lib/hooks/use-headings.ts`

**Upravené súbory:**
- `lib/hooks/use-tasks.ts` - pridané Things 3 hooks
- `lib/hooks/use-time-tracking.ts` - pridané useGlobalTimer, useTimeTotals
- `lib/hooks/use-keyboard-shortcuts.ts` - rozšírené skratky
- `components/layout/sidebar.tsx` - nové navigačné odkazy
- `components/layout/header.tsx` - globálny timer indikátor
- `components/layout/mobile-nav.tsx` - kompaktný timer + nové views
- `components/ui/keyboard-shortcuts-modal.tsx` - kategórie skratiek
- `lib/utils/date.ts` - formatDurationShort pre timer

---

**Verzia:** 2.1 (all features implemented)
**Posledná aktualizácia:** 4. januára 2026
