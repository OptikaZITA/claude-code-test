# ZADANIE PRE CLAUDE CODE: Fáza 2 — Drag & Drop do Koša v Sidebari

## Dátum: 16. február 2026
## Priorita: 🟡 STREDNÁ

---

## PROBLÉM

Používateľ chce pretiahnuť task zo zoznamu alebo z Kanban karty na položku v sidebari — napríklad na **Kôš**, na **Dnes**, alebo na iné **oddelenie/projekt**. Toto aktuálne nefunguje.

## KONTEXT

Aplikácia má dva drag & drop systémy:
1. **@dnd-kit** — používa sa v Kanban view (presun medzi stĺpcami) a v List view (reordering)
2. **HTML5 natívny drag** — používa sa v `DraggableTask` komponente pre presun na sidebar

Tieto dva systémy sa navzájom nevidia. Ale existuje **bridge** — `SidebarDropContext` (`lib/contexts/sidebar-drop-context.tsx`):
- `setDraggedTask(task)` — volá sa pri drag start (v oboch systémoch)
- `isDragging` — flag že prebieha drag
- `draggedTask` — aktuálny task ktorý sa ťahá
- `dropTarget` — cieľ kde sa task pustí (nastavuje sidebar)
- `handleDrop(target)` — spracuje drop na sidebar

`SortableTaskItem` a `KanbanCard` už volajú `setDraggedTask(task)` cez `useEffect` keď `isDragging` z @dnd-kit je true. Čiže sidebar VIE o ťahanom tasku.

Problém je na strane **sidebaru** — `sidebar-drop-item.tsx` počúva na HTML5 drag events (`onDragOver`, `onDrop`), ale @dnd-kit neposiela HTML5 drag events.

---

## RIEŠENIE

Namiesto toho aby sidebar počúval na HTML5 events, nech sidebar reaguje na **hover** počas @dnd-kit dragu. Keď `isDragging === true` (z SidebarDropContext), sidebar položky sa stanú "drop targetmi" a reagujú na `onPointerEnter`/`onPointerUp`.

### Prístup: DndKit Overlay Drop Zones

Keďže @dnd-kit DndContext je vnorený v page content ale sidebar je mimo neho, najlepší prístup je:

**Sidebar drop items budú počúvať na globálne pointer events počas dragu.**

### Krok 1: Uprav `sidebar-drop-item.tsx`

Pridaj logiku ktorá reaguje na pointer events počas @dnd-kit dragu:

```tsx
'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useSidebarDrop } from '@/lib/contexts/sidebar-drop-context'
import { cn } from '@/lib/utils/cn'

interface SidebarDropItemProps {
  children: React.ReactNode
  dropId: string
  dropType: 'trash' | 'when' | 'project' | 'area'
  dropData?: Record<string, any>
  className?: string
}

export function SidebarDropItem({
  children,
  dropId,
  dropType,
  dropData,
  className,
}: SidebarDropItemProps) {
  const { isDragging, draggedTask, setDropTarget } = useSidebarDrop()
  const [isOver, setIsOver] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  // HTML5 drag handlers (pre DraggableTask — List view enableDrag=true)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOver(false)
    
    if (draggedTask) {
      setDropTarget({ id: dropId, type: dropType, data: dropData })
    }
  }, [draggedTask, dropId, dropType, dropData, setDropTarget])

  // @dnd-kit bridge: Keď isDragging (z @dnd-kit), reaguj na pointer events
  useEffect(() => {
    if (!isDragging || !elementRef.current) return

    const element = elementRef.current

    const handlePointerEnter = () => {
      setIsOver(true)
      setDropTarget({ id: dropId, type: dropType, data: dropData })
    }

    const handlePointerLeave = () => {
      setIsOver(false)
      setDropTarget(null)
    }

    element.addEventListener('pointerenter', handlePointerEnter)
    element.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      element.removeEventListener('pointerenter', handlePointerEnter)
      element.removeEventListener('pointerleave', handlePointerLeave)
      setIsOver(false)
    }
  }, [isDragging, dropId, dropType, dropData, setDropTarget])

  // Reset keď drag skončí
  useEffect(() => {
    if (!isDragging) {
      setIsOver(false)
    }
  }, [isDragging])

  return (
    <div
      ref={elementRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'transition-all duration-150',
        isDragging && 'cursor-copy',
        isOver && isDragging && 'bg-primary/10 ring-2 ring-primary/30 rounded-lg scale-[1.02]',
        className
      )}
    >
      {children}
    </div>
  )
}
```

### Krok 2: Skontroluj že `setDraggedTask` sa volá v @dnd-kit komponentoch

V `sortable-task-item.tsx` (riadok ~58) — už existuje:
```tsx
useEffect(() => {
  if (isDragging) {
    setDraggedTask(task)
  } else {
    setDraggedTask(null)
  }
}, [isDragging, task, setDraggedTask])
```

V `kanban-card.tsx` (riadok ~34) — už existuje:
```tsx
useEffect(() => {
  if (isSortableDragging) {
    setDraggedTask(task)
  } else {
    setDraggedTask(null)
  }
}, [isSortableDragging, task, setDraggedTask])
```

✅ Toto je OK — netreba meniť.

### Krok 3: Spracuj drop v `handleDragEnd` handleroch

V `kanban-board.tsx` a `task-list.tsx` a `project-task-list.tsx` — handleDragEnd už kontroluje `dropTarget`:

```tsx
// Already exists in handleDragEnd:
const currentDropTarget = dropTarget
setDropTarget(null)

if (currentDropTarget) {
  handleSidebarDrop(currentDropTarget)
  return
}
```

✅ Toto je OK — netreba meniť.

### Krok 4: Skontroluj `handleDrop` v SidebarDropContext

V `lib/contexts/sidebar-drop-context.tsx`, skontroluj čo robí `handleDrop` keď `dropType === 'trash'`:

```tsx
// Mal by robiť niečo ako:
if (target.type === 'trash') {
  await softDelete(draggedTask.id)
}
if (target.type === 'when') {
  await updateTask(draggedTask.id, { when_type: target.data.whenType })
}
// atď.
```

Ak `handleDrop` nespracováva `trash` typ, pridaj ho. Použi optimistic update — okamžite odstráň task z UI cez `setTasks`.

### Krok 5: Pridaj vizuálny feedback v sidebari

Keď `isDragging` je true, sidebar položky by mali vizuálne naznačiť že sú drop target:
- Kôš: červený highlight pri hoveri
- Dnes: žltý/oranžový highlight
- Projekty/Oddelenia: modrý highlight

Toto sa rieši v `SidebarDropItem` cez `isOver && isDragging` podmienku (už je v kóde vyššie).

### Krok 6: @dnd-kit pointer events problém

**DÔLEŽITÉ:** @dnd-kit počas dragu prepíše pointer events (pointer-events: none na body). To znamená že `pointerenter`/`pointerleave` na sidebar elementy **sa nikdy nevyvolajú**.

Riešenie: Použi `DragOverlay` event listeners alebo custom sensor. Alebo jednoduchšie — použi CSS `pointer-events: auto !important` na sidebar počas dragu:

```tsx
// V sidebar layoute, pridaj:
<aside className={cn(
  "sidebar-container",
  isDragging && "[&_*]:pointer-events-auto"
)}>
  {/* sidebar content */}
</aside>
```

Alebo ešte lepšie — v `SidebarDropItem`, počas dragu, pridaj globálny `pointermove` listener a manuálne detekuj hit test:

```tsx
useEffect(() => {
  if (!isDragging || !elementRef.current) return

  const handlePointerMove = (e: PointerEvent) => {
    const rect = elementRef.current!.getBoundingClientRect()
    const isInside = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    )
    
    if (isInside && !isOver) {
      setIsOver(true)
      setDropTarget({ id: dropId, type: dropType, data: dropData })
    } else if (!isInside && isOver) {
      setIsOver(false)
      setDropTarget(null)
    }
  }

  // Použi document level listener — funguje aj keď @dnd-kit blokuje pointer events
  document.addEventListener('pointermove', handlePointerMove)
  
  return () => {
    document.removeEventListener('pointermove', handlePointerMove)
    setIsOver(false)
  }
}, [isDragging, isOver, dropId, dropType, dropData, setDropTarget])
```

Tento prístup je spoľahlivejší, lebo nepoliehá na pointer events na samotnom elemente.

---

## SÚHRN ZMIEN

| Súbor | Zmena |
|-------|-------|
| `sidebar-drop-item.tsx` | Pridať pointermove listener počas @dnd-kit dragu |
| `sidebar-drop-context.tsx` | Overiť že `handleDrop` spracováva trash, when, project, area |
| Sidebar layout | Vizuálny feedback pri hoveri počas dragu |

## ČO SA NEMENÍ

- `kanban-board.tsx` — handleDragEnd už kontroluje dropTarget ✅
- `task-list.tsx` — handleDragEnd už kontroluje dropTarget ✅  
- `sortable-task-item.tsx` — setDraggedTask už funguje ✅
- `kanban-card.tsx` — setDraggedTask už funguje ✅

## TESTOVANIE

- [ ] Kanban: drag kartu na "Kôš" v sidebari → task sa vymaže (bez refreshu)
- [ ] Kanban: drag kartu na "Dnes" v sidebari → task sa presunie do Dnes
- [ ] List view: drag task na "Kôš" → task sa vymaže
- [ ] List view: drag task na iné oddelenie → task sa presunie
- [ ] Vizuálny feedback: sidebar položky sa zvýraznia pri hoveri počas dragu
- [ ] Funguje pre admin aj member rolu
- [ ] Git push + deploy na Vercel

---

*Vytvorené: 16. február 2026*
