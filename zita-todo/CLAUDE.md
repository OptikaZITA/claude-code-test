# ZITA TODO - Claude Code Project

## Prehľad projektu

ZITA TODO je tímová produktivita aplikácia inšpirovaná Things 3 s Kanban zobrazením a sledovaním času. Určená pre ~20 členný tím.

## Technológie

- **Frontend**: Next.js 16+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Drag & Drop**: @dnd-kit
- **Dátumy**: date-fns (slovenský locale)
- **Deployment**: Vercel

## Štruktúra projektu

```
zita-todo/
├── app/
│   ├── (auth)/           # Auth stránky (login, signup)
│   ├── (dashboard)/      # Hlavná aplikácia
│   │   ├── inbox/        # Osobný a tímový inbox
│   │   └── projects/     # Projekty s Kanban zobrazením
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Presmerovanie na login/inbox
├── components/
│   ├── layout/           # Sidebar, Header, MobileNav
│   ├── tasks/            # TaskList, TaskItem, Kanban komponenty
│   ├── time-tracking/    # Timer, TimeEntriesList
│   └── ui/               # Button, Input, Modal, Badge, Avatar...
├── lib/
│   ├── hooks/            # React hooks (useTasks, useProjects, useTimeTracking)
│   ├── supabase/         # Supabase klienti (client, server)
│   └── utils/            # Pomocné funkcie (cn, date)
├── types/                # TypeScript typy
└── supabase-schema.sql   # Databázová schéma
```

## Supabase konfigurácia

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

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

### RLS politiky
Pre testovanie bez organizácie:
```sql
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
```

Pre produkciu - povoliť RLS a nastaviť politiky v `supabase-schema.sql`.

## Dôležité poznámky

### Middleware
Middleware bol odstránený kvôli Edge Function nekompatibilite s `@supabase/ssr`. Auth ochrana je riešená na úrovni:
- `app/(dashboard)/layout.tsx` - client-side redirect na /login
- `app/page.tsx` - client-side check a redirect

### Vercel deployment
- **Root Directory**: `zita-todo`
- **Framework**: Next.js (auto-detect)
- Nastaviť env variables vo Vercel dashboard

### Supabase Auth
- Vypnúť "Confirm email" pre jednoduchšie testovanie
- Site URL: `https://tvoja-app.vercel.app`
- Redirect URL: `https://tvoja-app.vercel.app/auth/callback`

## Časté problémy

### 404 na všetkých stránkach
- Skontrolovať Root Directory vo Vercel = `zita-todo`
- Redeployovať bez cache

### Úlohy sa neukladajú
- Skontrolovať RLS politiky v Supabase
- Dočasne vypnúť RLS: `ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;`

### MIDDLEWARE_INVOCATION_FAILED
- Middleware bol odstránený, použiť client-side auth

## Príkazy

```bash
# Vývoj
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## TODO pre dokončenie MVP

- [ ] Opraviť RLS politiky pre produkciu
- [ ] Pridať vytváranie organizácií
- [ ] Implementovať správu projektov (CRUD)
- [ ] Pridať filtrovanie úloh
- [ ] Implementovať real-time updates (Supabase subscriptions)
- [ ] Pridať notifikácie
- [ ] Mobilná optimalizácia
