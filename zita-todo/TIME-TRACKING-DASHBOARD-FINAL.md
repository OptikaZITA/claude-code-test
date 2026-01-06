# TIME TRACKING & DASHBOARD SPEC (ZITA TODO)
## Finálna verzia pre implementáciu

**Verzia:** 1.0
**Dátum:** 6. januára 2026
**Nadväzuje na:** CLAUDE.md v2.9

---

## 0. CIEĽ

Rozšíriť ZITA TODO o plnohodnotný **Toggl‑style time tracking dashboard**:

1. **Časovač pri každom tasku** - už existuje ✅
2. **Nová sekcia „ČASOVAČ" v sidebare** - link na Time Dashboard
3. **Time Dashboard** (`/(dashboard)/time`) - reporty, grafy, filtrovanie
4. **Export do CSV** - filtrované dáta

---

## 1. PREREKVIZITY - ZMENY PRED IMPLEMENTÁCIOU

### 1.1 RLS politika pre `time_entries`

**⚠️ DÔLEŽITÉ:** Aktuálna RLS môže povoľovať len vlastné záznamy. Pre dashboard potrebujeme vidieť záznamy celej organizácie.

```sql
-- Skontroluj existujúce politiky
SELECT * FROM pg_policies WHERE tablename = 'time_entries';

-- Ak neexistuje politika pre organizáciu, pridaj:
CREATE POLICY "org_members_can_view_time_entries"
ON time_entries
FOR SELECT
USING (organization_id = get_my_organization_id());

-- Alebo uprav existujúcu politiku
```

### 1.2 Overenie existujúcich komponentov

Tieto komponenty už existujú a budú sa používať:

| Komponent | Cesta | Stav |
|-----------|-------|------|
| `time_entries` tabuľka | Supabase | ✅ Existuje |
| `inline-time-tracker.tsx` | `components/time-tracking/` | ✅ Existuje |
| `timer-indicator.tsx` | `components/time-tracking/` | ✅ Existuje |
| `useGlobalTimer` hook | `lib/hooks/use-time-tracking.ts` | ✅ Existuje |
| `/api/time/start` | `app/api/time/start/route.ts` | ✅ Existuje |
| `/api/time/stop` | `app/api/time/stop/route.ts` | ✅ Existuje |
| `/api/time/current` | `app/api/time/current/route.ts` | ✅ Existuje |
| `/api/time/totals` | `app/api/time/totals/route.ts` | ✅ Existuje |

---

## 2. NOVÉ SÚBORY NA VYTVORENIE

### 2.1 Routes (stránky)

```
app/(dashboard)/
├── time/
│   ├── page.tsx                    # Time Dashboard
│   └── user/
│       └── [userId]/page.tsx       # User drilldown (voliteľné)
```

### 2.2 API Routes

```
app/api/time/
├── report/
│   ├── route.ts                    # GET - Report s filtrami
│   └── export/
│       └── route.ts                # GET - CSV export
```

### 2.3 Komponenty

```
components/time-tracking/
├── time-dashboard-filters.tsx      # Filter bar
├── time-dashboard-summary.tsx      # Total, Entries, Avg
├── time-dashboard-charts.tsx       # Grafy (by day, by group)
└── time-dashboard-table.tsx        # Summary/Detailed tabuľka
```

### 2.4 Sidebar úprava

```
components/layout/sidebar.tsx       # Pridať položku "Časovač"
```

---

## 3. SIDEBAR - NOVÁ POLOŽKA

### 3.1 Umiestnenie

V `components/layout/sidebar.tsx` pridaj novú položku medzi "Kalendár" a "ODDELENIA":

```tsx
import { Clock3 } from 'lucide-react';

// V navigačnom zozname pridaj:
{
  icon: Clock3,
  label: 'Časovač',
  href: '/(dashboard)/time',
}
```

### 3.2 Vizuál

```
├── Kôš
├── Kalendár
├── Časovač        ← NOVÉ (ikona Clock3)
├── ODDELENIA
```

---

## 4. TIME DASHBOARD STRÁNKA

### 4.1 Route

**Cesta:** `app/(dashboard)/time/page.tsx`
**URL:** `/time`

### 4.2 Layout stránky

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Časovač                                              🔍 Hľadať...   🔔  │
├─────────────────────────────────────────────────────────────────────────┤
│ FILTRE                                                                  │
│ [Tento týždeň ▼] [Oddelenie ▼] [Projekt ▼] [Kolega ▼] [Tag ▼]         │
│ ☑ Len môj čas   ☐ Všetok čas                         [Exportovať CSV] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ SÚHRN                                                                   │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                     │
│ │ Total        │ │ Záznamy      │ │ Priemer/deň  │                     │
│ │ 42h 15m      │ │ 156          │ │ 6h 2m        │                     │
│ └──────────────┘ └──────────────┘ └──────────────┘                     │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ GRAFY                                                                   │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐│
│ │ Čas podľa dní                   │ │ Čas podľa [User ▼]             ││
│ │ ▓▓▓░░▓▓▓▓▓░░▓▓▓                │ │ Katka    ████████ 12h          ││
│ │ Po Ut St Št Pi So Ne            │ │ Dano     ██████ 9h             ││
│ │                                 │ │ Naty     ████ 6h               ││
│ └─────────────────────────────────┘ └─────────────────────────────────┘│
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ TABUĽKA                                         [Summary ▼] [Detailed] │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ Meno          │ Celkový čas  │ % z celku                         │  │
│ ├───────────────────────────────────────────────────────────────────┤  │
│ │ Katka         │ 12h 30m      │ ████████████░░░░░░░░ 29%          │  │
│ │ Dano          │ 9h 15m       │ █████████░░░░░░░░░░░ 22%          │  │
│ │ Naty          │ 6h 45m       │ ██████░░░░░░░░░░░░░░ 16%          │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. FILTER BAR - `TimeDashboardFilters`

### 5.1 Filtrovacie prvky

| Filter | Typ | Možnosti |
|--------|-----|----------|
| **Obdobie** | dropdown | Dnes, Tento týždeň, Tento mesiac, Tento rok, Vlastné (from-to) |
| **Oddelenie** | multi-select | Zoznam z `areas` kde `is_global = true` |
| **Projekt** | multi-select | Zoznam z `projects` |
| **Kolega** | multi-select | Zoznam z `users` v organizácii |
| **Tag** | multi-select | Zoznam z `tags` |
| **Len môj čas** | toggle | Áno/Nie |

### 5.2 URL Query parametre

Filtre sa ukladajú do URL pre zdieľanie/bookmarkovanie:

```
/time?from=2026-01-01&to=2026-01-07&areaId=xxx&userId=yyy&onlyMine=true
```

### 5.3 Komponent

```tsx
// components/time-tracking/time-dashboard-filters.tsx

interface TimeDashboardFiltersProps {
  filters: TimeFilters;
  onFiltersChange: (filters: TimeFilters) => void;
  areas: Area[];
  projects: Project[];
  users: User[];
  tags: Tag[];
}

interface TimeFilters {
  from: string;           // ISO date
  to: string;             // ISO date
  areaIds: string[];
  projectIds: string[];
  userIds: string[];
  tagIds: string[];
  onlyMine: boolean;
}
```

---

## 6. API ENDPOINT - `/api/time/report`

### 6.1 Request

```
GET /api/time/report?from=2026-01-01&to=2026-01-07&groupBy=user
```

**Query parametre:**

| Parameter | Typ | Povinný | Popis |
|-----------|-----|---------|-------|
| `from` | ISO datetime | ✅ | Začiatok obdobia |
| `to` | ISO datetime | ✅ | Koniec obdobia |
| `userId[]` | uuid[] | ❌ | Filter podľa používateľov |
| `areaId[]` | uuid[] | ❌ | Filter podľa oddelení |
| `projectId[]` | uuid[] | ❌ | Filter podľa projektov |
| `tagId[]` | uuid[] | ❌ | Filter podľa tagov |
| `onlyMine` | boolean | ❌ | Len vlastné záznamy (default: false) |
| `groupBy` | string | ❌ | `user` \| `area` \| `project` \| `none` |

### 6.2 Response

```json
{
  "totalSeconds": 152100,
  "entryCount": 156,
  "avgPerDay": 21728,
  "summary": [
    {
      "id": "user-uuid-1",
      "label": "Katka",
      "type": "user",
      "totalSeconds": 45000,
      "percent": 29.6
    },
    {
      "id": "user-uuid-2",
      "label": "Dano",
      "type": "user",
      "totalSeconds": 33300,
      "percent": 21.9
    }
  ],
  "byDay": [
    { "date": "2026-01-01", "totalSeconds": 28800 },
    { "date": "2026-01-02", "totalSeconds": 32400 },
    { "date": "2026-01-03", "totalSeconds": 25200 }
  ],
  "entries": [
    {
      "id": "time-entry-uuid",
      "date": "2026-01-06",
      "userId": "user-uuid",
      "userName": "Katka",
      "userNickname": "Katka",
      "areaId": "area-uuid",
      "areaName": "Prevádzka",
      "projectId": "project-uuid",
      "projectName": "Objednávky",
      "taskId": "task-uuid",
      "taskTitle": "Objednať šošovky",
      "tags": ["ADMIN", "urgentné"],
      "durationSeconds": 1800,
      "description": "Telefonáty so zákazníkmi"
    }
  ]
}
```

### 6.3 SQL Query (backend)

```sql
-- Základná query s JOIN pre tagy
SELECT 
  te.id,
  te.started_at,
  te.duration_seconds,
  te.description,
  u.id as user_id,
  u.full_name as user_name,
  u.nickname as user_nickname,
  a.id as area_id,
  a.title as area_name,
  p.id as project_id,
  p.title as project_name,
  t.id as task_id,
  t.title as task_title
FROM time_entries te
JOIN users u ON u.id = te.user_id
LEFT JOIN areas a ON a.id = te.area_id
LEFT JOIN projects p ON p.id = te.project_id
LEFT JOIN tasks t ON t.id = te.todo_id
WHERE te.organization_id = get_my_organization_id()
  AND te.started_at >= :from
  AND te.started_at < :to
  AND te.duration_seconds IS NOT NULL  -- Len dokončené záznamy
  AND (:onlyMine IS FALSE OR te.user_id = auth.uid())
  AND (:userIds IS NULL OR te.user_id = ANY(:userIds))
  AND (:areaIds IS NULL OR te.area_id = ANY(:areaIds))
  AND (:projectIds IS NULL OR te.project_id = ANY(:projectIds))
ORDER BY te.started_at DESC;

-- Pre filter podľa tagov (ak sú vybrané tagy):
AND EXISTS (
  SELECT 1 FROM item_tags it 
  WHERE it.item_id = t.id 
    AND it.item_type = 'task'
    AND it.tag_id = ANY(:tagIds)
)

-- Summary podľa groupBy
SELECT 
  te.user_id as id,
  u.nickname as label,
  'user' as type,
  SUM(te.duration_seconds) as total_seconds
FROM time_entries te
JOIN users u ON u.id = te.user_id
WHERE ...
GROUP BY te.user_id, u.nickname
ORDER BY total_seconds DESC;

-- By day aggregation
SELECT 
  date_trunc('day', started_at)::date as date,
  SUM(duration_seconds) as total_seconds
FROM time_entries
WHERE ...
GROUP BY date_trunc('day', started_at)
ORDER BY date;
```

---

## 7. API ENDPOINT - `/api/time/report/export`

### 7.1 Request

```
GET /api/time/report/export?from=2026-01-01&to=2026-01-07
```

Rovnaké query parametre ako `/api/time/report`.

### 7.2 Response

```
Content-Type: text/csv
Content-Disposition: attachment; filename="time-report-2026-01-01-2026-01-07.csv"

Dátum,Používateľ,Oddelenie,Projekt,Úloha,Tagy,Trvanie,Popis
2026-01-06,Katka,Prevádzka,Objednávky,"Objednať šošovky","ADMIN, urgentné",00:30:00,"Telefonáty so zákazníkmi"
2026-01-06,Dano,Marketing,Kampane,"Pripraviť FB reklamu","marketing",01:15:00,""
```

### 7.3 Implementácia

```typescript
// app/api/time/report/export/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Získaj dáta rovnako ako /api/time/report
  const data = await getReportData(searchParams);
  
  // Konvertuj na CSV
  const csv = convertToCSV(data.entries);
  
  // Vráť CSV súbor
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="time-report-${from}-${to}.csv"`,
    },
  });
}

function convertToCSV(entries: TimeEntry[]): string {
  const header = 'Dátum,Používateľ,Oddelenie,Projekt,Úloha,Tagy,Trvanie,Popis\n';
  
  const rows = entries.map(e => {
    const duration = formatDuration(e.durationSeconds);
    const tags = e.tags.join(', ');
    return `${e.date},"${e.userNickname}","${e.areaName || ''}","${e.projectName || ''}","${e.taskTitle}","${tags}",${duration},"${e.description || ''}"`;
  });
  
  return header + rows.join('\n');
}
```

---

## 8. UI KOMPONENTY

### 8.1 TimeDashboardSummary

```tsx
// components/time-tracking/time-dashboard-summary.tsx

interface TimeDashboardSummaryProps {
  totalSeconds: number;
  entryCount: number;
  avgPerDay: number;
}

export function TimeDashboardSummary({ totalSeconds, entryCount, avgPerDay }: TimeDashboardSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <SummaryCard 
        label="Celkový čas" 
        value={formatDuration(totalSeconds)} 
        icon={Clock} 
      />
      <SummaryCard 
        label="Počet záznamov" 
        value={entryCount.toString()} 
        icon={ListTodo} 
      />
      <SummaryCard 
        label="Priemer za deň" 
        value={formatDuration(avgPerDay)} 
        icon={TrendingUp} 
      />
    </div>
  );
}
```

### 8.2 TimeDashboardCharts

```tsx
// components/time-tracking/time-dashboard-charts.tsx

interface TimeDashboardChartsProps {
  byDay: { date: string; totalSeconds: number }[];
  summary: { id: string; label: string; totalSeconds: number; percent: number }[];
  groupBy: 'user' | 'area' | 'project';
  onGroupByChange: (groupBy: 'user' | 'area' | 'project') => void;
  onDrilldown: (id: string, type: string) => void;
}

// Použiť recharts alebo chart.js pre grafy
// Chart 1: Bar chart - čas podľa dní
// Chart 2: Horizontal bar chart - čas podľa groupBy
```

### 8.3 TimeDashboardTable

```tsx
// components/time-tracking/time-dashboard-table.tsx

interface TimeDashboardTableProps {
  summary: SummaryItem[];
  entries: TimeEntry[];
  mode: 'summary' | 'detailed';
  onModeChange: (mode: 'summary' | 'detailed') => void;
  onUserClick: (userId: string) => void;
}

// Summary mód: Tabuľka s groupBy agregáciou
// Detailed mód: Tabuľka so všetkými záznamami
```

---

## 9. USER DRILLDOWN (VOLITEĽNÉ)

### 9.1 Route

**Cesta:** `app/(dashboard)/time/user/[userId]/page.tsx`
**URL:** `/time/user/xxx-uuid-xxx`

### 9.2 Funkcionalita

- Zobrazí detail času pre konkrétneho používateľa
- Rovnaké filtre (obdobie, projekt, tag)
- Grafy: čas podľa dní, čas podľa projektov
- Tabuľka: zoznam záznamov používateľa
- Tlačidlo "← Späť na dashboard"

---

## 10. HOOKY

### 10.1 useTimeReport

```typescript
// lib/hooks/use-time-report.ts

interface UseTimeReportOptions {
  from: string;
  to: string;
  userIds?: string[];
  areaIds?: string[];
  projectIds?: string[];
  tagIds?: string[];
  onlyMine?: boolean;
  groupBy?: 'user' | 'area' | 'project' | 'none';
}

export function useTimeReport(options: UseTimeReportOptions) {
  const [data, setData] = useState<TimeReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('from', options.from);
        params.set('to', options.to);
        if (options.groupBy) params.set('groupBy', options.groupBy);
        // ... ostatné parametre

        const response = await fetch(`/api/time/report?${params}`);
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [options]);

  return { data, loading, error };
}
```

### 10.2 useTimeFilters

```typescript
// lib/hooks/use-time-filters.ts

export function useTimeFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters: TimeFilters = {
    from: searchParams.get('from') || getStartOfWeek(),
    to: searchParams.get('to') || getEndOfWeek(),
    areaIds: searchParams.getAll('areaId'),
    projectIds: searchParams.getAll('projectId'),
    userIds: searchParams.getAll('userId'),
    tagIds: searchParams.getAll('tagId'),
    onlyMine: searchParams.get('onlyMine') === 'true',
  };

  const setFilters = (newFilters: Partial<TimeFilters>) => {
    const params = new URLSearchParams();
    // ... nastaviť parametre
    router.push(`/time?${params}`);
  };

  return { filters, setFilters };
}
```

---

## 11. IMPLEMENTAČNÉ KROKY

### Fáza 1: Príprava (15 min)
- [ ] Skontrolovať a upraviť RLS politiku pre `time_entries`
- [ ] Overiť existujúce komponenty a hooky

### Fáza 2: Sidebar (10 min)
- [ ] Pridať položku "Časovač" do sidebaru
- [ ] Ikona `Clock3`, link na `/time`

### Fáza 3: API Endpoints (1-2 hod)
- [ ] Vytvoriť `/api/time/report/route.ts`
- [ ] Vytvoriť `/api/time/report/export/route.ts`
- [ ] Testovať s rôznymi filtrami

### Fáza 4: Hooky (30 min)
- [ ] Vytvoriť `use-time-report.ts`
- [ ] Vytvoriť `use-time-filters.ts`

### Fáza 5: Komponenty (2-3 hod)
- [ ] `time-dashboard-filters.tsx`
- [ ] `time-dashboard-summary.tsx`
- [ ] `time-dashboard-charts.tsx` (použiť recharts)
- [ ] `time-dashboard-table.tsx`

### Fáza 6: Stránka (1 hod)
- [ ] Vytvoriť `app/(dashboard)/time/page.tsx`
- [ ] Integrovať všetky komponenty
- [ ] Testovať filtrovanie a export

### Fáza 7: User Drilldown - voliteľné (1 hod)
- [ ] Vytvoriť `app/(dashboard)/time/user/[userId]/page.tsx`
- [ ] Testovať navigáciu

### Fáza 8: Dokumentácia (15 min)
- [ ] Aktualizovať CLAUDE.md
- [ ] Pridať changelog pre novú verziu

---

## 12. POZNÁMKY PRE IMPLEMENTÁCIU

### Dôležité

1. **Používaj `nickname`** - v tabuľkách a grafoch zobrazuj prezývku, nie celé meno

2. **Konzistentná cesta** - používaj `/(dashboard)/time`, nie `/dashboard/time`

3. **Formátovanie času** - používaj existujúcu funkciu `formatDuration` alebo `formatDurationShort`

4. **RLS** - uisti sa že RLS povoľuje čítanie v rámci organizácie

5. **Tagy cez JOIN** - filtrovanie podľa tagov vyžaduje JOIN cez `tasks` → `item_tags`

6. **Len dokončené záznamy** - v reporte zobrazuj len záznamy kde `duration_seconds IS NOT NULL`

### Použité knižnice

- **Grafy:** `recharts` (už môže byť v projekte) alebo `chart.js`
- **Dátumy:** `date-fns` (už existuje)
- **UI:** `shadcn/ui` komponenty (Button, Select, Table, Card)

---

## 13. CHANGELOG

Po implementácii pridať do CLAUDE.md:

```markdown
### v2.10 (X. januára 2026)
**Time Dashboard:**

**Nové stránky:**
- ✅ `app/(dashboard)/time/page.tsx` - Time Dashboard s reportami
- ✅ `app/(dashboard)/time/user/[userId]/page.tsx` - User drilldown (voliteľné)

**Nové API:**
- ✅ `/api/time/report` - Report s filtrami a agregáciami
- ✅ `/api/time/report/export` - CSV export

**Nové komponenty:**
- ✅ `components/time-tracking/time-dashboard-filters.tsx`
- ✅ `components/time-tracking/time-dashboard-summary.tsx`
- ✅ `components/time-tracking/time-dashboard-charts.tsx`
- ✅ `components/time-tracking/time-dashboard-table.tsx`

**Nové hooky:**
- ✅ `lib/hooks/use-time-report.ts`
- ✅ `lib/hooks/use-time-filters.ts`

**Sidebar:**
- ✅ Pridaná položka "Časovač" s linkom na `/time`

**Funkcie:**
- ✅ Filtrovanie podľa obdobia, oddelenia, projektu, kolegu, tagu
- ✅ Toggle "Len môj čas" / "Všetok čas"
- ✅ Grafy: čas podľa dní, čas podľa user/area/project
- ✅ Tabuľka: Summary mód (agregácie) + Detailed mód (záznamy)
- ✅ Export do CSV
- ✅ URL query parametre pre zdieľanie filtrov
```

---

**Koniec špecifikácie**
