# ZITA TODO - Kompletná dokumentácia

## Prehľad projektu

ZITA TODO je tímová produktivita aplikácia inšpirovaná Things 3 s Kanban zobrazením a sledovaním času. Určená pre ~20 členný tím.

**Dátum vytvorenia**: 2. januára 2026
**Posledná aktualizácia**: 4. januára 2026

---

## Technológie

- **Frontend**: Next.js 16+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Real-time subscriptions)
- **Drag & Drop**: @dnd-kit
- **Dátumy**: date-fns (slovenský locale)
- **Ikony**: lucide-react
- **Deployment**: Vercel
- **PWA**: Service Worker, Web Push API

---

## Štruktúra projektu

```
zita-todo/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                    # Auth layout
│   │   ├── login/page.tsx                # Prihlásenie
│   │   ├── signup/page.tsx               # Registrácia
│   │   └── auth/callback/route.ts        # OAuth callback
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard layout + auth ochrana
│   │   ├── inbox/
│   │   │   ├── page.tsx                  # Osobný inbox
│   │   │   └── team/page.tsx             # Tímový inbox
│   │   ├── calendar/
│   │   │   └── page.tsx                  # Kalendárové zobrazenie
│   │   ├── projects/
│   │   │   ├── page.tsx                  # Zoznam projektov
│   │   │   └── [projectId]/
│   │   │       ├── page.tsx              # Projekt - zoznam úloh
│   │   │       └── kanban/page.tsx       # Projekt - kanban zobrazenie
│   │   └── settings/
│   │       └── page.tsx                  # Nastavenia (notifikácie, integrácie)
│   ├── layout.tsx                        # Root layout + ThemeProvider
│   ├── page.tsx                          # Presmerovanie na login/inbox
│   └── globals.css                       # Globálne štýly + dark mode CSS variables
├── components/
│   ├── calendar/
│   │   ├── calendar-view.tsx             # Mesačný kalendár
│   │   └── calendar-day.tsx              # Deň v kalendári
│   ├── export/
│   │   └── export-menu.tsx               # Export dropdown (CSV, PDF)
│   ├── integrations/
│   │   ├── integration-settings.tsx      # Hlavný komponent integrácií
│   │   ├── slack-settings.tsx            # Slack webhook konfigurácia
│   │   └── email-settings.tsx            # Email notifikácie konfigurácia
│   ├── layout/
│   │   ├── sidebar.tsx                   # Bočný panel (slide-in na mobile)
│   │   ├── header.tsx                    # Hlavička s vyhľadávaním
│   │   ├── mobile-nav.tsx                # Mobilná spodná navigácia
│   │   ├── connection-status.tsx         # Real-time indikátor pripojenia
│   │   ├── offline-indicator.tsx         # Offline/update banner
│   │   └── error-display.tsx             # Zobrazenie chýb (Supabase, auth)
│   ├── notifications/
│   │   └── notification-settings.tsx     # Push notifikácie nastavenia
│   ├── organization/
│   │   └── organization-setup.tsx        # Setup wizard pre nových používateľov
│   ├── projects/
│   │   ├── project-card.tsx              # Karta projektu s progress barom
│   │   ├── project-form.tsx              # Formulár pre vytváranie/úpravu
│   │   └── project-list.tsx              # Zoznam projektov
│   ├── tasks/
│   │   ├── task-list.tsx                 # Zoznam úloh
│   │   ├── task-item.tsx                 # Položka úlohy (swipe gestá)
│   │   ├── task-quick-add.tsx            # Rýchle pridanie úlohy
│   │   ├── task-detail.tsx               # Detail úlohy modal
│   │   ├── task-filters.tsx              # Filtrovanie úloh
│   │   ├── recurrence-config.tsx         # Konfigurácia opakovaných úloh
│   │   ├── kanban-board.tsx              # Kanban tabuľa
│   │   ├── kanban-column.tsx             # Kanban stĺpec
│   │   └── kanban-card.tsx               # Kanban karta
│   ├── time-tracking/
│   │   ├── timer.tsx                     # Časovač (štart/stop)
│   │   └── time-entries-list.tsx         # História záznamov
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── textarea.tsx
│       ├── modal.tsx                     # Full-screen na mobile
│       ├── checkbox.tsx
│       ├── badge.tsx
│       ├── dropdown.tsx
│       ├── avatar.tsx
│       ├── toast.tsx                     # Toast notifikácie
│       ├── toast-container.tsx           # Kontajner pre toasty
│       ├── theme-toggle.tsx              # Prepínač dark/light mode
│       └── keyboard-shortcuts-modal.tsx  # Modal s klávesovými skratkami
├── lib/
│   ├── contexts/
│   │   ├── toast-context.tsx             # Globálny toast provider
│   │   └── theme-context.tsx             # Dark/light/system theme provider
│   ├── hooks/
│   │   ├── use-tasks.ts                  # CRUD úloh
│   │   ├── use-projects.ts               # CRUD projektov
│   │   ├── use-time-tracking.ts          # Časové záznamy
│   │   ├── use-organization.ts           # Správa organizácie
│   │   ├── use-task-filters.ts           # Filtrovanie s URL sync
│   │   ├── use-realtime.ts               # Generický real-time hook
│   │   ├── use-realtime-tasks.ts         # Real-time pre úlohy
│   │   ├── use-toast.ts                  # Toast hook
│   │   ├── use-debounce.ts               # Debounce utility
│   │   ├── use-keyboard-shortcuts.ts     # Globálne klávesové skratky
│   │   ├── use-service-worker.ts         # Service worker registrácia
│   │   ├── use-push-notifications.ts     # Push notifikácie API
│   │   └── use-integrations.ts           # Slack/Email integrácie
│   ├── supabase/
│   │   ├── client.ts                     # Browser klient
│   │   ├── server.ts                     # Server klient
│   │   └── types.ts                      # TypeScript typy
│   └── utils/
│       ├── cn.ts                         # Tailwind class merge
│       ├── date.ts                       # Formátovanie dátumov
│       ├── recurrence.ts                 # Výpočty pre opakované úlohy
│       └── export.ts                     # CSV/PDF export funkcie
├── public/
│   ├── sw.js                             # Service Worker
│   ├── manifest.json                     # PWA manifest
│   └── icons/                            # PWA ikony
├── types/
│   └── index.ts                          # TypeScript typy
├── .claude/
│   └── mcp.json                          # MCP konfigurácia (gitignored)
├── supabase-schema.sql                   # Databázová schéma
└── supabase-rls-fix.sql                  # Opravené RLS politiky
```

---

## Implementované funkcie

### Fáza 10: Rozšírené funkcie (DOKONČENÉ)

#### 1. Dark Mode
**Súbory:**
- `lib/contexts/theme-context.tsx` - ThemeProvider s localStorage persistenciou
- `components/ui/theme-toggle.tsx` - Prepínač (light/dark/system)
- `app/globals.css` - CSS variables pre obe témy

```typescript
// Použitie
const { theme, setTheme } = useTheme()
setTheme('dark') // 'light' | 'dark' | 'system'
```

#### 2. Keyboard Shortcuts
**Súbory:**
- `lib/hooks/use-keyboard-shortcuts.ts` - Globálny handler
- `components/ui/keyboard-shortcuts-modal.tsx` - Help modal

**Skratky:**
- `N` - Nová úloha
- `I` - Inbox
- `T` - Tímový inbox
- `/` - Vyhľadávanie
- `D` - Prepnúť dark mode
- `Shift+?` - Zobraziť skratky
- `Escape` - Zavrieť modal

#### 3. Offline podpora (PWA)
**Súbory:**
- `public/sw.js` - Service Worker (network-first stratégia)
- `public/manifest.json` - PWA manifest
- `lib/hooks/use-service-worker.ts` - Registrácia a stav
- `components/layout/offline-indicator.tsx` - Offline banner

**Funkcie:**
- Offline caching stránok
- Background sync pre úlohy
- Push notifikácie handler
- Update available notifikácia

#### 4. Recurring Tasks
**Súbory:**
- `types/index.ts` - RecurrenceRule, RecurrenceFrequency typy
- `components/tasks/recurrence-config.tsx` - UI konfigurácia
- `lib/utils/recurrence.ts` - Helper funkcie

```typescript
interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  weekDays?: WeekDay[]
  monthDay?: number
  endDate?: string
  endAfterOccurrences?: number
}
```

#### 5. Kalendárové zobrazenie
**Súbory:**
- `components/calendar/calendar-view.tsx` - Mesačný pohľad
- `components/calendar/calendar-day.tsx` - Deň s úlohami
- `app/(dashboard)/calendar/page.tsx` - Kalendár stránka

**Funkcie:**
- Mesačná navigácia
- Drag & drop úloh medzi dňami
- Farebné indikátory priority
- Kliknutie na úlohu otvorí detail

#### 6. Export dát
**Súbory:**
- `lib/utils/export.ts` - Export funkcie
- `components/export/export-menu.tsx` - Dropdown menu

```typescript
exportTasksToCSV(tasks, filename)   // CSV s UTF-8 BOM
exportTasksToPDF(tasks, title)      // PDF cez print window
exportTimeEntriesToCSV(entries, filename)
exportTimeEntriesToPDF(entries, title)
```

#### 7. Push notifikácie
**Súbory:**
- `lib/hooks/use-push-notifications.ts` - Web Push API
- `components/notifications/notification-settings.tsx` - Nastavenia UI
- `public/sw.js` - Push handler s akciami

**Typy notifikácií:**
- Pripomienky úloh (s akciami: Dokončiť, Odložiť)
- Priradené úlohy
- Komentáre
- Tímové aktualizácie

#### 8. Integrácie (Slack, Email)
**Súbory:**
- `lib/hooks/use-integrations.ts` - Správa integrácií
- `components/integrations/slack-settings.tsx` - Slack webhook
- `components/integrations/email-settings.tsx` - Email notifikácie
- `components/integrations/integration-settings.tsx` - Hlavný komponent

**Slack notifikácie:**
- Vytvorené/dokončené úlohy
- Priradené úlohy
- Blížiaci sa termín
- Komentáre

**Email notifikácie:**
- Denný prehľad
- Týždenný report
- Priradené úlohy
- Zmienky v komentároch

---

## MCP Konfigurácia

Projekt používa Supabase MCP server pre priamy prístup k databáze.

**Konfigurácia:** `.claude/mcp.json` (gitignored)

**Potrebné premenné:**
- `SUPABASE_URL` - URL Supabase projektu
- `SUPABASE_SERVICE_ROLE_KEY` - Service role kľúč

---

## Supabase konfigurácia

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### RLS Politiky

**Problém 1:** Pôvodné RLS politiky nefungovali pre používateľov bez organizácie (NULL organization_id).

**Problém 2:** RLS politiky spôsobovali "infinite recursion" chybu, pretože politiky na tabuľke `users` obsahovali subquery na tú istú tabuľku.

**Riešenie:** Vytvorená `SECURITY DEFINER` funkcia, ktorá obchádza RLS a zabraňuje rekurzii:

```sql
-- Helper funkcia na získanie organization_id aktuálneho používateľa
-- SECURITY DEFINER obchádza RLS a zabraňuje nekonečnej rekurzii
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$;

-- Príklad použitia v RLS politike (bez rekurzie)
CREATE POLICY "Users can view tasks" ON tasks
  FOR SELECT USING (
    inbox_user_id = auth.uid()
    OR created_by = auth.uid()
    OR assignee_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND organization_id = public.get_my_organization_id()
    )
    OR (inbox_type = 'team' AND auth.uid() IS NOT NULL)
  );
```

**Opravené tabuľky:**
- `users` - politiky pre SELECT, UPDATE, INSERT
- `tasks` - politiky pre SELECT, UPDATE
- `projects` - politiky pre SELECT, UPDATE
- `time_entries` - politiky pre SELECT
- `areas` - politiky pre SELECT, UPDATE
- `tags` - politiky pre SELECT
- `organizations` - politiky pre SELECT

### Databázové funkcie
- `get_my_organization_id()` - SECURITY DEFINER funkcia na získanie organization_id aktuálneho používateľa (obchádza RLS, zabraňuje rekurzii)

### Databázové tabuľky
- `organizations` - Organizácie
- `users` - Používatelia (prepojenie s auth.users)
- `areas` - Oblasti (skupiny projektov)
- `projects` - Projekty
- `tasks` - Úlohy
- `tags` - Štítky
- `task_tags` - Prepojenie úloh a štítkov
- `time_entries` - Časové záznamy
- `invitations` - Pozvánky do tímu
- `area_members` - Členovia oblastí
- `project_members` - Členovia projektov

---

## Design systém

### Farby (CSS Variables)

**Light Mode:**
```css
--bg-primary: #ffffff
--bg-secondary: #f5f5f7
--text-primary: #1D1D1F
--text-secondary: #86868B
--color-primary: #007AFF
--color-success: #34C759
--color-warning: #FF9500
--color-error: #FF3B30
```

**Dark Mode:**
```css
--bg-primary: #0a0a0a
--bg-secondary: #1c1c1e
--text-primary: #ededed
--text-secondary: #a1a1a6
--color-primary: #0A84FF
--color-success: #30D158
--color-warning: #FF9F0A
--color-error: #FF453A
```

---

## Príkazy

```bash
# Vývoj
npm run dev

# Build
npm run build

# Lint
npm run lint
```

---

## Problémy a riešenia

### 1. RLS Error 500 - Infinite Recursion
**Problém:** Supabase vracala 500 error s hláškou "infinite recursion detected in policy for relation users"
**Príčina:** RLS politiky na tabuľke `users` obsahovali subquery `SELECT organization_id FROM users WHERE id = auth.uid()`, čo spôsobovalo nekonečnú rekurziu
**Riešenie:**
1. Vytvorená `SECURITY DEFINER` funkcia `get_my_organization_id()` ktorá obchádza RLS
2. Všetky RLS politiky prepísané tak, aby používali túto funkciu namiesto subquery

### 2. Falošný "Ste offline" banner
**Problém:** Appka zobrazovala oranžový offline banner aj keď bol používateľ online
**Príčina:** `navigator.onLine` API je nespoľahlivé a často vracia `false` aj keď je pripojenie funkčné
**Riešenie:** Upravený `use-service-worker.ts`:
- `isOnline` začína ako `true` (predpokladáme online stav)
- Offline stav sa nastaví len keď prehliadač vyšle `offline` event
- Už sa nespolieha na `navigator.onLine` pri inicializácii

### 3. "Ste offline" pri Supabase chybe
**Problém:** Appka zobrazovala offline stav pri databázových chybách
**Riešenie:** Pridaný `error-display.tsx` komponent s lepším error handling

### 4. TypeScript Uint8Array error
**Problém:** VAPID key conversion v push notifications
**Riešenie:** Zmena return typu na `ArrayBuffer`

---

## Status

### MVP funkcie (DOKONČENÉ)
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

### Rozšírené funkcie (DOKONČENÉ)
- [x] Dark mode
- [x] Keyboard shortcuts
- [x] Offline podpora (Service Worker)
- [x] Recurring tasks
- [x] Kalendárové zobrazenie
- [x] Export dát (CSV, PDF)
- [x] Push notifikácie
- [x] Integrácie (Slack, Email)

**Všetky plánované funkcie boli implementované!**
