# ZADANIE PRE CLAUDE CODE: Kanban UX Vylepšenia — Fáza 1

## Dátum: 16. február 2026
## Priorita: 🟡 STREDNÁ

---

## PROBLÉMY

1. **V Kanban view nie je možné vymazať task** — chýba ikona koša na karte
2. **Po drag & drop sa refreshuje celá stránka** — zlý UX, treba optimistic updates
3. **Member rola (NATY) nemôže reorderovať tasky** — RLS problém

---

## OPRAVA 1: Ikona koša na Kanban karte

V `components/tasks/kanban-card.tsx` pridaj ikonu koša do pravého horného rohu karty. Zobrazí sa len pri hoveri.

### Implementácia:

```tsx
// Import
import { Trash2 } from 'lucide-react'

// Pridaj prop
interface KanbanCardProps {
  // ... existujúce props ...
  onDelete?: () => void  // NOVÉ
}

// V komponente, pridaj do karty (hneď za otváracím divom karty):
{onDelete && (
  <button
    onClick={(e) => {
      e.stopPropagation()
      onDelete()
    }}
    className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all z-10"
    title="Vymazať"
  >
    <Trash2 className="h-3.5 w-3.5" />
  </button>
)}
```

**DÔLEŽITÉ:** Karta už má `className` s `group` — ak nie, pridaj `group` do className karty, aby `group-hover:opacity-100` fungovalo. Tiež pridaj `relative` do className karty (pre `absolute` positioning).

### Prepojenie v kanban-column.tsx:

```tsx
<KanbanCard
  key={task.id}
  task={task}
  onClick={() => onTaskClick(task)}
  onDelete={() => onTaskDelete?.(task.id)}  // NOVÉ
  hideToday={hideToday}
  isSelected={isTaskSelected?.(task.id) ?? false}
  onModifierClick={(e) => onModifierClick?.(task.id, e)}
/>
```

Pridaj `onTaskDelete` prop do `KanbanColumnProps` interface.

### Prepojenie v kanban-board.tsx:

Pridaj `onTaskDelete` prop do `KanbanBoardProps` a predaj ho do `KanbanColumnComponent`.

### Prepojenie v page.tsx (area) a všade kde sa KanbanBoard používa:

```tsx
<KanbanBoard
  tasks={tagFilteredTasks}
  onTaskMove={handleKanbanTaskMove}
  onTaskReorder={handleTaskReorder}
  onTaskDelete={handleTaskDelete}  // NOVÉ - handler už existuje
  onTaskClick={setSelectedTask}
  onQuickAdd={handleKanbanQuickAdd}
/>
```

Použi `grep -r "KanbanBoard" --include="*.tsx"` na nájdenie VŠETKÝCH miest kde sa KanbanBoard renderuje a pridaj `onTaskDelete` všade.

---

## OPRAVA 2: Optimistic updates — žiadny refresh po drag & drop

### Problém:
`handleTaskReorder` volá `refetchTasks()` po uložení, čo spôsobuje reload celého zoznamu a blikanie UI.

### Riešenie:
Všade kde sa volá `refetchTasks()` po reorderi alebo presune, nahraď optimistic update cez `setTasks`.

### A) handleTaskReorder (reordering v rámci stĺpca/sekcie):

```tsx
const handleTaskReorder = useCallback(async (taskId: string, newIndex: number, currentTasks: TaskWithRelations[]) => {
  const oldIndex = currentTasks.findIndex(t => t.id === taskId)
  if (oldIndex === -1 || oldIndex === newIndex) return
  
  const reordered = arrayMove(currentTasks, oldIndex, newIndex)
  
  // OPTIMISTIC UPDATE — okamžite aktualizuj lokálny state
  setTasks(prev => {
    const updated = [...prev]
    reordered.forEach((task, index) => {
      const taskIndex = updated.findIndex(t => t.id === task.id)
      if (taskIndex !== -1) {
        updated[taskIndex] = { ...updated[taskIndex], sort_order: index }
      }
    })
    return updated
  })
  
  // Ulož na pozadí — BEZ refetchTasks()
  try {
    await Promise.all(
      reordered.map((task, index) =>
        supabase
          .from('tasks')
          .update({ sort_order: index })
          .eq('id', task.id)
      )
    )
    // ŽIADNY refetchTasks() — optimistic update je dostatočný
  } catch (error) {
    console.error('Error reordering tasks:', error)
    refetchTasks() // Len pri chybe — rollback
  }
}, [supabase, setTasks, refetchTasks])
```

### B) handleTaskDelete (soft delete):

```tsx
const handleTaskDelete = async (taskId: string) => {
  // OPTIMISTIC UPDATE — okamžite odstráň z UI
  setTasks(prev => prev.filter(t => t.id !== taskId))
  
  try {
    await softDelete(taskId)
    // ŽIADNY refetchTasks()
  } catch (error) {
    console.error('Error deleting task:', error)
    refetchTasks() // Len pri chybe — rollback
  }
}
```

### C) handleTaskUpdate:

```tsx
const handleTaskUpdate = async (taskId: string, updates: Partial<TaskWithRelations>) => {
  // OPTIMISTIC UPDATE
  setTasks(prev => prev.map(t => 
    t.id === taskId ? { ...t, ...updates } : t
  ))
  
  try {
    await updateTask(taskId, updates)
    // ŽIADNY refetchTasks()
  } catch (error) {
    console.error('Error updating task:', error)
    refetchTasks() // Len pri chybe — rollback
  }
}
```

### DÔLEŽITÉ:
Skontroluj VŠETKY handlery v `page.tsx` (area detail) a nahraď pattern:
```
await nejakaAkcia(...)
refetchTasks()  ← ODSTRÁNIŤ
```
Za pattern:
```
setTasks(prev => ...)  ← OPTIMISTIC UPDATE pred await
await nejakaAkcia(...)
// žiadny refetchTasks()
```

Výnimky kde ponechaj `refetchTasks()`:
- `handleQuickAdd` / `handleSimpleQuickAdd` — po vytvorení nového tasku treba refetch, lebo nevieme ID nového tasku
- Error handling — pri chybe vždy `refetchTasks()` ako rollback

---

## OPRAVA 3: RLS — member musí môcť aktualizovať sort_order

Spusti cez Supabase SQL Editor:

```sql
-- Skontroluj existujúce UPDATE politiky
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'tasks' AND cmd = 'UPDATE';
```

Ak member nemá právo na UPDATE, pridaj/uprav politiku:

```sql
-- Povoľ UPDATE pre členov organizácie
CREATE POLICY "org_members_can_update_tasks" ON tasks
  FOR UPDATE
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

**Ak už taká politika existuje**, skontroluj či neobsahuje podmienku `role = 'admin'` — ak áno, odstráň ju.

---

## SÚHRN ZMIEN

| Súbor | Zmena |
|-------|-------|
| `kanban-card.tsx` | Pridať ikonu koša (hover) + `onDelete` prop |
| `kanban-column.tsx` | Pridať `onTaskDelete` prop, predať do KanbanCard |
| `kanban-board.tsx` | Pridať `onTaskDelete` prop, predať do KanbanColumn |
| `page.tsx` (areas) | Pridať `onTaskDelete` do KanbanBoard + optimistic updates |
| Ostatné stránky s KanbanBoard | Rovnako pridať `onTaskDelete` |
| Supabase RLS | Overiť/opraviť UPDATE politiku pre member rolu |

## TESTOVANIE

- [ ] Kanban: hover na kartu → zobrazí sa ikona koša → klik → task zmizne (bez refreshu)
- [ ] Kanban: drag task medzi stĺpcami → UI sa aktualizuje okamžite (bez refreshu/blikania)
- [ ] Kanban: reorder v rámci stĺpca → UI sa aktualizuje okamžite
- [ ] List view: reorder → bez refreshu
- [ ] Prihlásiť sa ako NATY (member) → reorder funguje
- [ ] Git push + deploy na Vercel

---

*Vytvorené: 16. február 2026*
