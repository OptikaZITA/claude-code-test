# ZITA TODO - Dokumentácia vývoja

## Zhrnutie projektu

Aplikácia ZITA TODO bola vytvorená pomocou Claude Code na základe špecifikácie v súbore `zita-todo-prompt-sk.md`.

**Dátum vytvorenia**: 2. januára 2026
**Čas vývoja**: ~2 hodiny (interaktívna session)

---

## Fázy vývoja

### Fáza 1: Nastavenie projektu
- Vytvorenie Next.js 16 projektu s TypeScript
- Konfigurácia Tailwind CSS
- Inštalácia závislostí (@supabase/ssr, @dnd-kit, date-fns, lucide-react)

### Fáza 2: Supabase integrácia
- `lib/supabase/client.ts` - Browser klient
- `lib/supabase/server.ts` - Server klient
- `lib/supabase/types.ts` - TypeScript typy pre databázu
- Databázová schéma v `supabase-schema.sql`

### Fáza 3: Autentifikácia
- Login stránka (`app/(auth)/login/page.tsx`)
- Signup stránka (`app/(auth)/signup/page.tsx`)
- OAuth callback (`app/(auth)/auth/callback/route.ts`)
- Client-side auth ochrana v dashboard layoute

### Fáza 4: UI komponenty
- Button, Input, Textarea, Modal
- Checkbox, Badge, Dropdown
- Avatar s fallback na iniciálky

### Fáza 5: Layout
- Sidebar s navigáciou a projektmi
- Header s vyhľadávaním
- Mobile navigation (bottom tabs)

### Fáza 6: Úlohy a Inbox
- TaskList, TaskItem komponenty
- TaskQuickAdd pre rýchle pridávanie
- Inbox stránka (osobný/tímový)
- React hooks: useTasks, useInboxTasks

### Fáza 7: Kanban zobrazenie
- KanbanBoard s drag & drop (@dnd-kit)
- KanbanColumn s droppable zónou
- KanbanCard s sortable
- Projekt stránky (list + kanban view)

### Fáza 8: Sledovanie času
- Timer komponent (štart/stop)
- TimeEntriesList - história záznamov
- useTimeTracking hook
- TaskDetail modal s integrovaným časovačom

---

## Problémy a riešenia

### 1. Edge Function nekompatibilita
**Problém**: Middleware s `@supabase/ssr` nefungoval na Vercel Edge
**Riešenie**: Odstránenie middleware, presun auth logiky do client components

### 2. 404 na Vercel
**Problém**: "No framework detected", všetky stránky 404
**Riešenie**: Nastavenie Root Directory = `zita-todo` vo Vercel settings

### 3. TypeScript typy pre Supabase
**Problém**: Strict typing spôsoboval `never` typy
**Riešenie**: Odstránenie generického parametra z createClient()

### 4. RLS blokuje operácie
**Problém**: Úlohy sa neukladali kvôli Row Level Security
**Riešenie**: Upravené RLS politiky, možnosť dočasne vypnúť pre testovanie

---

## Konfigurácia

### Vercel
```
Root Directory: zita-todo
Framework: Next.js
Environment Variables:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Supabase
```
Authentication > URL Configuration:
  - Site URL: https://claude-code-test-inky.vercel.app
  - Redirect URLs: https://claude-code-test-inky.vercel.app/auth/callback

Authentication > Providers > Email:
  - Confirm email: DISABLED (pre testovanie)
```

---

## Vytvorené súbory

### App Router stránky
```
app/
├── page.tsx                              # Root redirect
├── layout.tsx                            # Root layout
├── globals.css                           # Globálne štýly
├── (auth)/
│   ├── layout.tsx                        # Auth layout
│   ├── login/page.tsx                    # Prihlásenie
│   ├── signup/page.tsx                   # Registrácia
│   └── auth/callback/route.ts            # OAuth callback
└── (dashboard)/
    ├── layout.tsx                        # Dashboard layout + auth
    ├── inbox/
    │   ├── page.tsx                      # Osobný inbox
    │   └── team/page.tsx                 # Tímový inbox
    └── projects/[projectId]/
        ├── page.tsx                      # Projekt - zoznam
        └── kanban/page.tsx               # Projekt - kanban
```

### Komponenty
```
components/
├── layout/
│   ├── sidebar.tsx                       # Bočný panel
│   ├── header.tsx                        # Hlavička
│   └── mobile-nav.tsx                    # Mobilná navigácia
├── tasks/
│   ├── task-list.tsx                     # Zoznam úloh
│   ├── task-item.tsx                     # Položka úlohy
│   ├── task-quick-add.tsx                # Rýchle pridanie
│   ├── task-detail.tsx                   # Detail úlohy
│   ├── kanban-board.tsx                  # Kanban tabuľa
│   ├── kanban-column.tsx                 # Kanban stĺpec
│   └── kanban-card.tsx                   # Kanban karta
├── time-tracking/
│   ├── timer.tsx                         # Časovač
│   └── time-entries-list.tsx             # Zoznam záznamov
└── ui/
    ├── button.tsx
    ├── input.tsx
    ├── textarea.tsx
    ├── modal.tsx
    ├── checkbox.tsx
    ├── badge.tsx
    ├── dropdown.tsx
    └── avatar.tsx
```

### Hooks a utility
```
lib/
├── hooks/
│   ├── use-tasks.ts                      # CRUD úloh
│   ├── use-projects.ts                   # Projekty a ich úlohy
│   └── use-time-tracking.ts              # Časové záznamy
├── supabase/
│   ├── client.ts                         # Browser klient
│   ├── server.ts                         # Server klient
│   └── types.ts                          # DB typy
└── utils/
    ├── cn.ts                             # Tailwind merge
    └── date.ts                           # Formátovanie dátumov
```

---

## Git história

```
feat: ZITA TODO MVP implementation
fix: use relative import in middleware for Edge Function compatibility
fix: inline middleware code for Edge compatibility
fix: remove middleware (Edge incompatible)
fix: add client-side auth protection in dashboard layout
fix: convert root page to client component
fix: add vercel.json config
fix: simplify task creation without organization
```

---

## Nasledujúce kroky

1. **Opraviť ukladanie úloh** - RLS politiky alebo organization setup
2. **Testovanie** - End-to-end testovanie všetkých funkcií
3. **Real-time** - Supabase subscriptions pre live updates
4. **Produkčné RLS** - Správne nastavenie bezpečnosti
5. **Organizácie** - Workflow pre vytváranie a správu organizácií
