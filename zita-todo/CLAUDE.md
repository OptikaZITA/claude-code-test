# ZITA TODO - Kompletná dokumentácia (MERGED)

## Prehľad projektu

ZITA TODO je tímová produktivita aplikácia inšpirovaná Things 3 s Kanban zobrazením, sledovaním času a Toggl-style time trackingom. Určená pre ~20 členný tím s podporou osobnej aj tímovej produktivity.

**Dátum vytvorenia**: 2. januára 2026
**Posledná aktualizácia**: 8. januára 2026
**Verzia špecifikácie**: 2.27 (Strážci vesmíru Filter)

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

## Changelog

### v2.27 (8. januára 2026)
**Strážci vesmíru - Colleague Filter:**

Implementácia nového filtra pre filtrovanie úloh podľa priradeného kolegu (assignee).

**Hlavné funkcie:**
- Dynamický filter - zobrazuje len kolegov, ktorí majú minimálne 1 úlohu v aktuálnom kontexte
- Počet úloh pri každom kolegovi v zátvorke
- Možnosť "Nepriradené" pre úlohy bez priradeného kolegu
- "Všetci" pre resetovanie filtra
- Avatar a meno (nickname preferenčne) pri každom kolegovi
- Integrácia na všetkých stránkach s úlohami

**Nové súbory:**
- `components/filters/colleague-filter-bar.tsx` - ColleagueFilterBar komponent + filterTasksByColleague helper

**Upravené súbory:**
- `components/filters/index.ts` - Export ColleagueFilterBar a filterTasksByColleague
- `app/(dashboard)/today/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/inbox/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/inbox/team/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/anytime/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/upcoming/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/logbook/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/areas/[areaId]/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/projects/[projectId]/page.tsx` - Integrácia ColleagueFilterBar

**Pattern pre integráciu:**
```typescript
// Import
import { ColleagueFilterBar, filterTasksByColleague } from '@/components/filters'

// State
const [selectedColleague, setSelectedColleague] = useState<string | null>(null)

// Apply colleague filter (po tagFilteredTasks)
const colleagueFilteredTasks = useMemo(() => {
  return filterTasksByColleague(tagFilteredTasks, selectedColleague)
}, [tagFilteredTasks, selectedColleague])

// JSX - ColleagueFilterBar (po TagFilterBar)
<ColleagueFilterBar
  tasks={tagFilteredTasks}
  selectedColleague={selectedColleague}
  onSelectColleague={setSelectedColleague}
/>

// Empty state update
{colleagueFilteredTasks.length === 0 && (hasActiveFilters || selectedTag || selectedColleague) && ...}
```

**Vizuálny štýl:**
- Horizontálny scrollovací bar podobný TagFilterBar
- Avatar + meno + počet v zátvorke
- Aktívny kolega zvýraznený primary farbou
- Zafarbenie podľa variantu: outline (default), solid (vybraný)

---

### v2.26 (7. januára 2026)
**Area Detail Page Hooks Error Fix:**

Oprava kritického React Rules of Hooks erroru, ktorý spôsoboval crash aplikácie pri navigácii na Area Detail stránku.

**Problém:**
- Aplikácia padala s chybou: "Rendered fewer hooks than expected"
- Chyba nastávala pri načítaní Area Detail stránky (`/areas/[areaId]`)

**Príčina:**
- `useMemo` hooks (`visibleProjects`, `selectedTagName`) boli umiestnené PO early returns
- React vyžaduje, aby všetky hooks boli volané v rovnakom poradí pri každom renderovaní
- Keď bol `areaLoading=true`, early return spôsobil, že niektoré hooks neboli zavolané

**Riešenie:**
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx`
  - Presunutie `activeProjects`, `visibleProjects` a `selectedTagName` useMemo hooks PRED early returns
  - Odstránenie duplicitných definícií, ktoré boli po early returns

**Pravidlo React Rules of Hooks:**
```typescript
// ✅ SPRÁVNE - všetky hooks pred early returns
const { area, loading: areaLoading } = useArea(areaId)
const visibleProjects = useMemo(() => ..., [deps])
const selectedTagName = useMemo(() => ..., [deps])

if (areaLoading) return <Loading />  // early return AŽ PO hooks

// ❌ ZLE - hooks po early returns
if (areaLoading) return <Loading />
const visibleProjects = useMemo(() => ..., [deps])  // CRASH!
```

**Upravené súbory:**
- `app/(dashboard)/areas/[areaId]/page.tsx`

---

### v2.25 (7. januára 2026)
**Tag Filter Empty Projects Fix:**

Oprava správania filtrovania podľa tagov na Area Detail stránke - skrytie projektov bez úloh s vybraným tagom.

**Problém:**
- Pri filtrovaní podľa tagu sa zobrazovali všetky projekty, aj keď nemali žiadne úlohy s daným tagom
- Prázdne projekty bez relevantných úloh zaberali miesto a zhoršovali UX

**Riešenie:**
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx`
  - Nový `visibleProjects` useMemo - filtruje projekty podľa toho, či obsahujú úlohy s vybraným tagom
  - Nový `selectedTagName` useMemo - získa názov vybraného tagu pre empty state správu
  - Vylepšený empty state s konkrétnou správou: "Žiadne úlohy s tagom \"názov\""

**Logika filtrovania:**
```typescript
const visibleProjects = useMemo(() => {
  if (!selectedTag) return activeProjects  // Bez filtra = všetky projekty
  // S filtrom = len projekty s aspoň jednou úlohou s tagom
  return activeProjects.filter(project => {
    const projectTaskList = projectTasks.get(project.id) || []
    return projectTaskList.length > 0
  })
}, [activeProjects, selectedTag, projectTasks])
```

**Upravené súbory:**
- `app/(dashboard)/areas/[areaId]/page.tsx`

---

### v2.24 (7. januára 2026)
**Recurring Tasks (Opakujúce sa úlohy):**

Implementácia opakujúcich sa úloh inšpirovaná Things 3. Umožňuje nastaviť task, ktorý sa automaticky opakuje podľa definovaného pravidla.

**Dva typy opakovania:**

1. **After Completion (Po dokončení):**
   - Nový task sa vytvorí až keď dokončím predchádzajúci
   - Príklad: "Zálohovať PC" - 1 týždeň po dokončení
   - Výhoda: Ak nestíham, nenahromadia sa mi nedokončené tasky

2. **Scheduled (Pevný rozvrh):**
   - Nový task sa vytvorí podľa kalendára, nezávisle od dokončenia
   - Príklad: "Daily standup" - každý pracovný deň
   - Výhoda: Dodržiavam pevný termín

**Nové typy (types/index.ts):**
- `RecurrenceType = 'after_completion' | 'scheduled'`
- `RecurrenceUnit = 'day' | 'week' | 'month' | 'year'`
- `RecurrenceEndType = 'never' | 'after_count' | 'on_date'`
- Prepísaný `RecurrenceRule` interface s podporou oboch typov

**Nové komponenty:**
- ✅ `components/tasks/recurrence-config-modal.tsx` - Modal pre nastavenie opakovania
  - Výber typu (Po dokončení / Podľa rozvrhu)
  - Nastavenie intervalu (každý X dní/týždňov/mesiacov/rokov)
  - End conditions (nikdy / po X opakovaniach / k dátumu)
  - Voliteľné: pripomienky a automatický deadline
  - Preview budúcich dátumov pre scheduled typ
- ✅ `components/tasks/recurrence-badge.tsx` - Badge a IconButton komponenty

**Integrácia do UI:**
- ✅ `components/tasks/task-item.tsx` - Ikona 🔄 vedľa názvu recurring taskov
- ✅ `components/tasks/task-item-expanded.tsx` - Tlačidlo pre otvorenie modalu v toolbare

**Backend logika (lib/hooks/use-tasks.ts):**
- ✅ `getNextRecurrenceDate()` - Výpočet nasledujúceho dátumu
- ✅ `shouldCreateRecurringTask()` - Kontrola end conditions
- ✅ Rozšírený `completeTask()` - Automatické vytvorenie nového tasku pri dokončení after_completion tasku
  - Kópia všetkých relevantných polí (title, notes, project, tags, priority, atď.)
  - Reset checklistu (všetky položky unchecked)
  - Aktualizácia completed_count
  - Nastavenie when_date na vypočítaný dátum
  - Integrácia so signalizáciou (žltá bodka)

**API endpoint:**
- ✅ `app/api/tasks/[id]/recurrence/route.ts`
  - `PATCH` - Nastaviť/aktualizovať recurrence rule
  - `DELETE` - Odstrániť opakovanie
  - `GET` - Získať recurrence rule pre task

**Príklad JSON recurrence_rule:**
```json
{
  "type": "after_completion",
  "interval": 1,
  "unit": "week",
  "end_type": "never",
  "completed_count": 3
}
```

**Nové súbory:**
- `components/tasks/recurrence-config-modal.tsx`
- `components/tasks/recurrence-badge.tsx`
- `app/api/tasks/[id]/recurrence/route.ts`

**Odstránené súbory (staré implementácie):**
- `components/tasks/recurrence-config.tsx`
- `lib/utils/recurrence.ts`

**Upravené súbory:**
- `types/index.ts` - Nové typy pre recurrence
- `lib/hooks/use-tasks.ts` - After completion logika
- `components/tasks/task-item.tsx` - Recurrence ikona
- `components/tasks/task-item-expanded.tsx` - Recurrence tlačidlo a modal

---

### v2.23 (7. januára 2026)
**Kanban to Sidebar Drag & Drop Fix:**

Oprava drag & drop z Kanban zobrazenia do sidebar položiek (Kôš, Oddelenia, Projekty, atď.).

**Problém:**
- Drag & drop fungoval správne z listového zobrazenia do sidebaru
- Z Kanban zobrazenia nefungoval - sidebar nereagoval na drop

**Príčina:**
- Kanban používal vlastný `DndContext` z @dnd-kit
- Sidebar počúval na `isDragging` z `SidebarDropContext`
- Kanban karty nenotifikovali `SidebarDropContext` pri drag

**Riešenie:**

**Fáza 1 - KanbanCard notifikuje SidebarDropContext:**
- ✅ `components/tasks/kanban-card.tsx`
  - Import `useSidebarDrop` hook
  - `useEffect` nastavuje `setDraggedTask(task)` pri `isSortableDragging`
  - Sidebar teraz vidí aj drag z Kanban kariet

**Fáza 2 - KanbanBoard kontroluje sidebar drop target:**
- ✅ `components/tasks/kanban-board.tsx`
  - Import `useSidebarDrop` hook
  - V `handleDragEnd` kontrola `dropTarget` pred Kanban logikou
  - Ak je `dropTarget` nastavený, volá `handleSidebarDrop(dropTarget)`
  - Pridaný `handleDragCancel` pre úpratu stavu

**Výsledok:**
| Akcia | Pred | Po |
|-------|------|-----|
| Drag z listu do Koša | ✅ Funguje | ✅ Funguje |
| Drag z Kanban do Koša | ❌ Nefunguje | ✅ Funguje |
| Drag z Kanban do Area | ❌ Nefunguje | ✅ Funguje |
| Drag z Kanban do Projektu | ❌ Nefunguje | ✅ Funguje |
| Drag z Kanban medzi stĺpcami | ✅ Funguje | ✅ Funguje |

**Upravené súbory:**
- `components/tasks/kanban-card.tsx`
- `components/tasks/kanban-board.tsx`

---

### v2.22 (7. januára 2026)
**Signalization - Star Indicator & Yellow Dot:**

Implementácia Things 3 štýlu signalizácie pre úlohy v "Dnes" - hviezdička (⭐) a žltá bodka (🟡).

**Fáza 1 - Databázové zmeny:**
- ✅ `tasks.added_to_today_at` - Nový stĺpec pre sledovanie kedy bol task pridaný do "Dnes"
- ✅ `user_settings` tabuľka - Nová tabuľka pre uloženie `last_acknowledged` timestampu
- ✅ RLS politiky pre user_settings

**Fáza 2 - API endpoint:**
- ✅ `/api/user/acknowledge-tasks` - GET pre počet nových úloh, POST pre acknowledge

**Fáza 3 - Komponenty:**
- ✅ `components/indicators/today-star-indicator.tsx` - Zlatá hviezdička pre "Dnes" tasky
- ✅ `components/indicators/new-task-indicator.tsx` - Žltá bodka pre nové tasky
- ✅ `components/indicators/new-tasks-banner.tsx` - Banner "Máte X nových úloh"
- ✅ `components/indicators/sidebar-star-badge.tsx` - Star badge pre sidebar
- ✅ `components/indicators/index.ts` - Exporty

**Fáza 4 - Hooks:**
- ✅ `lib/hooks/use-new-tasks.ts` - useNewTasks hook pre žltú bodku logiku
  - `newTasksCount` - počet nových úloh
  - `acknowledge()` - volá POST API
  - `isTaskNew(added_to_today_at)` - callback pre určenie či je task nový
- ✅ `useTodayTasksCounts()` - počítadlo "Dnes" taskov pre sidebar star badges

**Fáza 5 - Integrácia:**
- ✅ `components/tasks/task-item.tsx` - Props `showTodayStar`, `isNew`
  - TodayStarIndicator zobrazená keď `showTodayStar && when_type === 'today'`
  - NewTaskIndicator zobrazená keď `isNew`
- ✅ `components/tasks/task-list.tsx` - Props `showTodayStar`, `isTaskNew`
- ✅ `components/tasks/sortable-task-item.tsx` - Props `showTodayStar`, `isNew`
- ✅ `components/tasks/project-task-list.tsx` - Prop `showTodayStar`
- ✅ `components/layout/sidebar.tsx` - SidebarStarBadge pre areas/projekty
- ✅ `components/layout/sidebar-drop-item.tsx` - `todayTasksCount` prop
- ✅ `app/(dashboard)/today/page.tsx` - NewTasksBanner + isTaskNew callback
- ✅ `app/(dashboard)/projects/[projectId]/page.tsx` - showTodayStar={true}
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx` - showTodayStar={true}
- ✅ `lib/hooks/use-tasks.ts` - Auto-set added_to_today_at pri when_type='today'

**Vizuálne pravidlá:**
| Indikátor | Kde sa zobrazuje | Podmienka |
|-----------|------------------|-----------|
| ⭐ Hviezdička | Project/Area stránky, Sidebar | Task je v "Dnes" (`when_type === 'today'`) |
| 🟡 Žltá bodka | Today stránka | `added_to_today_at > last_acknowledged` |
| Banner | Today stránka | Počet nových > 0 |

**Workflow:**
1. Task sa pridá do "Dnes" → nastaví sa `added_to_today_at = NOW()`
2. Používateľ vidí žltú bodku na Today stránke
3. Klikne "OK" na banner → volá sa `/api/user/acknowledge-tasks` POST
4. `last_acknowledged` sa aktualizuje → žlté bodky zmiznú

**Nové súbory:**
- `components/indicators/today-star-indicator.tsx`
- `components/indicators/new-task-indicator.tsx`
- `components/indicators/new-tasks-banner.tsx`
- `components/indicators/sidebar-star-badge.tsx`
- `components/indicators/index.ts`
- `lib/hooks/use-new-tasks.ts`
- `app/api/user/acknowledge-tasks/route.ts`

**Upravené súbory:**
- `types/index.ts` - added_to_today_at field
- `lib/hooks/use-tasks.ts` - auto-set added_to_today_at
- `components/tasks/task-item.tsx`
- `components/tasks/task-list.tsx`
- `components/tasks/sortable-task-item.tsx`
- `components/tasks/project-task-list.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/sidebar-drop-item.tsx`
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/projects/[projectId]/page.tsx`
- `app/(dashboard)/areas/[areaId]/page.tsx`

---

### v2.21 (7. januára 2026)
**Area Project Button + ProjectFormModal Simplification:**

Pridanie tlačidla "+ Pridať projekt" na stránku oddelenia a zjednodušenie ProjectFormModal keď je area preselected.

**Fáza 1 - Pridať projekt tlačidlo na Area page:**
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx` - Nové tlačidlo "+ Pridať projekt"
  - Import `FolderPlus` ikony z lucide-react
  - Import `ProjectFormModal` komponentu
  - Nový state `showProjectModal` pre ovládanie modalu
  - Tlačidlo zobrazené vedľa počtu projektov v headeri
  - `preselectedAreaId` automaticky nastavené na aktuálne oddelenie
  - Po úspešnom vytvorení sa refreshnú projekty aj úlohy

**Fáza 2 - Zjednodušený ProjectFormModal:**
- ✅ `components/projects/project-form-modal.tsx` - Skrytie area dropdown
  - Nový prop `preselectedAreaId?: string`
  - Podmienené fetchovanie areas - len keď NIE JE preselectedAreaId
  - Area dropdown skrytý keď je preselectedAreaId nastavené
  - Zjednodušené UX: zo stránky oddelenia modal zobrazuje len Názov + Farba
  - Automatický reset areaId pri zatvorení na preselectedAreaId

**Výsledné UX:**
| Kontext | Zobrazené polia |
|---------|-----------------|
| Z Area stránky | Názov, Farba |
| Zo sidebar/iného | Názov, Oddelenie (dropdown), Farba |

**Upravené súbory:**
- `app/(dashboard)/areas/[areaId]/page.tsx`
- `components/projects/project-form-modal.tsx`

---

### v2.20 (7. januára 2026)
**Drag & Drop Fix:**

Oprava nekonzistentného drag handle a zlej drop logiky pre Oddelenia/Projekty podľa Things 3 štýlu.

**Fáza 1 - Drag handle na celom riadku:**
- ✅ `components/tasks/sortable-task-item.tsx` - Drag kdekoľvek na task
  - Presun `{...attributes}` a `{...listeners}` na celý wrapper div
  - Odstránená samostatná `GripVertical` ikona
  - Pridaný `cursor-grab active:cursor-grabbing` štýl
  - Drag teraz funguje konzistentne na všetkých stránkach

**Fáza 2 - Oprava drop logiky:**
- ✅ `lib/contexts/sidebar-drop-context.tsx` - Things 3 štýl drop pravidlá
  - **Drop na Oddelenie**: Mení LEN `area_id` (zachová `when_type`, `project_id`)
  - **Drop na Projekt**: Mení LEN `project_id` a `area_id` (zachová `when_type`)
  - **Drop na Inbox**: Mení LEN `when_type` a `is_inbox` (zachová `project_id`)
  - Task v "Dnes" pretiahnutý do Oddelenia zostane v "Dnes"

**Pravidlá drop operácií (Things 3 štýl):**
| Kam dropnem | Čo sa ZMENÍ | Čo sa NEZMENÍ |
|-------------|-------------|---------------|
| Oddelenie (Area) | `area_id` | `when_type`, `project_id` |
| Projekt | `project_id`, `area_id` | `when_type` |
| Dnes | `when_type = 'today'` | `area_id`, `project_id` |
| Nadchádzajúce | `when_type = 'scheduled'`, `when_date` | `area_id`, `project_id` |
| Kedykoľvek | `when_type = 'anytime'` | `area_id`, `project_id` |
| Niekedy | `when_type = 'someday'` | `area_id`, `project_id` |
| Inbox | `when_type = 'inbox'`, `is_inbox = true` | `area_id`, `project_id` |

**Upravené súbory:**
- `components/tasks/sortable-task-item.tsx`
- `lib/contexts/sidebar-drop-context.tsx`

---

### v2.19 (7. januára 2026)
**Tags Position + DeadlineBadge Colors:**

Oprava pozície tagov a pridanie farebných varovaní pre deadline podľa špecifikácie Things 3.

**Fáza 1 - Tagy bližšie k názvu:**
- ✅ `components/tasks/task-item.tsx` - Presun tagov
  - Tagy sa teraz zobrazujú hneď za názvom úlohy a ikonou poznámky
  - Použitý flex-wrap pre správne zalamovanie na dlhších názvoch
  - Zmenené z `<p>` na `<span>` pre title (inline layout)

**Fáza 2 - DeadlineBadge farebné varovania:**
- ✅ `components/tasks/deadline-picker.tsx` - Aktualizovaný DeadlineBadge
  - Pridaný import `AlertCircle` a `differenceInDays` z date-fns
  - Farebné kódovanie podľa naliehavosti:
    | Stav | Farba | Ikona | Text |
    |------|-------|-------|------|
    | Budúci (> 1 deň) | Sivá | Calendar | 15.1. |
    | Zajtra | Oranžová | AlertTriangle | Zajtra |
    | Dnes | Oranžová (bold) | AlertTriangle | Dnes |
    | Po deadline | Červená (bold) | AlertCircle | 6.1. (4d po termíne) |

**Fáza 3 - Tag Selector Portal fix:**
- ✅ `components/tasks/inline-tag-selector.tsx` - Oprava orezávania
  - Dropdown sa teraz renderuje cez Portal do `document.body`
  - Dynamický výpočet pozície pomocou `getBoundingClientRect()`
  - Opravený click-outside handler s `setTimeout(0)` pre správne timing
  - z-index 9999 pre zobrazenie nad všetkým

**Upravené súbory:**
- `components/tasks/task-item.tsx`
- `components/tasks/deadline-picker.tsx`
- `components/tasks/inline-tag-selector.tsx`

---

### v2.18 (7. januára 2026)
**Tags Things 3 Style + TagFilterBar:**

Implementácia Things 3 štýlu pre zobrazenie tagov v task itemoch a pridanie TagFilterBar komponentu pre filtrovanie úloh podľa tagov.

**Fáza 1 - Tagy v Supabase queries:**
- ✅ `lib/hooks/use-tasks.ts` - Rozšírené query o tagy
  - Pridaný nested select: `tags:task_tags(tag:tags(id, name, color))`
  - Nová helper funkcia `transformTasks` pre flatten nested tag štruktúry
  - Aplikované na všetky hooks: `useTasks`, `useTodayTasks`, `useUpcomingTasks`, `useAnytimeTasks`, `useSomedayTasks`, `useLogbookTasks`, `useTrashTasks`, `useInboxTasks`

**Fáza 2 - Task Item Things 3 štýl:**
- ✅ `components/tasks/task-item.tsx` - Redizajn layoutu
  - Title + FileText ikona (ak má poznámky) v prvom riadku
  - Area/Department meno pod titulkom (sivý text, menší)
  - Tagy v outline štýle badges na pravej strane
  - Odstránené komponenty: TagChipList, WhenBadge, AreaBadge
  - Pridaný import: FileText z lucide-react

**Fáza 3 - TagFilterBar komponent:**
- ✅ `components/tasks/tag-filter-bar.tsx` - Nový komponent
  - Extrakcia unikátnych tagov z úloh
  - Single-select filtrovanie (jeden aktívny tag)
  - "Všetky" tlačidlo pre reset filtra
  - Horizontálne scrollovanie pre veľa tagov

**Fáza 4 - Integrácia TagFilterBar:**
- ✅ `app/(dashboard)/today/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/inbox/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/inbox/team/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/anytime/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/upcoming/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/projects/[projectId]/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx` - TagFilterBar integrácia

**Pattern pre integráciu:**
```typescript
// Import
import { TagFilterBar } from '@/components/tasks/tag-filter-bar'

// State
const [selectedTag, setSelectedTag] = useState<string | null>(null)

// Tag filter memo (po filteredTasks)
const tagFilteredTasks = useMemo(() => {
  if (!selectedTag) return filteredTasks
  return filteredTasks.filter(task =>
    task.tags?.some(tag => tag.id === selectedTag)
  )
}, [filteredTasks, selectedTag])

// JSX - TagFilterBar
<TagFilterBar
  tasks={filteredTasks}
  selectedTag={selectedTag}
  onSelectTag={setSelectedTag}
/>

// Empty state update
{tagFilteredTasks.length === 0 && (hasActiveFilters || selectedTag) && ...}
```

**Nové súbory:**
- `components/tasks/tag-filter-bar.tsx`

**Upravené súbory:**
- `lib/hooks/use-tasks.ts`
- `components/tasks/task-item.tsx`
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/inbox/page.tsx`
- `app/(dashboard)/inbox/team/page.tsx`
- `app/(dashboard)/anytime/page.tsx`
- `app/(dashboard)/upcoming/page.tsx`
- `app/(dashboard)/projects/[projectId]/page.tsx`
- `app/(dashboard)/areas/[areaId]/page.tsx`

---

### v2.17 (7. januára 2026)
**Things 3 Drag & Drop for Upcoming:**

Implementácia Things 3 štýlu drag & drop pre položku "Nadchádzajúce" v sidebar - pri pustení úlohy sa zobrazí kalendár pre výber dátumu.

**Hlavné zmeny:**
- ✅ `components/layout/sidebar.tsx` - Things 3 štýl pre Nadchádzajúce
  - Pri pustení úlohy na "Nadchádzajúce" sa zobrazí kalendár popover
  - Používateľ vyberie dátum, úloha dostane `when_type='scheduled'` a `when_date`
  - Kalendár sa zobrazí vedľa sidebaru s názvom úlohy
  - Klik mimo alebo X tlačidlo zruší akciu
  - Minulé dátumy sú zakázané
- ✅ `lib/contexts/sidebar-drop-context.tsx` - Rozšírený context
  - Nový stav `pendingUpcomingDrop` pre uloženie čakajúcej úlohy
  - Funkcie `setPendingUpcomingDrop` a `clearPendingUpcomingDrop`
- ✅ `components/layout/calendar-drop-picker.tsx` - Oprava typu
  - `handleCalendarDateSelect` teraz akceptuje `Date` namiesto `string`

**UI opravy:**
- ✅ Farba textu aktívnej položky v sidebar zmenená na tmavú
  - Zmenené z `text-primary` na `text-foreground` pre aktívne položky
  - Ovplyvnené: sidebar.tsx (team inbox, logbook, time)
  - Ovplyvnené: sidebar-drop-item.tsx (všetky droppable položky)
  - Aktívne položky majú teraz: peach pozadie + tmavý text

**Bug fixes:**
- ✅ Opravený stale closure bug v `handleCalendarDateSelect`
  - Použitie `useRef` pre aktuálnu hodnotu tasku namiesto priamej závislosti na state
- ✅ Opravená detekcia kliknutia mimo kalendára
  - Použitie overlay prístupu namiesto `contains()` metódy
- ✅ Opravený timezone bug pri ukladaní dátumu
  - Použitie lokálneho dátumu namiesto UTC konverzie (`toISOString()`)
- ✅ Opravený `useUpcomingTasks` query
  - Zmenené z `gt` (greater than) na `gte` (greater or equal) pre dnešný dátum
- ✅ Pridané správne Supabase error handling
  - Kontrola `error` objektu po každej Supabase operácii

**Upravené súbory:**
- `components/layout/sidebar.tsx`
- `components/layout/sidebar-drop-item.tsx`
- `components/layout/calendar-drop-picker.tsx`
- `lib/contexts/sidebar-drop-context.tsx`
- `lib/hooks/use-tasks.ts`

---

### v2.16 (7. januára 2026)
**Time Tracker Filters + Range Calendar:**

Implementácia kaskádových (závislých) filtrov v Časovači a nahradenie dvoch date inputov jedným range calendar pickerom.

**Fáza 1 - Kaskádové filtre:**
- ✅ `lib/hooks/use-cascading-time-filters.ts` - Nový hook pre závislé filtre
  - Načíta všetky areas, projects, users, tags
  - Buduje vzťahové mapy: `projectToArea`, `userToAreas`, `userToProjects`
  - Filtruje možnosti na základe aktuálneho výberu
  - Hierarchia: Oddelenie → Projekt → Kolega → Tag
- ✅ `app/(dashboard)/time/page.tsx` - Integrácia kaskádových filtrov
  - `handleCascadingFilterChange` - logika pre závislosti filtrov
  - Keď sa zmení area, vyfiltrujú sa neplatné projekty
  - Keď sa vyberie projekt, auto-nastaví sa area
- ✅ `components/time-tracking/time-dashboard-filters.tsx` - Vylepšené UI
  - Kontextové prázdne správy ("Žiadne projekty v oddelení")
  - "Zrušiť filtre" tlačidlo pre reset všetkých entity filtrov

**Fáza 2 - Range Calendar Picker:**
- ✅ Inštalácia `react-day-picker@^9.0.0`
- ✅ `components/ui/calendar.tsx` - Nový kalendár komponent
  - Podpora `mode="range"` pre výber rozsahu dátumov
  - Custom `MonthCaption` s navigáciou v jednom riadku: `◀ január 2026 ▶`
  - Slovenská lokalizácia (sk locale)
  - Vizuálne zvýraznenie vybraného rozsahu
  - CSS premenné pre dark/light mode
- ✅ `components/time-tracking/time-dashboard-filters.tsx` - Nový PeriodDropdown
  - Presety: Dnes, Tento týždeň, Tento mesiac, Tento rok
  - "Vlastné obdobie" otvorí range kalendár
  - Prvý klik = začiatočný dátum, druhý klik = koncový dátum
  - Zobrazenie vybraného rozsahu pod kalendárom
  - "Použiť" tlačidlo pre potvrdenie

**Nové súbory:**
- `lib/hooks/use-cascading-time-filters.ts`
- `components/ui/calendar.tsx`

**Upravené súbory:**
- `app/(dashboard)/time/page.tsx`
- `components/time-tracking/time-dashboard-filters.tsx`
- `package.json` (pridaný react-day-picker)

**Nové závislosti:**
- `react-day-picker@^9.0.0`

---

### v2.15 (7. januára 2026)
**Sidebar Drawer + Header Redesign:**

Implementácia podľa ZADANIE-REDESIGN-FINAL.md - sidebar ako drawer, hamburger menu v headeri, vizuálne zmeny pre task items.

**Fáza 1 - Sidebar Drawer:**
- ✅ `lib/contexts/sidebar-context.tsx` - Nový context pre globálny stav sidebaru
  - `sidebarOpen`, `setSidebarOpen`, `toggleSidebar`
- ✅ `app/(dashboard)/layout.tsx` - Sidebar ako drawer s overlay
  - Sidebar skrytý by default, zobrazí sa po kliknutí na hamburger
  - Overlay s `bg-black/50` pre zatmenie pozadia
  - `animate-slide-in-left` animácia pri otvorení
- ✅ `components/layout/sidebar.tsx` - Pridaný `onNavigate` prop
  - Automatické zatvorenie po navigácii
- ✅ `components/layout/sidebar-drop-item.tsx` - Pridaný `onNavigate` prop

**Fáza 2 - Header:**
- ✅ `components/layout/header.tsx` - Nový layout
  - Hamburger menu button (Menu ikona) na začiatku
  - Search roztiahnutý na `flex-1 max-w-md`
  - Notifikácie s červenou badge (`hasUnreadNotifications` prop)
  - Theme toggle a avatar vpravo

**Fáza 3 - Task Item zmeny:**
- ✅ `components/tasks/task-item.tsx` - Odstránený chevron/expand arrow
  - Rozbalenie len cez double-click (desktop) / tap (mobile)
- ✅ `components/tasks/when-picker.tsx` - "Dnes" badge modrá
  - Zmenené z `bg-warning` na `bg-primary text-white`
- ✅ `components/tasks/deadline-picker.tsx` - Zjednodušený štýl
  - Sivý text s Calendar ikonou namiesto výrazného badge

**Fáza 4 - Quick Add:**
- ✅ `components/tasks/task-quick-add.tsx` - Nové správanie
  - Default stav: modrý button "Pridať úlohu"
  - Po kliknutí: input s bordrom, "Pridať" a "Zrušiť" tlačidlá
  - Escape pre zrušenie

**Fáza 5 - Time Summary:**
- ✅ `components/time-tracking/time-summary-card.tsx` - Plain text štýl
  - Odstránený box s bordrom
  - Jednoduchý text: "Dnes: 2h 23m (5 úloh)"

**Nové súbory:**
- `lib/contexts/sidebar-context.tsx`

**Upravené súbory:**
- `app/(dashboard)/layout.tsx`
- `components/layout/header.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/sidebar-drop-item.tsx`
- `components/tasks/task-item.tsx`
- `components/tasks/when-picker.tsx`
- `components/tasks/deadline-picker.tsx`
- `components/tasks/task-quick-add.tsx`
- `components/time-tracking/time-summary-card.tsx`

---

### v2.14 (7. januára 2026)
**Lovable Design System - Kompletný redesign UI:**

Implementácia nového dizajnového systému podľa LOVABLE_ZITA-TODO-Design-System.md s modernou farebnou paletou, novými fontami a konzistentnými komponentmi.

**Branch:** `redesign/lovable-style`

**Fáza 1 - Dizajnový systém:**
- ✅ `app/globals.css` - Kompletný prepis CSS premenných
  - Nové farby: `--background: #fffcf7` (krémová), `--primary: #0039cc` (ZITA Blue), `--secondary: #ffbf9b` (peach)
  - Kanban farby: backlog, todo, in_progress, review, done
  - Priority farby: low, medium, high, urgent
  - Department farby: 8 predefinovaných farieb
  - Timer premenné pre aktívny stav
  - Nové animácie: pulse-soft, fade-in, scale-in, slide-in
- ✅ `app/layout.tsx` - Google Fonts (DM Serif Display + DM Sans)

**Fáza 2 - Layout komponenty:**
- ✅ `components/layout/sidebar.tsx` - Nové farby, font-heading pre logo
- ✅ `components/layout/sidebar-drop-item.tsx` - Sémantické farby
- ✅ `components/layout/header.tsx` - bg-card, font-heading
- ✅ `components/ui/theme-toggle.tsx` - Zjednodušený na single-click Moon/Sun toggle

**Fáza 3 - UI komponenty:**
- ✅ `components/ui/button.tsx` - Nové varianty s sémantickými farbami
- ✅ `components/ui/checkbox.tsx` - Kruhový štýl (Things 3 inšpirácia)
- ✅ `components/ui/badge.tsx` - Priority a kanban varianty
- ✅ `components/ui/input.tsx` - Sémantické farby, nový radius
- ✅ `components/ui/modal.tsx` - bg-card, font-heading, animate-scale-in
- ✅ `components/tasks/task-item.tsx` - ChevronRight/Down pre expand, priority farby
- ✅ `components/tasks/task-item-expanded.tsx` - bg-accent/50 pozadie
- ✅ `components/time-tracking/timer-indicator.tsx` - timer-badge-active class

**Fáza 4 - Kanban komponenty:**
- ✅ `components/tasks/kanban-board.tsx` - bg-background
- ✅ `components/tasks/kanban-column.tsx` - bg-muted/50, font-heading
- ✅ `components/tasks/kanban-card.tsx` - bg-card, sémantické farby

**Fáza 5 - Stránky:**
- ✅ `app/(dashboard)/today/page.tsx` - Konzistentné sémantické triedy
- ✅ `app/(dashboard)/inbox/page.tsx` - Aktualizované farby
- ✅ `app/(dashboard)/inbox/team/page.tsx` - Aktualizované farby
- ✅ `app/(dashboard)/logbook/page.tsx` - Aktualizované farby
- ✅ `app/(dashboard)/trash/page.tsx` - Aktualizované farby
- ✅ `app/(dashboard)/upcoming/page.tsx` - Aktualizované farby
- ✅ `components/tasks/task-list.tsx` - text-muted-foreground
- ✅ `components/tasks/task-detail.tsx` - Kompletná aktualizácia farieb

**Kľúčové zmeny dizajnu:**
```css
/* Light Mode */
--background: #fffcf7;     /* Krémová */
--card: #ffffff;
--primary: #0039cc;        /* ZITA Blue */
--secondary: #ffbf9b;      /* Peach */
--accent: #ffddcb;         /* Svetlá peach */

/* Dark Mode (invertované) */
--background: #0a0a0a;
--primary: #ffbf9b;        /* Peach sa stáva primárnou */
--secondary: #2563eb;

/* Fonty */
--font-heading: "DM Serif Display", Georgia, serif;
--font-body: "DM Sans", system-ui, sans-serif;
```

**Poznámka:** Zostáva ~50 súborov s originálnymi CSS premennými (sekundárne komponenty). Tieto fungujú správne a môžu byť postupne migrované.

---

### v2.13 (6. januára 2026)
**Unified Timer UX - Jeden zdroj pravdy:**

Kompletný refaktor time trackingu s jedným globálnym zdrojom pravdy pre konzistentné zobrazenie času naprieč celou aplikáciou.

**Nový context:**
- ✅ `lib/contexts/global-timer-context.tsx` - GlobalTimerProvider ako jediný zdroj pravdy
  - `isRunning`, `currentTaskId`, `elapsedSeconds`, `currentTask`
  - `startTimer(taskId)`, `stopTimer()`
  - Automatické zastavenie existujúceho timera pri spustení nového
  - Custom events `timer:started` a `timer:stopped` pre cross-component komunikáciu

**Nový hook:**
- ✅ `lib/hooks/use-task-time-total.ts` - Hook pre celkový čas tasku z DB
  - Počúva na `timer:stopped` event pre optimistickú aktualizáciu
  - Automatický refetch pri zmene taskId

**Refaktorované komponenty:**
- ✅ `components/tasks/inline-time-tracker.tsx` - Kompletný prepis
  - Používa GlobalTimerContext namiesto lokálneho stavu
  - Zobrazuje `totalSeconds + elapsedSeconds` keď timer beží na danom tasku
  - Jeden komponent pre všetky views (task-item, task-item-expanded, task-detail)
- ✅ `components/time-tracking/timer-indicator.tsx` - Refaktor na context
  - Zobrazuje názov tasku v rozbalenom paneli
- ✅ `components/tasks/task-item.tsx` - Zjednodušené props pre InlineTimeTracker
- ✅ `components/tasks/task-item-expanded.tsx` - Pridaný InlineTimeTracker do toolbaru
- ✅ `components/tasks/task-detail.tsx` - Aktualizovaný na nový context

**Layout:**
- ✅ `app/(dashboard)/layout.tsx` - GlobalTimerProvider obaluje celú dashboard sekciu

**Pravidlá UX:**
1. **Header badge** = globálny indikátor (vždy viditeľný keď timer beží)
2. **V zozname taskov** = celkový čas + live elapsed ak beží na tomto tasku
3. **V rozbalenom tasku** = rovnaký InlineTimeTracker (nie duplikát)
4. **Jeden timer globálne** = spustenie nového automaticky zastaví predchádzajúci

**Výsledné správanie:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ZITA TODO                              [🟢 00:12]               │  ← Header
├─────────────────────────────────────────────────────────────────┤
│ ☆ úloha A      [⏸ 5:12]  ← total (5:00) + live (0:12)          │
│ ☆ úloha B      [▶ 2:30]  ← statický total                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### v2.12 (6. januára 2026)
**Time Tracking Dashboard:**

Implementácia Toggl-style Time Tracking Dashboard s reportami, grafmi a CSV exportom.

**Nová stránka:**
- ✅ `app/(dashboard)/time/page.tsx` - Time Dashboard na `/time`

**Nové API endpointy:**
- ✅ `/api/time/report` - Report s filtrami, agregáciami a groupBy
- ✅ `/api/time/report/export` - CSV export filtrovaných dát

**Nové komponenty:**
- ✅ `components/time-tracking/time-dashboard-filters.tsx` - Filter bar s obdobím, multi-selectmi
- ✅ `components/time-tracking/time-dashboard-summary.tsx` - Súhrnné karty (celkový čas, záznamy, priemer/deň)
- ✅ `components/time-tracking/time-dashboard-charts.tsx` - Grafy: čas podľa dní + čas podľa user/area/project
- ✅ `components/time-tracking/time-dashboard-table.tsx` - Summary mód + Detailed mód tabuľky

**Nové hooks:**
- ✅ `lib/hooks/use-time-report.ts` - Fetch reportu s filtrami a exportCSV funkciou
- ✅ `lib/hooks/use-time-filters.ts` - URL-based filter management s period detection

**Sidebar:**
- ✅ Pridaná položka "Časovač" s ikonou `Timer` pred sekciu "Oddelenia"

**Funkcie:**
- Filtrovanie podľa obdobia: Dnes, Tento týždeň, Tento mesiac, Tento rok, Vlastné
- Multi-select filtre: Oddelenie, Projekt, Kolega, Tag
- Toggle "Len môj čas" pre zobrazenie len vlastných záznamov
- GroupBy prepínač: Používateľ, Oddelenie, Projekt
- Graf podľa dní s víkendovým zvýraznením
- Horizontálny bar chart s percentami
- Summary tabuľka s progress barmi
- Detailed tabuľka so všetkými záznamami
- CSV export s UTF-8 kódovaním
- URL query parametre pre zdieľanie filtrov

**RLS:**
- Overené že `time_entries` RLS podporuje organizáciu cez `get_my_organization_id()`

---

### v2.11 (6. januára 2026)
**Calendar View Toggle:**

**Presun Kalendára zo sidebaru do headera:**
Kalendár bol presunutý z navigácie v sidebari do headera ako tretí view toggle (List | Kanban | Calendar).

**Zmeny v `components/ui/view-toggle.tsx`:**
```typescript
// PRED:
export type ViewMode = 'list' | 'kanban'

// PO:
export type ViewMode = 'list' | 'kanban' | 'calendar'

// Pridané tretie tlačidlo s Calendar ikonou
<button onClick={() => onChange('calendar')} title="Kalendár">
  <Calendar className="h-4 w-4" />
</button>
```

**Zmeny v `components/layout/sidebar.tsx`:**
- Odstránená navigačná položka "Kalendár"
- Odstránený nepoužívaný `Calendar` import

**CalendarView integrovaný do všetkých stránok s view toggle:**

| Stránka | Súbor | Zmeny |
|---------|-------|-------|
| Dnes | `today/page.tsx` | Import CalendarView, calendar handlers, podmienené renderovanie |
| Inbox | `inbox/page.tsx` | Import CalendarView, calendar handlers, podmienené renderovanie |
| Kedykoľvek | `anytime/page.tsx` | Import CalendarView, calendar handlers, podmienené renderovanie |
| Projekt | `projects/[projectId]/page.tsx` | Import CalendarView, calendar handlers, podmienené renderovanie |
| Oddelenie | `areas/[areaId]/page.tsx` | Import CalendarView, calendar handlers, podmienené renderovanie |

**Calendar handlers pattern:**
```typescript
// Calendar handlers
const handleCalendarTaskMove = async (taskId: string, newDate: Date) => {
  await updateTask(taskId, {
    due_date: newDate.toISOString().split('T')[0],
  })
  refetch()
}

const handleCalendarDateClick = (date: Date) => {
  console.log('Date clicked:', date)
}

// Podmienené renderovanie
{viewMode === 'calendar' ? (
  <CalendarView
    tasks={filteredTasks}
    onTaskClick={setSelectedTask}
    onDateClick={handleCalendarDateClick}
    onTaskMove={handleCalendarTaskMove}
  />
) : viewMode === 'kanban' ? (
  <KanbanBoard ... />
) : (
  <TaskList ... />
)}
```

**Upravené súbory:**
- `components/ui/view-toggle.tsx` - Rozšírený ViewMode typ, pridaná Calendar ikona
- `components/layout/sidebar.tsx` - Odstránený Kalendár z navigácie
- `app/(dashboard)/today/page.tsx` - CalendarView integrácia
- `app/(dashboard)/inbox/page.tsx` - CalendarView integrácia
- `app/(dashboard)/anytime/page.tsx` - CalendarView integrácia
- `app/(dashboard)/projects/[projectId]/page.tsx` - CalendarView integrácia
- `app/(dashboard)/areas/[areaId]/page.tsx` - CalendarView integrácia

---

### v2.10 (6. januára 2026)
**Slovak Diacritics + Nickname Display:**

**Oprava zobrazenia nickname v sidebar:**
Dashboard layout teraz správne načítava `nickname` a `role` z databázy a zobrazuje prezývku namiesto celého mena.

**Zmeny v `app/(dashboard)/layout.tsx`:**
```typescript
interface User {
  full_name: string | null
  nickname: string | null  // PRIDANÉ
  email: string
  avatar_url: string | null
  role?: 'admin' | 'strategicka_rada' | 'hr' | 'member'  // PRIDANÉ
}

// Query rozšírené o nickname a role:
.select('full_name, nickname, email, avatar_url, role')
```

**Kompletná oprava slovenskej diakritiky:**
Opravená diakritika (háčky, dĺžne, mäkčene) vo všetkých používateľských textoch:

| Súbor | Opravené texty |
|-------|----------------|
| `settings/page.tsx` | Push notifikácie, Integrácie, Organizácia, Vzhľad, Farebný režim, Svetlý/Tmavý/Systém |
| `email-settings.tsx` | Integrácia je aktívna, Prijímajte notifikácie, Emailová adresa, Typy notifikácií, Denný prehľad, Priradené úlohy, Blížiaci sa termín, Týždenný report, Zmienky v komentároch |
| `slack-settings.tsx` | Integrácia je aktívna, Prijímajte notifikácie do Slack kanálu, Ako vytvoriť webhook, Názov kanálu (voliteľne) |
| `trash/page.tsx` | Kôš, Vyprázdniť kôš, položka/položky/položiek, Vymazané úlohy môžete obnoviť, Kôš je prázdny, Obnoviť, Táto akcia je nevrátna, Ešte X dní |
| `mini-calendar.tsx` | 1-2 úlohy, 3+ úlohy |
| `assignee-selector.tsx` | Nepriradené, Hľadaj používateľa |
| `inline-tag-selector.tsx` | Názov tagu, Zrušiť, Vytvoriť |
| `inline-project-selector.tsx` | Priradiť k projektu |
| `sidebar.tsx` | Tímový inbox, Nadchádzajúce, Kedykoľvek, Nová úloha |
| `task-item.tsx` | Vymazať úlohu |
| `inline-when-picker.tsx` | Kedykoľvek, Naplánované |
| `task-item-expanded.tsx` | Názov úlohy, Poznámky |
| `project-form-modal.tsx` | Nový projekt, Názov projektu, Webová stránka, Zrušiť, Vytvoriť |
| `area-form.tsx` | Nové oddelenie, Názov oddelenia, Zrušiť, Vytvoriť |

**Upravené súbory (celkovo 20+):**
- `app/(dashboard)/layout.tsx` - nickname/role loading
- `app/(dashboard)/settings/page.tsx`
- `app/(dashboard)/trash/page.tsx`
- `components/integrations/email-settings.tsx`
- `components/integrations/slack-settings.tsx`
- `components/calendar/mini-calendar.tsx`
- `components/tasks/assignee-selector.tsx`
- `components/tasks/inline-tag-selector.tsx`
- `components/tasks/inline-project-selector.tsx`
- `components/layout/sidebar.tsx`
- `components/tasks/task-item.tsx`
- `components/tasks/inline-when-picker.tsx`
- `components/tasks/task-item-expanded.tsx`
- `components/projects/project-form-modal.tsx`
- `components/areas/area-form.tsx`
- A ďalšie...

---

### v2.9 (6. januára 2026)
**Task Filters + Unified View Toggle:**

**Task Filters na všetkých stránkach:**
Filtrovací panel integrovaný do všetkých dashboard stránok pre konzistentné UX:

| Stránka | Súbor |
|---------|-------|
| Inbox (osobný) | `app/(dashboard)/inbox/page.tsx` |
| Team Inbox | `app/(dashboard)/inbox/team/page.tsx` |
| Today | `app/(dashboard)/today/page.tsx` |
| Anytime | `app/(dashboard)/anytime/page.tsx` |
| Upcoming | `app/(dashboard)/upcoming/page.tsx` |
| Logbook | `app/(dashboard)/logbook/page.tsx` |
| Trash | `app/(dashboard)/trash/page.tsx` |
| Area Detail | `app/(dashboard)/areas/[areaId]/page.tsx` |
| Project Detail | `app/(dashboard)/projects/[projectId]/page.tsx` |

**Pattern pre integráciu filtrov:**
```typescript
import { useState, useMemo } from 'react'
import { Filter } from 'lucide-react'
import { TaskFiltersBar } from '@/components/filters/task-filters-bar'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'

// State
const [showFilters, setShowFilters] = useState(false)
const { filters, setFilter, clearFilters, hasActiveFilters } = useTaskFilters()

// Apply filters
const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])

// Filter button in Header
<button
  onClick={() => setShowFilters(!showFilters)}
  className={`p-2 rounded-lg transition-colors ${
    hasActiveFilters ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--bg-hover)]'
  }`}
>
  <Filter className="h-4 w-4" />
</button>

// Filter bar (collapsible)
{showFilters && (
  <TaskFiltersBar filters={filters} onFilterChange={setFilter} ... />
)}
```

**Unified View Toggle:**
Zjednotené UI pre prepínanie List/Kanban view - malé ikony v headeri namiesto veľkých textových tlačidiel:

- ✅ **Today** - Už mal správny štýl (malé ikony)
- ✅ **Projects** - Zmenené z veľkých textových tlačidiel na malé ikony v Header
- ✅ **Areas** - Pridaný ViewToggle (predtým chýbal)
- ✅ `/projects/[id]/kanban` - Zjednodušené na redirect (toggle je teraz v hlavnej stránke)

**Zmeny v Header komponente:**
```typescript
<Header
  title={project.name}
  showViewToggle           // Zapne toggle
  viewMode={viewMode}      // 'list' | 'kanban'
  onViewModeChange={setViewMode}
>
```

**Kanban handlery pre Areas:**
```typescript
const handleKanbanTaskMove = async (taskId: string, newStatus: TaskStatus) => {
  const updates: Partial<TaskWithRelations> = { status: newStatus }
  if (newStatus === 'done') {
    updates.completed_at = new Date().toISOString()
    updates.when_type = null  // Auto-logbook
  } else {
    updates.completed_at = null
  }
  await updateTask(taskId, updates)
  refetchTasks()
}
```

**Upravené súbory:**
- `app/(dashboard)/inbox/page.tsx` - Pridané filtre
- `app/(dashboard)/inbox/team/page.tsx` - Pridané filtre
- `app/(dashboard)/today/page.tsx` - Pridané filtre
- `app/(dashboard)/anytime/page.tsx` - Pridané filtre
- `app/(dashboard)/upcoming/page.tsx` - Pridané filtre
- `app/(dashboard)/logbook/page.tsx` - Pridané filtre
- `app/(dashboard)/trash/page.tsx` - Pridané filtre
- `app/(dashboard)/areas/[areaId]/page.tsx` - Pridané filtre + ViewToggle + Kanban
- `app/(dashboard)/projects/[projectId]/page.tsx` - Pridané filtre + ViewToggle v Header
- `app/(dashboard)/projects/[projectId]/kanban/page.tsx` - Zjednodušené na redirect

---

### v2.8 (5. januára 2026)
**User Management + Departments + Filters:**

**Nový systém rolí:**
| Rola | Popis | Prístup k oddeleniam |
|------|-------|---------------------|
| `admin` | Administrátor | Všetky oddelenia |
| `strategicka_rada` | Strategická rada | Všetky oddelenia |
| `hr` | HR oddelenie | Všetky oddelenia |
| `member` | Bežný člen | Len priradené oddelenia |

**Nové tabuľky a polia:**
- ✅ `users` - rozšírené o `nickname`, `position`, `status`, `invited_by`, `invited_at`, `last_login_at`, `start_date`
- ✅ `areas` - pridané `is_global` pre označenie oddelení
- ✅ `invitations` - rozšírené o `full_name`, `nickname`, `position`, `departments` (JSONB)
- ✅ `department_members` - nová tabuľka pre priradenie používateľov k oddeleniam

**Nové stránky:**
- ✅ `/settings/users` - Správa používateľov (len admin)
- ✅ `/invite/[token]` - Prijatie pozvánky a vytvorenie účtu

**Nové API:**
- ✅ `/api/invitations/accept` - Endpoint pre prijatie pozvánky

**Nové komponenty:**
- ✅ `components/users/user-row.tsx` - Riadok používateľa
- ✅ `components/users/edit-user-modal.tsx` - Modal pre editáciu
- ✅ `components/users/invite-user-modal.tsx` - Modal pre pozvanie
- ✅ `components/filters/task-filters-bar.tsx` - Filtrovací panel

**Nové hooky:**
- ✅ `use-user-departments.ts` - Načítanie oddelení podľa roly + `useCurrentUser`
- ✅ `use-task-filters.ts` - Správa stavu filtrov
- ✅ `use-users-management.ts` - Admin CRUD pre používateľov a pozvánky

**Sidebar vylepšenia:**
- ✅ Zobrazovanie nickname namiesto full_name
- ✅ "Moje oddelenia" sekcia pre bežných členov
- ✅ "Ostatné oddelenia" collapsible sekcia pre admin/hr/strategická_rada
- ✅ Role badge pod menom používateľa
- ✅ Admin odkaz na /settings/users

**TypeScript typy:**
```typescript
export type UserRole = 'admin' | 'strategicka_rada' | 'hr' | 'member'
export type UserStatus = 'active' | 'inactive' | 'invited'
export const FULL_ACCESS_ROLES: UserRole[] = ['admin', 'strategicka_rada', 'hr']

export function canSeeAllDepartments(role: UserRole): boolean
export function canManageUsers(role: UserRole): boolean
```

**Nové súbory:**
- `app/(dashboard)/settings/users/page.tsx`
- `app/(auth)/invite/[token]/page.tsx`
- `app/api/invitations/accept/route.ts`
- `components/users/user-row.tsx`
- `components/users/edit-user-modal.tsx`
- `components/users/invite-user-modal.tsx`
- `components/filters/task-filters-bar.tsx`
- `components/filters/index.ts`
- `lib/hooks/use-user-departments.ts`
- `lib/hooks/use-task-filters.ts`
- `lib/hooks/use-users-management.ts`
- `lib/utils/filter-query.ts`
- `lib/supabase/admin.ts`

**Upravené súbory:**
- `types/index.ts` - Nové typy a helper funkcie
- `components/layout/sidebar.tsx` - Nickname, oddelenia, admin link

---

### v2.7 (5. januára 2026)
**Status-based Kanban Board:**

**Zmena koncepcie:**
Kanban board teraz používa `status` pole namiesto `when_type`. Toto oddeľuje workflow fázy (Backlog → To Do → In Progress → Review → Done) od časového zaradenia úloh (Today/Anytime/Someday).

**Kanban stĺpce (Status-based):**
| Stĺpec | Status | Farba |
|--------|--------|-------|
| Backlog | `backlog` | #8E8E93 |
| To Do | `todo` | #007AFF |
| In Progress | `in_progress` | #FF9500 |
| Review | `review` | #AF52DE |
| Done | `done` | #34C759 |

**Auto-logbook logika:**
Keď úloha prejde do stĺpca "Done":
```typescript
if (newStatus === 'done') {
  updates.completed_at = new Date().toISOString()
  updates.when_type = null  // Presun do logbooku
}
```

**Funkcie:**
- ✅ Drag & drop medzi stĺpcami mení `status` úlohy
- ✅ Auto-logbook pri dokončení (when_type = null, completed_at = now)
- ✅ View Toggle (List/Kanban) na Today, Inbox, Anytime stránkach
- ✅ Konzistentný KanbanBoard komponent naprieč aplikáciou

**Odstránené súbory (When-based Kanban):**
- `components/tasks/when-kanban-board.tsx` ❌
- `components/tasks/when-kanban-column.tsx` ❌
- `components/tasks/when-kanban-card.tsx` ❌

**Upravené stránky:**
- `app/(dashboard)/inbox/page.tsx` - KanbanBoard namiesto WhenKanbanBoard
- `app/(dashboard)/today/page.tsx` - KanbanBoard namiesto WhenKanbanBoard
- `app/(dashboard)/anytime/page.tsx` - KanbanBoard namiesto WhenKanbanBoard
- `app/(dashboard)/areas/[areaId]/page.tsx` - Odstránený duplicitný header

**Existujúce status-based komponenty (použité):**
- `components/tasks/kanban-board.tsx` - Hlavný Kanban board
- `components/tasks/kanban-column.tsx` - Stĺpec s drag & drop
- `components/tasks/kanban-card.tsx` - Karta úlohy

---

### v2.6 (4. januára 2026)
**View Toggle - Prepínač Zoznam/Kanban:**

**Nové komponenty:**
- `components/ui/view-toggle.tsx` - Toggle button pre prepínanie List/Kanban zobrazenia
- ~~`components/tasks/when-kanban-board.tsx`~~ - (Odstránené v2.7)
- ~~`components/tasks/when-kanban-column.tsx`~~ - (Odstránené v2.7)
- ~~`components/tasks/when-kanban-card.tsx`~~ - (Odstránené v2.7)
- `lib/hooks/use-view-preference.ts` - Hook pre ukladanie view preference do localStorage

**Funkcie:**
- ✅ Toggle button v headeri (vedľa vyhľadávania)
- ✅ Perzistencia preferencie do localStorage (per-page)
- ✅ Responzívne horizontálne scrollovanie na mobile

**Aktualizované stránky:**
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/inbox/page.tsx`
- `app/(dashboard)/anytime/page.tsx`
- `app/(dashboard)/upcoming/page.tsx`
- `components/layout/header.tsx` - pridané props pre view toggle

---

### v2.5 (4. januára 2026)
**Inline Components + Drag & Drop Sorting + Calendar Drop:**

**Fáza 1 - Inline komponenty pre task-item-expanded:**
- ✅ `components/tasks/inline-when-picker.tsx` - Kompaktný When picker pre inline editáciu
- ✅ `components/tasks/inline-deadline-picker.tsx` - Kompaktný Deadline picker s mini kalendárom
- ✅ `components/tasks/inline-tag-selector.tsx` - Multi-select tags pre inline editáciu
- ✅ `components/tasks/inline-project-selector.tsx` - Project dropdown pre inline editáciu
- ✅ `components/tasks/inline-time-tracker.tsx` - Inline time tracker s elapsed time
- ✅ `components/tasks/inline-location-selector.tsx` - Location selector pre task lokáciu

**Fáza 2 - Calendar Drop Picker:**
- ✅ `components/layout/calendar-drop-picker.tsx` - Mini kalendár pre drag & drop na sidebar
- ✅ Vizuálne zvýraznenie pri drag over dňa
- ✅ Automatická zmena `when_type` na `scheduled` a nastavenie `when_date`

**Fáza 3 - Sortable Task Items:**
- ✅ `components/tasks/sortable-task-item.tsx` - Wrapper pre drag & drop triedenie
- ✅ `lib/utils/task-sorting.ts` - Utility funkcie pre triedenie (priority, date, manual)
- ✅ Perzistentné uloženie sort_order do databázy

**Fáza 4 - Project & Area Forms:**
- ✅ `components/projects/project-form-modal.tsx` - Modal pre vytvorenie nového projektu
- ✅ `components/areas/area-form.tsx` - Formulár pre vytvorenie/úpravu oddelenia
- ✅ Integrácia s sidebar pre rýchle vytváranie

**Fáza 5 - Vylepšené Task Counts:**
- ✅ Podpora pre `archived_at` stĺpec v počítadlách
- ✅ Optimalizované paralelné queries pre rýchlejšie načítanie
- ✅ Realtime subscription na zmeny v tasks tabuľke

**Nové súbory:**
- `components/tasks/inline-when-picker.tsx`
- `components/tasks/inline-deadline-picker.tsx`
- `components/tasks/inline-tag-selector.tsx`
- `components/tasks/inline-project-selector.tsx`
- `components/tasks/inline-time-tracker.tsx`
- `components/tasks/inline-location-selector.tsx`
- `components/tasks/sortable-task-item.tsx`
- `components/layout/calendar-drop-picker.tsx`
- `components/projects/project-form-modal.tsx`
- `components/areas/area-form.tsx`
- `lib/utils/task-sorting.ts`

**Upravené súbory:**
- `components/tasks/task-item-expanded.tsx` - integrácia inline komponentov
- `components/tasks/task-list.tsx` - podpora pre sortable items
- `components/layout/sidebar.tsx` - integrácia calendar drop picker
- `lib/hooks/use-task-counts.ts` - podpora archive_at
- `lib/hooks/use-tasks.ts` - nové sorting funkcie
- `lib/hooks/use-areas.ts` - CRUD operácie pre areas
- `lib/hooks/use-projects.ts` - CRUD operácie pre projects

---

### v2.4 (4. januára 2026)
**Trash + Inline Edit + Task Counters:**

**Fáza 1 - Kôš (Trash):**
- ✅ `app/(dashboard)/trash/page.tsx` - Nová stránka pre vymazané úlohy
- ✅ `deleted_at` stĺpec v tabuľke tasks
- ✅ Soft delete namiesto trvalého mazania
- ✅ Obnovenie úloh z koša
- ✅ Trvalé vymazanie jednotlivých úloh
- ✅ Vyprázdnenie celého koša s potvrdením

**Fáza 2 - Inline editovanie úloh:**
- ✅ `components/tasks/task-item-expanded.tsx` - Rozbalená úloha priamo v zozname
- ✅ Dvojklik na desktop / klik na mobile pre rozbalenie
- ✅ Inline editovateľný názov a poznámky
- ✅ When picker, Deadline, Tags, Project selector v rozbalenom stave
- ✅ Click-outside a Escape pre zatvorenie

**Fáza 3 - Swipe-to-delete:**
- ✅ Touch gestá v `task-item.tsx` pre mobilné zariadenia
- ✅ Swipe doľava odhalí delete button
- ✅ Vizuálny feedback s červeným pozadím
- ✅ Threshold 80px pre aktiváciu

**Fáza 4 - Keyboard shortcut pre mazanie:**
- ✅ Backspace/Delete klávesy pre vymazanie rozbalenej úlohy
- ✅ Pridané do `keyboard-shortcuts-modal.tsx`

**Fáza 5 - Task counters v sidebar:**
- ✅ `lib/hooks/use-task-counts.ts` - Hook pre počítanie úloh
- ✅ Realtime subscription pre automatické aktualizácie
- ✅ Sivé badges pre bežné počty
- ✅ Červená badge pre deadline úlohy na Today
- ✅ Podpora dark mode pre badges

**Opravy:**
- ✅ RLS politika pre UPDATE/DELETE tímových inbox úloh
- ✅ Tag creation s `null` namiesto `undefined` pre organization_id
- ✅ Lepšie error logging v team inbox page

**Nové súbory:**
- `app/(dashboard)/trash/page.tsx`
- `components/tasks/task-item-expanded.tsx`
- `lib/hooks/use-task-counts.ts`

**Upravené súbory:**
- `components/tasks/task-item.tsx` - swipe gestá
- `components/tasks/task-list.tsx` - keyboard delete, expand state
- `components/layout/sidebar.tsx` - task counters
- `components/layout/sidebar-drop-item.tsx` - count badges
- `lib/hooks/use-tasks.ts` - softDelete, useTrashTasks
- `lib/hooks/use-tags.ts` - null fix pre organization_id
- `types/index.ts` - deleted_at field
- `supabase-rls-fix.sql` - team inbox UPDATE/DELETE politiky

---

### v2.3 (4. januára 2026)
**Things 3 UI + Sidebar Drag & Drop:**

**Fáza 1 - Checklist UI:**
- ✅ `components/tasks/checklist.tsx` - Interaktívny checklist s @dnd-kit drag & drop
- ✅ Inline pridávanie položiek, delete, complete toggle
- ✅ Integrácia do task-detail.tsx

**Fáza 2 - Tags UI:**
- ✅ `components/tasks/tag-selector.tsx` - Multi-select dropdown s farebnými indikátormi
- ✅ `lib/hooks/use-tags.ts` - CRUD hook pre tagy
- ✅ Vytvorenie nových tagov priamo v dropdown

**Fáza 3 - Task Detail Panel Redesign:**
- ✅ `components/tasks/project-selector.tsx` - Project dropdown s vyhľadávaním
- ✅ `components/tasks/assignee-selector.tsx` - Team member dropdown s avatarmi
- ✅ `components/tasks/deadline-picker.tsx` - Deadline picker s quick options + DeadlineBadge
- ✅ Prepísaný `task-detail.tsx` v Things 3 štýle s inline editovateľným titulkom
- ✅ Auto-save pattern pre všetky polia
- ✅ Avatar 'xs' size pre kompaktné zobrazenie

**Fáza 4 - Sidebar Drag & Drop:**
- ✅ `lib/contexts/sidebar-drop-context.tsx` - Context pre globálny drag stav
- ✅ `components/layout/sidebar-drop-item.tsx` - Droppable sidebar položky
- ✅ `components/tasks/draggable-task.tsx` - Wrapper pre draggable úlohy
- ✅ `lib/hooks/use-task-moved.ts` - Event listener pre refresh listov
- ✅ Native HTML5 Drag & Drop API (nie @dnd-kit pre sidebar)
- ✅ Vizuálny feedback pri drag over
- ✅ Custom event `task:moved` pre cross-component komunikáciu

**Fáza 5 - Upcoming Mini Calendar:**
- ✅ `components/calendar/mini-calendar.tsx` - Kompaktný kalendár
- ✅ Task indikátory (bodky) - modrá 1-2 úlohy, oranžová/červená 3+
- ✅ Klik na deň scrolluje k úlohám daného dňa
- ✅ Integrácia do Upcoming page s quick stats

**Opravy:**
- Fix: `showQuickAdd` type error (`boolean | null` → `!!value`)

---

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

**Verzia:** 2.26 (Area Detail Page Hooks Fix)
**Posledná aktualizácia:** 7. januára 2026
