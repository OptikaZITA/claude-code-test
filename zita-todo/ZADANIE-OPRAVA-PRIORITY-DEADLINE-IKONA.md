# ZADANIE: Oprava priorít a deadline ikony

## Prehľad

Zjednodušenie priorít na 2 úrovne, oprava bugu s čiernou vlajkou a zmena deadline ikony v task detaile.

---

## 1. PRIORITA - ZJEDNODUŠENIE NA 2 ÚROVNE

### Aktuálny stav (ZLE)
- 4 úrovne: Urgentná, Vysoká, Stredná, Nízka
- Zobrazuje sa aj čierna vlajka (bug)

### Nový stav (SPRÁVNE)

| Priorita | Ikona | Farba | Tailwind trieda |
|----------|-------|-------|-----------------|
| Vysoká | 🚩 | Červená | text-red-500 (#EF4444) |
| Nízka | 🚩 | Žltá | text-yellow-500 (#EAB308) |
| Žiadna | - | - | Bez vlajky |

### Migrácia existujúcich dát

| Stará hodnota | Nová hodnota |
|---------------|--------------|
| urgent | high |
| high | high |
| medium | low |
| low | low |
| (null) | (null) |

### Filter Priorita

Upraviť dropdown filter:

**Staré:**
- Urgentná
- Vysoká
- Stredná
- Nízka

**Nové:**
- Vysoká
- Nízka

### Databáza

```sql
-- Migrácia existujúcich hodnôt
UPDATE tasks SET priority = 'high' WHERE priority IN ('urgent', 'high');
UPDATE tasks SET priority = 'low' WHERE priority IN ('medium', 'low');
```

### Kód - priorityColors

```typescript
const priorityColors = {
  high: 'text-red-500',    // Červená
  low: 'text-yellow-500',  // Žltá
};

// Zobrazenie
{task.priority && (
  <Flag 
    className={`w-4 h-4 ${priorityColors[task.priority]}`} 
    fill="currentColor" 
  />
)}
```

---

## 2. BUG: ČIERNA VLAJKA

### Problém
V zozname taskov sa zobrazuje čierna vlajka, ktorá nemá byť definovaná.

### Príčina (pravdepodobne)
- Default/fallback farba keď priorita nie je rozpoznaná
- Alebo chýbajúca podmienka pre `null` prioritu

### Riešenie

```typescript
// ❌ ZLE - zobrazuje vlajku aj pre neznáme hodnoty
<Flag className={priorityColors[task.priority] || 'text-black'} />

// ✅ SPRÁVNE - zobrazuje vlajku LEN pre definované priority
{task.priority && ['high', 'low'].includes(task.priority) && (
  <Flag className={priorityColors[task.priority]} fill="currentColor" />
)}
```

### Kde hľadať
```
components/tasks/task-item.tsx
components/tasks/kanban-card.tsx
```

---

## 3. DEADLINE IKONA V TASK DETAILE

### Aktuálny stav (ZLE)
- V task detaile je pri deadline nastavení **vlajka** 🚩
- Mätúce - vlajka = priorita

### Nový stav (SPRÁVNE)
- Pri deadline nastavení má byť **kalendár** 📅
- Kliknutie na kalendár otvorí date picker

### Vizuál

```
┌─────────────────────────────────────┐
│ 🚩 Priorita    [Vysoká ▼]           │  ← Vlajka pre prioritu
│ 📅 Deadline    [10.1.2026]          │  ← Kalendár pre deadline
│ 📆 Kedy        [Dnes ▼]             │  ← When picker
└─────────────────────────────────────┘
```

### Kód

```typescript
// V task-detail.tsx alebo podobnom komponente

// Deadline sekcia
<div className="flex items-center gap-2">
  <Calendar className="w-4 h-4 text-gray-500" />  {/* Zmena z Flag na Calendar */}
  <span>Deadline</span>
  <DatePicker 
    value={task.deadline} 
    onChange={handleDeadlineChange} 
  />
</div>
```

### Kde hľadať
```
components/tasks/task-detail.tsx
components/tasks/task-form.tsx
components/tasks/deadline-picker.tsx
```

---

## 4. ACCEPTANCE CRITERIA

### Priorita
- [ ] Len 2 úrovne: Vysoká (červená) a Nízka (žltá)
- [ ] Žiadna priorita = žiadna vlajka
- [ ] Filter má len 2 možnosti
- [ ] Existujúce dáta migrované

### Čierna vlajka
- [ ] Čierna vlajka sa nikde nezobrazuje
- [ ] Vlajka sa zobrazuje LEN pre 'high' a 'low'

### Deadline ikona
- [ ] V task detaile je pri deadline kalendár 📅 (nie vlajka)
- [ ] Kliknutie na kalendár otvorí date picker
- [ ] V task riadku zostáva kalendár s dátumom (bez zmeny)

---

## 5. SÚBORY NA ÚPRAVU

```
components/tasks/task-item.tsx         # Vlajka v zozname
components/tasks/task-detail.tsx       # Deadline ikona
components/tasks/kanban-card.tsx       # Vlajka na karte
components/filters/priority-filter.tsx # Filter dropdown
lib/constants/priority.ts              # Definícia priorít (ak existuje)
```

---

## 6. TESTOVANIE

1. Vytvor task bez priority → žiadna vlajka
2. Nastav prioritu "Vysoká" → červená vlajka
3. Nastav prioritu "Nízka" → žltá vlajka
4. Over že čierna vlajka sa nikde nezobrazuje
5. V task detaile klikni na deadline → kalendár ikona, otvorí sa date picker

---

**Priorita zadania:** Vysoká (oprava bugov)
**Dátum:** 8. január 2026
