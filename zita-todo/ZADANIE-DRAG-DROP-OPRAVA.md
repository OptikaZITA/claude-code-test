# Zadanie pre Claude Code: Oprava Drag & Drop logiky

## 1. PROBLÉM: Nekonzistentný drag handle

### Aktuálne správanie
| Stránka | Drag funguje |
|---------|--------------|
| Dnes | Len na 6-bodkovej ikone (⠿) |
| Nadchádzajúce | Kdekoľvek na task riadku ✅ |
| Kanban | Kdekoľvek na karte ✅ |

### Požadované správanie
Drag funguje **kdekoľvek na task riadku** na všetkých stránkach (rovnako ako v Nadchádzajúce).

### Implementácia

```tsx
// components/tasks/task-item.tsx

// Celý task riadok je draggable
<div
  draggable
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  className={cn(
    "flex items-center gap-3 p-3 rounded-lg cursor-grab active:cursor-grabbing",
    isDragging && "opacity-50"
  )}
>
  {/* ODSTRÁNIŤ samostatný drag handle - už nie je potrebný */}
  {/* <GripVertical className="h-4 w-4" /> */}
  
  <Checkbox />
  <Star />
  <span>{task.title}</span>
  {/* ... */}
</div>
```

### Zachovať mobile logiku
Existujúce touch gestá a swipe-to-delete zostávajú bez zmeny.

---

## 2. PROBLÉM: Zlá logika pri drop na Oddelenie/Projekt

### Aktuálne správanie (ZLE)
```
Task "kúpiť mlieko" je v DNES (when_type='today')
↓ Pretiahnem do oddelenia "Prevádzka"
↓ Task ZMIZNE z DNES
↓ when_type sa zmení (na 'anytime' alebo null)
```

### Požadované správanie (Things 3 štýl)
```
Task "kúpiť mlieko" je v DNES (when_type='today')
↓ Pretiahnem do oddelenia "Prevádzka"
↓ Task ZOSTÁVA v DNES (when_type='today' sa NEMENÍ!)
↓ Len area_id sa nastaví na "Prevádzka"
↓ Task sa zobrazí v DNES aj v oddelení "Prevádzka"
```

### Pravidlá drop operácií

| Kam dropnem | Čo sa ZMENÍ | Čo sa NEZMENÍ |
|-------------|-------------|---------------|
| Oddelenie (Area) | `area_id` | `when_type`, `project_id` |
| Projekt | `project_id`, `area_id` (z projektu) | `when_type` |
| Dnes | `when_type = 'today'` | `area_id`, `project_id` |
| Nadchádzajúce | `when_type = 'scheduled'`, `when_date` | `area_id`, `project_id` |
| Kedykoľvek | `when_type = 'anytime'` | `area_id`, `project_id` |
| Niekedy | `when_type = 'someday'` | `area_id`, `project_id` |
| Inbox | `when_type = 'inbox'`, `is_inbox = true` | `area_id`, `project_id` |

### Implementácia

```tsx
// components/layout/sidebar-drop-item.tsx

const handleDrop = async (taskId: string, targetType: string, targetId?: string) => {
  let updates: Partial<Task> = {};
  
  switch (targetType) {
    // ČASOVÉ VIEWS - mení len when_type
    case 'today':
      updates = { when_type: 'today' };
      break;
    case 'upcoming':
      // Zobrazí kalendár pre výber dátumu
      setPendingUpcomingDrop(taskId);
      return;
    case 'anytime':
      updates = { when_type: 'anytime' };
      break;
    case 'someday':
      updates = { when_type: 'someday' };
      break;
    case 'inbox':
      updates = { when_type: 'inbox', is_inbox: true };
      break;
      
    // ORGANIZAČNÉ - mení len area_id/project_id, NIE when_type!
    case 'area':
      updates = { area_id: targetId };
      // NEZMENIŤ when_type!
      break;
    case 'project':
      const project = await getProject(targetId);
      updates = { 
        project_id: targetId,
        area_id: project.area_id  // Zdedí area z projektu
      };
      // NEZMENIŤ when_type!
      break;
  }
  
  await updateTask(taskId, updates);
};
```

---

## 3. SÚBORY NA ÚPRAVU

### Hlavné súbory
1. `components/tasks/task-item.tsx` - draggable na celom riadku
2. `components/layout/sidebar-drop-item.tsx` - opraviť drop logiku

### Overiť/Skontrolovať
3. `components/tasks/sortable-task-item.tsx` - konzistencia
4. `lib/contexts/sidebar-drop-context.tsx` - drop context

---

## 4. VÝSLEDOK

### Drag
- Kdekoľvek na task riadku (nie len na ikone)
- Konzistentné na všetkých stránkach
- Mobile touch gestá zachované

### Drop na Oddelenie/Projekt
- Zmení len `area_id` alebo `project_id`
- `when_type` sa NEMENÍ
- Task zostáva v pôvodnom časovom view (Dnes, Upcoming...)

### Drop na časové views
- Zmení len `when_type` (a `when_date` pre Upcoming)
- `area_id` a `project_id` sa NEMENIA

---

## 5. TESTOVANIE

Po implementácii otestovať:

1. **Drag z Dnes do Oddelenia:**
   - [ ] Task zostáva v Dnes
   - [ ] Task sa zobrazí aj v Oddelení

2. **Drag z Dnes do Projektu:**
   - [ ] Task zostáva v Dnes
   - [ ] Task sa zobrazí aj v Projekte

3. **Drag z Oddelenia do Dnes:**
   - [ ] Task sa presunie do Dnes
   - [ ] Task zostáva v Oddelení

4. **Drag funguje kdekoľvek:**
   - [ ] Na stránke Dnes
   - [ ] Na stránke Inbox
   - [ ] Na stránke Kedykoľvek
   - [ ] V detaile Projektu
