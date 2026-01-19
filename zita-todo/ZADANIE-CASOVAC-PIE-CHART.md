# VYLEPŠENIE: Koláčový graf v Časovači (Time Dashboard)

## Kontext

Časovač (Time Dashboard) už má filtráciu podľa používateľov, projektov, oddelení a dátumov. Chýba vizuálna reprezentácia dát - koláčový graf.

---

## Požiadavka

Pridať **2D donut chart** (koláčový graf s dierou uprostred) do Časovača, ktorý vizuálne zobrazí rozdelenie trackovaného času.

---

## Dizajn

### Štýl grafu

- **Typ:** Donut chart (nie plný pie - modernejší vzhľad)
- **2D:** Žiadne 3D efekty
- **Farby:** Prispôsobené ZITA TODO dizajnu
- **Stred:** Celkový čas alebo počet hodín

### Vizuálna inšpirácia

```
         ┌─────────────────────────────────────┐
         │                                     │
         │         ┌───────────────┐           │
         │        ╱   ╲       ╱     ╲          │
         │       │  30%  │   │  25%  │         │
         │       │ Prev. │   │ Rámy  │         │
         │        ╲     ╱     ╲     ╱          │
         │         │ 47h │                     │
         │         │total│     ╱  20%  ╲       │
         │        ╱     ╲    │ Financie│       │
         │       │  25%  │    ╲       ╱        │
         │       │ Newbiz│                     │
         │        ╲     ╱                      │
         │         └───────────────┘           │
         │                                     │
         │  ● Prevádzka    ● Rámy              │
         │  ● Financie     ● Newbiz            │
         └─────────────────────────────────────┘
```

### Centrálna hodnota

V strede donut grafu zobraziť:
- **Celkový čas:** "47h 32m"
- **Alebo:** Počet úloh, priemerný čas

---

## Dátové zdroje pre graf

Graf by mal podporovať zobrazenie podľa:

| Zoskupenie | Popis |
|------------|-------|
| **Podľa oddelenia** | Koľko času na každé oddelenie |
| **Podľa projektu** | Koľko času na každý projekt |
| **Podľa používateľa** | Koľko času trackoval každý člen |
| **Podľa úlohy** | Top N úloh podľa času |

### Prepínač zoskupenia

```
┌─────────────────────────────────────────────────────────┐
│ Zobraziť podľa: [Oddelenia ▼]                           │
│                  ├─ Oddelenia                           │
│                  ├─ Projekty                            │
│                  ├─ Používatelia                        │
│                  └─ Úlohy (Top 10)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Farebná paleta

Použiť farby konzistentné so ZITA TODO:

```typescript
const CHART_COLORS = [
  '#007AFF', // Modrá (primary)
  '#34C759', // Zelená (success)
  '#FF9500', // Oranžová (warning)
  '#AF52DE', // Fialová
  '#FF3B30', // Červená
  '#5AC8FA', // Svetlo modrá
  '#FFCC00', // Žltá
  '#FF2D55', // Ružová
  '#00C7BE', // Tyrkysová
  '#8E8E93', // Šedá
];
```

---

## Implementácia

### Knižnica

Použiť **Recharts** (už je v projekte k dispozícii):

```typescript
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
```

### Komponent

```typescript
// components/time-tracker/time-pie-chart.tsx

interface TimeData {
  name: string;
  value: number; // sekundy alebo minúty
  color: string;
}

interface TimePieChartProps {
  data: TimeData[];
  totalTime: number;
  groupBy: 'area' | 'project' | 'user' | 'task';
}

export function TimePieChart({ data, totalTime, groupBy }: TimePieChartProps) {
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}    // Donut efekt
            outerRadius={140}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => formatDuration(value)}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Centrálna hodnota */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-3xl font-bold">{formatDuration(totalTime)}</div>
          <div className="text-sm text-muted-foreground">celkovo</div>
        </div>
      </div>
    </div>
  );
}
```

### Hook pre dáta

```typescript
// lib/hooks/use-time-chart-data.ts

export function useTimeChartData(
  groupBy: 'area' | 'project' | 'user' | 'task',
  filters: TimeFilters
) {
  return useQuery({
    queryKey: ['time-chart', groupBy, filters],
    queryFn: async () => {
      let query = supabase
        .from('time_entries')
        .select(`
          duration_seconds,
          tasks (
            id, title,
            area_id, areas (id, title, color),
            project_id, projects (id, title)
          ),
          users (id, nickname, full_name)
        `)
        .eq('is_running', false);
      
      // Aplikovať filtre
      if (filters.startDate) {
        query = query.gte('started_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('started_at', filters.endDate);
      }
      // ... ďalšie filtre
      
      const { data } = await query;
      
      // Agregácia podľa groupBy
      return aggregateByGroup(data, groupBy);
    },
  });
}

function aggregateByGroup(entries, groupBy) {
  const groups = new Map();
  
  entries.forEach(entry => {
    let key, name, color;
    
    switch (groupBy) {
      case 'area':
        key = entry.tasks?.area_id;
        name = entry.tasks?.areas?.title || 'Bez oddelenia';
        color = entry.tasks?.areas?.color;
        break;
      case 'project':
        key = entry.tasks?.project_id;
        name = entry.tasks?.projects?.title || 'Bez projektu';
        break;
      case 'user':
        key = entry.user_id;
        name = entry.users?.nickname || entry.users?.full_name;
        break;
      case 'task':
        key = entry.tasks?.id;
        name = entry.tasks?.title;
        break;
    }
    
    if (!groups.has(key)) {
      groups.set(key, { name, value: 0, color });
    }
    groups.get(key).value += entry.duration_seconds;
  });
  
  // Priradiť farby ak chýbajú
  return Array.from(groups.values()).map((item, index) => ({
    ...item,
    color: item.color || CHART_COLORS[index % CHART_COLORS.length],
  }));
}
```

---

## Umiestnenie v UI

### Možnosť A: Vedľa tabuľky (odporúčané)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Časovač                                              [Filtre...]        │
├───────────────────────────────────┬─────────────────────────────────────┤
│                                   │                                     │
│     ┌───────────────────┐         │   Tabuľka s time entries            │
│     │                   │         │   ┌─────────────────────────────┐   │
│     │   DONUT CHART     │         │   │ Úloha    │ Čas   │ User    │   │
│     │                   │         │   ├──────────┼───────┼─────────┤   │
│     │     47h 32m       │         │   │ Task 1   │ 2:30  │ Dano    │   │
│     │                   │         │   │ Task 2   │ 1:45  │ Katka   │   │
│     └───────────────────┘         │   │ ...      │       │         │   │
│                                   │   └─────────────────────────────┘   │
│   ● Prevádzka  ● Rámy             │                                     │
│   ● Financie   ● Newbiz           │                                     │
│                                   │                                     │
└───────────────────────────────────┴─────────────────────────────────────┘
```

### Možnosť B: Nad tabuľkou (full width)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Časovač                                              [Filtre...]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────┐   ┌─────────────────────────────────────────┐ │
│   │     DONUT CHART     │   │  ● Prevádzka  14h 20m  (30%)            │ │
│   │                     │   │  ● Rámy       12h 05m  (25%)            │ │
│   │       47h 32m       │   │  ● Financie    9h 30m  (20%)            │ │
│   │                     │   │  ● Newbiz     11h 37m  (25%)            │ │
│   └─────────────────────┘   └─────────────────────────────────────────┘ │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│   Tabuľka s time entries...                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Možnosť C: Toggle medzi tabuľkou a grafom

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Časovač                              [📊 Graf] [📋 Tabuľka]  [Filtre]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ... zobrazí sa buď graf ALEBO tabuľka podľa výberu ...                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Interaktivita

### Hover efekt

Pri hoveri nad segmentom:
- Segment sa mierne zväčší
- Zobrazí sa tooltip s detailmi

```typescript
<Tooltip
  content={({ payload }) => (
    <div className="bg-popover p-3 rounded-lg shadow-lg border">
      <p className="font-medium">{payload[0]?.name}</p>
      <p className="text-muted-foreground">
        {formatDuration(payload[0]?.value)}
      </p>
      <p className="text-sm">
        {((payload[0]?.value / totalTime) * 100).toFixed(1)}%
      </p>
    </div>
  )}
/>
```

### Klik na segment

Voliteľne: klik na segment vyfiltruje tabuľku na dané oddelenie/projekt.

---

## Legenda

Legenda pod alebo vedľa grafu:

```
● Prevádzka    14h 20m   30%
● Rámy         12h 05m   25%
● Financie      9h 30m   20%
● Newbiz       11h 37m   25%
```

```typescript
<Legend
  layout="vertical"
  align="right"
  verticalAlign="middle"
  formatter={(value, entry) => (
    <span className="text-sm">
      {value} - {formatDuration(entry.payload.value)} ({entry.payload.percent}%)
    </span>
  )}
/>
```

---

## Responsívne správanie

| Šírka | Zobrazenie |
|-------|------------|
| Desktop (>1024px) | Graf vedľa tabuľky |
| Tablet (768-1024px) | Graf nad tabuľkou |
| Mobile (<768px) | Graf nad tabuľkou, menší |

---

## Prázdny stav

Ak nie sú žiadne dáta:

```
┌─────────────────────────────────────┐
│                                     │
│         ┌───────────────┐           │
│         │               │           │
│         │      ⏱️       │           │
│         │               │           │
│         │   Žiadne      │           │
│         │   dáta        │           │
│         │               │           │
│         └───────────────┘           │
│                                     │
│   Zatiaľ nie sú žiadne              │
│   trackované časy v tomto období.   │
│                                     │
└─────────────────────────────────────┘
```

---

## Testovanie

Po implementácii overiť:

- [ ] Graf sa zobrazuje správne s reálnymi dátami
- [ ] Prepínanie zoskupenia (oddelenia/projekty/users) funguje
- [ ] Filtre ovplyvňujú graf
- [ ] Hover tooltip zobrazuje správne hodnoty
- [ ] Centrálna hodnota ukazuje celkový čas
- [ ] Legenda je čitateľná a správna
- [ ] Responsívne zobrazenie funguje
- [ ] Prázdny stav sa zobrazuje keď nie sú dáta
- [ ] Farby sú konzistentné s dizajnom ZITA TODO

---

## Odhad implementácie

| Časť | Odhad |
|------|-------|
| Komponent grafu | 0.5 dňa |
| Hook pre dáta + agregácia | 0.5 dňa |
| Integrácia do Časovača | 0.5 dňa |
| Responsívnosť + polish | 0.5 dňa |
| **Celkovo** | **~2 dni** |

---

*Vytvorené: 19. január 2026*
