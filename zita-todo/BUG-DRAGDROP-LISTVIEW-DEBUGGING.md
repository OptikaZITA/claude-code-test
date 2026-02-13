# BUG: Drag & Drop nefunguje v List View - DEBUGGING ZADANIE

## Problém

Pri pokuse o presun tasku v listovom zobrazení:
1. Chytím task
2. Presúvam ho vyššie/nižšie v zozname
3. Pustím task
4. **NIČ SA NESTANE** - task zostane na pôvodnej pozícii

---

## Existujúce súbory (podľa CLAUDE.md)

Tieto súbory by mali obsahovať drag & drop logiku:

```
components/tasks/
├── sortable-task-item.tsx      # Drag & drop triediteľná úloha
├── draggable-task.tsx          # Wrapper pre drag
├── task-list.tsx               # Hlavný list komponent
└── task-item.tsx               # Jednotlivý task

components/layout/
├── sidebar-drop-item.tsx       # Droppable sidebar položky
└── calendar-drop-picker.tsx    # Kalendár pre drag & drop

lib/contexts/
└── sidebar-drop-context.tsx    # Drag & drop stav
```

---

## Debugging kroky

### Krok 1: Skontrolovať či je DndContext wrapper

V `task-list.tsx` alebo parent komponente musí byť:

```tsx
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  <SortableContext 
    items={tasks.map(t => t.id)} 
    strategy={verticalListSortingStrategy}
  >
    {tasks.map(task => (
      <SortableTaskItem key={task.id} task={task} />
    ))}
  </SortableContext>
</DndContext>
```

**Ak chýba `DndContext` alebo `SortableContext`, drag nebude fungovať!**

### Krok 2: Skontrolovať SortableTaskItem

V `sortable-task-item.tsx`:

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableTaskItem({ task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}  // ← TOTO JE KRITICKÉ - bez tohto sa nedá chytiť
    >
      <TaskItem task={task} />
    </div>
  );
}
```

**Skontrolovať:**
- Je `{...listeners}` aplikovaný na element?
- Je `ref={setNodeRef}` nastavený?
- Je `id` v `useSortable({ id: task.id })` unikátny string/number?

### Krok 3: Skontrolovať onDragEnd handler

```tsx
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  
  console.log('Drag ended:', { active, over }); // DEBUG
  
  if (!over) {
    console.log('No drop target'); // DEBUG
    return;
  }
  
  if (active.id === over.id) {
    console.log('Same position'); // DEBUG
    return;
  }

  // Nájsť indexy
  const oldIndex = tasks.findIndex(t => t.id === active.id);
  const newIndex = tasks.findIndex(t => t.id === over.id);
  
  console.log('Reorder:', { oldIndex, newIndex }); // DEBUG

  // Optimistic update (UI)
  const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
  setTasks(reorderedTasks);

  // Persist to database
  try {
    await reorderTasksMutation.mutateAsync({
      taskId: active.id as string,
      newIndex,
    });
  } catch (error) {
    console.error('Reorder failed:', error);
    // Rollback
    setTasks(tasks);
  }
};
```

**Pridať `console.log` do handlera a sledovať v DevTools Console!**

### Krok 4: Skontrolovať sensors

```tsx
import { 
  useSensor, 
  useSensors, 
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Minimálna vzdialenosť pred aktiváciou
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

**Ak chýbajú sensors, drag sa neaktivuje!**

### Krok 5: Skontrolovať API endpoint

Existuje endpoint pre reorder?

```typescript
// app/api/tasks/reorder/route.ts
export async function POST(request: Request) {
  const { taskId, newIndex } = await request.json();
  
  // Update sort_order v databáze
  // ...
}
```

**Ak endpoint neexistuje alebo nefunguje, zmena sa neuloží!**

---

## Možné príčiny problému

| Príčina | Ako zistiť | Riešenie |
|---------|------------|----------|
| Chýba DndContext | Pozrieť task-list.tsx | Pridať wrapper |
| Chýba SortableContext | Pozrieť task-list.tsx | Pridať s items a strategy |
| Listeners nie sú aplikované | Pozrieť sortable-task-item.tsx | Pridať `{...listeners}` |
| onDragEnd nie je implementovaný | console.log | Implementovať handler |
| Sensors chýbajú | Pozrieť DndContext | Pridať useSensors |
| CSS transform nefunguje | Pozrieť style | Opraviť CSS.Transform |
| API reorder nefunguje | Network tab | Opraviť endpoint |
| Task ID nie je string | console.log active.id | Konvertovať na string |

---

## Quick Fix - Minimálna implementácia

Ak je problém rozsiahly, tu je minimálna fungujúca implementácia:

```tsx
// components/tasks/task-list-sortable.tsx

'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';

interface Props {
  initialTasks: Task[];
  onReorder: (taskId: string, newIndex: number) => Promise<void>;
}

function SortableTask({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-white border rounded-lg mb-2 cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="font-medium">{task.title}</span>
    </div>
  );
}

export function TaskListSortable({ initialTasks, onReorder }: Props) {
  const [tasks, setTasks] = useState(initialTasks);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);

    // Optimistic update
    setTasks(arrayMove(tasks, oldIndex, newIndex));

    // Persist
    try {
      await onReorder(active.id as string, newIndex);
    } catch (error) {
      // Rollback on error
      setTasks(initialTasks);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <SortableTask key={task.id} task={task} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

---

## Testovanie

Po oprave:

1. ✅ Chytím task - kurzor sa zmení na "grabbing"
2. ✅ Presúvam - task sa vizuálne presúva, ostatné sa posúvajú
3. ✅ Pustím - task zostane na novej pozícii
4. ✅ Refresh stránky - poradie je zachované

---

*Vytvorené: 12. február 2026*
