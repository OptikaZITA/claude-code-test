# VYLEPŠENIE: Vyhľadávanie bez diakritiky (accent-insensitive search)

## Problém

Aktuálne vyhľadávanie vyžaduje presnú diakritiku:
- Hľadám "smi" → nič nenájde
- Hľadám "šmi" → nájde "Šmihulová"

## Požiadavka

Vyhľadávanie by malo fungovať **bez ohľadu na diakritiku**:
- "smi" → nájde "Šmihulová"
- "caka" → nájde "Čaká na odpoveď"
- "uloha" → nájde "Úloha"
- "navrh" → nájde "Návrh"

---

## Riešenie 1: PostgreSQL `unaccent()` extension

### Krok 1: Povoliť extension v Supabase

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
```

### Krok 2: Upraviť search query

```sql
-- Pred (case-insensitive, ale vyžaduje diakritiku)
SELECT * FROM tasks 
WHERE title ILIKE '%šmi%';

-- Po (accent-insensitive)
SELECT * FROM tasks 
WHERE unaccent(title) ILIKE unaccent('%smi%');
```

### Krok 3: Vytvoriť index pre výkon (voliteľné)

```sql
CREATE INDEX idx_tasks_title_unaccent ON tasks (unaccent(title));
```

---

## Riešenie 2: Aplikačná vrstva (JavaScript)

Ak nechceme meniť DB, normalizovať v kóde:

```typescript
// utils/search.ts
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Príklad: removeAccents('Šmihulová') → 'Smihulova'
```

```typescript
// V search hook/komponente
const normalizedQuery = removeAccents(query.toLowerCase());

const results = tasks.filter(task => 
  removeAccents(task.title.toLowerCase()).includes(normalizedQuery)
);
```

**Nevýhoda:** Načíta všetky dáta a filtruje na klientovi - neefektívne pre veľa úloh.

---

## Riešenie 3: Kombinácia (odporúčané)

1. **Databáza:** Použiť `unaccent()` pre hlavné vyhľadávanie
2. **Frontend:** Normalizovať query pred odoslaním

```typescript
// hooks/use-search.ts
import { removeAccents } from '@/lib/utils';

export function useSearch(query: string) {
  const normalizedQuery = removeAccents(query);
  
  return useQuery({
    queryKey: ['search', normalizedQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .or(`title.ilike.%${normalizedQuery}%,notes.ilike.%${normalizedQuery}%`)
        // Pozor: toto stále vyžaduje unaccent() na DB strane
    },
  });
}
```

---

## Implementácia - Krok za krokom

### 1. Supabase: Povoliť unaccent

V Supabase Dashboard → SQL Editor:

```sql
-- Povoliť extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Test
SELECT unaccent('Šmihulová');  -- Výsledok: Smihulova
```

### 2. Vytvoriť helper funkciu

```sql
-- Funkcia pre accent-insensitive search
CREATE OR REPLACE FUNCTION search_tasks(search_query text)
RETURNS SETOF tasks AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM tasks
  WHERE unaccent(title) ILIKE '%' || unaccent(search_query) || '%'
     OR unaccent(notes) ILIKE '%' || unaccent(search_query) || '%'
  ORDER BY 
    CASE WHEN unaccent(title) ILIKE unaccent(search_query) || '%' THEN 0 ELSE 1 END,
    title;
END;
$$ LANGUAGE plpgsql;
```

### 3. Upraviť frontend search

```typescript
// lib/utils.ts
export function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// components/search/global-search.tsx
const handleSearch = async (query: string) => {
  const { data, error } = await supabase
    .rpc('search_tasks', { search_query: query });
  
  return data;
};
```

---

## Čo všetko prehľadávať

| Entita | Polia |
|--------|-------|
| **Tasks** | title, notes |
| **Projects** | title, notes |
| **Areas** | title |
| **Tags** | title |
| **Users** | full_name, nickname, email |

---

## Slovenská diakritika - mapovanie

| S diakritikou | Bez diakritiky |
|---------------|----------------|
| á, ä | a |
| č | c |
| ď | d |
| é | e |
| í | i |
| ĺ, ľ | l |
| ň | n |
| ó, ô | o |
| ŕ | r |
| š | s |
| ť | t |
| ú | u |
| ý | y |
| ž | z |

---

## Testovanie

Po implementácii overiť:

- [ ] "smi" nájde "Šmihulová"
- [ ] "caka" nájde "Čaká na odpoveď"
- [ ] "uloha" nájde "Úloha"
- [ ] "prevadzka" nájde "Prevádzka"
- [ ] Veľké/malé písmená nehrájú rolu
- [ ] Vyhľadávanie je dostatočne rýchle
- [ ] Funguje pre tasks, projects, areas, users

---

*Vytvorené: 19. január 2026*
