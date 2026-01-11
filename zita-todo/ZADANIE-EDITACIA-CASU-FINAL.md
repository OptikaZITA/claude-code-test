# ZADANIE: Editácia času (Time Entries)

## Prehľad

Pridať možnosť editovať, mazať a manuálne pridávať časové záznamy (time entries). Funkcionalita bude dostupná na 2 miestach: Task Detail Panel a Časovač (Time Dashboard).

---

## Prípad použitia

> "Spustil som timer o 10:00, ale o 10:30 ma kolega vyrušil. Zabudol som zastaviť timer a zistil som to až o 12:00. Chcem si upraviť čas z 2h na 30 minút."

---

## Kde bude editácia dostupná

### 1. Task Detail Panel (slide-over vpravo)

V sekcii ⏱️ TIME TRACKER:

```
┌─────────────────────────────────────────────┐
│ ⏱️ TIME TRACKER                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [▶️ Start Timer]                        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Total: 2h 38m                               │
│ ─────────────────────────────────────────── │
│                                             │
│ 📅 Dnes                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ 10:15 – 12:30           2h 15m          │ │
│ │                           [✏️] [🗑️]    │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 09:00 – 09:45           45m             │ │
│ │                           [✏️] [🗑️]    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 📅 Včera                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ 14:00 – 15:30           1h 30m          │ │
│ │                           [✏️] [🗑️]    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [+ Pridať čas manuálne]                     │
└─────────────────────────────────────────────┘
```

### 2. Časovač / Time Dashboard (`/time`)

V tabuľke (Detailed view) - nový stĺpec Akcie:

```
┌────────┬────────────────────┬────────┬──────────┬───────────┬───────────┐
│ Dátum  │ Úloha              │ Kto    │ Trvanie  │ Čas       │ Akcie     │
├────────┼────────────────────┼────────┼──────────┼───────────┼───────────┤
│ 11.1.  │ Analýza ticketov   │ Dano   │ 2h 15m   │ 10:15-12:30│ [✏️][🗑️]│
│ 11.1.  │ Kontrola pohľadávok│ Dano   │ 45m      │ 09:00-09:45│ [✏️][🗑️]│
│ 10.1.  │ Cold calling       │ Naty   │ 1h 30m   │ 14:00-15:30│ [👁️]     │
└────────┴────────────────────┴────────┴──────────┴───────────┴───────────┘
```

**Pravidlá prístupu:**
- Bežný user: Edit/Delete len pri **svojich** entries
- Admin: Edit/Delete pri **všetkých** entries
- Cudzie entries: Len view [👁️] (alebo žiadne tlačidlo)

---

## Edit Modal

Keď klikneš na [✏️], otvorí sa modal:

```
┌─────────────────────────────────────────────┐
│ Upraviť čas                             [×] │
├─────────────────────────────────────────────┤
│                                             │
│ Úloha                                       │
│ [Analýza ticketov              ▼]           │
│                                             │
│ Popis (voliteľné)                           │
│ [Telefonát s klientom          ]            │
│                                             │
│ ┌───────────────┐    ┌───────────────┐      │
│ │ Začiatok      │    │ Koniec        │      │
│ │ [10:15]       │    │ [12:30]       │      │
│ │ [11.1.2026 ▼] │    │ [11.1.2026 ▼] │      │
│ └───────────────┘    └───────────────┘      │
│                                             │
│ Trvanie: 2h 15m  (automaticky vypočítané)   │
│                                             │
├─────────────────────────────────────────────┤
│                     [Zrušiť]  [Uložiť]      │
└─────────────────────────────────────────────┘
```

**Editovateľné polia:**

| Pole | Typ | Popis |
|------|-----|-------|
| **Úloha** | Dropdown | Môže presunúť čas na inú úlohu |
| **Popis** | Text input | Voliteľná poznámka |
| **Začiatok** | Time + Date picker | Kedy začal |
| **Koniec** | Time + Date picker | Kedy skončil |
| **Trvanie** | Read-only | Auto-computed z začiatku/konca |

**Alternatívne:** Používateľ môže editovať priamo trvanie a systém dopočíta koniec.

---

## Manuálne pridanie času

Keď klikneš na [+ Pridať čas manuálne], otvorí sa podobný modal:

```
┌─────────────────────────────────────────────┐
│ Pridať čas manuálne                     [×] │
├─────────────────────────────────────────────┤
│                                             │
│ Úloha                                       │
│ [Analýza ticketov              ▼]           │ ← Predvyplnené ak otvorené z Task Detail
│                                             │
│ Popis (voliteľné)                           │
│ [                              ]            │
│                                             │
│ ┌───────────────┐    ┌───────────────┐      │
│ │ Začiatok      │    │ Koniec        │      │
│ │ [14:00]       │    │ [15:30]       │      │
│ │ [Dnes      ▼] │    │ [Dnes      ▼] │      │
│ └───────────────┘    └───────────────┘      │
│                                             │
│ Trvanie: 1h 30m                             │
│                                             │
├─────────────────────────────────────────────┤
│                     [Zrušiť]  [Pridať]      │
└─────────────────────────────────────────────┘
```

**Poznámka:** Môže byť rovnaký komponent ako Edit modal, len s iným titulkom a tlačidlom.

---

## Delete potvrdenie

Keď klikneš na [🗑️]:

```
┌─────────────────────────────────────────────┐
│ Vymazať záznam?                             │
├─────────────────────────────────────────────┤
│                                             │
│ Naozaj chceš vymazať tento časový záznam?   │
│                                             │
│ • Analýza ticketov                          │
│ • 10:15 – 12:30 (2h 15m)                    │
│ • 11. januára 2026                          │
│                                             │
├─────────────────────────────────────────────┤
│                    [Zrušiť]  [Vymazať]      │
└─────────────────────────────────────────────┘
```

**Soft delete:** Záznam sa neodstráni úplne, len sa nastaví `deleted_at = now()`.

---

## Databázové zmeny

```sql
-- Pridať stĺpec pre soft delete
ALTER TABLE time_entries 
ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Voliteľne: Index pre rýchlejšie query
CREATE INDEX idx_time_entries_deleted_at ON time_entries(deleted_at) WHERE deleted_at IS NULL;
```

**Poznámka:** Stĺpec `editable` nie je potrebný - môžeš riešiť obmedzenie editácie cez aplikačnú logiku (napr. entries staršie ako 7 dní).

---

## API Endpoints

### PUT `/api/time-entries/[id]`

Editácia existujúceho entry.

**Request:**
```json
{
  "todo_id": "uuid",           // Voliteľné - presun na inú úlohu
  "description": "Telefonát",  // Voliteľné
  "started_at": "2026-01-11T10:15:00Z",
  "stopped_at": "2026-01-11T12:30:00Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "todo_id": "uuid",
  "description": "Telefonát",
  "started_at": "2026-01-11T10:15:00Z",
  "stopped_at": "2026-01-11T12:30:00Z",
  "duration_seconds": 8100,
  "updated_at": "2026-01-11T15:00:00Z"
}
```

**Validácia:**
- `stopped_at` musí byť po `started_at`
- `duration_seconds` sa automaticky vypočíta
- RLS: User môže editovať len svoje entries (admin všetky)

### POST `/api/time-entries/manual`

Manuálne pridanie času.

**Request:**
```json
{
  "todo_id": "uuid",
  "description": "Zabudnutý timer",  // Voliteľné
  "started_at": "2026-01-11T14:00:00Z",
  "stopped_at": "2026-01-11T15:30:00Z"
}
```

**Response:** Rovnaké ako PUT.

**Poznámka:** Môže byť rovnaký endpoint ako POST `/api/time-entries` (existujúci pre start timer), len s `is_running: false`.

### DELETE `/api/time-entries/[id]`

Soft delete.

**Response:**
```json
{
  "id": "uuid",
  "deleted_at": "2026-01-11T15:00:00Z"
}
```

---

## Komponenty

### Nové

```
components/time-tracking/
├── edit-time-entry-modal.tsx    # Modal pre editáciu aj manuálne pridanie
└── delete-time-entry-dialog.tsx # Potvrdenie vymazania
```

### Upravené

```
components/time-tracking/
├── time-entries-list.tsx        # Pridať [✏️][🗑️] tlačidlá + [+ Pridať manuálne]
└── time-dashboard-table.tsx     # Pridať stĺpec Akcie s [✏️][🗑️]
```

---

## Hooks

### Nový alebo rozšírený

```typescript
// lib/hooks/use-time-entries.ts

// Existujúce
export function useTimeEntries(todoId: string) { ... }

// Nové funkcie
export function useUpdateTimeEntry() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTimeEntryData }) => {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
      return response.json()
    },
    onSuccess: () => {
      // Invalidate queries, dispatch event
    }
  })
}

export function useDeleteTimeEntry() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'DELETE'
      })
      return response.json()
    }
  })
}

export function useCreateManualTimeEntry() {
  return useMutation({
    mutationFn: async (data: CreateManualTimeEntryData) => {
      const response = await fetch('/api/time-entries/manual', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return response.json()
    }
  })
}
```

---

## Realtime sync

Po editácii/vymazaní dispatnúť custom event pre aktualizáciu ostatných komponentov:

```typescript
// Po úspešnej editácii
window.dispatchEvent(new CustomEvent('time-entry:updated', { detail: { id, data } }))

// Po vymazaní
window.dispatchEvent(new CustomEvent('time-entry:deleted', { detail: { id } }))
```

Komponenty počúvajú na tieto eventy a refreshnú dáta.

---

## Acceptance Criteria

### Task Detail Panel
- [ ] Zobrazujú sa [✏️] [🗑️] tlačidlá pri každom time entry
- [ ] Klik na [✏️] otvorí Edit modal s predvyplnenými dátami
- [ ] Klik na [🗑️] otvorí Delete potvrdenie
- [ ] Tlačidlo [+ Pridať čas manuálne] otvorí modal pre manuálny zápis
- [ ] Po editácii/vymazaní sa Total čas aktualizuje

### Časovač (Time Dashboard)
- [ ] Nový stĺpec "Akcie" v Detailed tabuľke
- [ ] [✏️] [🗑️] len pri vlastných entries (admin pri všetkých)
- [ ] Klik na [✏️] otvorí Edit modal
- [ ] Klik na [🗑️] otvorí Delete potvrdenie
- [ ] Po editácii/vymazaní sa tabuľka a grafy aktualizujú

### Edit Modal
- [ ] Dropdown pre výber úlohy (môže presunúť na inú)
- [ ] Text input pre popis
- [ ] Time + Date picker pre začiatok
- [ ] Time + Date picker pre koniec
- [ ] Auto-computed trvanie
- [ ] Validácia: koniec > začiatok
- [ ] Uložiť aktualizuje entry v DB

### Manuálne pridanie
- [ ] Predvyplnená úloha ak otvorené z Task Detail
- [ ] Rovnaké polia ako Edit modal
- [ ] Vytvorí nový entry s `is_running: false`

### Delete
- [ ] Soft delete (`deleted_at = now()`)
- [ ] Potvrdenie pred vymazaním
- [ ] Deleted entries sa nezobrazujú v UI

### API
- [ ] PUT `/api/time-entries/[id]` funguje
- [ ] POST `/api/time-entries/manual` funguje
- [ ] DELETE `/api/time-entries/[id]` funguje
- [ ] RLS: user môže editovať/mazať len svoje entries
- [ ] Admin môže editovať/mazať všetky entries

### Realtime
- [ ] Custom events pre cross-component sync
- [ ] Totals sa aktualizujú po zmene

---

## Test scenáre

1. **Editácia času po vyrušení:**
   - Spusti timer o 10:00
   - Zastav o 12:00
   - Edituj koniec na 10:30
   - Overiť: Trvanie = 30m

2. **Manuálne pridanie zabudnutého času:**
   - Otvor úlohu
   - Klikni [+ Pridať čas manuálne]
   - Zadaj včerajšie 14:00-16:00
   - Overiť: Nový entry sa zobrazí

3. **Presun času na inú úlohu:**
   - Edituj entry
   - Zmeň úlohu v dropdown
   - Overiť: Entry sa presunul

4. **Vymazanie času:**
   - Klikni [🗑️]
   - Potvrď
   - Overiť: Entry zmizol, Total sa aktualizoval

---

**Priorita:** Vysoká
**Odhadovaný čas:** 4-6 hodín
**Dátum:** 11. január 2026
