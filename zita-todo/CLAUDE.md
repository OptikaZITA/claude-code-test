# ZITA TODO - Kompletná dokumentácia (MERGED)

## Prehľad projektu

ZITA TODO je tímová produktivita aplikácia inšpirovaná Things 3 s Kanban zobrazením, sledovaním času a Toggl-style time trackingom. Určená pre ~20 členný tím s podporou osobnej aj tímovej produktivity.

**Dátum vytvorenia**: 2. januára 2026
**Posledná aktualizácia**: 12. januára 2026
**Verzia špecifikácie**: 2.37 (Global Search + My Tasks Filter Fix)

---

## Technológie

- **Frontend**: Next.js 16+ (App Router), TypeScript, Tailwind CSS
- **UI komponenty**: shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Real-time subscriptions)
- **Drag & Drop**: @dnd-kit
- **Dátumy**: date-fns (slovenský locale)
- **Kalendár**: react-day-picker (range selection)
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

#### USERS (rozšírené v2.8)
```sql
id (uuid PK, FK → auth.users)
email (text NOT NULL)
full_name (text)
nickname (text)                    -- NOVÉ v2.8: Prezývka (primárne zobrazované meno)
avatar_url (text)
organization_id (uuid FK → organizations, nullable)
role (text: 'admin' | 'strategicka_rada' | 'hr' | 'member')  -- ROZŠÍRENÉ v2.8
status (text: 'active' | 'inactive' | 'invited' DEFAULT 'active')  -- NOVÉ v2.8
position (text)                    -- NOVÉ v2.8: Pracovná pozícia
invited_by (uuid FK → users, nullable)  -- NOVÉ v2.8
invited_at (timestamptz)           -- NOVÉ v2.8
last_login_at (timestamptz)        -- NOVÉ v2.8
start_date (date)                  -- NOVÉ v2.8: Dátum nástupu
created_at (timestamptz)
updated_at (timestamptz)
```

#### AREAS (rozšírené v2.8)
```sql
id (uuid PK)
user_id (uuid FK → users)
organization_id (uuid FK → organizations, nullable)
title (text NOT NULL)
notes (text)
icon (text)
color (text)
sort_order (integer DEFAULT 0)
is_global (boolean DEFAULT false)  -- NOVÉ v2.8: Označuje či je area "oddelenie"
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

-- Workflow fázy (Kanban stĺpce) - konsolidované do status v2.7
-- status teraz obsahuje: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'canceled'

-- Tímové funkcie (existujúce)
inbox_type (text: 'personal' | 'team' DEFAULT 'personal')
inbox_user_id (uuid FK → users, nullable)
created_by (uuid FK → users)
assignee_id (uuid FK → users, nullable)

-- Checklist a metadáta
checklist_items (jsonb DEFAULT '[]')
recurrence_rule (jsonb, nullable)

-- Soft delete
deleted_at (timestamptz, nullable)  -- NOVÉ v2.4

-- Signalization
added_to_today_at (timestamptz, nullable)  -- NOVÉ v2.22: Kedy bol task pridaný do "Dnes"

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

#### INVITATIONS (rozšírené v2.8)
```sql
id (uuid PK)
organization_id (uuid FK → organizations)
email (text NOT NULL)
full_name (text)                   -- NOVÉ v2.8
nickname (text)                    -- NOVÉ v2.8
position (text)                    -- NOVÉ v2.8
role (text: 'admin' | 'strategicka_rada' | 'hr' | 'member')  -- ROZŠÍRENÉ v2.8
departments (jsonb)                -- NOVÉ v2.8: Array of department IDs
invited_by (uuid FK → users)
accepted_at (timestamptz, nullable)
expires_at (timestamptz)
created_at (timestamptz)
```

#### DEPARTMENT_MEMBERS ⭐ NOVÁ TABUĽKA v2.8
```sql
id (uuid PK)
user_id (uuid FK → users NOT NULL)
department_id (uuid FK → areas NOT NULL)  -- areas kde is_global = true
role (text: 'owner' | 'member' DEFAULT 'member')
created_at (timestamptz DEFAULT now())
UNIQUE(user_id, department_id)
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

#### USER_SETTINGS ⭐ NOVÁ TABUĽKA v2.22
```sql
id (uuid PK)
user_id (uuid FK → users NOT NULL, UNIQUE)
last_acknowledged (timestamptz, nullable)  -- Kedy naposledy používateľ klikol "OK" na žlté bodky
created_at (timestamptz DEFAULT now())
updated_at (timestamptz DEFAULT now())
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
  status=backlog|todo|in_progress|review|done|canceled&
  assignee_id=uuid&
  inbox_type=personal|team
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
  Body: { status: "in_progress", sort_order?: number }
  → Updates status a sort_order (v2.7+ používa status namiesto kanban_column)
```

---

## Views / UX Flows

### Sidebar (permanent left)

```
📥 Inbox (personal)     [počet]     ← badge s počtom úloh
👥 Team Inbox           [počet]     ← badge s počtom úloh
─────────────
📅 Today        [🔴3]               ← červená badge ak deadline=today, inak sivá
🔮 Upcoming     [počet]             ← when_type = 'scheduled' + budúce deadlines
⏳ Anytime      [počet]             ← when_type = 'anytime' AND status = 'open'
💭 Someday      [počet]             ← when_type = 'someday'
📚 Logbook                          ← status = 'completed' ORDER BY completed_at DESC
🗑️ Kôš                              ← deleted_at IS NOT NULL (NOVÉ v2.4)
📆 Calendar
─────────────
📁 Oddelenia
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
| **Kôš (Trash)** | `/trash` | `deleted_at IS NOT NULL` (NOVÉ v2.4) |
| **Calendar** | `/calendar` | Všetky úlohy s dátumom (mesačný pohľad) |
| **Area Detail** | `/areas/[id]` | Projekty + voľné úlohy v danom oddelení (list/kanban toggle v2.9) |
| **Project Detail** | `/projects/[id]` | Úlohy + headings v projekte (list/kanban toggle) |
| **Project Kanban** | `/projects/[id]/kanban` | ⚠️ Presmeruje na `/projects/[id]` (v2.9) |

### View Toggle (v2.9 Unified UI)

Malé ikony v headeri pre prepínanie List/Kanban zobrazenia:
- **Kde je dostupný:** Projects, Areas
- **UI:** Malé ikony (List/LayoutGrid) z lucide-react
- **Perzistencia:** `useViewPreference` hook ukladá preferenciu do localStorage per-page
- **Implementácia:** Props v Header komponente (`showViewToggle`, `viewMode`, `onViewModeChange`)

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
- Drag & drop medzi stĺpcami → updates `status` (v2.7+)
- Auto-logbook: Done stĺpec nastaví `completed_at` a `when_type = null`
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

### Filters (v2.9 - na všetkých stránkach)

Filter button v headeri otvára/zatvára filtrovací panel:
```
[Status ▼] [Assignee ▼] [Due Date ▼] [Priority ▼] [Tags ▼] [When ▼] [Project ▼]
```

**Komponenty:**
- `TaskFiltersBar` - Filtrovací panel s dropdown filtrami
- `useTaskFilters` hook - Správa stavu filtrov
- `filterTasks` utility - Client-side filtrovanie úloh

**Stránky s filtrami:** Inbox, Team Inbox, Today, Anytime, Upcoming, Logbook, Trash, Areas, Projects

**Filter button vizuál:**
- Sivý ak žiadne filtre nie sú aktívne
- Modrý (primary) ak sú nejaké filtre aktívne

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
│   │   ├── trash/page.tsx            # NOVÉ v2.4 - Kôš
│   │   ├── calendar/page.tsx
│   │   ├── areas/
│   │   │   └── [areaId]/page.tsx     # NOVÉ
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [projectId]/
│   │   │       ├── page.tsx
│   │   │       └── kanban/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── users/page.tsx        # NOVÉ v2.8 - Správa používateľov
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── invite/[token]/page.tsx   # NOVÉ v2.8 - Prijatie pozvánky
│   ├── api/
│   │   ├── areas/route.ts
│   │   ├── projects/route.ts
│   │   ├── headings/route.ts         # NOVÉ
│   │   ├── tasks/route.ts
│   │   ├── tags/route.ts
│   │   ├── invitations/
│   │   │   └── accept/route.ts       # NOVÉ v2.8 - API pre prijatie pozvánky
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
│   │   ├── index.ts                      # Exporty
│   │   ├── calendar-view.tsx
│   │   ├── calendar-day.tsx
│   │   └── mini-calendar.tsx             # NOVÉ v2.3 - Mini kalendár s indikátormi
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
│   │   ├── sidebar-drop-item.tsx         # NOVÉ v2.3 - Droppable sidebar položky
│   │   ├── calendar-drop-picker.tsx      # NOVÉ v2.5 - Kalendár pre drag & drop
│   │   ├── header.tsx
│   │   ├── mobile-nav.tsx
│   │   ├── connection-status.tsx
│   │   ├── offline-indicator.tsx
│   │   └── error-display.tsx
│   ├── areas/                            # NOVÉ v2.5
│   │   └── area-form.tsx                 # Formulár pre vytvorenie/úpravu area
│   ├── notifications/
│   │   └── notification-settings.tsx
│   ├── organization/
│   │   └── organization-setup.tsx
│   ├── projects/
│   │   ├── project-card.tsx
│   │   ├── project-form.tsx
│   │   ├── project-form-modal.tsx        # NOVÉ v2.5 - Modal pre vytvorenie projektu
│   │   └── project-list.tsx
│   ├── tasks/
│   │   ├── task-list.tsx
│   │   ├── task-item.tsx                 # Swipe-to-delete na mobile (NOVÉ v2.4)
│   │   ├── task-item-expanded.tsx        # NOVÉ v2.4 - Inline rozbalená úloha
│   │   ├── task-quick-add.tsx
│   │   ├── task-detail.tsx               # PREPÍSANÉ v2.3 - Things 3 štýl
│   │   ├── task-filters.tsx
│   │   ├── when-picker.tsx               # Today/Anytime/Someday/Scheduled
│   │   ├── inline-when-picker.tsx        # NOVÉ v2.5 - Inline When picker
│   │   ├── inline-deadline-picker.tsx    # NOVÉ v2.5 - Inline Deadline picker
│   │   ├── inline-tag-selector.tsx       # NOVÉ v2.5 - Inline Tag selector
│   │   ├── inline-project-selector.tsx   # NOVÉ v2.5 - Inline Project selector
│   │   ├── inline-time-tracker.tsx       # NOVÉ v2.5 - Inline Time tracker
│   │   ├── inline-location-selector.tsx  # NOVÉ v2.5 - Inline Location selector
│   │   ├── sortable-task-item.tsx        # NOVÉ v2.5 - Drag & drop triediteľná úloha
│   │   ├── checklist.tsx                 # NOVÉ v2.3 - Drag & drop checklist
│   │   ├── checklist-item.tsx            # Jednotlivá položka checklistu
│   │   ├── tag-selector.tsx              # NOVÉ v2.3 - Multi-select tags
│   │   ├── project-selector.tsx          # NOVÉ v2.3 - Project dropdown
│   │   ├── assignee-selector.tsx         # NOVÉ v2.3 - Team member dropdown
│   │   ├── deadline-picker.tsx           # NOVÉ v2.3 - Deadline picker s badge
│   │   ├── draggable-task.tsx            # NOVÉ v2.3 - Wrapper pre drag
│   │   ├── recurrence-config.tsx
│   │   ├── kanban-board.tsx
│   │   ├── kanban-column.tsx
│   │   └── kanban-card.tsx
│   ├── tags/                         # NOVÉ v2.3
│   │   ├── index.ts                  # Exporty
│   │   ├── tag-chip.tsx              # Jednotlivý tag chip
│   │   └── tag-selector.tsx          # Multi-select tag dropdown
│   ├── users/                        # NOVÉ v2.8
│   │   ├── user-row.tsx              # Riadok používateľa v zozname
│   │   ├── edit-user-modal.tsx       # Modal pre editáciu používateľa
│   │   └── invite-user-modal.tsx     # Modal pre pozvanie používateľa
│   ├── filters/                      # NOVÉ v2.8
│   │   ├── index.ts                  # Exporty
│   │   └── task-filters-bar.tsx      # Filtrovací panel pre úlohy
│   ├── time-tracking/
│   │   ├── timer.tsx
│   │   ├── timer-indicator.tsx       # NOVÉ - globálny indikátor v headeri
│   │   ├── time-entries-list.tsx
│   │   ├── time-summary.tsx          # NOVÉ
│   │   └── time-dashboard-filters.tsx # NOVÉ v2.16 - Kaskádové filtre + Range calendar
│   └── ui/
│       ├── button.tsx
│       ├── calendar.tsx              # NOVÉ v2.16 - Range calendar picker
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
│   │   ├── theme-context.tsx
│   │   ├── sidebar-drop-context.tsx      # NOVÉ v2.3 - Drag & drop stav
│   │   └── global-timer-context.tsx      # NOVÉ v2.13 - Unified timer state
│   ├── hooks/
│   │   ├── use-tasks.ts              # + useTodayTasks, useUpcomingTasks, useAnytimeTasks, useSomedayTasks, useLogbookTasks, useTrashTasks
│   │   ├── use-task-counts.ts        # NOVÉ v2.4 - Počítadlá úloh pre sidebar
│   │   ├── use-task-filters.ts       # NOVÉ v2.8 - Task filters state management
│   │   ├── use-user-departments.ts   # NOVÉ v2.8 - User departments + useCurrentUser
│   │   ├── use-users-management.ts   # NOVÉ v2.8 - Admin user management CRUD
│   │   ├── use-projects.ts
│   │   ├── use-areas.ts              # useArea, useAreaProjects, useAreaTasks, useAreas
│   │   ├── use-headings.ts
│   │   ├── use-tags.ts               # NOVÉ v2.3 - Tags CRUD hook
│   │   ├── use-task-moved.ts         # NOVÉ v2.3 - Event listener pre refresh
│   │   ├── use-time-tracking.ts      # + useGlobalTimer, useTimeTotals
│   │   ├── use-time-filters.ts       # URL-based filter management
│   │   ├── use-cascading-time-filters.ts # NOVÉ v2.16 - Kaskádové filtre pre Časovač
│   │   ├── use-task-time-total.ts    # NOVÉ v2.13 - Total time per task
│   │   ├── use-organization.ts
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
│   │   ├── admin.ts                  # NOVÉ v2.8 - Admin client for API routes
│   │   └── types.ts
│   └── utils/
│       ├── cn.ts
│       ├── date.ts
│       ├── recurrence.ts
│       ├── export.ts
│       └── task-sorting.ts               # NOVÉ v2.5 - Utility pre triedenie úloh
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
- [x] **Area detail view** - projekty a úlohy v oddelení (`app/(dashboard)/areas/[areaId]/page.tsx`)
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

-- NOTE: Od v2.7 sa kanban_column nepoužíva - workflow fázy sú v status poli
-- Status constraint (obsahuje všetky Kanban stĺpce + canceled)
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done', 'canceled'));

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
| `Backspace` / `Delete` | Vymazať úlohu (keď je rozbalená) - NOVÉ v2.4 |

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

### UI vylepšenia v2.3 - VŠETKY DOKONČENÉ ✅
- [x] Checklist s drag & drop (@dnd-kit)
- [x] Tags UI s multi-select a farbami
- [x] Task Detail - Things 3 štýl s auto-save
- [x] Project selector dropdown
- [x] Assignee selector s avatarmi
- [x] Deadline picker s quick options
- [x] Sidebar drag & drop (presun úloh medzi views)
- [x] Mini kalendár v Upcoming view s indikátormi úloh

### Funkcie v2.4 - VŠETKY DOKONČENÉ ✅
- [x] Kôš (Trash) - soft delete, obnovenie, trvalé vymazanie
- [x] Inline editovanie úloh - rozbalenie priamo v zozname
- [x] Swipe-to-delete na mobile
- [x] Keyboard shortcut pre mazanie (Backspace/Delete)
- [x] Task counters v sidebar s realtime aktualizáciami
- [x] Červená badge pre deadline úlohy
- [x] RLS opravy pre tímový inbox

### Funkcie v2.5 - VŠETKY DOKONČENÉ ✅
- [x] **Inline komponenty** pre task-item-expanded:
  - [x] `inline-when-picker.tsx` - Výber When (Today/Anytime/Someday/Scheduled)
  - [x] `inline-deadline-picker.tsx` - Výber deadlinu s mini kalendárom
  - [x] `inline-tag-selector.tsx` - Výber tagov s farebnými indikátormi
  - [x] `inline-project-selector.tsx` - Výber projektu
  - [x] `inline-time-tracker.tsx` - Inline time tracker s start/stop
  - [x] `inline-location-selector.tsx` - Výber lokácie
- [x] **Calendar drop picker** - Drag & drop úloh na kalendárový dátum
- [x] **Sortable task item** - Drag & drop preusporiadanie úloh v zozname
- [x] **Task sorting utilities** - Utility funkcie pre triedenie úloh
- [x] **Project form modal** - Modal pre vytvorenie nového projektu
- [x] **Area form** - Formulár pre vytvorenie/úpravu oddelenia
- [x] **Vylepšené task counts** - Realtime počítadlá s archive support

### Funkcie v2.8 - VŠETKY DOKONČENÉ ✅
- [x] **Používateľské roly** - admin, strategicka_rada, hr, member
- [x] **Používateľské statusy** - active, inactive, invited
- [x] **Department Members** - Oddelia (areas s is_global=true) + členstvo používateľov
- [x] **Sidebar logika** - "Moje oddelenia" vs "Ostatné oddelenia" podľa roly
- [x] **Nickname ako primárne meno** - Prezývka zobrazovaná v celej aplikácii
- [x] **Task Filters UI** - Filtrovací panel: Status, Assignee, Due Date, Priority, Tags, When, Project
- [x] **Správa používateľov** - /settings/users stránka (len pre admin)
- [x] **Invite User Modal** - Pozvanie nového používateľa s rolou a oddeleniami
- [x] **Edit User Modal** - Úprava používateľa a jeho oddelení
- [x] **Invite Accept Page** - Prijatie pozvánky a vytvorenie účtu
- [x] **API pre pozvánky** - /api/invitations/accept endpoint

### Funkcie v2.9 - VŠETKY DOKONČENÉ ✅
- [x] **Task Filters na všetkých stránkach** - Filtrovací panel integrovaný do všetkých dashboard stránok
- [x] **Unified View Toggle** - Konzistentné malé ikony (List/LayoutGrid) v headeri
- [x] **Areas Kanban View** - Kanban zobrazenie pridané na stránku oddelení
- [x] **Project Kanban Redirect** - `/projects/[id]/kanban` presmeruje na hlavnú stránku projektu

### Funkcie v2.10 - VŠETKY DOKONČENÉ ✅
- [x] **Nickname display** - Zobrazenie prezývky namiesto celého mena v sidebar
- [x] **Role loading** - Správne načítanie roly používateľa v dashboard layoute
- [x] **Slovenská diakritika** - Kompletná oprava diakritiky v celej aplikácii (20+ súborov)
  - [x] Settings stránka (Integrácie, Organizácia, Vzhľad, Farebný režim)
  - [x] Email integrácia (všetky notifikačné typy a popisy)
  - [x] Slack integrácia (Prijímajte notifikácie do Slack kanálu)
  - [x] Kôš (Vyprázdniť kôš, Obnoviť, Táto akcia je nevrátna)
  - [x] Kalendár (1-2 úlohy, 3+ úlohy)
  - [x] Task komponenty (Nepriradené, Názov tagu, Priradiť k projektu)
  - [x] Sidebar (Tímový inbox, Nadchádzajúce, Kedykoľvek)
  - [x] Formuláre (Nový projekt, Nové oddelenie, Zrušiť, Vytvoriť)

### Funkcie v2.11 - VŠETKY DOKONČENÉ ✅
- [x] **Calendar View Toggle** - Presun kalendára zo sidebaru do headera ako tretí view
- [x] **ViewMode rozšírený** - `'list' | 'kanban' | 'calendar'`
- [x] **CalendarView integrovaný** - Na všetkých stránkach s view toggle:
  - [x] `today/page.tsx` - Kalendár pre dnešné úlohy
  - [x] `inbox/page.tsx` - Kalendár pre inbox úlohy
  - [x] `anytime/page.tsx` - Kalendár pre kedykoľvek úlohy
  - [x] `projects/[projectId]/page.tsx` - Kalendár pre projektové úlohy
  - [x] `areas/[areaId]/page.tsx` - Kalendár pre úlohy oddelenia
- [x] **Sidebar zjednodušený** - Odstránená položka "Kalendár" z navigácie

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

### 4. Error updating task v tímovom inboxe (NOVÉ v2.4)
**Problém:** Používatelia nemohli upravovať úlohy v tímovom inboxe
**Príčina:** RLS UPDATE politika neobsahovala podmienku pre `inbox_type = 'team'`
**Riešenie:** Pridaná podmienka `OR (inbox_type = 'team' AND auth.uid() IS NOT NULL)` do UPDATE a DELETE politík

### 5. Error creating tag (NOVÉ v2.4)
**Problém:** Vytváranie tagov zlyhávalo
**Príčina:** `undefined` namiesto `null` pre `organization_id`
**Riešenie:** Použitie `?? null` namiesto `?.` operátora

---

## História verzií

Kompletná história zmien je v súbore [CHANGELOG.md](./CHANGELOG.md).
