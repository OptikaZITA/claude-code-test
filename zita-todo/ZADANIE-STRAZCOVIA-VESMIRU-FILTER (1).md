# ZADANIE: Filter "Strážcovia vesmíru" (Assignee filter)

## Prehľad

Prepracovať assignee filter z mätúceho "Moje úlohy" na jednoduchý filter podľa assignee s názvom **"Strážcovia vesmíru"**.

---

## Aktuálny stav (problém)

```
[Moje úlohy ▼]
├── Všetci
├── Moje úlohy (30)    ← Mätúce - čo to znamená?
├── Dano (24)          ← Aký je rozdiel oproti "Moje úlohy"?
├── Nepriradené (6)
```

**Problém:** "Moje úlohy" vs "Dano" - používateľ nevie aký je rozdiel.

---

## Nový stav (riešenie)

```
[Strážcovia vesmíru ▼]
├── Všetci
├── ─────────────────
├── 👤 Dano (24)        ← DEFAULT (prihlásený používateľ)
├── 👤 Optika (6)
├── 👤 Jolo (12)
├── ...
├── ─────────────────
├── Nepriradené (6)
```

---

## Pravidlá

### 1. Default = prihlásený používateľ

Keď otvorím "Dnes", automaticky je vybraný JA (Dano). Vidím svoje úlohy.

### 2. Filter podľa assignee_id

| Výber | Query |
|-------|-------|
| Dano | `assignee_id = dano_id` |
| Optika | `assignee_id = optika_id` |
| Všetci | Žiadny filter (celá organizácia) |
| Nepriradené | `assignee_id IS NULL` |

### 3. Žiadne "Moje úlohy"

Odstrániť túto možnosť. Stačí filtrovať podľa assignee.

### 4. Automatické priradenie pri vytvorení

| Kde vytvorím | Assignee |
|--------------|----------|
| Dnes, Inbox, Kedykoľvek | Automaticky JA |
| Tímový Inbox | NULL (nepriradené) |
| Projekt/Oddelenie | Môžem vybrať alebo nechať NULL |

---

## UI/UX

### Button text - JEDNODUCHÉ

Button ukazuje **vždy len názov kategórie** - nemení sa podľa výberu.

```
[Strážcovia vesmíru ▼]  [Oddelenie ▼]  [Status ▼]  [Priorita ▼]  ...
```

**Stavy buttonu:**
- **Sivý/normálny** = nič vybraté (default)
- **Modrý** = niečo vybraté (aktívny filter)

Text sa NEMENÍ - len farba indikuje aktívny filter.

### Aktívne filtre - riadok pod buttonmi

Keď je niečo vybraté, zobrazí sa riadok "Aktívne:" s možnosťou zrušiť jednotlivé filtre:

```
[Strážcovia vesmíru ▼]  [Oddelenie ▼]  [Status ▼]  ...
                    (modré)         (modré)

Aktívne:  Dano ✕   Facility ✕   Urgent ✕
```

**Klik na ✕** = zruší ten konkrétny filter, button sa vráti na sivý.

### Dropdown vzhľad

```
┌─────────────────────────────┐
│ Strážcovia vesmíru ▼        │
├─────────────────────────────┤
│ ○ Všetci                    │
│ ─────────────────────────── │
│ ● 👤 Dano              (24) │  ← Vybraný (default)
│ ○ 👤 Optika             (6) │
│ ○ 👤 Jolo              (12) │
│ ─────────────────────────── │
│ ○ Nepriradené           (6) │
└─────────────────────────────┘
```

### Button zobrazuje výber

| Výber | Button text |
|-------|-------------|
| Default (ja) | `Strážcovia vesmíru ▼` |
| Konkrétny človek | `Strážcovia vesmíru: Optika ▼` |
| Všetci | `Strážcovia vesmíru: Všetci ▼` |
| Nepriradené | `Strážcovia vesmíru: Nepriradené ▼` |

---

## Implementácia

### 1. Komponent dropdown

**Súbor:** `components/filters/assignee-filter.tsx`

```tsx
'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { useOrganizationUsers } from '@/lib/hooks/use-organization-users';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AssigneeFilterProps {
  value: string; // 'all' | 'unassigned' | user_id
  onChange: (value: string) => void;
  taskCounts?: Record<string, number>;
}

export function AssigneeFilter({ value, onChange, taskCounts }: AssigneeFilterProps) {
  const { user } = useAuth();
  const { data: users } = useOrganizationUsers();
  
  // Default = prihlásený používateľ
  const effectiveValue = value || user?.id;
  
  const getLabel = () => {
    if (effectiveValue === 'all') return 'Všetci';
    if (effectiveValue === 'unassigned') return 'Nepriradené';
    const selectedUser = users?.find(u => u.id === effectiveValue);
    return selectedUser?.nickname || selectedUser?.full_name || 'Strážcovia vesmíru';
  };

  const showLabel = effectiveValue !== user?.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Strážcovia vesmíru
          {showLabel && `: ${getLabel()}`}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => onChange('all')}>
          Všetci
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {users?.map(u => (
          <DropdownMenuItem 
            key={u.id} 
            onClick={() => onChange(u.id)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={u.avatar_url} />
                <AvatarFallback>{u.nickname?.[0] || u.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <span>{u.nickname || u.full_name}</span>
              {u.id === user?.id && <span className="text-muted-foreground">(ja)</span>}
            </div>
            {taskCounts?.[u.id] && (
              <span className="text-muted-foreground">({taskCounts[u.id]})</span>
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => onChange('unassigned')}>
          <div className="flex items-center justify-between w-full">
            <span>Nepriradené</span>
            {taskCounts?.unassigned && (
              <span className="text-muted-foreground">({taskCounts.unassigned})</span>
            )}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 2. Hook pre filtrovanie

**Súbor:** `lib/hooks/use-tasks.ts`

```typescript
export function useTodayTasks(assigneeFilter?: string) {
  const { user } = useAuth();
  
  // Default = prihlásený používateľ
  const effectiveFilter = assigneeFilter || user?.id;
  
  let query = supabase
    .from('tasks')
    .select('*, area:areas(*), project:projects(*)')
    .eq('when_type', 'today')
    .is('deleted_at', null);
  
  // Aplikuj filter
  if (effectiveFilter === 'all') {
    // Žiadny filter - všetky v organizácii (RLS to obmedzí)
  } else if (effectiveFilter === 'unassigned') {
    query = query.is('assignee_id', null);
  } else {
    // Konkrétny používateľ
    query = query.eq('assignee_id', effectiveFilter);
  }
  
  return useQuery({
    queryKey: ['tasks', 'today', effectiveFilter],
    queryFn: () => query,
  });
}
```

### 3. Automatické priradenie pri vytvorení

**Súbor:** `lib/hooks/use-create-task.ts`

```typescript
export function useCreateTask() {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      // Automaticky priraď ak nie je špecifikované a nie je Tímový Inbox
      const assignee_id = data.assignee_id ?? 
        (data.inbox_type === 'team' ? null : user?.id);
      
      return supabase.from('tasks').insert({
        ...data,
        assignee_id,
        user_id: user?.id,
        created_by: user?.id,
      });
    },
  });
}
```

---

## Príkaz pre Claude Code

```
Prepracuj assignee filter na "Strážcovia vesmíru":

1. BUTTON TEXT:
   - Vždy len "Strážcovia vesmíru ▼"
   - Text sa NEMENÍ podľa výberu
   - Sivý = nič vybraté (default)
   - Modrý = niečo vybraté (aktívny filter)

2. AKTÍVNE FILTRE RIADOK:
   - Pod buttonmi zobraz riadok "Aktívne:" keď sú filtre aktívne
   - Formát: "Aktívne: Dano ✕  Facility ✕  Urgent ✕"
   - Klik na ✕ zruší ten filter
   - Toto platí pre VŠETKY filtre (Strážcovia, Oddelenie, Status, Priorita...)

3. DROPDOWN štruktúra:
   - Všetci
   - --- separator ---
   - Zoznam používateľov s avatarmi a počtami
   - --- separator ---
   - Nepriradené

4. DEFAULT SPRÁVANIE:
   - Keď otvorím "Dnes" → vidím moje úlohy (bez aktívneho filtra)
   - Keď vyberiem seba v dropdown → rovnaký výsledok, ale filter je aktívny (modrý button)
   - Keď vyberiem kolegu → jeho úlohy
   - Reset filtrov → späť na moje úlohy (sivý button)

5. FILTER LOGIKA:
   - Žiadny výber (default): assignee_id = ja
   - Konkrétny user: assignee_id = user_id  
   - Všetci: žiadny filter
   - Nepriradené: assignee_id IS NULL

6. AUTO-ASSIGN pri vytvorení:
   - Dnes/Inbox/Kedykoľvek → assignee_id = ja
   - Tímový Inbox → assignee_id = NULL

Slovenské texty. Použiť existujúce ZITA TODO komponenty.
```

---

## Testovanie

| Test | Očakávané |
|------|-----------|
| Otvorím "Dnes" | Default = ja, vidím svoje úlohy |
| Vyberiem "Optika" | Vidím Optikine úlohy |
| Vyberiem "Všetci" | Vidím všetky v organizácii |
| Vyberiem "Nepriradené" | Vidím úlohy bez assignee |
| Vytvorím úlohu v "Dnes" | Automaticky assignee = ja |
| Vytvorím úlohu v "Tímový Inbox" | assignee = NULL |
