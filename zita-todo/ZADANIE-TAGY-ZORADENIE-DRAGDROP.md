# ZADANIE: 3 bugy/vylepšenia - Tagy, Zoradenie, Drag & Drop

## Prehľad

| # | Typ | Popis | Priorita |
|---|-----|-------|----------|
| 1 | UI | Tagy nie sú viditeľné na Kanban kartách | Stredná |
| 2 | Feature | Pridať zoradenie podľa dátumu vytvorenia | Nízka |
| 3 | Bug | Nefunguje drag & drop taskov | Vysoká |

---

## 1. Tagy nie sú viditeľné na Kanban kartách

### Problém

- **List view:** Tagy sú viditeľné pri každom tasku ✅
- **Kanban view:** Tagy NIE SÚ viditeľné na kartách ❌
- **Task detail (modal):** Tagy sú viditeľné ✅

### Screenshot porovnanie

**List view (funguje):**
```
○ 28.1. MARTIN ĎURIŠ /LA BRIQUE [PRE ZÁKAZNÍKA] [RIEŠIM] [ČAKÁM NA DODÁVATEĽA]
  Rámy
```

**Kanban view (chýbajú tagy):**
```
┌─────────────────────────┐
│ Peťa eyekido / THEO     │
│ 0                    ND │
└─────────────────────────┘
```

### Požadované riešenie

Zobraziť tagy na Kanban kartách podobne ako v list view:

```
┌─────────────────────────────────────┐
│ 28.1. MARTIN ĎURIŠ /LA BRIQUE       │
│ [PRE ZÁKAZNÍKA] [RIEŠIM] [ČAKÁM...] │  ← PRIDAŤ
│ 0                                ND │
└─────────────────────────────────────┘
```

### Implementácia

```tsx
// V komponente Kanban karty (napr. kanban-card.tsx)

// Pridať import
import { Badge } from '@/components/ui/badge';

// V komponente pridať zobrazenie tagov
<div className="flex flex-wrap gap-1 mt-1">
  {task.tags?.map(tag => (
    <Badge 
      key={tag.id} 
      variant="secondary"
      className="text-xs px-1.5 py-0"
      style={{ 
        backgroundColor: tag.color + '20', 
        color: tag.color,
        borderColor: tag.color 
      }}
    >
      {tag.title}
    </Badge>
  ))}
</div>
```

### Súbory na úpravu

- `components/kanban/kanban-card.tsx` (alebo podobný názov)
- Overiť či sa tagy načítavajú v query pre Kanban view

---

## 2. Pridať zoradenie podľa dátumu vytvorenia

### Aktuálny stav

Dropdown "Zoradiť" obsahuje:
- ○ Predvolené
- ○ Deadline ↑
- ○ Deadline ↓

### Požadovaný stav

Pridať možnosti zoradenia podľa `created_at`:

- ○ Predvolené
- ○ Deadline ↑ (najskorší najprv)
- ○ Deadline ↓ (najneskorší najprv)
- ○ **Vytvorené ↑** (najstaršie najprv) ← PRIDAŤ
- ○ **Vytvorené ↓** (najnovšie najprv) ← PRIDAŤ

### Implementácia

```tsx
// V komponente pre zoradenie (napr. task-sort-dropdown.tsx)

const sortOptions = [
  { value: 'default', label: 'Predvolené' },
  { value: 'deadline_asc', label: 'Deadline ↑' },
  { value: 'deadline_desc', label: 'Deadline ↓' },
  { value: 'created_asc', label: 'Vytvorené ↑' },   // PRIDAŤ
  { value: 'created_desc', label: 'Vytvorené ↓' },  // PRIDAŤ
];

// V query/hook pre načítanie taskov
const orderBy = {
  default: { sort_order: 'asc' },
  deadline_asc: { deadline: 'asc' },
  deadline_desc: { deadline: 'desc' },
  created_asc: { created_at: 'asc' },   // PRIDAŤ
  created_desc: { created_at: 'desc' }, // PRIDAŤ
};
```

### Súbory na úpravu

- `components/filters/sort-dropdown.tsx` (alebo podobný)
- `lib/hooks/use-tasks.ts` (query s ORDER BY)

---

## 3. BUG: Nefunguje Drag & Drop taskov

### Problém

Drag & drop nefunguje ani v:
- ❌ Kanban view (medzi stĺpcami)
- ❌ List view (zmena poradia)
- ❌ Presun do iného projektu/oddelenia

### Požadované správanie (inšpirované Things 3)

#### A) Kanban view
- Drag karta medzi stĺpcami → zmení `status`
- Drag karta v rámci stĺpca → zmení `sort_order`

#### B) List view
- Drag task hore/dole → zmení `sort_order`
- Drag task na projekt v sidebar → presunie do projektu
- Drag task na oddelenie v sidebar → presunie do oddelenia

#### C) Univerzálne
- Drag task na "Dnes" v sidebar → nastaví `when_type: 'today'`
- Drag task na "Inbox" → nastaví `when_type: 'inbox'`
- Drag task na "Kedykoľvek" → nastaví `when_type: 'anytime'`
- Drag task na "Niekedy" → nastaví `when_type: 'someday'`

### Technická implementácia

ZITA TODO používa `@dnd-kit` knižnicu. Treba overiť:

1. **Sú DndContext a správne providery nastavené?**
```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCorners}
  onDragEnd={handleDragEnd}
  onDragOver={handleDragOver}
>
  <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
    {/* tasks */}
  </SortableContext>
</DndContext>
```

2. **Sú tasky obalené v `useSortable`?**
```tsx
function SortableTask({ task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  );
}
```

3. **Je implementovaný `onDragEnd` handler?**
```tsx
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  
  if (!over || active.id === over.id) return;

  // Ak sa presúva v rámci zoznamu (zmena poradia)
  if (active.data.current?.type === 'task' && over.data.current?.type === 'task') {
    await reorderTasks(active.id, over.id);
  }
  
  // Ak sa presúva do iného stĺpca/kontajnera
  if (over.data.current?.type === 'column') {
    await updateTaskStatus(active.id, over.data.current.status);
  }
  
  // Ak sa presúva do projektu v sidebar
  if (over.data.current?.type === 'project') {
    await moveTaskToProject(active.id, over.data.current.projectId);
  }
};
```

4. **Je sidebar droppable?**
```tsx
// Sidebar items musia byť droppable
function SidebarItem({ item }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `sidebar-${item.type}-${item.id}`,
    data: { type: item.type, id: item.id },
  });

  return (
    <div ref={setNodeRef} className={isOver ? 'bg-blue-100' : ''}>
      {item.label}
    </div>
  );
}
```

### Databázové operácie

```typescript
// Zmena poradia
async function reorderTasks(activeId: string, overId: string) {
  // Získať aktuálne poradie
  const tasks = await getTasks();
  const oldIndex = tasks.findIndex(t => t.id === activeId);
  const newIndex = tasks.findIndex(t => t.id === overId);
  
  // Preusporiadať
  const reordered = arrayMove(tasks, oldIndex, newIndex);
  
  // Aktualizovať sort_order pre všetky dotknuté tasky
  for (let i = 0; i < reordered.length; i++) {
    await supabase
      .from('tasks')
      .update({ sort_order: i })
      .eq('id', reordered[i].id);
  }
}

// Presun do iného projektu
async function moveTaskToProject(taskId: string, projectId: string) {
  await supabase
    .from('tasks')
    .update({ 
      project_id: projectId,
      // Ak projekt patrí pod iné oddelenie, aktualizovať aj area_id
    })
    .eq('id', taskId);
}

// Zmena statusu (Kanban stĺpec)
async function updateTaskStatus(taskId: string, status: string) {
  await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId);
}
```

### Súbory na kontrolu/úpravu

- `components/tasks/task-list.tsx` - List view DnD
- `components/kanban/kanban-board.tsx` - Kanban DnD
- `components/kanban/kanban-column.tsx` - Droppable stĺpce
- `components/sidebar/sidebar.tsx` - Droppable sidebar items
- `lib/hooks/use-tasks.ts` - Mutation pre reorder
- `app/api/tasks/reorder/route.ts` - API endpoint (ak existuje)

### Debugging kroky

1. Otvoriť DevTools Console
2. Skontrolovať či nie sú JS errory pri drag operácii
3. Overiť či sa volá `onDragEnd` (pridať `console.log`)
4. Skontrolovať či sú správne `id` v `useSortable` a `useDroppable`

---

## Priorita implementácie

1. **🔴 #3 Drag & Drop** - Najdôležitejšie, základná funkcionalita
2. **🟡 #1 Tagy v Kanban** - Vizuálne vylepšenie
3. **🟢 #2 Zoradenie** - Nice to have

---

## Referencie

- Things 3 screenshoty priložené - ukážka drag & drop správania
- `@dnd-kit` dokumentácia: https://docs.dndkit.com/

---

*Vytvorené: 12. február 2026*
