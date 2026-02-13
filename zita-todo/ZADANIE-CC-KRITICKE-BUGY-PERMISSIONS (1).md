# ZADANIE PRE CLAUDE CODE: Kritické bugy — Permissions & Visibility

## Dátum: 13. február 2026
## Priorita: 🔴 KRITICKÁ
## Projekt: ZITA TODO (Next.js + Supabase)

---

## KONTEXT

ZITA TODO je task management aplikácia. Má dvoch aktívnych používateľov:
- **DANO** — rola `admin`, všetko funguje správne
- **NATY** (Naty Domanická) — rola `member`, má dva kritické problémy

Aplikácia beží na:
- **Frontend:** Next.js 16+, TypeScript, Tailwind, shadcn/ui, @dnd-kit
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Deployment:** Vercel

---

## BUG 1: Drag & Drop nefunguje pre Member (NATY)

### Popis problému
- DANO (admin) môže drag & drop tasky medzi sekciami/stĺpcami — funguje ✅
- NATY (member) ťahá task, zobrazí sa preview/tooltip, ale po pustení sa task vráti na pôvodné miesto ❌
- Problém je v oboch views: **Kanban** aj **List view**

### Čo treba urobiť

#### Krok 1: Nájdi onDragEnd handler
Pozri tieto súbory:
- `components/tasks/kanban-board.tsx`
- `components/tasks/task-list.tsx`
- `components/layout/sidebar-drop-item.tsx`

Zisti:
- Aký API endpoint/Supabase volanie sa robí pri drag & drop?
- Aktualizuje sa `sort_order`, `status`, `project_id`, alebo `when_type`?
- Je tam error handling? Loguje sa chyba?

#### Krok 2: Skontroluj RLS politiky
Pozri Supabase migrácie alebo dashboard. Nájdi RLS politiky na tabuľke `tasks`.

Typický problém: RLS politika povoľuje UPDATE len pre `admin` rolu, ale `member` nemá povolený UPDATE.

**Čo hľadáš:**
```sql
-- Existuje politika typu?
CREATE POLICY "members can update tasks" ON tasks
  FOR UPDATE
  USING (organization_id = auth.jwt() -> 'organization_id')
  WITH CHECK (organization_id = auth.jwt() -> 'organization_id');
```

Ak taká politika neexistuje alebo je obmedzená len na admin, treba ju opraviť.

#### Krok 3: Otestuj priamo v Supabase
Spusti v SQL editore:
```sql
-- Pozri všetky RLS politiky pre tasks
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'tasks';
```

#### Krok 4: Oprav RLS
Member (NATY) potrebuje mať povolený UPDATE na tabuľke `tasks`, minimálne na tieto stĺpce:
- `sort_order` (pre zmenu poradia)
- `status` (pre presun medzi stĺpcami v Kanban)
- `project_id` (pre presun do iného projektu)
- `when_type` (pre presun medzi Today/Anytime/atď.)

**Príklad opravy:**
```sql
-- Ak chýba UPDATE politika pre memberov, pridaj:
CREATE POLICY "org_members_can_update_own_tasks" ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

⚠️ **POZOR:** Neodstraňuj existujúce politiky bez pochopenia. Najprv zisti aké sú, potom uprav.

---

## BUG 2: Task vytvorený NATY nie je viditeľný

### Popis problému
- NATY vytvorila task **"10.2. NaČa Hrušovská // MARYLL"** v Kanban view
- Task nie je viditeľný ani pre NATY, ani pre DANO
- Task buď: nebol uložený, alebo bol uložený s chybnými údajmi

### Čo treba urobiť

#### Krok 1: Nájdi task v databáze
```sql
-- Hľadaj task podľa názvu
SELECT 
  id, title, user_id, organization_id, project_id,
  area_id, status, when_type, deleted_at, created_at,
  assignee_id
FROM tasks 
WHERE title ILIKE '%Hrušovská%' 
   OR title ILIKE '%MARYLL%'
   OR title ILIKE '%Hrusovska%'
ORDER BY created_at DESC;
```

#### Krok 2: Diagnostikuj problém

Ak task **existuje**, skontroluj:

| Pole | Očakávaná hodnota | Problém ak |
|------|-------------------|------------|
| `organization_id` | UUID organizácie | `NULL` — task nie je priradený k organizácii |
| `status` | `'todo'` | Iná hodnota alebo NULL |
| `when_type` | `'anytime'` alebo `'today'` | NULL alebo neplatná hodnota |
| `deleted_at` | `NULL` | Má hodnotu = soft deleted |
| `user_id` | NATY user ID | NULL alebo iné |

Ak task **neexistuje**:
- Pozri frontend kód pre vytváranie taskov (pravdepodobne `kanban-board.tsx` alebo komponent s "Pridať úlohu")
- Zisti či sa pri vytváraní nastavuje `organization_id`
- Problém môže byť aj v RLS — INSERT politika nepovoľuje NATY vytvárať tasky

#### Krok 3: Oprav task (ak existuje s chybnými údajmi)
```sql
-- Príklad opravy — uprav podľa skutočného stavu
UPDATE tasks 
SET 
  organization_id = 'DOPLŇ_SPRÁVNE_ORG_ID',
  status = 'todo',
  when_type = 'anytime',
  deleted_at = NULL
WHERE title ILIKE '%Hrušovská%' OR title ILIKE '%MARYLL%';
```

#### Krok 4: Oprav root cause
Nájdi v kóde kde sa vytvára nový task a over, že sa **vždy** nastavuje `organization_id` z aktuálne prihláseného používateľa.

Hľadaj niečo ako:
```typescript
// Niekde v create task logike
const { data } = await supabase.from('tasks').insert({
  title: taskTitle,
  organization_id: user.organization_id, // ← TOTO MUSÍ BYŤ VŽDY NASTAVENÉ
  user_id: user.id,
  status: 'todo',
  // ...
});
```

Ak `organization_id` chýba pri inserte, pridaj ho.

#### Krok 5: Skontroluj RLS pre INSERT
```sql
-- Pozri INSERT politiky
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'tasks' AND cmd = 'INSERT';
```

---

## BUG 3 (BONUS): Skontroluj aj SELECT politiky

Je možné, že NATY nevidí niektoré tasky kvôli SELECT RLS politike. Over:

```sql
-- Pozri SELECT politiky
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'tasks' AND cmd = 'SELECT';
```

Member by mal vidieť všetky tasky v rámci svojej organizácie.

---

## POSTUP PRÁCE

1. **Najprv diagnostikuj** — spusti SQL dotazy, pozri RLS politiky, pozri kód
2. **Potom oprav** — najprv databázu (stratený task), potom RLS politiky
3. **Otestuj** — over že NATY môže:
   - [ ] Vidieť všetky tasky vo svojej organizácii
   - [ ] Drag & drop task v List view
   - [ ] Drag & drop task v Kanban view
   - [ ] Vytvoriť nový task a vidieť ho
4. **Deploy** — push na Vercel, over na produkcii

---

## DÔLEŽITÉ SÚBORY V PROJEKTE

```
components/
├── tasks/
│   ├── task-list.tsx           # List view + drag & drop
│   ├── task-detail.tsx         # Task detail modal
│   ├── sortable-task-item.tsx  # Drag & drop wrapper
│   ├── tag-selector.tsx        # Tag dropdown
│   └── kanban-board.tsx        # Kanban view + drag & drop
├── kanban/
│   └── kanban-card.tsx         # Kanban karta
├── filters/
│   ├── active-filters-chips.tsx
│   └── sort-dropdown.tsx
└── layout/
    └── sidebar-drop-item.tsx   # Droppable sidebar
```

### Supabase tabuľky
- `users` — (id, email, nickname, role, organization_id)
- `tasks` — (id, title, status, sort_order, organization_id, user_id, assignee_id)
- `tags` — (id, title, color, organization_id)
- `task_tags` — (task_id, tag_id)
- `projects`, `areas`

### User roles
- `admin` — plné oprávnenia (DANO)
- `member` — základný člen (NATY)

---

## OČAKÁVANÝ VÝSTUP

Po dokončení tohto zadania:
1. NATY (member) môže drag & drop tasky — Kanban aj List view
2. Task "NaČa Hrušovská // MARYLL" je viditeľný alebo vieme čo sa stalo
3. Nové tasky vytvorené NATY sú vždy viditeľné pre celú organizáciu
4. Zmeny sú deploynuté na Vercel

---

*Vytvorené: 13. február 2026*
