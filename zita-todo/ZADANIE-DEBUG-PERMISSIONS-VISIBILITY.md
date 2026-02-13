# ZADANIE: Debugging 2 bugov - Drag&Drop permissions + Task visibility

## Bug 1: Drag & Drop funguje len pre Admin (DANO), nie pre Member (NATY)

### Symptómy
- DANO (Admin) môže drag & drop tasky - funguje
- NATY (Member) nemôže drag & drop - nefunguje
- Hard refresh nepomohol

### Debugging kroky

1. **Skontrolovať Network tab** keď NATY robí drag & drop:
   - Je tam API call?
   - Aký je response? (200/400/403/500?)
   - Aká je error message?

2. **Skontrolovať RLS politiky pre tasks UPDATE**:
```sql
-- Pozrieť existujúce politiky
SELECT * FROM pg_policies WHERE tablename = 'tasks';

-- Skontrolovať či member môže UPDATE
-- Politika by mala povoliť UPDATE ak:
-- user_id = auth.uid() ALEBO
-- assignee_id = auth.uid() ALEBO
-- organization_id = get_my_organization_id()
```

3. **Skontrolovať API endpoint pre reorder**:
   - Existuje `/api/tasks/reorder` alebo podobný?
   - Kontroluje permissions?
   - Má správne RLS?

### Možná oprava

```sql
-- Ak chýba UPDATE politika pre členov organizácie:
CREATE POLICY "Members can update tasks in their organization"
ON tasks FOR UPDATE
TO authenticated
USING (organization_id = get_my_organization_id())
WITH CHECK (organization_id = get_my_organization_id());
```

---

## Bug 2: Task vytvorený v Kanban nie je viditeľný nikde

### Symptómy
- NATY vytvorila task "10.2. Naďa Hrušovská // MARYLL" v Kanban view
- NATY nevidí task v List view
- DANO (Admin) nevidí task ani v Kanban ani v List view
- Task pravdepodobne existuje v databáze, ale nie je viditeľný

### Debugging kroky

1. **Nájsť task v databáze**:
```sql
SELECT 
  id,
  title,
  user_id,
  organization_id,
  project_id,
  area_id,
  status,
  when_type,
  deleted_at,
  created_at,
  assignee_id
FROM tasks 
WHERE title ILIKE '%Naďa Hrušovská%' OR title ILIKE '%MARYLL%'
ORDER BY created_at DESC
LIMIT 10;
```

2. **Skontrolovať či má správne hodnoty**:
```sql
-- Porovnať s fungujúcim taskom
SELECT 
  t.id,
  t.title,
  t.organization_id,
  u.organization_id as user_org_id,
  t.status,
  t.when_type,
  t.deleted_at
FROM tasks t
JOIN users u ON t.user_id = u.id
WHERE t.title ILIKE '%Naďa Hrušovská%';
```

3. **Možné problémy**:

| Stĺpec | Očakávaná hodnota | Problém ak |
|--------|-------------------|------------|
| organization_id | UUID organizácie | NULL alebo iná hodnota |
| status | 'todo' alebo 'open' | 'canceled', 'done', NULL |
| when_type | 'inbox', 'today', 'anytime' | NULL alebo neočakávaná hodnota |
| deleted_at | NULL | Má hodnotu (soft deleted) |
| project_id | UUID projektu | NULL (možno sa filtruje) |

### Možná oprava

```sql
-- Ak task existuje ale má zlé hodnoty:
UPDATE tasks 
SET 
  organization_id = (SELECT organization_id FROM users WHERE nickname ILIKE '%naty%'),
  status = 'todo',
  when_type = 'anytime',
  deleted_at = NULL
WHERE title ILIKE '%Naďa Hrušovská%';
```

---

## Kontrola RLS politík

```sql
-- Zobraziť všetky politiky pre tasks
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'tasks';

-- Skontrolovať či SELECT politika funguje pre NATY
-- Prihlásiť sa ako NATY a skúsiť:
SELECT * FROM tasks WHERE title ILIKE '%Naďa%';
```

---

## Rozdiely Admin vs Member

Skontrolovať či kód niekde rozlišuje role:

```typescript
// Hľadať v kóde:
if (user.role === 'admin') { ... }
// alebo
if (isAdmin) { ... }
// alebo
role === 'member'
```

Tieto podmienky môžu spôsobovať rozdielne správanie.

---

## Odporúčaný postup

1. **Najprv** nájsť stratený task v databáze (Bug 2)
2. **Zistiť** prečo nie je viditeľný (RLS? Zlé hodnoty?)
3. **Opraviť** task alebo RLS politiky
4. **Potom** riešiť drag & drop permissions (Bug 1)
5. **Overiť** že NATY môže robiť všetky operácie

---

*Vytvorené: 13. február 2026*
