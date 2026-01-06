# ZITA TODO - Správa používateľov a Filtre
## Finálne zadanie pre Claude Code

**Verzia:** 1.0
**Dátum:** 5. januára 2026

---

## PREHĽAD

Implementuj systém správy používateľov s rolami, oddeleniami a filtrami.

### Hlavné funkcie:
1. Rozšírenie users tabuľky (nickname, position, status, role)
2. Nová tabuľka department_members
3. Sidebar logika (moje vs všetky oddelenia)
4. Filtre pre tasky (Status, Assignee, Due Date, Priority, Tag, Projekt, When)
5. Stránka /settings/users pre správu používateľov
6. Pozvánkový systém

---

## FÁZA 1: Databázové zmeny

### 1.1 Rozšír tabuľku `users`

```sql
-- Pridaj nové stĺpce
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'invited' 
  CHECK (status IN ('active', 'inactive', 'invited'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS start_date DATE;

-- Rozšír role enum
-- Zmeň existujúci CHECK constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'strategicka_rada', 'hr', 'member'));
```

### 1.2 Vytvor tabuľku `department_members`

```sql
CREATE TABLE IF NOT EXISTS department_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, department_id)
);

-- RLS politiky
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view department memberships"
  ON department_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage department memberships"
  ON department_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index pre rýchle vyhľadávanie
CREATE INDEX IF NOT EXISTS idx_department_members_user 
  ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_department_members_department 
  ON department_members(department_id);
```

### 1.3 Rozšír tabuľku `invitations`

```sql
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS departments JSONB DEFAULT '[]';
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS token TEXT UNIQUE;

-- Rozšír role
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE invitations ADD CONSTRAINT invitations_role_check 
  CHECK (role IN ('admin', 'strategicka_rada', 'hr', 'member'));
```

### 1.4 Uprav tabuľku `areas` pre globálne oddelenia

```sql
-- Pridaj flag pre globálne oddelenia
ALTER TABLE areas ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Existujúce fixné oddelenia označ ako globálne
UPDATE areas SET is_global = true, user_id = NULL 
WHERE title IN ('Prevádzka', 'Rámy', 'Financie', 'Marketing', 'New Biz', 'Inovácie', 'Facility', 'HR');
```

### 1.5 Seed data - 18 používateľov

**DÔLEŽITÉ:** Tento script spusti až PO tom, čo sa používatelia zaregistrujú cez Supabase Auth, alebo použi Supabase Dashboard na vytvorenie auth.users záznamov.

```sql
-- Pomocná funkcia
CREATE OR REPLACE FUNCTION get_area_id_by_title(area_title TEXT) 
RETURNS UUID AS $$
  SELECT id FROM areas WHERE title = area_title LIMIT 1;
$$ LANGUAGE SQL;

-- Aktualizuj používateľov (predpokladá že už existujú v auth.users)
-- Použiješ UPDATE alebo INSERT podľa toho či používatelia existujú

-- Príklad pre jedného používateľa:
-- UPDATE users SET 
--   full_name = 'Daniel Grigar',
--   nickname = 'Dano',
--   position = 'Principál',
--   role = 'admin',
--   status = 'active'
-- WHERE email = 'dano.grigar@gmail.com';
```

**Zoznam 18 používateľov:**

| Email | Meno | Prezývka | Rola | Pozícia | Oddelenia |
|-------|------|----------|------|---------|-----------|
| dano.grigar@gmail.com | Daniel Grigar | Dano | admin | Principál | Všetky (New Biz, Inovácie) |
| zita.grigarova@gmail.com | Zita Grigarová | Zita | strategicka_rada | Principál | Všetky |
| matej.zoldos@gmail.com | Matej Žoldoš | Jolo | strategicka_rada | | Všetky (Financie, Facility) |
| kata.tomasikova@gmail.com | Katarína Tomášiková | Kata | strategicka_rada | | Všetky |
| katka.kalocajova@gmail.com | Katka Grigarová | Katula | strategicka_rada | | Všetky (Marketing, New Biz) |
| krcmeryoval@gmail.com | Lucia Urban | Lucia | hr | HR | Všetky |
| domanicka.n@gmail.com | Natália Domanická | Naty | member | Optička, manažérka prevádzky | Prevádzka, Rámy |
| veronika.letko@gmail.com | Veronika Škodová | Verča | member | Optometristka | Prevádzka |
| dan.daniel.vallo@gmail.com | Daniel Vallo | Borris | member | Optik | Prevádzka |
| lidosta8888@gmail.com | Lidiia Steshenko | Lida | member | Asistent predaja | Prevádzka |
| dubenova4.a@gmail.com | Anna Kristína Dubeňová | Kika | member | Optička | Prevádzka |
| dibelka.peter@gmail.com | Peter Dibelka | Pyty | member | Optik | Prevádzka |
| junkji@email.cz | Jiří Junker | Jirka | member | Optometrista | Prevádzka |
| b.leschingerova@gmail.com | Barbara Garaj | Baša | member | Marketingová špecialistka | Marketing |
| hurajtovav23@gmail.com | Vanesa Hurajtová | Vanesa | member | Optička | Prevádzka |
| henamasar@gmail.com | Henrieta Masárová | Heni | member | Asistent predaja | Prevádzka |
| tomas.ksisky@gmail.com | Tomáš Kšinský | Tomáš | member | Optometrista | Prevádzka |
| kvasovazuzana@gmail.com | Zuzana Kvasová | Zuzi | member | Optometristka | Prevádzka |

---

## FÁZA 2: TypeScript typy

### 2.1 Vytvor/uprav `lib/types/user.ts`

```typescript
export type UserRole = 'admin' | 'strategicka_rada' | 'hr' | 'member';
export type UserStatus = 'active' | 'inactive' | 'invited';

export interface User {
  id: string;
  email: string;
  full_name: string;
  nickname: string;
  avatar_url: string | null;
  position: string | null;
  role: UserRole;
  status: UserStatus;
  organization_id: string | null;
  invited_by: string | null;
  invited_at: string | null;
  last_login_at: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentMember {
  id: string;
  user_id: string;
  department_id: string;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  full_name: string;
  nickname: string;
  position: string | null;
  role: UserRole;
  departments: string[];
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// Roly ktoré vidia všetky oddelenia
export const FULL_ACCESS_ROLES: UserRole[] = ['admin', 'strategicka_rada', 'hr'];

export function canSeeAllDepartments(role: UserRole): boolean {
  return FULL_ACCESS_ROLES.includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}
```

### 2.2 Vytvor `lib/types/filters.ts`

```typescript
export type DueDateFilter = 'today' | 'this_week' | 'this_month' | 'overdue' | 'no_date';
export type PriorityFilter = 'urgent' | 'high' | 'medium' | 'low';
export type StatusFilter = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type WhenFilter = 'today' | 'anytime' | 'someday' | 'scheduled';

export interface TaskFilters {
  status: StatusFilter | null;
  assigneeIds: string[];
  dueDate: DueDateFilter | null;
  priority: PriorityFilter | null;
  tagIds: string[];
  projectId: string | null;
  when: WhenFilter | null;
}

export const DEFAULT_FILTERS: TaskFilters = {
  status: null,
  assigneeIds: [],
  dueDate: null,
  priority: null,
  tagIds: [],
  projectId: null,
  when: null,
};
```

---

## FÁZA 3: Hooky

### 3.1 Vytvor `lib/hooks/use-user-departments.ts`

```typescript
// Hook pre načítanie oddelení používateľa
// - Ak user má role admin/strategicka_rada/hr → vráti všetky oddelenia
// - Inak vráti len oddelenia kde je členom (cez department_members)

export function useUserDepartments() {
  // Implementácia...
  return { 
    myDepartments,      // Oddelenia kde som členom
    allDepartments,     // Všetky oddelenia
    otherDepartments,   // Oddelenia kde NIE som členom
    loading 
  };
}
```

### 3.2 Vytvor `lib/hooks/use-task-filters.ts`

```typescript
// Hook pre správu filtrov
export function useTaskFilters() {
  // Implementácia...
  return { 
    filters, 
    setFilter, 
    clearFilters, 
    hasActiveFilters 
  };
}
```

### 3.3 Vytvor `lib/hooks/use-users-management.ts`

```typescript
// Hook pre správu používateľov (len pre admin)
export function useUsersManagement() {
  // Implementácia...
  return { 
    users, 
    invitations,
    loading,
    inviteUser,
    updateUser,
    deactivateUser,
    reactivateUser,
    deleteInvitation
  };
}
```

### 3.4 Vytvor `lib/utils/filter-query.ts`

```typescript
// Utility pre aplikovanie filtrov na Supabase query
export function applyTaskFilters(query, filters: TaskFilters) {
  // Implementácia...
  return query;
}
```

---

## FÁZA 4: Sidebar úpravy

### 4.1 Uprav `components/layout/sidebar.tsx`

**Požiadavky:**
- Zobrazuj `nickname` namiesto `full_name`
- Sekcia "MOJE ODDELENIA" - oddelenia kde som členom
- Pre member rolu: pridaj "[👁️ Všetky oddelenia]" button (collapsed by default)
- Pre admin/strategicka_rada/hr: zobrazuj všetky automaticky

**Štruktúra:**
```
MOJE ODDELENIA
● Prevádzka              >
● Rámy                   >

[👁️ Ostatné oddelenia]     ← len pre member
  ○ Financie             >
  ○ Marketing            >
```

---

## FÁZA 5: Filtre UI

### 5.1 Vytvor `components/filters/task-filters.tsx`

**Požiadavky:**
- Dropdown pre každý filter
- Umiestnenie v headeri pod názvom stránky/oddelenia
- "More" dropdown pre menej používané filtre

**Layout:**
```
[☰ List] [▦ Board]     [Status ▼] [Assignee ▼] [Due Date ▼] [More ▼]
```

### 5.2 Integruj filtre do stránok

- `app/(dashboard)/areas/[areaId]/page.tsx`
- `app/(dashboard)/projects/[projectId]/page.tsx`
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/inbox/page.tsx`

---

## FÁZA 6: Správa používateľov

### 6.1 Vytvor `app/(dashboard)/settings/users/page.tsx`

**Požiadavky:**
- Prístup len pre admin (redirect ak nie je admin)
- Zoznam používateľov zoskupených podľa role/oddelenia
- Filtre: [Všetci ▼] [Všetky oddelenia ▼] [Všetky statusy ▼]
- Vyhľadávanie
- Button [+ Pozvať používateľa]

### 6.2 Vytvor `components/users/invite-user-modal.tsx`

**Polia:**
- Email * (povinné)
- Celé meno * (povinné)
- Prezývka * (povinné)
- Pozícia (voliteľné)
- Rola * (dropdown: Admin, Strategická rada, HR, Člen)
- Oddelenia * (multi-checkbox)

### 6.3 Vytvor `components/users/edit-user-modal.tsx`

Rovnaký ako invite modal, ale s vyplnenými údajmi.

### 6.4 Vytvor `components/users/user-row.tsx`

**Zobrazuje:**
- Avatar + Prezývka
- Email
- Rola badge
- Status badge (Aktívny/Neaktívny/Čaká na pozvánku)
- Menu [···]: Upraviť, Deaktivovať, Zobraziť tasky

### 6.5 Vytvor `app/(auth)/invite/[token]/page.tsx`

**Flow:**
1. Načítaj pozvánku podľa tokenu
2. Ak expired/accepted → error stránka
3. Formulár na vytvorenie hesla
4. Po submit: vytvor auth.user, users záznam, department_members záznamy
5. Redirect do aplikácie

---

## FÁZA 7: Aktualizuj CLAUDE.md

Po implementácii aktualizuj CLAUDE.md:

1. Pridaj nové stĺpce do users tabuľky
2. Pridaj department_members tabuľku
3. Aktualizuj invitations tabuľku
4. Pridaj is_global do areas
5. Aktualizuj role enum (4 hodnoty)
6. Pridaj changelog pre v2.8

---

## POZNÁMKY

### Kto čo vidí:

| Rola | Oddelenia v sidebari | Správa používateľov |
|------|---------------------|---------------------|
| admin | Všetky | ✅ |
| strategicka_rada | Všetky | ❌ |
| hr | Všetky | ❌ (zatiaľ) |
| member | Len svoje | ❌ |

### Dôležité pravidlá:

1. **Nickname všade** - zobrazuj prezývku, nie celé meno
2. **Deaktivácia** - tasky zostávajú priradené, user sa nemôže prihlásiť
3. **Presun človeka** - tasky zostávajú v pôvodnom oddelení
4. **Email** - akýkoľvek email povolený (nie len @optika.sk)

---

## PORADIE IMPLEMENTÁCIE

1. ✅ SQL migrácie (Fáza 1)
2. ✅ TypeScript typy (Fáza 2)
3. ✅ Hooky (Fáza 3)
4. ✅ Sidebar (Fáza 4)
5. ✅ Filtre (Fáza 5)
6. ✅ Správa používateľov (Fáza 6)
7. ✅ Aktualizuj CLAUDE.md (Fáza 7)

---

**Koniec zadania**
