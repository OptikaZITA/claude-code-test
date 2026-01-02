# ZITA TODO - Prompt pre Claude Code

## Prehľad projektu

Vytvor tímovú produktivitu aplikáciu s názvom **ZITA TODO** - systém na správu úloh inšpirovaný aplikáciou Things 3 s Kanban zobrazením a sledovaním času. Ide o interný nástroj pre firmu (~20 ľudí), ktorý sa postupne vyvinie na komplexný systém riadenia firmy.

### Technologický stack
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Row Level Security)
- **Nasadenie**: Vercel
- **Repozitár**: GitHub

---

## Fáza 1: Rozsah MVP

### Hlavné funkcie (podľa priority)
1. Autentifikácia a správa tímu
2. CRUD operácie pre úlohy (Inbox, Projekty, Oblasti)
3. Kanban zobrazenie
4. Sledovanie času
5. Tagy a filtre

### Explicitne NIE JE v MVP
- Integrácia s Google Calendar
- Opakujúce sa úlohy
- Správa dochádzky/zmien (databáza je navrhnutá tak, aby to podporovala neskôr)
- Reporty a analytika
- Externé integrácie
- Mobilná aplikácia (iba responzívny web)

---

## Dátový model

### Kľúčové koncepty
- **Organizácia**: Firma ZITA - zatiaľ jeden tenant
- **Používatelia**: Členovia tímu s rolami (admin/member)
- **Oblasti (Areas)**: Kategórie na vysokej úrovni (napr. "Marketing", "Prevádzka")
- **Projekty**: Kontajnery pre úlohy v rámci oblastí
- **Úlohy (Tasks)**: Jednotlivé pracovné položky s priradenými osobami
- **Časové záznamy**: Sledované pracovné intervaly na úlohu

### Databázová schéma (Supabase/PostgreSQL)

```sql
-- Povolenie UUID rozšírenia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizácie (pre budúcu multi-tenancy, začíname s jednou)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Používatelia (rozširuje Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pozvánky (admin pozýva nových používateľov)
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Oblasti (kategórie na vysokej úrovni)
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT, -- hex farba pre UI
  is_private BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES users(id), -- tvorca/vlastník
  sort_order INTEGER DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Členovia oblasti (kto môže editovať, nielen prezerať)
CREATE TABLE area_members (
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT true,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (area_id, user_id)
);

-- Projekty (v rámci oblastí alebo samostatné)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_private BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Členovia projektu (kto môže editovať)
CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT true,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Tagy (celá organizácia)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Úlohy
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Obsah úlohy
  title TEXT NOT NULL,
  description TEXT,
  
  -- Stav a organizácia
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  kanban_column TEXT DEFAULT 'backlog', -- neskôr prispôsobiteľné per projekt
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Dátumy
  due_date DATE,
  start_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Priradenie
  created_by UUID REFERENCES users(id),
  assignee_id UUID REFERENCES users(id),
  
  -- Spracovanie inboxu
  inbox_type TEXT CHECK (inbox_type IN ('personal', 'team')), -- NULL = nie je v inboxe
  inbox_user_id UUID REFERENCES users(id), -- pre osobný inbox
  
  -- Organizácia
  sort_order INTEGER DEFAULT 0,
  archived_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vzťah Úloha-Tag
CREATE TABLE task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Časové záznamy (pre sledovanie času)
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ NOT NULL,
  stopped_at TIMESTAMPTZ,
  duration_seconds INTEGER, -- vypočítané pri zastavení
  
  note TEXT,
  
  -- Pre budúcu integráciu dochádzky/zmien
  entry_type TEXT DEFAULT 'task' CHECK (entry_type IN ('task', 'shift', 'break')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexy pre výkon
CREATE INDEX idx_tasks_organization ON tasks(organization_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_inbox ON tasks(inbox_type, inbox_user_id);
CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_started ON time_entries(started_at);

-- Trigger funkcia pre updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplikovanie triggera na relevantné tabuľky
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Row Level Security pravidlá

```sql
-- Povolenie RLS na všetkých tabuľkách
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Pomocná funkcia na získanie organization_id používateľa
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Pomocná funkcia na overenie, či je používateľ admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Používatelia: vidia členov vlastnej organizácie
CREATE POLICY "Používatelia môžu vidieť členov vlastnej organizácie" ON users
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Používatelia môžu aktualizovať vlastný profil" ON users
  FOR UPDATE USING (id = auth.uid());

-- Oblasti: členovia organizácie môžu vidieť ne-privátne alebo vlastné
CREATE POLICY "Zobrazenie oblastí" ON areas
  FOR SELECT USING (
    organization_id = get_user_organization_id() AND (
      is_private = false OR 
      owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM area_members WHERE area_id = id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Členovia môžu vytvárať oblasti" ON areas
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Editácia vlastných alebo členských oblastí" ON areas
  FOR UPDATE USING (
    organization_id = get_user_organization_id() AND (
      owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM area_members WHERE area_id = id AND user_id = auth.uid() AND can_edit = true)
    )
  );

-- Projekty: podobne ako oblasti
CREATE POLICY "Zobrazenie projektov" ON projects
  FOR SELECT USING (
    organization_id = get_user_organization_id() AND (
      is_private = false OR 
      owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM project_members WHERE project_id = id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Členovia môžu vytvárať projekty" ON projects
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Editácia vlastných alebo členských projektov" ON projects
  FOR UPDATE USING (
    organization_id = get_user_organization_id() AND (
      owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM project_members WHERE project_id = id AND user_id = auth.uid() AND can_edit = true)
    )
  );

-- Úlohy: zobrazenie ak sú vo viditeľnom projekte alebo inboxe
CREATE POLICY "Zobrazenie úloh" ON tasks
  FOR SELECT USING (
    organization_id = get_user_organization_id() AND (
      -- Tímový inbox
      inbox_type = 'team' OR
      -- Osobný inbox (vlastný)
      (inbox_type = 'personal' AND inbox_user_id = auth.uid()) OR
      -- Úloha projektu (ak môže vidieť projekt)
      (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = project_id AND (
          p.is_private = false OR 
          p.owner_id = auth.uid() OR
          EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
        )
      ))
    )
  );

CREATE POLICY "Vytváranie úloh" ON tasks
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Aktualizácia úloh" ON tasks
  FOR UPDATE USING (
    organization_id = get_user_organization_id() AND (
      created_by = auth.uid() OR
      assignee_id = auth.uid() OR
      is_admin() OR
      (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM project_members pm WHERE pm.project_id = project_id AND pm.user_id = auth.uid() AND pm.can_edit = true
      ))
    )
  );

-- Časové záznamy: vlastné záznamy viditeľné, admin vidí všetko
CREATE POLICY "Zobrazenie časových záznamov" ON time_entries
  FOR SELECT USING (
    organization_id = get_user_organization_id() AND (
      user_id = auth.uid() OR is_admin()
    )
  );

CREATE POLICY "Vytváranie vlastných časových záznamov" ON time_entries
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id() AND user_id = auth.uid()
  );

CREATE POLICY "Aktualizácia vlastných časových záznamov" ON time_entries
  FOR UPDATE USING (user_id = auth.uid());

-- Tagy: celá organizácia
CREATE POLICY "Zobrazenie tagov" ON tags
  FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Správa tagov" ON tags
  FOR ALL USING (organization_id = get_user_organization_id());

-- Pozvánky: iba admin
CREATE POLICY "Admin spravuje pozvánky" ON invitations
  FOR ALL USING (organization_id = get_user_organization_id() AND is_admin());
```

---

## Štruktúra aplikácie

```
zita-todo/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx          # Flow prijatia pozvánky
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── inbox/
│   │   │   └── page.tsx          # Osobný + tímový inbox
│   │   ├── areas/
│   │   │   ├── page.tsx          # Zoznam oblastí
│   │   │   └── [areaId]/
│   │   │       └── page.tsx      # Detail oblasti s projektmi
│   │   ├── projects/
│   │   │   └── [projectId]/
│   │   │       ├── page.tsx      # Zoznamové zobrazenie
│   │   │       └── kanban/
│   │   │           └── page.tsx  # Kanban zobrazenie
│   │   ├── settings/
│   │   │   ├── page.tsx          # Nastavenia používateľa
│   │   │   └── team/
│   │   │       └── page.tsx      # Admin: správa tímu
│   │   └── layout.tsx            # Bočný panel + hlavička
│   ├── api/
│   │   └── ... (ak potrebné)
│   ├── layout.tsx
│   └── page.tsx                  # Presmerovanie na inbox alebo login
├── components/
│   ├── ui/                       # Základné UI komponenty
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   ├── dropdown.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── mobile-nav.tsx
│   ├── tasks/
│   │   ├── task-list.tsx
│   │   ├── task-item.tsx
│   │   ├── task-detail-panel.tsx
│   │   ├── task-form.tsx
│   │   ├── kanban-board.tsx
│   │   ├── kanban-column.tsx
│   │   └── kanban-card.tsx
│   ├── time-tracking/
│   │   ├── timer-button.tsx
│   │   ├── time-entries-list.tsx
│   │   └── active-timer-badge.tsx
│   ├── filters/
│   │   ├── filter-bar.tsx
│   │   └── tag-filter.tsx
│   └── team/
│       ├── invite-modal.tsx
│       └── member-list.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser klient
│   │   ├── server.ts             # Server klient
│   │   ├── middleware.ts         # Auth middleware
│   │   └── types.ts              # Generované typy
│   ├── hooks/
│   │   ├── use-tasks.ts
│   │   ├── use-projects.ts
│   │   ├── use-timer.ts
│   │   └── use-realtime.ts
│   └── utils/
│       ├── cn.ts                 # pomocník pre classnames
│       └── date.ts               # formátovanie dátumov
├── types/
│   └── index.ts                  # Typy pre celú aplikáciu
├── middleware.ts                 # Next.js middleware pre auth
└── tailwind.config.ts
```

---

## UI/UX pravidlá

### Dizajnové princípy
- **Čisté a minimalistické** ako Things 3
- **Biely priestor je dôležitý** - nepreplňovať
- **Jemné animácie** pre interakcie
- **Klávesnica na prvom mieste** - podpora skratiek

### Farebná schéma (zástupné hodnoty - bude definované)
```css
:root {
  --color-primary: #007AFF;      /* Bude firemná farba ZITA */
  --color-background: #FFFFFF;
  --color-surface: #F5F5F7;
  --color-text: #1D1D1F;
  --color-text-secondary: #86868B;
  --color-border: #E5E5E5;
  --color-success: #34C759;
  --color-warning: #FF9500;
  --color-error: #FF3B30;
}
```

### Kľúčové UI komponenty

#### Bočný panel (Sidebar)
- Logo hore
- "Inbox" (s odznačkom pre neprečítané)
- "Tímový Inbox"
- Oddeľovač
- Zoznam oblastí (zbaliteľné, zobrazujú projekty vnútri)
- "+" tlačidlo na pridanie Oblasti/Projektu
- Dole: Avatar používateľa + nastavenia

#### Zoznamové zobrazenie úloh
- Rýchle pridanie vstupu hore (stlač Enter pre pridanie)
- Úlohy zoskupené podľa stavu alebo dátumu
- Každá úloha zobrazuje: checkbox, názov, avatar priradenej osoby, deadline, tagy, sledovaný čas
- Kliknutie na úlohu → vysúvací panel s detailmi

#### Kanban nástenka
- Stĺpce: Backlog | To Do | Rozpracované | Hotové
- Drag & drop medzi stĺpcami
- Karty zobrazujú: názov, priradenú osobu, deadline, indikátor priority

#### Panel detailu úlohy
- Vysúvací z pravej strany (50% šírky na desktope)
- Polia: názov, popis (voliteľne markdown podpora), projekt, priradená osoba, deadline, priorita, tagy
- Sekcia sledovania času: tlačidlo Štart/Stop, zoznam záznamov, celkový čas

### Klávesové skratky
- `N` - Nová úloha v aktuálnom kontexte
- `Cmd/Ctrl + Enter` - Uložiť a zavrieť
- `Escape` - Zavrieť panel/modál
- `1/2/3/4` - Nastaviť prioritu (v detaile úlohy)
- `Medzerník` - Prepnúť dokončenie úlohy (keď je fokusnutá)

---

## Poradie implementácie

### Krok 1: Nastavenie projektu
```bash
npx create-next-app@latest zita-todo --typescript --tailwind --app --src-dir=false
cd zita-todo
npm install @supabase/supabase-js @supabase/ssr
npm install lucide-react                    # Ikony
npm install @dnd-kit/core @dnd-kit/sortable # Drag & drop
npm install date-fns                        # Utility pre dátumy
npm install clsx tailwind-merge             # Utility pre styling
```

Vytvor `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Krok 2: Nastavenie Supabase
1. Vytvor nový Supabase projekt
2. Spusti SQL schému z vyššie
3. Spusti RLS pravidlá
4. Povol Email auth v Supabase dashboarde
5. Vygeneruj TypeScript typy: `npx supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts`

### Krok 3: Autentifikácia
- Implementuj prihlasovaciu stránku
- Implementuj flow prijatia pozvánky
- Nastav middleware pre chránené routy
- Vytvor auth context/hooks

### Krok 4: Layout a navigácia
- Postav komponent bočného panela
- Postav hlavičku s menu používateľa
- Implementuj responzívnu mobilnú navigáciu
- Nastav routing štruktúru

### Krok 5: CRUD pre Oblasti a Projekty
- Zoznam oblastí v bočnom paneli
- Modál na vytvorenie/editáciu oblasti
- Zoznam projektov pod oblasťami
- Modál na vytvorenie/editáciu projektu
- Stránky detailu oblasti/projektu

### Krok 6: Úlohy - Zoznamové zobrazenie
- Komponent zoznamu úloh
- Vstup pre rýchle pridanie
- Komponent položky úlohy
- Panel detailu úlohy (vysúvací)
- Formulár na vytvorenie/editáciu úlohy
- Funkcionalita označenia ako dokončené

### Krok 7: Inbox
- Osobný inbox (úlohy bez projektu, priradené mne alebo vytvorené mnou)
- Tímový inbox (inbox_type = 'team')
- Presun úlohy z inboxu do projektu

### Krok 8: Tagy a filtre
- Správa tagov (vytvoriť, editovať, zmazať)
- Priradenie tagov k úlohám
- Komponent lišty filtrov
- Filtrovanie cez URL (?tag=xxx&status=yyy)

### Krok 9: Kanban zobrazenie
- Layout Kanban nástenky
- Komponent Kanban stĺpca
- Komponent Kanban karty
- Funkcionalita Drag & drop
- Aktualizácia stavu pri pustení
- Prepínanie medzi zoznamom/kanbanom

### Krok 10: Sledovanie času
- Komponent tlačidla časovača
- Logika štart/stop (iba jeden aktívny časovač na používateľa)
- Zoznam časových záznamov v detaile úlohy
- Indikátor aktívneho časovača v hlavičke
- Výpočet celkového času na úlohu

### Krok 11: Správa tímu (Admin)
- Zoznam členov tímu
- Modál na pozvanie používateľa
- Flow pozývacieho emailu
- Zmena role používateľa
- Deaktivácia používateľa

### Krok 12: Realtime aktualizácie
- Prihlásenie sa na zmeny úloh
- Aktualizácia UI pri vzdialených zmenách
- Elegantné riešenie konfliktov

### Krok 13: Doladenie
- Načítavacie stavy (skeletóny)
- Spracovanie chýb a toasty
- Prázdne stavy
- Klávesové skratky
- Testovanie mobilnej responzivity

---

## Dôležité poznámky k implementácii

### Logika sledovania času
```typescript
// Pri spustení časovača:
// 1. Skontroluj aktívne časové záznamy pre tohto používateľa
// 2. Ak nájdeš, zastav ich (nastav stopped_at a duration_seconds)
// 3. Vytvor nový časový záznam so started_at = teraz

// Pri zastavení:
// 1. Nastav stopped_at = teraz
// 2. Vypočítaj duration_seconds = stopped_at - started_at

// Iba JEDEN aktívny časovač na používateľa naraz!
```

### Súhrn pravidiel viditeľnosti
| Typ obsahu | Viditeľnosť |
|------------|-------------|
| Ne-privátna Oblasť/Projekt | Všetci členovia org môžu VIDIEŤ |
| Ne-privátna Oblasť/Projekt | Iba členovia môžu EDITOVAŤ |
| Privátna Oblasť/Projekt | Iba vlastník + členovia môžu VIDIEŤ aj EDITOVAŤ |
| Úloha v projekte | Rovnaká ako viditeľnosť projektu |
| Osobný inbox | Iba vlastník |
| Tímový inbox | Všetci členovia org |
| Časové záznamy | Vlastné záznamy + admin vidí všetko |

### Budúce úvahy (databáza je navrhnutá na podporu)
- **Zmeny/Dochádzka**: `time_entries.entry_type` už podporuje 'shift', 'break'
- **Opakujúce sa úlohy**: Pridať stĺpec `recurrence_rule` k úlohám neskôr
- **Google Calendar**: Pridať `external_calendar_id` k používateľom, `calendar_event_id` k úlohám
- **Komentáre k úlohám**: Nová tabuľka `task_comments`
- **Prílohy súborov**: Nová tabuľka `task_attachments` so Supabase Storage

---

## Kontrolný zoznam kvality

Pred považovaním funkcie za dokončenú:
- [ ] Funguje na desktope (1200px+)
- [ ] Funguje na tablete (768px - 1199px)
- [ ] Funguje na mobile (< 768px)
- [ ] Zobrazuje sa stav načítavania počas async operácií
- [ ] Chybový stav je spracovaný s používateľsky prívetivou správou
- [ ] Navrhnutý prázdny stav (napr. "Zatiaľ žiadne úlohy")
- [ ] Prístupné cez klávesnicu
- [ ] Realtime aktualizácie fungujú (ak je relevantné)
- [ ] RLS pravidlá otestované (nemožno pristúpiť k dátam inej org)

---

## Príkaz na začatie

Po nastavení spusti vývoj:
```bash
npm run dev
```

Prvá úloha: Implementuj autentifikačný flow, potom postav layout bočného panela.

---

*Tento prompt by mal dať Claude Code všetko potrebné na vytvorenie ZITA TODO MVP. Dizajnové tokeny (farby, fonty) definujeme v samostatnej session.*
