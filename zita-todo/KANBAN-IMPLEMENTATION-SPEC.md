# KANBAN IMPLEMENTATION SPEC pre ZITA TODO

## Cieľ
Implementovať projektový Kanban (workflow fázy) oddelene od List view (časové zaradenie).

---

## 1. DATABÁZOVÉ ZMENY

### Rozšír `status` pole v tabuľke `tasks`

**PRED (aktuálne):**
```sql
status (text: 'open' | 'completed' | 'canceled' DEFAULT 'open')
kanban_column (text: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done', nullable)
```

**PO (nové):**
```sql
status (text: 'todo' | 'in_progress' | 'review' | 'done' | 'canceled' DEFAULT 'todo')
-- ZRUŠ kanban_column - už nie je potrebný
```

### Migrácia existujúcich dát
```sql
-- Migrácia status hodnôt
UPDATE tasks SET status = 'todo' WHERE status = 'open';
UPDATE tasks SET status = 'done' WHERE status = 'completed';

-- Ak existuje kanban_column, preveď hodnoty do status
UPDATE tasks SET status = kanban_column WHERE kanban_column IS NOT NULL;

-- Odstráň kanban_column stĺpec
ALTER TABLE tasks DROP COLUMN IF EXISTS kanban_column;
```

---

## 2. DVA NEZÁVISLÉ POHĽADY

### List View (časové zaradenie)
- Používa `when_type`: inbox | today | anytime | someday | scheduled
- Checkbox dokončí task: `status = 'done'`
- Drag & drop mení `when_type`

### Kanban View (workflow fázy)
- Používa `status`: todo | in_progress | review | done
- Drag & drop medzi stĺpcami mení `status`
- 4 stĺpce: Todo | In Progress | Review | Done

---

## 3. LOGIKA PREPOJENIA

### Keď task prejde do "Done" v Kanbane:
```javascript
onKanbanDrag(taskId, newStatus) {
  updateTask(taskId, { status: newStatus })
  
  // Voliteľné: automaticky presunúť do Logbook
  if (newStatus === 'done') {
    // when_type zostáva (task je stále viditeľný v Today ak bol v Today)
    // ALEBO: updateTask(taskId, { when_type: 'logbook' })
  }
}
```

### Keď checkbox označí task ako dokončený v Liste:
```javascript
onCheckboxToggle(taskId, completed) {
  if (completed) {
    updateTask(taskId, { status: 'done' })
  } else {
    updateTask(taskId, { status: 'todo' })
  }
}
```

### Task existuje v OBOCH views súčasne:
```
Task "Napísať report":
- when_type: 'today'     → List: vidno v "Today"
- status: 'in_progress'  → Kanban: vidno v "In Progress"

Drag v Kanbane → mení status → List OSTÁVA (stále v Today)
Drag v Liste → mení when_type → Kanban OSTÁVA (stále In Progress)
```

---

## 4. KOMPONENTY NA ÚPRAVU

### Premenuj/Nahraď When-based Kanban komponenty:

| Starý súbor | Nový súbor | Zmena |
|-------------|------------|-------|
| `when-kanban-board.tsx` | `kanban-board.tsx` | Používa `status` namiesto `when_type` |
| `when-kanban-column.tsx` | `kanban-column.tsx` | Filter podľa `status` |
| `when-kanban-card.tsx` | `kanban-card.tsx` | Zobrazuje when_type badge |

### Nová štruktúra Kanban stĺpcov:
```typescript
const KANBAN_COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'blue' },
  { id: 'in_progress', title: 'In Progress', color: 'yellow' },
  { id: 'review', title: 'Review', color: 'purple' },
  { id: 'done', title: 'Done', color: 'green' },
]
```

### Kanban Card zobrazuje:
```
┌─────────────────────────┐
│ Názov tasku             │
│ ⭐ Dnes   ● Prevádzka   │  ← when_type + oddelenie
│ 👤 Meno   🚩 15.1.      │  ← assignee + deadline
└─────────────────────────┘
```

---

## 5. VIEW TOGGLE

### Kde sa zobrazuje toggle:
- ✅ V Projekte (project detail) - hlavný use case
- ✅ V Oddelení (area detail)
- ❌ V Today/Inbox/Anytime - len List view (bez Kanban toggle)

### Toggle button:
```
[☰ List] [▦ Kanban]
```

### Uloženie preferencie:
- localStorage per-page: `view_preference_project_{id}`

---

## 6. DRAG & DROP HANDLERY

### Kanban Drag (mení status):
```typescript
const onKanbanDragEnd = (taskId: string, newStatus: TaskStatus) => {
  updateTask(taskId, { 
    status: newStatus,
    // Ak done, nastav completed_at
    ...(newStatus === 'done' ? { completed_at: new Date().toISOString() } : {})
  })
}
```

### List Drag (mení when_type):
```typescript
const onListDragEnd = (taskId: string, newWhen: WhenType) => {
  updateTask(taskId, { when_type: newWhen })
}
```

---

## 7. QUERIES

### List Views:
```sql
-- Today
SELECT * FROM tasks WHERE when_type = 'today' AND status != 'canceled' AND deleted_at IS NULL

-- Logbook (všetky dokončené)
SELECT * FROM tasks WHERE status = 'done' AND deleted_at IS NULL
```

### Kanban View (v projekte):
```sql
SELECT * FROM tasks 
WHERE project_id = :projectId 
  AND status != 'canceled' 
  AND deleted_at IS NULL
ORDER BY sort_order
-- Potom GROUP BY status v kóde
```

---

## 8. TYPESCRIPT TYPY

```typescript
// Nový status type
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'canceled'

// When type (bez zmeny)
type WhenType = 'inbox' | 'today' | 'anytime' | 'someday' | 'scheduled'

// Task interface update
interface Task {
  id: string
  title: string
  status: TaskStatus        // Workflow fáza (pre Kanban)
  when_type: WhenType       // Časové zaradenie (pre List)
  when_date: string | null  // Pre scheduled
  // ... ostatné polia
}
```

---

## 9. KROKY IMPLEMENTÁCIE

### Fáza 1: Databáza
1. [ ] Migrácia `status` hodnôt (open → todo, completed → done)
2. [ ] Odstránenie `kanban_column` stĺpca

### Fáza 2: Typy a Hooky
3. [ ] Update TypeScript typov
4. [ ] Update `use-tasks.ts` - nové status hodnoty

### Fáza 3: Komponenty
5. [ ] Premenuj `when-kanban-*.tsx` na `kanban-*.tsx`
6. [ ] Uprav Kanban board na použitie `status`
7. [ ] Uprav checkbox toggle na `status: 'done'`

### Fáza 4: Views
8. [ ] Projekt detail - List/Kanban toggle
9. [ ] Area detail - List/Kanban toggle
10. [ ] Odstráň toggle z Today/Inbox (len List)

### Fáza 5: Testovanie
11. [ ] Test: drag v Kanbane nemení when_type
12. [ ] Test: checkbox v Liste nastaví status=done
13. [ ] Test: task viditeľný v oboch views súčasne

---

## 10. PRÍKLAD WORKFLOW

```
1. Vytvorím task "Napísať report" v Today
   → when_type: 'today', status: 'todo'
   → List Today: ✅ VIDITEĽNÝ
   → Kanban: v stĺpci "To Do"

2. V Kanbane pretiahnem do "In Progress"
   → when_type: 'today' (NEZMENENÉ)
   → status: 'in_progress'
   → List Today: ✅ STÁLE VIDITEĽNÝ
   → Kanban: v stĺpci "In Progress"

3. V Kanbane pretiahnem do "Done"
   → when_type: 'today' (NEZMENENÉ)
   → status: 'done'
   → List Today: ✅ STÁLE VIDITEĽNÝ (ale s checknutým boxom)
   → Kanban: v stĺpci "Done"

4. (Voliteľné) Automaticky presunúť do Logbook
   → when_type: 'logbook'
   → List Today: ❌ ZMIZNE
   → Logbook: ✅ OBJAVÍ SA
```

---

**Verzia:** 1.0
**Dátum:** 4. januára 2026
**Autor:** Claude + Daniel
