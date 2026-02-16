# ZADANIE PRE CLAUDE CODE: Prepracovanie systému opakujúcich sa taskov

## Dátum: 16. február 2026
## Priorita: 🟡 STREDNÁ
## Inšpirácia: Things 3 (macOS/iOS)

---

## KONTEXT

Aktuálny recurrence systém v ZITA TODO funguje, ale má problémy:
1. Dátum začiatku opakovania sa počíta od "teraz" namiesto od konkrétneho dátumu
2. Chýba výber dňa v týždni (weekly), dňa v mesiaci (monthly), mesiaca (yearly)
3. UX je menej intuitívny ako Things 3

Cieľ: Prepracovať `recurrence-config-modal.tsx` podľa Things 3 vzoru, prispôsobený ZITA TODO dizajnu.

---

## THINGS 3 REFERENCIA

Things 3 má tento repeat dialog:

### Typ opakovania
- **After completion** — nový task sa vytvorí X dní/týždňov/mesiacov po dokončení predošlého
- **Scheduled** (podľa rozvrhu) — task sa opakuje podľa pevného rozvrhu

### Frekvencia (pre oba typy)
- **Daily** — Every X days
- **Weekly** — Every X weeks on [Monday/Tuesday/...]
- **Monthly** — Every X months on the [1st/2nd/.../last] [day/Monday/Tuesday/...]
- **Yearly** — Every X years on the [1st/2nd/.../last] [day/Monday/...] in [January/.../December]

### Ďalšie nastavenia
- **Start date** — Next: dd/mm/yyyy (odkedy sa začne opakovanie)
- **Ends** — never / after X times / on date
- **Add reminders** — checkbox
- **Add deadlines** — checkbox

### Preview
Zobrazenie nasledujúcich 4-5 dátumov výskytov

---

## IMPLEMENTÁCIA

### 1. Uprav RecurrenceRule typ v `types/index.ts`

Pridaj nové polia:

```typescript
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurrenceRule {
  // Typ opakovania
  type: 'after_completion' | 'scheduled'
  
  // Frekvencia
  frequency: RecurrenceFrequency    // NOVÉ - nahradí unit
  interval: number                   // Každý X (1 = každý, 2 = každý druhý...)
  
  // Weekly: ktoré dni
  weekdays?: number[]                // NOVÉ - 0=Po, 1=Ut, 2=St, 3=Št, 4=Pi, 5=So, 6=Ne
  
  // Monthly: ktorý deň
  month_day?: number                 // NOVÉ - 1-31 alebo -1 (posledný)
  month_week?: number                // NOVÉ - 1-5 (1.týždeň, 2.týždeň...) alebo -1 (posledný)
  month_weekday?: number             // NOVÉ - 0-6 (Po-Ne) — použije sa s month_week
  
  // Yearly: ktorý mesiac a deň
  year_month?: number                // NOVÉ - 1-12
  year_day?: number                  // NOVÉ - 1-31
  
  // Kedy začať
  start_date?: string                // NOVÉ - ISO date odkedy sa začne opakovanie
  next_date?: string                 // Ďalší výskyt
  
  // Kedy skončiť
  end_type: RecurrenceEndType
  end_after_count?: number
  end_on_date?: string
  
  // Stav
  completed_count: number
  
  // Voliteľné
  reminder_time?: string
  deadline_days_before?: number
  
  // DEPRECATED - pre spätnú kompatibilitu
  unit?: RecurrenceUnit              // Nahradené frequency
}
```

### 2. Prepracuj RecurrenceConfigModal

Nový layout modálu:

```
┌─────────────────────────────────────────┐
│  Opakovanie                         ✕   │
├─────────────────────────────────────────┤
│                                         │
│  Opakovať  [Po dokončení ▼]  [✓]       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Každý [1] [týždeň ▼]           │    │
│  │ v [Pondelok ▼]                  │    │  ← len pre weekly
│  └─────────────────────────────────┘    │
│                                         │
│  Ďalší:  16.2.2026                      │
│  → 23.2., 2.3., 9.3., 16.3.            │
│                                         │
│  Ukončiť  [nikdy ▼]                    │
│                                         │
│  ☐ Pridať pripomienku                  │
│  ☐ Pridať deadline                     │
│                                         │
├─────────────────────────────────────────┤
│  [Odstrániť]          [Zrušiť] [Uložiť]│
└─────────────────────────────────────────┘
```

### Hlavný komponent:

```tsx
export function RecurrenceConfigModal({ isOpen, onClose, task, onSave }: RecurrenceConfigModalProps) {
  const [repeatType, setRepeatType] = useState<'none' | 'after_completion' | 'scheduled'>('none')
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly')
  const [interval, setInterval] = useState(1)
  
  // Weekly
  const [selectedWeekday, setSelectedWeekday] = useState(1) // 0=Po ... 6=Ne
  
  // Monthly
  const [monthMode, setMonthMode] = useState<'day' | 'weekday'>('day') // deň vs deň v týždni
  const [monthDay, setMonthDay] = useState(1)        // 1-31
  const [monthWeek, setMonthWeek] = useState(1)      // 1.týždeň, 2.týždeň...
  const [monthWeekday, setMonthWeekday] = useState(1) // Po-Ne
  
  // Yearly
  const [yearMonth, setYearMonth] = useState(1)      // Január=1 ... December=12
  const [yearDay, setYearDay] = useState(1)
  
  // Start date
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  
  // End
  const [endType, setEndType] = useState<RecurrenceEndType>('never')
  const [endAfterCount, setEndAfterCount] = useState(5)
  const [endOnDate, setEndOnDate] = useState('')
  
  // Reminders & deadlines
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('09:00')
  const [deadlineEnabled, setDeadlineEnabled] = useState(false)
  const [deadlineDaysBefore, setDeadlineDaysBefore] = useState(0)
  
  // ... (inicializácia z task.recurrence_rule)
```

### 3. Frekvenčné nastavenia podľa typu

#### Daily:
```tsx
{frequency === 'daily' && (
  <div className="flex items-center gap-2">
    <span>Každý</span>
    <NumberInput value={interval} onChange={setInterval} min={1} max={365} />
    <span>{interval === 1 ? 'deň' : 'dní'}</span>
  </div>
)}
```

#### Weekly:
```tsx
{frequency === 'weekly' && (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <span>Každý</span>
      <NumberInput value={interval} onChange={setInterval} min={1} max={52} />
      <span>{interval === 1 ? 'týždeň' : 'týždňov'}</span>
      <span>v</span>
      <select value={selectedWeekday} onChange={...}>
        <option value={0}>Pondelok</option>
        <option value={1}>Utorok</option>
        <option value={2}>Streda</option>
        <option value={3}>Štvrtok</option>
        <option value={4}>Piatok</option>
        <option value={5}>Sobota</option>
        <option value={6}>Nedeľa</option>
      </select>
    </div>
  </div>
)}
```

#### Monthly:
```tsx
{frequency === 'monthly' && (
  <div className="flex items-center gap-2 flex-wrap">
    <span>Každý</span>
    <NumberInput value={interval} onChange={setInterval} min={1} max={12} />
    <span>{interval === 1 ? 'mesiac' : 'mesiacov'}</span>
    <span>v</span>
    <select value={monthDay} onChange={...}>
      {Array.from({ length: 31 }, (_, i) => (
        <option key={i + 1} value={i + 1}>{i + 1}.</option>
      ))}
      <option value={-1}>posledný</option>
    </select>
    <span>deň</span>
  </div>
)}
```

#### Yearly:
```tsx
{frequency === 'yearly' && (
  <div className="flex items-center gap-2 flex-wrap">
    <span>Každý</span>
    <NumberInput value={interval} onChange={setInterval} min={1} max={10} />
    <span>{interval === 1 ? 'rok' : 'rokov'}</span>
    <span>v</span>
    <select value={yearDay} onChange={...}>
      {Array.from({ length: 31 }, (_, i) => (
        <option key={i + 1} value={i + 1}>{i + 1}.</option>
      ))}
    </select>
    <span>deň</span>
    <span>v</span>
    <select value={yearMonth} onChange={...}>
      <option value={1}>Januári</option>
      <option value={2}>Februári</option>
      <option value={3}>Marci</option>
      <option value={4}>Apríli</option>
      <option value={5}>Máji</option>
      <option value={6}>Júni</option>
      <option value={7}>Júli</option>
      <option value={8}>Auguste</option>
      <option value={9}>Septembri</option>
      <option value={10}>Októbri</option>
      <option value={11}>Novembri</option>
      <option value={12}>Decembri</option>
    </select>
  </div>
)}
```

### 4. Start date & Preview

```tsx
{/* Start date */}
<div className="flex items-center gap-2">
  <span className="text-sm text-muted-foreground">Ďalší:</span>
  <input
    type="date"
    value={startDate}
    onChange={(e) => setStartDate(e.target.value)}
    className="px-2 py-1 rounded border border-border bg-background text-foreground"
  />
</div>

{/* Preview nasledujúcich dátumov */}
{upcomingDates.length > 0 && (
  <div className="text-sm text-muted-foreground">
    → {upcomingDates.map((d, i) => (
      <span key={i}>
        {format(d, 'd.M.yyyy', { locale: sk })}
        {i < upcomingDates.length - 1 && ', '}
      </span>
    ))}
  </div>
)}
```

### 5. Uprav výpočet upcoming dates

`upcomingDates` sa musí počítať od `startDate` (nie od "teraz"):

```tsx
const upcomingDates = useMemo(() => {
  const dates: Date[] = []
  let current = startDate ? new Date(startDate) : new Date()
  
  for (let i = 0; i < 4; i++) {
    switch (frequency) {
      case 'daily':
        current = addDays(current, interval)
        break
      case 'weekly':
        current = addWeeks(current, interval)
        // Adjust to correct weekday
        break
      case 'monthly':
        current = addMonths(current, interval)
        // Adjust to correct day
        if (monthDay === -1) {
          // Posledný deň mesiaca
          current = new Date(current.getFullYear(), current.getMonth() + 1, 0)
        } else {
          current.setDate(Math.min(monthDay, new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()))
        }
        break
      case 'yearly':
        current = addYears(current, interval)
        current.setMonth(yearMonth - 1)
        current.setDate(yearDay)
        break
    }
    
    if (endType === 'after_count' && i >= endAfterCount) break
    if (endType === 'on_date' && endOnDate && current > new Date(endOnDate)) break
    
    dates.push(new Date(current))
  }
  
  return dates
}, [frequency, interval, startDate, monthDay, yearMonth, yearDay, selectedWeekday, endType, endAfterCount, endOnDate])
```

### 6. Spätná kompatibilita

Existujúce `recurrence_rule` v databáze majú pole `unit` namiesto `frequency`. Pri načítaní mapuj:

```tsx
// V useEffect pri načítaní:
if (rule.unit && !rule.frequency) {
  // Stará verzia — mapuj unit na frequency
  setFrequency(rule.unit === 'day' ? 'daily' : 
               rule.unit === 'week' ? 'weekly' : 
               rule.unit === 'month' ? 'monthly' : 'yearly')
} else if (rule.frequency) {
  setFrequency(rule.frequency)
}
```

### 7. Uprav handleSave

```tsx
const handleSave = () => {
  if (repeatType === 'none') {
    onSave(null)
    onClose()
    return
  }

  const rule: RecurrenceRule = {
    type: repeatType,
    frequency,
    interval,
    end_type: endType,
    completed_count: task.recurrence_rule?.completed_count || 0,
    start_date: startDate,
    next_date: startDate, // Prvý výskyt = start date
  }

  // Weekly
  if (frequency === 'weekly') {
    rule.weekdays = [selectedWeekday]
  }

  // Monthly
  if (frequency === 'monthly') {
    rule.month_day = monthDay
  }

  // Yearly
  if (frequency === 'yearly') {
    rule.year_month = yearMonth
    rule.year_day = yearDay
  }

  // End conditions
  if (endType === 'after_count') rule.end_after_count = endAfterCount
  if (endType === 'on_date') rule.end_on_date = endOnDate
  
  // Optional
  if (reminderEnabled) rule.reminder_time = reminderTime
  if (deadlineEnabled) rule.deadline_days_before = deadlineDaysBefore

  onSave(rule)
  onClose()
}
```

### 8. Uprav formatRecurrenceRule v `types/index.ts`

```tsx
export function formatRecurrenceRule(rule: RecurrenceRule): string {
  const freq = rule.frequency || (rule.unit === 'day' ? 'daily' : rule.unit === 'week' ? 'weekly' : rule.unit === 'month' ? 'monthly' : 'yearly')
  const typeLabel = rule.type === 'after_completion' ? 'po dokončení' : ''
  
  const WEEKDAYS_SK = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']
  const MONTHS_SK = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
  
  let label = ''
  switch (freq) {
    case 'daily':
      label = rule.interval === 1 ? 'Denne' : `Každý ${rule.interval}. deň`
      break
    case 'weekly':
      const day = rule.weekdays?.[0] !== undefined ? WEEKDAYS_SK[rule.weekdays[0]] : ''
      label = rule.interval === 1 ? `Týždenne (${day})` : `Každý ${rule.interval}. týždeň (${day})`
      break
    case 'monthly':
      label = rule.interval === 1 ? `Mesačne (${rule.month_day}.)` : `Každý ${rule.interval}. mesiac (${rule.month_day}.)`
      break
    case 'yearly':
      label = `Ročne (${rule.year_day}. ${MONTHS_SK[rule.year_month || 1]})`
      break
  }
  
  if (typeLabel) label += ` ${typeLabel}`
  return label
}
```

---

## DATABÁZA

`recurrence_rule` je uložený ako JSONB v tabuľke `tasks`. Nie je potrebná žiadna migrácia — len pridáme nové polia do JSON objektu. Stará verzia bude stále fungovať vďaka spätnej kompatibilite.

---

## SÚHRN ZMIEN

| Súbor | Zmena |
|-------|-------|
| `types/index.ts` | Rozšíriť RecurrenceRule typ + nový formatRecurrenceRule |
| `recurrence-config-modal.tsx` | Kompletný prepis — nový layout podľa Things 3 |
| `recurrence-badge.tsx` | Bez zmeny (používa formatRecurrenceRule) |

## TESTOVANIE

- [ ] Nové opakovanie: Daily — every 1 day → preview ukazuje správne dátumy
- [ ] Nové opakovanie: Weekly — every 1 week on Monday → preview OK
- [ ] Nové opakovanie: Monthly — every 1 month on 15th → preview OK
- [ ] Nové opakovanie: Yearly — every 1 year on 1st January → preview OK
- [ ] Start date: zmením dátum → preview sa aktualizuje
- [ ] End: after 3 times → preview ukazuje len 3 dátumy
- [ ] End: on date → preview ukazuje dátumy do daného dátumu
- [ ] After completion: funguje s daily/weekly/monthly/yearly
- [ ] Spätná kompatibilita: staré tasky so starým formátom sa správne načítajú
- [ ] Existujúce tasky s opakovaním sa dajú editovať
- [ ] Slovenské preklady sú správne
- [ ] Git push + deploy na Vercel

---

*Vytvorené: 16. február 2026*
