# ZADANIE PRE CLAUDE CODE: Vymazané tasky sa stále zobrazujú v project view

## Dátum: 17. február 2026
## Priorita: 🔴 VYSOKÁ
## Nahlásil: Jolo (Strategická rada)

---

## PROBLÉM

Task "test test" bol vymazaný/odstránený z projektu "Automatizácia úhrad eyekido" (oddelenie Financie). Task zmizol z area list view, ale **stále sa zobrazuje v project detail view**. Počítadlo v projekte ukazuje 0/2 (čo naznačuje nekonzistenciu).

Používateľ nevie task definitívne odstrániť.

---

## DIAGNOSTIKA

### Krok 1: Zisti čo robí "zmazať task"
```bash
# Hľadaj delete/remove handler v kóde
grep -rn "delete\|remove\|trash\|is_deleted\|soft.delete" --include="*.tsx" --include="*.ts" \
  app/\(dashboard\)/projects/ \
  app/\(dashboard\)/areas/ \
  components/tasks/ \
  lib/
```

Otázky:
- Nastavuje sa `status = 'deleted'`?
- Alebo `is_deleted = true`?
- Alebo sa task fyzicky maže (`DELETE FROM tasks`)?
- Alebo sa presúva do Koša (`status = 'trashed'`)?

### Krok 2: Porovnaj query v area view vs project view
```bash
# Area page query
grep -A 20 "from.*tasks" app/\(dashboard\)/areas/\[areaId\]/page.tsx

# Project page query
grep -A 20 "from.*tasks" app/\(dashboard\)/projects/\[projectId\]/page.tsx
```

Nájdi rozdiel vo WHERE podmienkach — area view pravdepodobne filtruje vymazané tasky, project view nie.

---

## OPRAVA

### A) Zjednoť filtrovanie vymazaných taskov

Vytvor JEDNU helper funkciu na filtrovanie:

```typescript
// lib/queries/tasks.ts
export function baseTaskQuery(supabase: SupabaseClient) {
  return supabase
    .from('tasks')
    .select('*')
    .neq('status', 'deleted')    // Ak používate soft delete cez status
    // .eq('is_deleted', false)   // Ak používate is_deleted flag
}
```

### B) Použi ju VŠADE kde sa načítavajú tasky

Skontroluj a oprav KAŽDÉ z týchto miest:

| Súbor | Popis |
|-------|-------|
| `app/(dashboard)/areas/[areaId]/page.tsx` | Area list + kanban view |
| `app/(dashboard)/projects/[projectId]/page.tsx` | **← HLAVNÝ PROBLÉM** — project detail view |
| `app/(dashboard)/today/page.tsx` | Dnes |
| `app/(dashboard)/inbox/page.tsx` | Inbox |
| `app/(dashboard)/upcoming/page.tsx` | Nadchádzajúce |
| `components/tasks/kanban-board.tsx` | Kanban board query |
| `components/tasks/task-list.tsx` | Task list query |
| `components/tasks/project-task-list.tsx` | Project task list |

Pre KAŽDÝ súbor nájdi Supabase query na tasky a pridaj filter:

```typescript
// PRED (chýba filter):
const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('project_id', projectId)

// PO (s filtrom):
const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('project_id', projectId)
  .neq('status', 'deleted')  // PRIDAJ TOTO
```

### C) Oprav počítadlo projektov

Počítadlo taskov v projekte (napr. "0/2") musí tiež filtrovať vymazané tasky:

```typescript
// Počítadlo musí ignorovať deleted tasky
const activeTasks = tasks.filter(t => t.status !== 'deleted')
const completedTasks = activeTasks.filter(t => t.completed)
// Zobraz: completedTasks.length / activeTasks.length
```

---

## RLS KONTROLA

Skontroluj aj RLS politiky pre DELETE na tasks:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'tasks' AND cmd IN ('DELETE', 'UPDATE');
```

Ak Jolo (rola: strategická rada) nemá právo mazať — pridaj politiku:

```sql
CREATE POLICY "org_members_can_delete_tasks" ON tasks
  FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## TESTOVANIE

- [ ] Vytvor test task v projekte → vymaž ho → NESMIE sa zobrazovať v project view
- [ ] Vymazaný task sa NESMIE zobrazovať v area view
- [ ] Vymazaný task sa NESMIE zobrazovať v Dnes/Inbox/Nadchádzajúce
- [ ] Vymazaný task SA MÁ zobrazovať v Koši
- [ ] Počítadlo taskov v projekte ignoruje vymazané tasky
- [ ] Otestuj ako Admin (Dano) aj ako Member (Naty) aj ako Strategická rada (Jolo)
- [ ] Git push + deploy na Vercel

---

*Vytvorené: 17. február 2026*
