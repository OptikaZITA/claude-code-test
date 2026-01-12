# ZITA TODO - Changelog

História všetkých zmien v projekte.

---

### v2.37 (12. januára 2026)
**Global Search + My Tasks Filter Fix:**

Implementácia globálneho vyhľadávania a oprava bugu s "Moje úlohy" filtrom.

**Fáza 1 - Global Search:**

**API Endpoint:**
- ✅ `app/api/search/route.ts` - Vyhľadávací endpoint
  - Vyhľadávanie v: tasks (title, notes), projects (name), areas (name), tags (name), users (full_name, nickname, email)
  - ILIKE pre case-insensitive matching
  - Paralelné queries cez `Promise.all`
  - Minimum 2 znaky, limit 5 výsledkov per kategória

**Frontend Hook:**
- ✅ `lib/hooks/use-search.ts` - Hook pre vyhľadávanie
  - Debounce 300ms
  - TypeScript typy pre výsledky
  - Loading a error state

**UI Komponenty:**
- ✅ `components/layout/global-search.tsx` - Hlavný search komponent
  - Input s ikonou 🔍 a keyboard hint `[/]`
  - Dropdown s výsledkami zoskupenými podľa typu (Úlohy, Projekty, Oddelenia, Tagy, Používatelia)
  - Loading spinner a empty state
- ✅ `components/layout/search-result-item.tsx` - Položka výsledku
  - Ikony podľa typu
  - Subtitle s area/project info
  - Dátum pre úlohy

**Keyboard navigácia:**
| Klávesa | Akcia |
|---------|-------|
| `/` | Focus na search input (globálne) |
| `↑` `↓` | Navigácia medzi výsledkami |
| `Enter` | Otvoriť vybraný výsledok |
| `Escape` | Zavrieť dropdown, vyčistiť |

**Akcie pri kliknutí:**
| Typ výsledku | Akcia |
|--------------|-------|
| Úloha | Custom event `search:select-task` |
| Projekt | Navigácia na `/projects/[id]` |
| Oddelenie | Navigácia na `/areas/[id]` |

**Fáza 2 - Bug fix: "Moje úlohy" filter:**
- ✅ Oprava neexistujúceho stĺpca `user_id` vo filtri
- ✅ Zmenený filter z `.or(\`assignee_id.eq.${user.id},created_by.eq.${user.id},user_id.eq.${user.id}\`)`
- ✅ Na: `.or(\`created_by.eq.${user.id},assignee_id.eq.${user.id}\`)`
- ✅ Opravené hooks: `useTodayTasks`, `useUpcomingTasks`, `useAnytimeTasks`, `useLogbookTasks`

**Nové súbory:**
- `app/api/search/route.ts`
- `lib/hooks/use-search.ts`
- `components/layout/global-search.tsx`
- `components/layout/search-result-item.tsx`

**Upravené súbory:**
- `components/layout/header.tsx` - Integrácia GlobalSearch
- `lib/hooks/use-tasks.ts` - Oprava filtra

---

### v2.36 (12. januára 2026)
**Private Tasks + My Tasks Filter:**

Implementácia súkromných úloh (is_private) a default filtrovania "Moje úlohy" vo všetkých views.

**Fáza 1 - Súkromné úlohy (is_private):**

**Databázové zmeny:**
- ✅ `is_private` boolean stĺpec v tabuľke `tasks`
- ✅ Index `idx_tasks_is_private` pre rýchle query
- ✅ RLS politika: Súkromné úlohy vidí len vlastník (created_by, assignee_id, inbox_user_id)

**UI zmeny:**
- ✅ `components/tasks/task-item.tsx` - Lock ikona pri súkromných úlohách
- ✅ `components/tasks/task-item-expanded.tsx` - Lock/LockOpen toggle v toolbare
- ✅ Tooltip: "Súkromná úloha" / "Označiť ako súkromné" / "Zrušiť súkromie"

**Anonymizácia v reportoch:**
- ✅ `app/api/time/report/route.ts` - Súkromné úlohy iných používateľov zobrazené ako "🔒 Súkromná úloha"
- ✅ `app/api/time/report/export/route.ts` - Rovnaká anonymizácia v CSV exporte
- ✅ Skryté aj tagy a popis súkromných úloh

**Pravidlá viditeľnosti:**
| Používateľ | Vidí súkromnú úlohu |
|------------|---------------------|
| Vlastník (created_by) | ✅ Áno |
| Priradený (assignee_id) | ✅ Áno |
| Inbox vlastník (inbox_user_id) | ✅ Áno |
| Time entry vlastník | ✅ Áno |
| Ostatní v organizácii | ❌ Nie (anonymizované) |

**Fáza 2 - Default "Moje úlohy" filter:**
- ✅ `lib/hooks/use-tasks.ts` - Všetky task hooks teraz vracajú len úlohy používateľa
  - `useTodayTasks` - filter už existoval
  - `useUpcomingTasks` - pridaný filter
  - `useAnytimeTasks` - pridaný filter
  - `useLogbookTasks` - pridaný filter
- ✅ Filter pattern: `.or(\`assignee_id.eq.${user.id},created_by.eq.${user.id},user_id.eq.${user.id}\`)`

**Fáza 3 - Bug fix: "Pridať úlohu" button:**
- ✅ `components/tasks/task-quick-add.tsx` - Oprava nefunkčného tlačidla v /upcoming
  - Problém: Button variant vždy vracel len button, aj keď bol `isActive=true`
  - Riešenie: Zmenená podmienka z `if (variant === 'button')` na `if (variant === 'button' && !isActive)`

**Upravené súbory:**
- `types/index.ts` - Pridané `is_private: boolean` do Task interface
- `components/tasks/task-item.tsx` - Lock ikona
- `components/tasks/task-item-expanded.tsx` - Lock toggle
- `app/api/time/report/route.ts` - Anonymizácia
- `app/api/time/report/export/route.ts` - Anonymizácia v CSV
- `lib/hooks/use-tasks.ts` - Default "moje úlohy" filter
- `components/tasks/task-quick-add.tsx` - Bug fix

---

### v2.35 (11. januára 2026)
**Time Entry Editing:**

Kompletná implementácia editácie, mazania a manuálneho pridávania časových záznamov (time entries).

**Databázové zmeny:**
- ✅ Migrácia: `deleted_at` stĺpec pre soft delete
- ✅ Migrácia: `description` stĺpec pre poznámky
- ✅ Index pre rýchle query na non-deleted záznamy

**API Endpoints:**
- ✅ `PUT /api/time-entries/[id]` - Editácia existujúceho záznamu
- ✅ `POST /api/time-entries` - Manuálne pridanie nového záznamu
- ✅ `DELETE /api/time-entries/[id]` - Soft delete záznamu
- ✅ `GET /api/time-entries/[id]` - Získanie jedného záznamu
- ✅ RLS: User môže editovať/mazať len svoje záznamy (admin všetky)

**Nové komponenty:**
- ✅ `components/time-tracking/edit-time-entry-modal.tsx` - Modal pre editáciu aj manuálne pridanie
  - Dropdown pre výber úlohy (môže presunúť na inú)
  - Popis (voliteľný)
  - Time + Date picker pre začiatok a koniec
  - Auto-computed trvanie
  - Validácia: koniec > začiatok
- ✅ `components/time-tracking/delete-time-entry-dialog.tsx` - Potvrdenie vymazania

**Nové hooks:**
- ✅ `lib/hooks/use-time-entries.ts`
  - `useUpdateTimeEntry()` - Aktualizácia záznamu
  - `useDeleteTimeEntry()` - Soft delete záznamu
  - `useCreateTimeEntry()` - Manuálne vytvorenie záznamu
  - `useTimeEntry(id)` - Získanie jedného záznamu

**Aktualizované komponenty:**
- ✅ `time-entries-list.tsx` - Tlačidlá [✏️][🗑️] pri každom zázname
  - Zoskupenie záznamov podľa dátumu (Dnes, Včera, atď.)
  - Tlačidlo [+ Pridať čas manuálne]
  - Hover efekt pre akčné tlačidlá
- ✅ `time-dashboard-table.tsx` - Stĺpec "Akcie" v Detailed view
  - [✏️][🗑️] len pri vlastných entries (admin pri všetkých)
  - [👁️] ikona pre cudzie záznamy

**Realtime sync:**
- ✅ Custom events: `time-entry:updated`, `time-entry:deleted`, `time-entry:created`
- ✅ Komponenty počúvajú na tieto eventy a refreshnú dáta

**Pravidlá prístupu:**
| Rola | Editácia | Mazanie |
|------|----------|---------|
| Vlastník | ✅ | ✅ |
| Admin | ✅ | ✅ |
| Iný používateľ | ❌ | ❌ |

**Nové súbory:**
- `app/api/time-entries/route.ts`
- `app/api/time-entries/[id]/route.ts`
- `lib/hooks/use-time-entries.ts`
- `components/time-tracking/edit-time-entry-modal.tsx`
- `components/time-tracking/delete-time-entry-dialog.tsx`

**Upravené súbory:**
- `types/index.ts` - Pridané `description` a `deleted_at` do TimeEntry
- `components/time-tracking/time-entries-list.tsx` - Kompletný prepis
- `components/time-tracking/time-dashboard-table.tsx` - Stĺpec Akcie
- `app/(dashboard)/time/page.tsx` - Pridané props pre editáciu

---

### v2.34 (11. januára 2026)
**Cascading Filters + Nickname Everywhere:**

Kompletná implementácia kaskádových filtrov pre desktop a unifikácia zobrazenia mena používateľa (nickname) v celej aplikácii.

**Fáza 1 - Kaskádové filtre pre desktop:**
- ✅ `components/filters/cascading-filter-bar.tsx` - Hlavný komponent s 7 kategóriami filtrov
  - Status, Due Date, Priority, Sort, Assignee, Area, Tags
  - Každý filter je dropdown s multi-select podporou
  - Aktívne filtre zvýraznené modrou farbou
- ✅ `components/filters/filter-dropdown.tsx` - Reusable dropdown komponent
- ✅ `components/filters/filter-trigger-button.tsx` - Trigger button pre dropdown
- ✅ `components/filters/filter-dropdown-panel.tsx` - Panel s možnosťami
- ✅ `components/filters/active-filters-chips.tsx` - Chipy pre aktívne filtre
- ✅ `components/filters/filter-chips.tsx` - Jednotlivé filter chipy
- ✅ `lib/hooks/use-cascading-filters.ts` - Hook pre správu stavu filtrov

**Fáza 2 - Mobilné filtre:**
- ✅ `components/filters/unified-filter-bar.tsx` - Responzívny komponent
  - Desktop: CascadingFilterBar
  - Mobile: FilterBottomSheet trigger
- ✅ `components/filters/filter-bottom-sheet.tsx` - Bottom sheet pre mobile

**Fáza 3 - Integrácia na všetky stránky:**
- ✅ `app/(dashboard)/today/page.tsx`
- ✅ `app/(dashboard)/inbox/page.tsx`
- ✅ `app/(dashboard)/inbox/team/page.tsx`
- ✅ `app/(dashboard)/anytime/page.tsx`
- ✅ `app/(dashboard)/upcoming/page.tsx`
- ✅ `app/(dashboard)/logbook/page.tsx`
- ✅ `app/(dashboard)/trash/page.tsx`
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx`
- ✅ `app/(dashboard)/projects/[projectId]/page.tsx`

**Fáza 4 - Nickname všade:**
- ✅ `lib/utils/user.ts` - Nový helper modul
  - `getDisplayName()` - Vracia nickname || full_name || fallback
  - `getFullDisplayName()` - Vracia "nickname (full_name)" pre admin view
- ✅ Aktualizované komponenty:
  - `components/tasks/assignee-selector.tsx` - 4x použitie getDisplayName
  - `components/tasks/task-item.tsx` - Avatar name
  - `components/filters/colleague-filter-bar.tsx` - Avatar name
  - `components/users/user-row.tsx` - getFullDisplayName pre admin

**Fáza 5 - Supabase query fixes:**
- ✅ Pridané `nickname` do všetkých assignee select queries:
  - `lib/hooks/use-tasks.ts` - 7 occurrences
  - `lib/hooks/use-projects.ts` - 1 occurrence
  - `lib/hooks/use-areas.ts` - 2 occurrences

**Nové súbory:**
- `components/filters/cascading-filter-bar.tsx`
- `components/filters/filter-dropdown.tsx`
- `components/filters/filter-trigger-button.tsx`
- `components/filters/filter-dropdown-panel.tsx`
- `components/filters/active-filters-chips.tsx`
- `components/filters/filter-chips.tsx`
- `components/filters/unified-filter-bar.tsx`
- `components/filters/filter-bottom-sheet.tsx`
- `lib/hooks/use-cascading-filters.ts`
- `lib/utils/user.ts`

**Upravené súbory:**
- Všetky dashboard stránky (9 súborov)
- `components/tasks/assignee-selector.tsx`
- `components/tasks/task-item.tsx`
- `components/filters/colleague-filter-bar.tsx`
- `components/users/user-row.tsx`
- `lib/hooks/use-tasks.ts`
- `lib/hooks/use-projects.ts`
- `lib/hooks/use-areas.ts`
- `components/filters/index.ts`
- `types/index.ts`

---

### v2.33 (10. januára 2026)
**Inline Form Position + Task Order:**

Oprava pozície formulára pre pridávanie úloh a poradie nových úloh.

**Problém:**
- Formulár sa zobrazoval NAD filtrami namiesto POD nimi
- Nové úlohy sa neukladali na začiatok zoznamu

**Riešenie:**

**1. Pozícia formulára:**
- Formulár sa teraz zobrazuje PO filtroch (TagFilterBar, ColleagueFilterBar)
- Poradie: Title → Stats → TagFilter → ColleagueFilter → **FORM** → Tasks
- Aktualizované na všetkých 7 stránkach: today, inbox, inbox/team, anytime, upcoming, projects/[id], areas/[id]

**2. Poradie nových úloh:**
- `createTask` v `use-tasks.ts` teraz nastavuje `sort_order` na minimum - 1
- Nové úlohy sa zobrazujú ako PRVÉ v zozname

**3. TaskQuickAdd vylepšenia:**
- Podpora `forwardRef` s `useImperativeHandle`
- Nový `variant` prop: 'button' | 'inline'
- Export `TaskQuickAddHandle` interface pre typovanie ref
- Tlačidlo v headeri aktivuje inline formulár cez ref

**Upravené súbory:**
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/inbox/page.tsx`
- `app/(dashboard)/inbox/team/page.tsx`
- `app/(dashboard)/anytime/page.tsx`
- `app/(dashboard)/upcoming/page.tsx`
- `app/(dashboard)/projects/[projectId]/page.tsx`
- `app/(dashboard)/areas/[areaId]/page.tsx`
- `components/tasks/task-quick-add.tsx`
- `lib/hooks/use-tasks.ts`

---

### v2.32 (10. januára 2026)
**New Task Form - Things 3 Style:**

Nový formulár pre pridávanie úloh v štýle Things 3.

**Hlavné zmeny:**
- ✅ Nový `TaskQuickAddNew` komponent s Things 3 štýlom
- ✅ Kompaktný input s inline dropdown selektormi
- ✅ Dropdown pre: When, Deadline, Project, Area, Assignee, Tags
- ✅ Enter pre odoslanie, Escape pre zrušenie
- ✅ Mobilná verzia `TaskQuickAddMobileNew` s bottom sheet
- ✅ Zmenšený vertikálny padding task itemov (p-3 → px-3 py-2)

**Nové súbory:**
- `components/tasks/task-quick-add-new.tsx` - Desktop formulár
- `components/tasks/task-quick-add-mobile-new.tsx` - Mobilný formulár

**Upravené súbory:**
- `components/tasks/task-item.tsx` - Zmenšený padding
- `components/tasks/sortable-task-item.tsx` - Zmenšený padding

---

### v2.31 (10. januára 2026)
**Remove Page Title Duplication:**

Odstránenie duplikovaného názvu stránky z headera.

**Problém:**
- Názov stránky sa zobrazoval dvakrát - v Header komponente aj v obsahu stránky
- Napríklad "Dnes" sa zobrazovalo v headeri aj pod ním

**Riešenie:**
- Odstránený `title` prop z Header komponentu na všetkých stránkach
- Header teraz zobrazuje len akcie (filtre, view toggle, atď.)
- Názov stránky zostáva len v `<h2>` v obsahu

**Upravené súbory:**
- Všetky dashboard stránky - odstránený title z Header

---

### v2.30 (10. januára 2026)
**Simplify Deadline Display:**

Zjednodušenie zobrazenia deadline v task itemoch.

**Problém:**
- Deadline badge bol príliš veľký a rušivý
- Obsahoval ikonu a text "deadline" čo zaberalo veľa miesta

**Riešenie:**
- Zobrazuje sa len dátum (napr. "15.1.")
- Farebné kódovanie podľa naliehavosti:
  - Sivá: budúci termín (> 1 deň)
  - Oranžová: zajtra alebo dnes
  - Červená: po termíne
- Odstránená ikona a slovo "deadline"

**Upravené súbory:**
- `components/tasks/deadline-picker.tsx` - DeadlineBadge zjednodušený

---

### v2.29 (8. januára 2026)
**Settings Reorganization:**

Reorganizácia Settings stránky s tab navigáciou a zjednodušenie sidebaru.

**Hlavné zmeny:**
- `/settings` presmeruje na `/settings/profile`
- Nová tab navigácia: Profil, Vzhľad, Integrácie, (Používatelia pre admin)
- Sidebar zjednodušený - len 2 ikony: Nastavenia, Odhlásiť
- Meno používateľa v sidebar je teraz celé viditeľné

**URL štruktúra:**
```
/settings           → redirect na /settings/profile
/settings/profile   → Profil (avatar upload, osobné údaje)
/settings/appearance → Vzhľad (farebný režim)
/settings/integrations → Integrácie (Push notifikácie, Slack, Email)
/settings/users     → Používatelia (len admin)
```

**Nové súbory:**
- `app/(dashboard)/settings/layout.tsx` - Layout s Header a SettingsTabs
- `app/(dashboard)/settings/appearance/page.tsx` - Stránka vzhľadu
- `app/(dashboard)/settings/integrations/page.tsx` - Stránka integrácií
- `components/settings/settings-tabs.tsx` - Tab navigácia komponent
- `components/settings/index.ts` - Exporty

**Upravené súbory:**
- `app/(dashboard)/settings/page.tsx` - Redirect na /settings/profile
- `app/(dashboard)/settings/profile/page.tsx` - Odstránený Header (layout ho má)
- `app/(dashboard)/settings/users/page.tsx` - Odstránený Header (layout ho má)
- `components/layout/sidebar.tsx` - Odstránené ikony Profile a Users

**Tab navigácia:**
- Bežný používateľ vidí: Profil, Vzhľad, Integrácie
- Admin vidí navyše: Používatelia

---

### v2.28 (8. januára 2026)
**Profile Photo Upload:**

Implementácia upload profilovej fotky podľa ZADANIE-UPLOAD-PROFILOVEJ-FOTKY.md.

**Hlavné funkcie:**
- Nová stránka `/settings/profile` pre zobrazenie profilu a upload fotky
- Avatar upload modal s kruhovým výrezom, zoom a drag funkciami
- Kompresia obrázkov na max 500KB / 400x400px
- Supabase Storage bucket 'avatars' s RLS politikami
- Admin môže meniť fotky všetkým používateľom cez edit-user-modal
- Používatelia môžu meniť len svoju fotku, nie ostatné údaje

**Nové závislosti:**
- `browser-image-compression` - Kompresia obrázkov na klientovi
- `react-easy-crop` - Kruhový crop editor s zoom a drag

**Nové súbory:**
- `app/(dashboard)/settings/profile/page.tsx` - Profilová stránka
- `components/profile/avatar-editor.tsx` - Crop editor s react-easy-crop
- `components/profile/avatar-upload-modal.tsx` - Modal pre upload fotky
- `components/profile/profile-info.tsx` - Zobrazenie osobných údajov (read-only)
- `components/profile/index.ts` - Exporty
- `lib/hooks/use-avatar-upload.ts` - Hook pre upload, kompresia, delete

**Upravené súbory:**
- `components/users/edit-user-modal.tsx` - Pridaná sekcia pre avatar (admin)
- `components/layout/sidebar.tsx` - Pridaný link na profil (UserCircle ikona)

**Supabase Storage:**
- Bucket: `avatars` (public, 1MB limit, JPG/PNG/WEBP)
- Cesta: `{user_id}/avatar.jpg`
- RLS: Users môžu spravovať len svoje, admini všetky

**Technické detaily:**
- Validácia: max 1MB pred kompresiou, JPG/PNG/WEBP formáty
- Kompresia: max 500KB, 400x400px, JPEG output
- Cache-busting: URL s `?t={timestamp}` pre okamžitú aktualizáciu
- Drag & Drop: Podpora pre drag súborov do upload zóny

---

### v2.27 (8. januára 2026)
**Strážci vesmíru - Colleague Filter:**

Implementácia nového filtra pre filtrovanie úloh podľa priradeného kolegu (assignee).

**Hlavné funkcie:**
- Dynamický filter - zobrazuje len kolegov, ktorí majú minimálne 1 úlohu v aktuálnom kontexte
- Počet úloh pri každom kolegovi v zátvorke
- Možnosť "Nepriradené" pre úlohy bez priradeného kolegu
- "Všetci" pre resetovanie filtra
- Avatar a meno (nickname preferenčne) pri každom kolegovi
- Integrácia na všetkých stránkach s úlohami

**Nové súbory:**
- `components/filters/colleague-filter-bar.tsx` - ColleagueFilterBar komponent + filterTasksByColleague helper

**Upravené súbory:**
- `components/filters/index.ts` - Export ColleagueFilterBar a filterTasksByColleague
- `app/(dashboard)/today/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/inbox/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/inbox/team/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/anytime/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/upcoming/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/logbook/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/areas/[areaId]/page.tsx` - Integrácia ColleagueFilterBar
- `app/(dashboard)/projects/[projectId]/page.tsx` - Integrácia ColleagueFilterBar

**Pattern pre integráciu:**
```typescript
// Import
import { ColleagueFilterBar, filterTasksByColleague } from '@/components/filters'

// State
const [selectedColleague, setSelectedColleague] = useState<string | null>(null)

// Apply colleague filter (po tagFilteredTasks)
const colleagueFilteredTasks = useMemo(() => {
  return filterTasksByColleague(tagFilteredTasks, selectedColleague)
}, [tagFilteredTasks, selectedColleague])

// JSX - ColleagueFilterBar (po TagFilterBar)
<ColleagueFilterBar
  tasks={tagFilteredTasks}
  selectedColleague={selectedColleague}
  onSelectColleague={setSelectedColleague}
/>

// Empty state update
{colleagueFilteredTasks.length === 0 && (hasActiveFilters || selectedTag || selectedColleague) && ...}
```

**Vizuálny štýl:**
- Horizontálny scrollovací bar podobný TagFilterBar
- Avatar + meno + počet v zátvorke
- Aktívny kolega zvýraznený primary farbou
- Zafarbenie podľa variantu: outline (default), solid (vybraný)

---

### v2.26 (7. januára 2026)
**Area Detail Page Hooks Error Fix:**

Oprava kritického React Rules of Hooks erroru, ktorý spôsoboval crash aplikácie pri navigácii na Area Detail stránku.

**Problém:**
- Aplikácia padala s chybou: "Rendered fewer hooks than expected"
- Chyba nastávala pri načítaní Area Detail stránky (`/areas/[areaId]`)

**Príčina:**
- `useMemo` hooks (`visibleProjects`, `selectedTagName`) boli umiestnené PO early returns
- React vyžaduje, aby všetky hooks boli volané v rovnakom poradí pri každom renderovaní
- Keď bol `areaLoading=true`, early return spôsobil, že niektoré hooks neboli zavolané

**Riešenie:**
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx`
  - Presunutie `activeProjects`, `visibleProjects` a `selectedTagName` useMemo hooks PRED early returns
  - Odstránenie duplicitných definícií, ktoré boli po early returns

**Pravidlo React Rules of Hooks:**
```typescript
// ✅ SPRÁVNE - všetky hooks pred early returns
const { area, loading: areaLoading } = useArea(areaId)
const visibleProjects = useMemo(() => ..., [deps])
const selectedTagName = useMemo(() => ..., [deps])

if (areaLoading) return <Loading />  // early return AŽ PO hooks

// ❌ ZLE - hooks po early returns
if (areaLoading) return <Loading />
const visibleProjects = useMemo(() => ..., [deps])  // CRASH!
```

**Upravené súbory:**
- `app/(dashboard)/areas/[areaId]/page.tsx`

---

### v2.25 (7. januára 2026)
**Tag Filter Empty Projects Fix:**

Oprava správania filtrovania podľa tagov na Area Detail stránke - skrytie projektov bez úloh s vybraným tagom.

**Problém:**
- Pri filtrovaní podľa tagu sa zobrazovali všetky projekty, aj keď nemali žiadne úlohy s daným tagom
- Prázdne projekty bez relevantných úloh zaberali miesto a zhoršovali UX

**Riešenie:**
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx`
  - Nový `visibleProjects` useMemo - filtruje projekty podľa toho, či obsahujú úlohy s vybraným tagom
  - Nový `selectedTagName` useMemo - získa názov vybraného tagu pre empty state správu
  - Vylepšený empty state s konkrétnou správou: "Žiadne úlohy s tagom \"názov\""

**Logika filtrovania:**
```typescript
const visibleProjects = useMemo(() => {
  if (!selectedTag) return activeProjects  // Bez filtra = všetky projekty
  // S filtrom = len projekty s aspoň jednou úlohou s tagom
  return activeProjects.filter(project => {
    const projectTaskList = projectTasks.get(project.id) || []
    return projectTaskList.length > 0
  })
}, [activeProjects, selectedTag, projectTasks])
```

**Upravené súbory:**
- `app/(dashboard)/areas/[areaId]/page.tsx`

---

### v2.24 (7. januára 2026)
**Recurring Tasks (Opakujúce sa úlohy):**

Implementácia opakujúcich sa úloh inšpirovaná Things 3. Umožňuje nastaviť task, ktorý sa automaticky opakuje podľa definovaného pravidla.

**Dva typy opakovania:**

1. **After Completion (Po dokončení):**
   - Nový task sa vytvorí až keď dokončím predchádzajúci
   - Príklad: "Zálohovať PC" - 1 týždeň po dokončení
   - Výhoda: Ak nestíham, nenahromadia sa mi nedokončené tasky

2. **Scheduled (Pevný rozvrh):**
   - Nový task sa vytvorí podľa kalendára, nezávisle od dokončenia
   - Príklad: "Daily standup" - každý pracovný deň
   - Výhoda: Dodržiavam pevný termín

**Nové typy (types/index.ts):**
- `RecurrenceType = 'after_completion' | 'scheduled'`
- `RecurrenceUnit = 'day' | 'week' | 'month' | 'year'`
- `RecurrenceEndType = 'never' | 'after_count' | 'on_date'`
- Prepísaný `RecurrenceRule` interface s podporou oboch typov

**Nové komponenty:**
- ✅ `components/tasks/recurrence-config-modal.tsx` - Modal pre nastavenie opakovania
  - Výber typu (Po dokončení / Podľa rozvrhu)
  - Nastavenie intervalu (každý X dní/týždňov/mesiacov/rokov)
  - End conditions (nikdy / po X opakovaniach / k dátumu)
  - Voliteľné: pripomienky a automatický deadline
  - Preview budúcich dátumov pre scheduled typ
- ✅ `components/tasks/recurrence-badge.tsx` - Badge a IconButton komponenty

**Integrácia do UI:**
- ✅ `components/tasks/task-item.tsx` - Ikona 🔄 vedľa názvu recurring taskov
- ✅ `components/tasks/task-item-expanded.tsx` - Tlačidlo pre otvorenie modalu v toolbare

**Backend logika (lib/hooks/use-tasks.ts):**
- ✅ `getNextRecurrenceDate()` - Výpočet nasledujúceho dátumu
- ✅ `shouldCreateRecurringTask()` - Kontrola end conditions
- ✅ Rozšírený `completeTask()` - Automatické vytvorenie nového tasku pri dokončení after_completion tasku
  - Kópia všetkých relevantných polí (title, notes, project, tags, priority, atď.)
  - Reset checklistu (všetky položky unchecked)
  - Aktualizácia completed_count
  - Nastavenie when_date na vypočítaný dátum
  - Integrácia so signalizáciou (žltá bodka)

**API endpoint:**
- ✅ `app/api/tasks/[id]/recurrence/route.ts`
  - `PATCH` - Nastaviť/aktualizovať recurrence rule
  - `DELETE` - Odstrániť opakovanie
  - `GET` - Získať recurrence rule pre task

**Príklad JSON recurrence_rule:**
```json
{
  "type": "after_completion",
  "interval": 1,
  "unit": "week",
  "end_type": "never",
  "completed_count": 3
}
```

**Nové súbory:**
- `components/tasks/recurrence-config-modal.tsx`
- `components/tasks/recurrence-badge.tsx`
- `app/api/tasks/[id]/recurrence/route.ts`

**Odstránené súbory (staré implementácie):**
- `components/tasks/recurrence-config.tsx`
- `lib/utils/recurrence.ts`

**Upravené súbory:**
- `types/index.ts` - Nové typy pre recurrence
- `lib/hooks/use-tasks.ts` - After completion logika
- `components/tasks/task-item.tsx` - Recurrence ikona
- `components/tasks/task-item-expanded.tsx` - Recurrence tlačidlo a modal

---

### v2.23 (7. januára 2026)
**Kanban to Sidebar Drag & Drop Fix:**

Oprava drag & drop z Kanban zobrazenia do sidebar položiek (Kôš, Oddelenia, Projekty, atď.).

**Problém:**
- Drag & drop fungoval správne z listového zobrazenia do sidebaru
- Z Kanban zobrazenia nefungoval - sidebar nereagoval na drop

**Príčina:**
- Kanban používal vlastný `DndContext` z @dnd-kit
- Sidebar počúval na `isDragging` z `SidebarDropContext`
- Kanban karty nenotifikovali `SidebarDropContext` pri drag

**Riešenie:**

**Fáza 1 - KanbanCard notifikuje SidebarDropContext:**
- ✅ `components/tasks/kanban-card.tsx`
  - Import `useSidebarDrop` hook
  - `useEffect` nastavuje `setDraggedTask(task)` pri `isSortableDragging`
  - Sidebar teraz vidí aj drag z Kanban kariet

**Fáza 2 - KanbanBoard kontroluje sidebar drop target:**
- ✅ `components/tasks/kanban-board.tsx`
  - Import `useSidebarDrop` hook
  - V `handleDragEnd` kontrola `dropTarget` pred Kanban logikou
  - Ak je `dropTarget` nastavený, volá `handleSidebarDrop(dropTarget)`
  - Pridaný `handleDragCancel` pre úpratu stavu

**Výsledok:**
| Akcia | Pred | Po |
|-------|------|-----|
| Drag z listu do Koša | ✅ Funguje | ✅ Funguje |
| Drag z Kanban do Koša | ❌ Nefunguje | ✅ Funguje |
| Drag z Kanban do Area | ❌ Nefunguje | ✅ Funguje |
| Drag z Kanban do Projektu | ❌ Nefunguje | ✅ Funguje |
| Drag z Kanban medzi stĺpcami | ✅ Funguje | ✅ Funguje |

**Upravené súbory:**
- `components/tasks/kanban-card.tsx`
- `components/tasks/kanban-board.tsx`

---

### v2.22 (7. januára 2026)
**Signalization - Star Indicator & Yellow Dot:**

Implementácia Things 3 štýlu signalizácie pre úlohy v "Dnes" - hviezdička (⭐) a žltá bodka (🟡).

**Fáza 1 - Databázové zmeny:**
- ✅ `tasks.added_to_today_at` - Nový stĺpec pre sledovanie kedy bol task pridaný do "Dnes"
- ✅ `user_settings` tabuľka - Nová tabuľka pre uloženie `last_acknowledged` timestampu
- ✅ RLS politiky pre user_settings

**Fáza 2 - API endpoint:**
- ✅ `/api/user/acknowledge-tasks` - GET pre počet nových úloh, POST pre acknowledge

**Fáza 3 - Komponenty:**
- ✅ `components/indicators/today-star-indicator.tsx` - Zlatá hviezdička pre "Dnes" tasky
- ✅ `components/indicators/new-task-indicator.tsx` - Žltá bodka pre nové tasky
- ✅ `components/indicators/new-tasks-banner.tsx` - Banner "Máte X nových úloh"
- ✅ `components/indicators/sidebar-star-badge.tsx` - Star badge pre sidebar
- ✅ `components/indicators/index.ts` - Exporty

**Fáza 4 - Hooks:**
- ✅ `lib/hooks/use-new-tasks.ts` - useNewTasks hook pre žltú bodku logiku
  - `newTasksCount` - počet nových úloh
  - `acknowledge()` - volá POST API
  - `isTaskNew(added_to_today_at)` - callback pre určenie či je task nový
- ✅ `useTodayTasksCounts()` - počítadlo "Dnes" taskov pre sidebar star badges

**Fáza 5 - Integrácia:**
- ✅ `components/tasks/task-item.tsx` - Props `showTodayStar`, `isNew`
  - TodayStarIndicator zobrazená keď `showTodayStar && when_type === 'today'`
  - NewTaskIndicator zobrazená keď `isNew`
- ✅ `components/tasks/task-list.tsx` - Props `showTodayStar`, `isTaskNew`
- ✅ `components/tasks/sortable-task-item.tsx` - Props `showTodayStar`, `isNew`
- ✅ `components/tasks/project-task-list.tsx` - Prop `showTodayStar`
- ✅ `components/layout/sidebar.tsx` - SidebarStarBadge pre areas/projekty
- ✅ `components/layout/sidebar-drop-item.tsx` - `todayTasksCount` prop
- ✅ `app/(dashboard)/today/page.tsx` - NewTasksBanner + isTaskNew callback
- ✅ `app/(dashboard)/projects/[projectId]/page.tsx` - showTodayStar={true}
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx` - showTodayStar={true}
- ✅ `lib/hooks/use-tasks.ts` - Auto-set added_to_today_at pri when_type='today'

**Vizuálne pravidlá:**
| Indikátor | Kde sa zobrazuje | Podmienka |
|-----------|------------------|-----------|
| ⭐ Hviezdička | Project/Area stránky, Sidebar | Task je v "Dnes" (`when_type === 'today'`) |
| 🟡 Žltá bodka | Today stránka | `added_to_today_at > last_acknowledged` |
| Banner | Today stránka | Počet nových > 0 |

**Workflow:**
1. Task sa pridá do "Dnes" → nastaví sa `added_to_today_at = NOW()`
2. Používateľ vidí žltú bodku na Today stránke
3. Klikne "OK" na banner → volá sa `/api/user/acknowledge-tasks` POST
4. `last_acknowledged` sa aktualizuje → žlté bodky zmiznú

**Nové súbory:**
- `components/indicators/today-star-indicator.tsx`
- `components/indicators/new-task-indicator.tsx`
- `components/indicators/new-tasks-banner.tsx`
- `components/indicators/sidebar-star-badge.tsx`
- `components/indicators/index.ts`
- `lib/hooks/use-new-tasks.ts`
- `app/api/user/acknowledge-tasks/route.ts`

**Upravené súbory:**
- `types/index.ts` - added_to_today_at field
- `lib/hooks/use-tasks.ts` - auto-set added_to_today_at
- `components/tasks/task-item.tsx`
- `components/tasks/task-list.tsx`
- `components/tasks/sortable-task-item.tsx`
- `components/tasks/project-task-list.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/sidebar-drop-item.tsx`
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/projects/[projectId]/page.tsx`
- `app/(dashboard)/areas/[areaId]/page.tsx`

---

### v2.21 (7. januára 2026)
**Area Project Button + ProjectFormModal Simplification:**

Pridanie tlačidla "+ Pridať projekt" na stránku oddelenia a zjednodušenie ProjectFormModal keď je area preselected.

**Fáza 1 - Pridať projekt tlačidlo na Area page:**
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx` - Nové tlačidlo "+ Pridať projekt"
  - Import `FolderPlus` ikony z lucide-react
  - Import `ProjectFormModal` komponentu
  - Nový state `showProjectModal` pre ovládanie modalu
  - Tlačidlo zobrazené vedľa počtu projektov v headeri
  - `preselectedAreaId` automaticky nastavené na aktuálne oddelenie
  - Po úspešnom vytvorení sa refreshnú projekty aj úlohy

**Fáza 2 - Zjednodušený ProjectFormModal:**
- ✅ `components/projects/project-form-modal.tsx` - Skrytie area dropdown
  - Nový prop `preselectedAreaId?: string`
  - Podmienené fetchovanie areas - len keď NIE JE preselectedAreaId
  - Area dropdown skrytý keď je preselectedAreaId nastavené
  - Zjednodušené UX: zo stránky oddelenia modal zobrazuje len Názov + Farba
  - Automatický reset areaId pri zatvorení na preselectedAreaId

**Výsledné UX:**
| Kontext | Zobrazené polia |
|---------|-----------------|
| Z Area stránky | Názov, Farba |
| Zo sidebar/iného | Názov, Oddelenie (dropdown), Farba |

**Upravené súbory:**
- `app/(dashboard)/areas/[areaId]/page.tsx`
- `components/projects/project-form-modal.tsx`

---

### v2.20 (7. januára 2026)
**Drag & Drop Fix:**

Oprava nekonzistentného drag handle a zlej drop logiky pre Oddelenia/Projekty podľa Things 3 štýlu.

**Fáza 1 - Drag handle na celom riadku:**
- ✅ `components/tasks/sortable-task-item.tsx` - Drag kdekoľvek na task
  - Presun `{...attributes}` a `{...listeners}` na celý wrapper div
  - Odstránená samostatná `GripVertical` ikona
  - Pridaný `cursor-grab active:cursor-grabbing` štýl
  - Drag teraz funguje konzistentne na všetkých stránkach

**Fáza 2 - Oprava drop logiky:**
- ✅ `lib/contexts/sidebar-drop-context.tsx` - Things 3 štýl drop pravidlá
  - **Drop na Oddelenie**: Mení LEN `area_id` (zachová `when_type`, `project_id`)
  - **Drop na Projekt**: Mení LEN `project_id` a `area_id` (zachová `when_type`)
  - **Drop na Inbox**: Mení LEN `when_type` a `is_inbox` (zachová `project_id`)
  - Task v "Dnes" pretiahnutý do Oddelenia zostane v "Dnes"

**Pravidlá drop operácií (Things 3 štýl):**
| Kam dropnem | Čo sa ZMENÍ | Čo sa NEZMENÍ |
|-------------|-------------|---------------|
| Oddelenie (Area) | `area_id` | `when_type`, `project_id` |
| Projekt | `project_id`, `area_id` | `when_type` |
| Dnes | `when_type = 'today'` | `area_id`, `project_id` |
| Nadchádzajúce | `when_type = 'scheduled'`, `when_date` | `area_id`, `project_id` |
| Kedykoľvek | `when_type = 'anytime'` | `area_id`, `project_id` |
| Niekedy | `when_type = 'someday'` | `area_id`, `project_id` |
| Inbox | `when_type = 'inbox'`, `is_inbox = true` | `area_id`, `project_id` |

**Upravené súbory:**
- `components/tasks/sortable-task-item.tsx`
- `lib/contexts/sidebar-drop-context.tsx`

---

### v2.19 (7. januára 2026)
**Tags Position + DeadlineBadge Colors:**

Oprava pozície tagov a pridanie farebných varovaní pre deadline podľa špecifikácie Things 3.

**Fáza 1 - Tagy bližšie k názvu:**
- ✅ `components/tasks/task-item.tsx` - Presun tagov
  - Tagy sa teraz zobrazujú hneď za názvom úlohy a ikonou poznámky
  - Použitý flex-wrap pre správne zalamovanie na dlhších názvoch
  - Zmenené z `<p>` na `<span>` pre title (inline layout)

**Fáza 2 - DeadlineBadge farebné varovania:**
- ✅ `components/tasks/deadline-picker.tsx` - Aktualizovaný DeadlineBadge
  - Pridaný import `AlertCircle` a `differenceInDays` z date-fns
  - Farebné kódovanie podľa naliehavosti:
    | Stav | Farba | Ikona | Text |
    |------|-------|-------|------|
    | Budúci (> 1 deň) | Sivá | Calendar | 15.1. |
    | Zajtra | Oranžová | AlertTriangle | Zajtra |
    | Dnes | Oranžová (bold) | AlertTriangle | Dnes |
    | Po deadline | Červená (bold) | AlertCircle | 6.1. (4d po termíne) |

**Fáza 3 - Tag Selector Portal fix:**
- ✅ `components/tasks/inline-tag-selector.tsx` - Oprava orezávania
  - Dropdown sa teraz renderuje cez Portal do `document.body`
  - Dynamický výpočet pozície pomocou `getBoundingClientRect()`
  - Opravený click-outside handler s `setTimeout(0)` pre správne timing
  - z-index 9999 pre zobrazenie nad všetkým

**Upravené súbory:**
- `components/tasks/task-item.tsx`
- `components/tasks/deadline-picker.tsx`
- `components/tasks/inline-tag-selector.tsx`

---

### v2.18 (7. januára 2026)
**Tags Things 3 Style + TagFilterBar:**

Implementácia Things 3 štýlu pre zobrazenie tagov v task itemoch a pridanie TagFilterBar komponentu pre filtrovanie úloh podľa tagov.

**Fáza 1 - Tagy v Supabase queries:**
- ✅ `lib/hooks/use-tasks.ts` - Rozšírené query o tagy
  - Pridaný nested select: `tags:task_tags(tag:tags(id, name, color))`
  - Nová helper funkcia `transformTasks` pre flatten nested tag štruktúry
  - Aplikované na všetky hooks: `useTasks`, `useTodayTasks`, `useUpcomingTasks`, `useAnytimeTasks`, `useSomedayTasks`, `useLogbookTasks`, `useTrashTasks`, `useInboxTasks`

**Fáza 2 - Task Item Things 3 štýl:**
- ✅ `components/tasks/task-item.tsx` - Redizajn layoutu
  - Title + FileText ikona (ak má poznámky) v prvom riadku
  - Area/Department meno pod titulkom (sivý text, menší)
  - Tagy v outline štýle badges na pravej strane
  - Odstránené komponenty: TagChipList, WhenBadge, AreaBadge
  - Pridaný import: FileText z lucide-react

**Fáza 3 - TagFilterBar komponent:**
- ✅ `components/tasks/tag-filter-bar.tsx` - Nový komponent
  - Extrakcia unikátnych tagov z úloh
  - Single-select filtrovanie (jeden aktívny tag)
  - "Všetky" tlačidlo pre reset filtra
  - Horizontálne scrollovanie pre veľa tagov

**Fáza 4 - Integrácia TagFilterBar:**
- ✅ `app/(dashboard)/today/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/inbox/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/inbox/team/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/anytime/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/upcoming/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/projects/[projectId]/page.tsx` - TagFilterBar integrácia
- ✅ `app/(dashboard)/areas/[areaId]/page.tsx` - TagFilterBar integrácia

**Pattern pre integráciu:**
```typescript
// Import
import { TagFilterBar } from '@/components/tasks/tag-filter-bar'

// State
const [selectedTag, setSelectedTag] = useState<string | null>(null)

// Tag filter memo (po filteredTasks)
const tagFilteredTasks = useMemo(() => {
  if (!selectedTag) return filteredTasks
  return filteredTasks.filter(task =>
    task.tags?.some(tag => tag.id === selectedTag)
  )
}, [filteredTasks, selectedTag])

// JSX - TagFilterBar
<TagFilterBar
  tasks={filteredTasks}
  selectedTag={selectedTag}
  onSelectTag={setSelectedTag}
/>

// Empty state update
{tagFilteredTasks.length === 0 && (hasActiveFilters || selectedTag) && ...}
```

**Nové súbory:**
- `components/tasks/tag-filter-bar.tsx`

**Upravené súbory:**
- `lib/hooks/use-tasks.ts`
- `components/tasks/task-item.tsx`
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/inbox/page.tsx`
- `app/(dashboard)/inbox/team/page.tsx`
- `app/(dashboard)/anytime/page.tsx`
- `app/(dashboard)/upcoming/page.tsx`
- `app/(dashboard)/projects/[projectId]/page.tsx`
- `app/(dashboard)/areas/[areaId]/page.tsx`

---

### v2.17 (7. januára 2026)
**Things 3 Drag & Drop for Upcoming:**

Implementácia Things 3 štýlu drag & drop pre položku "Nadchádzajúce" v sidebar - pri pustení úlohy sa zobrazí kalendár pre výber dátumu.

**Hlavné zmeny:**
- ✅ `components/layout/sidebar.tsx` - Things 3 štýl pre Nadchádzajúce
  - Pri pustení úlohy na "Nadchádzajúce" sa zobrazí kalendár popover
  - Používateľ vyberie dátum, úloha dostane `when_type='scheduled'` a `when_date`
  - Kalendár sa zobrazí vedľa sidebaru s názvom úlohy
  - Klik mimo alebo X tlačidlo zruší akciu
  - Minulé dátumy sú zakázané
- ✅ `lib/contexts/sidebar-drop-context.tsx` - Rozšírený context
  - Nový stav `pendingUpcomingDrop` pre uloženie čakajúcej úlohy
  - Funkcie `setPendingUpcomingDrop` a `clearPendingUpcomingDrop`
- ✅ `components/layout/calendar-drop-picker.tsx` - Oprava typu
  - `handleCalendarDateSelect` teraz akceptuje `Date` namiesto `string`

**UI opravy:**
- ✅ Farba textu aktívnej položky v sidebar zmenená na tmavú
  - Zmenené z `text-primary` na `text-foreground` pre aktívne položky
  - Ovplyvnené: sidebar.tsx (team inbox, logbook, time)
  - Ovplyvnené: sidebar-drop-item.tsx (všetky droppable položky)
  - Aktívne položky majú teraz: peach pozadie + tmavý text

**Bug fixes:**
- ✅ Opravený stale closure bug v `handleCalendarDateSelect`
  - Použitie `useRef` pre aktuálnu hodnotu tasku namiesto priamej závislosti na state
- ✅ Opravená detekcia kliknutia mimo kalendára
  - Použitie overlay prístupu namiesto `contains()` metódy
- ✅ Opravený timezone bug pri ukladaní dátumu
  - Použitie lokálneho dátumu namiesto UTC konverzie (`toISOString()`)
- ✅ Opravený `useUpcomingTasks` query
  - Zmenené z `gt` (greater than) na `gte` (greater or equal) pre dnešný dátum
- ✅ Pridané správne Supabase error handling
  - Kontrola `error` objektu po každej Supabase operácii

**Upravené súbory:**
- `components/layout/sidebar.tsx`
- `components/layout/sidebar-drop-item.tsx`
- `components/layout/calendar-drop-picker.tsx`
- `lib/contexts/sidebar-drop-context.tsx`
- `lib/hooks/use-tasks.ts`

---

### v2.16 (7. januára 2026)
**Time Tracker Filters + Range Calendar:**

Implementácia kaskádových (závislých) filtrov v Časovači a nahradenie dvoch date inputov jedným range calendar pickerom.

**Fáza 1 - Kaskádové filtre:**
- ✅ `lib/hooks/use-cascading-time-filters.ts` - Nový hook pre závislé filtre
  - Načíta všetky areas, projects, users, tags
  - Buduje vzťahové mapy: `projectToArea`, `userToAreas`, `userToProjects`
  - Filtruje možnosti na základe aktuálneho výberu
  - Hierarchia: Oddelenie → Projekt → Kolega → Tag
- ✅ `app/(dashboard)/time/page.tsx` - Integrácia kaskádových filtrov
  - `handleCascadingFilterChange` - logika pre závislosti filtrov
  - Keď sa zmení area, vyfiltrujú sa neplatné projekty
  - Keď sa vyberie projekt, auto-nastaví sa area
- ✅ `components/time-tracking/time-dashboard-filters.tsx` - Vylepšené UI
  - Kontextové prázdne správy ("Žiadne projekty v oddelení")
  - "Zrušiť filtre" tlačidlo pre reset všetkých entity filtrov

**Fáza 2 - Range Calendar Picker:**
- ✅ Inštalácia `react-day-picker@^9.0.0`
- ✅ `components/ui/calendar.tsx` - Nový kalendár komponent
  - Podpora `mode="range"` pre výber rozsahu dátumov
  - Custom `MonthCaption` s navigáciou v jednom riadku: `◀ január 2026 ▶`
  - Slovenská lokalizácia (sk locale)
  - Vizuálne zvýraznenie vybraného rozsahu
  - CSS premenné pre dark/light mode
- ✅ `components/time-tracking/time-dashboard-filters.tsx` - Nový PeriodDropdown
  - Presety: Dnes, Tento týždeň, Tento mesiac, Tento rok
  - "Vlastné obdobie" otvorí range kalendár
  - Prvý klik = začiatočný dátum, druhý klik = koncový dátum
  - Zobrazenie vybraného rozsahu pod kalendárom
  - "Použiť" tlačidlo pre potvrdenie

**Nové súbory:**
- `lib/hooks/use-cascading-time-filters.ts`
- `components/ui/calendar.tsx`

**Upravené súbory:**
- `app/(dashboard)/time/page.tsx`
- `components/time-tracking/time-dashboard-filters.tsx`
- `package.json` (pridaný react-day-picker)

**Nové závislosti:**
- `react-day-picker@^9.0.0`

---

### v2.15 (7. januára 2026)
**Sidebar Drawer + Header Redesign:**

Implementácia podľa ZADANIE-REDESIGN-FINAL.md - sidebar ako drawer, hamburger menu v headeri, vizuálne zmeny pre task items.

**Fáza 1 - Sidebar Drawer:**
- ✅ `lib/contexts/sidebar-context.tsx` - Nový context pre globálny stav sidebaru
  - `sidebarOpen`, `setSidebarOpen`, `toggleSidebar`
- ✅ `app/(dashboard)/layout.tsx` - Sidebar ako drawer s overlay
  - Sidebar skrytý by default, zobrazí sa po kliknutí na hamburger
  - Overlay s `bg-black/50` pre zatmenie pozadia
  - `animate-slide-in-left` animácia pri otvorení
- ✅ `components/layout/sidebar.tsx` - Pridaný `onNavigate` prop
  - Automatické zatvorenie po navigácii
- ✅ `components/layout/sidebar-drop-item.tsx` - Pridaný `onNavigate` prop

**Fáza 2 - Header:**
- ✅ `components/layout/header.tsx` - Nový layout
  - Hamburger menu button (Menu ikona) na začiatku
  - Search roztiahnutý na `flex-1 max-w-md`
  - Notifikácie s červenou badge (`hasUnreadNotifications` prop)
  - Theme toggle a avatar vpravo

**Fáza 3 - Task Item zmeny:**
- ✅ `components/tasks/task-item.tsx` - Odstránený chevron/expand arrow
  - Rozbalenie len cez double-click (desktop) / tap (mobile)
- ✅ `components/tasks/when-picker.tsx` - "Dnes" badge modrá
  - Zmenené z `bg-warning` na `bg-primary text-white`
- ✅ `components/tasks/deadline-picker.tsx` - Zjednodušený štýl
  - Sivý text s Calendar ikonou namiesto výrazného badge

**Fáza 4 - Quick Add:**
- ✅ `components/tasks/task-quick-add.tsx` - Nové správanie
  - Default stav: modrý button "Pridať úlohu"
  - Po kliknutí: input s bordrom, "Pridať" a "Zrušiť" tlačidlá
  - Escape pre zrušenie

**Fáza 5 - Time Summary:**
- ✅ `components/time-tracking/time-summary-card.tsx` - Plain text štýl
  - Odstránený box s bordrom
  - Jednoduchý text: "Dnes: 2h 23m (5 úloh)"

**Nové súbory:**
- `lib/contexts/sidebar-context.tsx`

**Upravené súbory:**
- `app/(dashboard)/layout.tsx`
- `components/layout/header.tsx`
- `components/layout/sidebar.tsx`
- `components/layout/sidebar-drop-item.tsx`
- `components/tasks/task-item.tsx`
- `components/tasks/when-picker.tsx`
- `components/tasks/deadline-picker.tsx`
- `components/tasks/task-quick-add.tsx`
- `components/time-tracking/time-summary-card.tsx`

---

### v2.14 (7. januára 2026)
**Lovable Design System - Kompletný redesign UI:**

Implementácia nového dizajnového systému podľa LOVABLE_ZITA-TODO-Design-System.md s modernou farebnou paletou, novými fontami a konzistentnými komponentmi.

**Branch:** `redesign/lovable-style`

**Fáza 1 - Dizajnový systém:**
- ✅ `app/globals.css` - Kompletný prepis CSS premenných
  - Nové farby: `--background: #fffcf7` (krémová), `--primary: #0039cc` (ZITA Blue), `--secondary: #ffbf9b` (peach)
  - Kanban farby: backlog, todo, in_progress, review, done
  - Priority farby: low, medium, high, urgent
  - Department farby: 8 predefinovaných farieb
  - Timer premenné pre aktívny stav
  - Nové animácie: pulse-soft, fade-in, scale-in, slide-in
- ✅ `app/layout.tsx` - Google Fonts (DM Serif Display + DM Sans)

**Fáza 2 - Layout komponenty:**
- ✅ `components/layout/sidebar.tsx` - Nové farby, font-heading pre logo
- ✅ `components/layout/sidebar-drop-item.tsx` - Sémantické farby
- ✅ `components/layout/header.tsx` - bg-card, font-heading
- ✅ `components/ui/theme-toggle.tsx` - Zjednodušený na single-click Moon/Sun toggle

**Fáza 3 - UI komponenty:**
- ✅ `components/ui/button.tsx` - Nové varianty s sémantickými farbami
- ✅ `components/ui/checkbox.tsx` - Kruhový štýl (Things 3 inšpirácia)
- ✅ `components/ui/badge.tsx` - Priority a kanban varianty
- ✅ `components/ui/input.tsx` - Sémantické farby, nový radius
- ✅ `components/ui/modal.tsx` - bg-card, font-heading, animate-scale-in
- ✅ `components/tasks/task-item.tsx` - ChevronRight/Down pre expand, priority farby
- ✅ `components/tasks/task-item-expanded.tsx` - bg-accent/50 pozadie
- ✅ `components/time-tracking/timer-indicator.tsx` - timer-badge-active class

**Fáza 4 - Kanban komponenty:**
- ✅ `components/tasks/kanban-board.tsx` - bg-background
- ✅ `components/tasks/kanban-column.tsx` - bg-muted/50, font-heading
- ✅ `components/tasks/kanban-card.tsx` - bg-card, sémantické farby

**Fáza 5 - Stránky:**
- ✅ `app/(dashboard)/today/page.tsx` - Konzistentné sémantické triedy
- ✅ `app/(dashboard)/inbox/page.tsx` - Aktualizované farby
- ✅ `app/(dashboard)/inbox/team/page.tsx` - Aktualizované farby
- ✅ `app/(dashboard)/logbook/page.tsx` - Aktualizované farby
- ✅ `app/(dashboard)/trash/page.tsx` - Aktualizované farby
- ✅ `app/(dashboard)/upcoming/page.tsx` - Aktualizované farby
- ✅ `components/tasks/task-list.tsx` - text-muted-foreground
- ✅ `components/tasks/task-detail.tsx` - Kompletná aktualizácia farieb

**Kľúčové zmeny dizajnu:**
```css
/* Light Mode */
--background: #fffcf7;     /* Krémová */
--card: #ffffff;
--primary: #0039cc;        /* ZITA Blue */
--secondary: #ffbf9b;      /* Peach */
--accent: #ffddcb;         /* Svetlá peach */

/* Dark Mode (invertované) */
--background: #0a0a0a;
--primary: #ffbf9b;        /* Peach sa stáva primárnou */
--secondary: #2563eb;

/* Fonty */
--font-heading: "DM Serif Display", Georgia, serif;
--font-body: "DM Sans", system-ui, sans-serif;
```

**Poznámka:** Zostáva ~50 súborov s originálnymi CSS premennými (sekundárne komponenty). Tieto fungujú správne a môžu byť postupne migrované.

---

### v2.13 (6. januára 2026)
**Unified Timer UX - Jeden zdroj pravdy:**

Kompletný refaktor time trackingu s jedným globálnym zdrojom pravdy pre konzistentné zobrazenie času naprieč celou aplikáciou.

**Nový context:**
- ✅ `lib/contexts/global-timer-context.tsx` - GlobalTimerProvider ako jediný zdroj pravdy
  - `isRunning`, `currentTaskId`, `elapsedSeconds`, `currentTask`
  - `startTimer(taskId)`, `stopTimer()`
  - Automatické zastavenie existujúceho timera pri spustení nového
  - Custom events `timer:started` a `timer:stopped` pre cross-component komunikáciu

**Nový hook:**
- ✅ `lib/hooks/use-task-time-total.ts` - Hook pre celkový čas tasku z DB
  - Počúva na `timer:stopped` event pre optimistickú aktualizáciu
  - Automatický refetch pri zmene taskId

**Refaktorované komponenty:**
- ✅ `components/tasks/inline-time-tracker.tsx` - Kompletný prepis
  - Používa GlobalTimerContext namiesto lokálneho stavu
  - Zobrazuje `totalSeconds + elapsedSeconds` keď timer beží na danom tasku
  - Jeden komponent pre všetky views (task-item, task-item-expanded, task-detail)
- ✅ `components/time-tracking/timer-indicator.tsx` - Refaktor na context
  - Zobrazuje názov tasku v rozbalenom paneli
- ✅ `components/tasks/task-item.tsx` - Zjednodušené props pre InlineTimeTracker
- ✅ `components/tasks/task-item-expanded.tsx` - Pridaný InlineTimeTracker do toolbaru
- ✅ `components/tasks/task-detail.tsx` - Aktualizovaný na nový context

**Layout:**
- ✅ `app/(dashboard)/layout.tsx` - GlobalTimerProvider obaluje celú dashboard sekciu

**Pravidlá UX:**
1. **Header badge** = globálny indikátor (vždy viditeľný keď timer beží)
2. **V zozname taskov** = celkový čas + live elapsed ak beží na tomto tasku
3. **V rozbalenom tasku** = rovnaký InlineTimeTracker (nie duplikát)
4. **Jeden timer globálne** = spustenie nového automaticky zastaví predchádzajúci

**Výsledné správanie:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ZITA TODO                              [🟢 00:12]               │  ← Header
├─────────────────────────────────────────────────────────────────┤
│ ☆ úloha A      [⏸ 5:12]  ← total (5:00) + live (0:12)          │
│ ☆ úloha B      [▶ 2:30]  ← statický total                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### v2.12 (6. januára 2026)
**Time Tracking Dashboard:**

Implementácia Toggl-style Time Tracking Dashboard s reportami, grafmi a CSV exportom.

**Nová stránka:**
- ✅ `app/(dashboard)/time/page.tsx` - Time Dashboard na `/time`

**Nové API endpointy:**
- ✅ `/api/time/report` - Report s filtrami, agregáciami a groupBy
- ✅ `/api/time/report/export` - CSV export filtrovaných dát

**Nové komponenty:**
- ✅ `components/time-tracking/time-dashboard-filters.tsx` - Filter bar s obdobím, multi-selectmi
- ✅ `components/time-tracking/time-dashboard-summary.tsx` - Súhrnné karty (celkový čas, záznamy, priemer/deň)
- ✅ `components/time-tracking/time-dashboard-charts.tsx` - Grafy: čas podľa dní + čas podľa user/area/project
- ✅ `components/time-tracking/time-dashboard-table.tsx` - Summary mód + Detailed mód tabuľky

**Nové hooks:**
- ✅ `lib/hooks/use-time-report.ts` - Fetch reportu s filtrami a exportCSV funkciou
- ✅ `lib/hooks/use-time-filters.ts` - URL-based filter management s period detection

**Sidebar:**
- ✅ Pridaná položka "Časovač" s ikonou `Timer` pred sekciu "Oddelenia"

**Funkcie:**
- Filtrovanie podľa obdobia: Dnes, Tento týždeň, Tento mesiac, Tento rok, Vlastné
- Multi-select filtre: Oddelenie, Projekt, Kolega, Tag
- Toggle "Len môj čas" pre zobrazenie len vlastných záznamov
- GroupBy prepínač: Používateľ, Oddelenie, Projekt
- Graf podľa dní s víkendovým zvýraznením
- Horizontálny bar chart s percentami
- Summary tabuľka s progress barmi
- Detailed tabuľka so všetkými záznamami
- CSV export s UTF-8 kódovaním
- URL query parametre pre zdieľanie filtrov

**RLS:**
- Overené že `time_entries` RLS podporuje organizáciu cez `get_my_organization_id()`

---

### v2.11 (6. januára 2026)
**Calendar View Toggle:**

**Presun Kalendára zo sidebaru do headera:**
Kalendár bol presunutý z navigácie v sidebari do headera ako tretí view toggle (List | Kanban | Calendar).

**Zmeny v `components/ui/view-toggle.tsx`:**
```typescript
// PRED:
export type ViewMode = 'list' | 'kanban'

// PO:
export type ViewMode = 'list' | 'kanban' | 'calendar'

// Pridané tretie tlačidlo s Calendar ikonou
<button onClick={() => onChange('calendar')} title="Kalendár">
  <Calendar className="h-4 w-4" />
</button>
```

**Zmeny v `components/layout/sidebar.tsx`:**
- Odstránená navigačná položka "Kalendár"
- Odstránený nepoužívaný `Calendar` import

**CalendarView integrovaný do všetkých stránok s view toggle:**

| Stránka | Súbor | Zmeny |
|---------|-------|-------|
| Dnes | `today/page.tsx` | Import CalendarView, calendar handlers, podmienené renderovanie |
| Inbox | `inbox/page.tsx` | Import CalendarView, calendar handlers, podmienené renderovanie |
| Kedykoľvek | `anytime/page.tsx` | Import CalendarView, calendar handlers, podmienené renderovanie |
| Projekt | `projects/[projectId]/page.tsx` | Import CalendarView, calendar handlers, podmienené renderovanie |
| Oddelenie | `areas/[areaId]/page.tsx` | Import CalendarView, calendar handlers, podmienené renderovanie |

**Calendar handlers pattern:**
```typescript
// Calendar handlers
const handleCalendarTaskMove = async (taskId: string, newDate: Date) => {
  await updateTask(taskId, {
    due_date: newDate.toISOString().split('T')[0],
  })
  refetch()
}

const handleCalendarDateClick = (date: Date) => {
  console.log('Date clicked:', date)
}

// Podmienené renderovanie
{viewMode === 'calendar' ? (
  <CalendarView
    tasks={filteredTasks}
    onTaskClick={setSelectedTask}
    onDateClick={handleCalendarDateClick}
    onTaskMove={handleCalendarTaskMove}
  />
) : viewMode === 'kanban' ? (
  <KanbanBoard ... />
) : (
  <TaskList ... />
)}
```

**Upravené súbory:**
- `components/ui/view-toggle.tsx` - Rozšírený ViewMode typ, pridaná Calendar ikona
- `components/layout/sidebar.tsx` - Odstránený Kalendár z navigácie
- `app/(dashboard)/today/page.tsx` - CalendarView integrácia
- `app/(dashboard)/inbox/page.tsx` - CalendarView integrácia
- `app/(dashboard)/anytime/page.tsx` - CalendarView integrácia
- `app/(dashboard)/projects/[projectId]/page.tsx` - CalendarView integrácia
- `app/(dashboard)/areas/[areaId]/page.tsx` - CalendarView integrácia

---

### v2.10 (6. januára 2026)
**Slovak Diacritics + Nickname Display:**

**Oprava zobrazenia nickname v sidebar:**
Dashboard layout teraz správne načítava `nickname` a `role` z databázy a zobrazuje prezývku namiesto celého mena.

**Zmeny v `app/(dashboard)/layout.tsx`:**
```typescript
interface User {
  full_name: string | null
  nickname: string | null  // PRIDANÉ
  email: string
  avatar_url: string | null
  role?: 'admin' | 'strategicka_rada' | 'hr' | 'member'  // PRIDANÉ
}

// Query rozšírené o nickname a role:
.select('full_name, nickname, email, avatar_url, role')
```

**Kompletná oprava slovenskej diakritiky:**
Opravená diakritika (háčky, dĺžne, mäkčene) vo všetkých používateľských textoch:

| Súbor | Opravené texty |
|-------|----------------|
| `settings/page.tsx` | Push notifikácie, Integrácie, Organizácia, Vzhľad, Farebný režim, Svetlý/Tmavý/Systém |
| `email-settings.tsx` | Integrácia je aktívna, Prijímajte notifikácie, Emailová adresa, Typy notifikácií, Denný prehľad, Priradené úlohy, Blížiaci sa termín, Týždenný report, Zmienky v komentároch |
| `slack-settings.tsx` | Integrácia je aktívna, Prijímajte notifikácie do Slack kanálu, Ako vytvoriť webhook, Názov kanálu (voliteľne) |
| `trash/page.tsx` | Kôš, Vyprázdniť kôš, položka/položky/položiek, Vymazané úlohy môžete obnoviť, Kôš je prázdny, Obnoviť, Táto akcia je nevrátna, Ešte X dní |
| `mini-calendar.tsx` | 1-2 úlohy, 3+ úlohy |
| `assignee-selector.tsx` | Nepriradené, Hľadaj používateľa |
| `inline-tag-selector.tsx` | Názov tagu, Zrušiť, Vytvoriť |
| `inline-project-selector.tsx` | Priradiť k projektu |
| `sidebar.tsx` | Tímový inbox, Nadchádzajúce, Kedykoľvek, Nová úloha |
| `task-item.tsx` | Vymazať úlohu |
| `inline-when-picker.tsx` | Kedykoľvek, Naplánované |
| `task-item-expanded.tsx` | Názov úlohy, Poznámky |
| `project-form-modal.tsx` | Nový projekt, Názov projektu, Webová stránka, Zrušiť, Vytvoriť |
| `area-form.tsx` | Nové oddelenie, Názov oddelenia, Zrušiť, Vytvoriť |

**Upravené súbory (celkovo 20+):**
- `app/(dashboard)/layout.tsx` - nickname/role loading
- `app/(dashboard)/settings/page.tsx`
- `app/(dashboard)/trash/page.tsx`
- `components/integrations/email-settings.tsx`
- `components/integrations/slack-settings.tsx`
- `components/calendar/mini-calendar.tsx`
- `components/tasks/assignee-selector.tsx`
- `components/tasks/inline-tag-selector.tsx`
- `components/tasks/inline-project-selector.tsx`
- `components/layout/sidebar.tsx`
- `components/tasks/task-item.tsx`
- `components/tasks/inline-when-picker.tsx`
- `components/tasks/task-item-expanded.tsx`
- `components/projects/project-form-modal.tsx`
- `components/areas/area-form.tsx`
- A ďalšie...

---

### v2.9 (6. januára 2026)
**Task Filters + Unified View Toggle:**

**Task Filters na všetkých stránkach:**
Filtrovací panel integrovaný do všetkých dashboard stránok pre konzistentné UX:

| Stránka | Súbor |
|---------|-------|
| Inbox (osobný) | `app/(dashboard)/inbox/page.tsx` |
| Team Inbox | `app/(dashboard)/inbox/team/page.tsx` |
| Today | `app/(dashboard)/today/page.tsx` |
| Anytime | `app/(dashboard)/anytime/page.tsx` |
| Upcoming | `app/(dashboard)/upcoming/page.tsx` |
| Logbook | `app/(dashboard)/logbook/page.tsx` |
| Trash | `app/(dashboard)/trash/page.tsx` |
| Area Detail | `app/(dashboard)/areas/[areaId]/page.tsx` |
| Project Detail | `app/(dashboard)/projects/[projectId]/page.tsx` |

**Pattern pre integráciu filtrov:**
```typescript
import { useState, useMemo } from 'react'
import { Filter } from 'lucide-react'
import { TaskFiltersBar } from '@/components/filters/task-filters-bar'
import { useTaskFilters, filterTasks } from '@/lib/hooks/use-task-filters'

// State
const [showFilters, setShowFilters] = useState(false)
const { filters, setFilter, clearFilters, hasActiveFilters } = useTaskFilters()

// Apply filters
const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])

// Filter button in Header
<button
  onClick={() => setShowFilters(!showFilters)}
  className={`p-2 rounded-lg transition-colors ${
    hasActiveFilters ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--bg-hover)]'
  }`}
>
  <Filter className="h-4 w-4" />
</button>

// Filter bar (collapsible)
{showFilters && (
  <TaskFiltersBar filters={filters} onFilterChange={setFilter} ... />
)}
```

**Unified View Toggle:**
Zjednotené UI pre prepínanie List/Kanban view - malé ikony v headeri namiesto veľkých textových tlačidiel:

- ✅ **Today** - Už mal správny štýl (malé ikony)
- ✅ **Projects** - Zmenené z veľkých textových tlačidiel na malé ikony v Header
- ✅ **Areas** - Pridaný ViewToggle (predtým chýbal)
- ✅ `/projects/[id]/kanban` - Zjednodušené na redirect (toggle je teraz v hlavnej stránke)

**Zmeny v Header komponente:**
```typescript
<Header
  title={project.name}
  showViewToggle           // Zapne toggle
  viewMode={viewMode}      // 'list' | 'kanban'
  onViewModeChange={setViewMode}
>
```

**Kanban handlery pre Areas:**
```typescript
const handleKanbanTaskMove = async (taskId: string, newStatus: TaskStatus) => {
  const updates: Partial<TaskWithRelations> = { status: newStatus }
  if (newStatus === 'done') {
    updates.completed_at = new Date().toISOString()
    updates.when_type = null  // Auto-logbook
  } else {
    updates.completed_at = null
  }
  await updateTask(taskId, updates)
  refetchTasks()
}
```

**Upravené súbory:**
- `app/(dashboard)/inbox/page.tsx` - Pridané filtre
- `app/(dashboard)/inbox/team/page.tsx` - Pridané filtre
- `app/(dashboard)/today/page.tsx` - Pridané filtre
- `app/(dashboard)/anytime/page.tsx` - Pridané filtre
- `app/(dashboard)/upcoming/page.tsx` - Pridané filtre
- `app/(dashboard)/logbook/page.tsx` - Pridané filtre
- `app/(dashboard)/trash/page.tsx` - Pridané filtre
- `app/(dashboard)/areas/[areaId]/page.tsx` - Pridané filtre + ViewToggle + Kanban
- `app/(dashboard)/projects/[projectId]/page.tsx` - Pridané filtre + ViewToggle v Header
- `app/(dashboard)/projects/[projectId]/kanban/page.tsx` - Zjednodušené na redirect

---

### v2.8 (5. januára 2026)
**User Management + Departments + Filters:**

**Nový systém rolí:**
| Rola | Popis | Prístup k oddeleniam |
|------|-------|---------------------|
| `admin` | Administrátor | Všetky oddelenia |
| `strategicka_rada` | Strategická rada | Všetky oddelenia |
| `hr` | HR oddelenie | Všetky oddelenia |
| `member` | Bežný člen | Len priradené oddelenia |

**Nové tabuľky a polia:**
- ✅ `users` - rozšírené o `nickname`, `position`, `status`, `invited_by`, `invited_at`, `last_login_at`, `start_date`
- ✅ `areas` - pridané `is_global` pre označenie oddelení
- ✅ `invitations` - rozšírené o `full_name`, `nickname`, `position`, `departments` (JSONB)
- ✅ `department_members` - nová tabuľka pre priradenie používateľov k oddeleniam

**Nové stránky:**
- ✅ `/settings/users` - Správa používateľov (len admin)
- ✅ `/invite/[token]` - Prijatie pozvánky a vytvorenie účtu

**Nové API:**
- ✅ `/api/invitations/accept` - Endpoint pre prijatie pozvánky

**Nové komponenty:**
- ✅ `components/users/user-row.tsx` - Riadok používateľa
- ✅ `components/users/edit-user-modal.tsx` - Modal pre editáciu
- ✅ `components/users/invite-user-modal.tsx` - Modal pre pozvanie
- ✅ `components/filters/task-filters-bar.tsx` - Filtrovací panel

**Nové hooky:**
- ✅ `use-user-departments.ts` - Načítanie oddelení podľa roly + `useCurrentUser`
- ✅ `use-task-filters.ts` - Správa stavu filtrov
- ✅ `use-users-management.ts` - Admin CRUD pre používateľov a pozvánky

**Sidebar vylepšenia:**
- ✅ Zobrazovanie nickname namiesto full_name
- ✅ "Moje oddelenia" sekcia pre bežných členov
- ✅ "Ostatné oddelenia" collapsible sekcia pre admin/hr/strategická_rada
- ✅ Role badge pod menom používateľa
- ✅ Admin odkaz na /settings/users

**TypeScript typy:**
```typescript
export type UserRole = 'admin' | 'strategicka_rada' | 'hr' | 'member'
export type UserStatus = 'active' | 'inactive' | 'invited'
export const FULL_ACCESS_ROLES: UserRole[] = ['admin', 'strategicka_rada', 'hr']

export function canSeeAllDepartments(role: UserRole): boolean
export function canManageUsers(role: UserRole): boolean
```

**Nové súbory:**
- `app/(dashboard)/settings/users/page.tsx`
- `app/(auth)/invite/[token]/page.tsx`
- `app/api/invitations/accept/route.ts`
- `components/users/user-row.tsx`
- `components/users/edit-user-modal.tsx`
- `components/users/invite-user-modal.tsx`
- `components/filters/task-filters-bar.tsx`
- `components/filters/index.ts`
- `lib/hooks/use-user-departments.ts`
- `lib/hooks/use-task-filters.ts`
- `lib/hooks/use-users-management.ts`
- `lib/utils/filter-query.ts`
- `lib/supabase/admin.ts`

**Upravené súbory:**
- `types/index.ts` - Nové typy a helper funkcie
- `components/layout/sidebar.tsx` - Nickname, oddelenia, admin link

---

### v2.7 (5. januára 2026)
**Status-based Kanban Board:**

**Zmena koncepcie:**
Kanban board teraz používa `status` pole namiesto `when_type`. Toto oddeľuje workflow fázy (Backlog → To Do → In Progress → Review → Done) od časového zaradenia úloh (Today/Anytime/Someday).

**Kanban stĺpce (Status-based):**
| Stĺpec | Status | Farba |
|--------|--------|-------|
| Backlog | `backlog` | #8E8E93 |
| To Do | `todo` | #007AFF |
| In Progress | `in_progress` | #FF9500 |
| Review | `review` | #AF52DE |
| Done | `done` | #34C759 |

**Auto-logbook logika:**
Keď úloha prejde do stĺpca "Done":
```typescript
if (newStatus === 'done') {
  updates.completed_at = new Date().toISOString()
  updates.when_type = null  // Presun do logbooku
}
```

**Funkcie:**
- ✅ Drag & drop medzi stĺpcami mení `status` úlohy
- ✅ Auto-logbook pri dokončení (when_type = null, completed_at = now)
- ✅ View Toggle (List/Kanban) na Today, Inbox, Anytime stránkach
- ✅ Konzistentný KanbanBoard komponent naprieč aplikáciou

**Odstránené súbory (When-based Kanban):**
- `components/tasks/when-kanban-board.tsx` ❌
- `components/tasks/when-kanban-column.tsx` ❌
- `components/tasks/when-kanban-card.tsx` ❌

**Upravené stránky:**
- `app/(dashboard)/inbox/page.tsx` - KanbanBoard namiesto WhenKanbanBoard
- `app/(dashboard)/today/page.tsx` - KanbanBoard namiesto WhenKanbanBoard
- `app/(dashboard)/anytime/page.tsx` - KanbanBoard namiesto WhenKanbanBoard
- `app/(dashboard)/areas/[areaId]/page.tsx` - Odstránený duplicitný header

**Existujúce status-based komponenty (použité):**
- `components/tasks/kanban-board.tsx` - Hlavný Kanban board
- `components/tasks/kanban-column.tsx` - Stĺpec s drag & drop
- `components/tasks/kanban-card.tsx` - Karta úlohy

---

### v2.6 (4. januára 2026)
**View Toggle - Prepínač Zoznam/Kanban:**

**Nové komponenty:**
- `components/ui/view-toggle.tsx` - Toggle button pre prepínanie List/Kanban zobrazenia
- ~~`components/tasks/when-kanban-board.tsx`~~ - (Odstránené v2.7)
- ~~`components/tasks/when-kanban-column.tsx`~~ - (Odstránené v2.7)
- ~~`components/tasks/when-kanban-card.tsx`~~ - (Odstránené v2.7)
- `lib/hooks/use-view-preference.ts` - Hook pre ukladanie view preference do localStorage

**Funkcie:**
- ✅ Toggle button v headeri (vedľa vyhľadávania)
- ✅ Perzistencia preferencie do localStorage (per-page)
- ✅ Responzívne horizontálne scrollovanie na mobile

**Aktualizované stránky:**
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/inbox/page.tsx`
- `app/(dashboard)/anytime/page.tsx`
- `app/(dashboard)/upcoming/page.tsx`
- `components/layout/header.tsx` - pridané props pre view toggle

---

### v2.5 (4. januára 2026)
**Inline Components + Drag & Drop Sorting + Calendar Drop:**

**Fáza 1 - Inline komponenty pre task-item-expanded:**
- ✅ `components/tasks/inline-when-picker.tsx` - Kompaktný When picker pre inline editáciu
- ✅ `components/tasks/inline-deadline-picker.tsx` - Kompaktný Deadline picker s mini kalendárom
- ✅ `components/tasks/inline-tag-selector.tsx` - Multi-select tags pre inline editáciu
- ✅ `components/tasks/inline-project-selector.tsx` - Project dropdown pre inline editáciu
- ✅ `components/tasks/inline-time-tracker.tsx` - Inline time tracker s elapsed time
- ✅ `components/tasks/inline-location-selector.tsx` - Location selector pre task lokáciu

**Fáza 2 - Calendar Drop Picker:**
- ✅ `components/layout/calendar-drop-picker.tsx` - Mini kalendár pre drag & drop na sidebar
- ✅ Vizuálne zvýraznenie pri drag over dňa
- ✅ Automatická zmena `when_type` na `scheduled` a nastavenie `when_date`

**Fáza 3 - Sortable Task Items:**
- ✅ `components/tasks/sortable-task-item.tsx` - Wrapper pre drag & drop triedenie
- ✅ `lib/utils/task-sorting.ts` - Utility funkcie pre triedenie (priority, date, manual)
- ✅ Perzistentné uloženie sort_order do databázy

**Fáza 4 - Project & Area Forms:**
- ✅ `components/projects/project-form-modal.tsx` - Modal pre vytvorenie nového projektu
- ✅ `components/areas/area-form.tsx` - Formulár pre vytvorenie/úpravu oddelenia
- ✅ Integrácia s sidebar pre rýchle vytváranie

**Fáza 5 - Vylepšené Task Counts:**
- ✅ Podpora pre `archived_at` stĺpec v počítadlách
- ✅ Optimalizované paralelné queries pre rýchlejšie načítanie
- ✅ Realtime subscription na zmeny v tasks tabuľke

**Nové súbory:**
- `components/tasks/inline-when-picker.tsx`
- `components/tasks/inline-deadline-picker.tsx`
- `components/tasks/inline-tag-selector.tsx`
- `components/tasks/inline-project-selector.tsx`
- `components/tasks/inline-time-tracker.tsx`
- `components/tasks/inline-location-selector.tsx`
- `components/tasks/sortable-task-item.tsx`
- `components/layout/calendar-drop-picker.tsx`
- `components/projects/project-form-modal.tsx`
- `components/areas/area-form.tsx`
- `lib/utils/task-sorting.ts`

**Upravené súbory:**
- `components/tasks/task-item-expanded.tsx` - integrácia inline komponentov
- `components/tasks/task-list.tsx` - podpora pre sortable items
- `components/layout/sidebar.tsx` - integrácia calendar drop picker
- `lib/hooks/use-task-counts.ts` - podpora archive_at
- `lib/hooks/use-tasks.ts` - nové sorting funkcie
- `lib/hooks/use-areas.ts` - CRUD operácie pre areas
- `lib/hooks/use-projects.ts` - CRUD operácie pre projects

---

### v2.4 (4. januára 2026)
**Trash + Inline Edit + Task Counters:**

**Fáza 1 - Kôš (Trash):**
- ✅ `app/(dashboard)/trash/page.tsx` - Nová stránka pre vymazané úlohy
- ✅ `deleted_at` stĺpec v tabuľke tasks
- ✅ Soft delete namiesto trvalého mazania
- ✅ Obnovenie úloh z koša
- ✅ Trvalé vymazanie jednotlivých úloh
- ✅ Vyprázdnenie celého koša s potvrdením

**Fáza 2 - Inline editovanie úloh:**
- ✅ `components/tasks/task-item-expanded.tsx` - Rozbalená úloha priamo v zozname
- ✅ Dvojklik na desktop / klik na mobile pre rozbalenie
- ✅ Inline editovateľný názov a poznámky
- ✅ When picker, Deadline, Tags, Project selector v rozbalenom stave
- ✅ Click-outside a Escape pre zatvorenie

**Fáza 3 - Swipe-to-delete:**
- ✅ Touch gestá v `task-item.tsx` pre mobilné zariadenia
- ✅ Swipe doľava odhalí delete button
- ✅ Vizuálny feedback s červeným pozadím
- ✅ Threshold 80px pre aktiváciu

**Fáza 4 - Keyboard shortcut pre mazanie:**
- ✅ Backspace/Delete klávesy pre vymazanie rozbalenej úlohy
- ✅ Pridané do `keyboard-shortcuts-modal.tsx`

**Fáza 5 - Task counters v sidebar:**
- ✅ `lib/hooks/use-task-counts.ts` - Hook pre počítanie úloh
- ✅ Realtime subscription pre automatické aktualizácie
- ✅ Sivé badges pre bežné počty
- ✅ Červená badge pre deadline úlohy na Today
- ✅ Podpora dark mode pre badges

**Opravy:**
- ✅ RLS politika pre UPDATE/DELETE tímových inbox úloh
- ✅ Tag creation s `null` namiesto `undefined` pre organization_id
- ✅ Lepšie error logging v team inbox page

**Nové súbory:**
- `app/(dashboard)/trash/page.tsx`
- `components/tasks/task-item-expanded.tsx`
- `lib/hooks/use-task-counts.ts`

**Upravené súbory:**
- `components/tasks/task-item.tsx` - swipe gestá
- `components/tasks/task-list.tsx` - keyboard delete, expand state
- `components/layout/sidebar.tsx` - task counters
- `components/layout/sidebar-drop-item.tsx` - count badges
- `lib/hooks/use-tasks.ts` - softDelete, useTrashTasks
- `lib/hooks/use-tags.ts` - null fix pre organization_id
- `types/index.ts` - deleted_at field
- `supabase-rls-fix.sql` - team inbox UPDATE/DELETE politiky

---

### v2.3 (4. januára 2026)
**Things 3 UI + Sidebar Drag & Drop:**

**Fáza 1 - Checklist UI:**
- ✅ `components/tasks/checklist.tsx` - Interaktívny checklist s @dnd-kit drag & drop
- ✅ Inline pridávanie položiek, delete, complete toggle
- ✅ Integrácia do task-detail.tsx

**Fáza 2 - Tags UI:**
- ✅ `components/tasks/tag-selector.tsx` - Multi-select dropdown s farebnými indikátormi
- ✅ `lib/hooks/use-tags.ts` - CRUD hook pre tagy
- ✅ Vytvorenie nových tagov priamo v dropdown

**Fáza 3 - Task Detail Panel Redesign:**
- ✅ `components/tasks/project-selector.tsx` - Project dropdown s vyhľadávaním
- ✅ `components/tasks/assignee-selector.tsx` - Team member dropdown s avatarmi
- ✅ `components/tasks/deadline-picker.tsx` - Deadline picker s quick options + DeadlineBadge
- ✅ Prepísaný `task-detail.tsx` v Things 3 štýle s inline editovateľným titulkom
- ✅ Auto-save pattern pre všetky polia
- ✅ Avatar 'xs' size pre kompaktné zobrazenie

**Fáza 4 - Sidebar Drag & Drop:**
- ✅ `lib/contexts/sidebar-drop-context.tsx` - Context pre globálny drag stav
- ✅ `components/layout/sidebar-drop-item.tsx` - Droppable sidebar položky
- ✅ `components/tasks/draggable-task.tsx` - Wrapper pre draggable úlohy
- ✅ `lib/hooks/use-task-moved.ts` - Event listener pre refresh listov
- ✅ Native HTML5 Drag & Drop API (nie @dnd-kit pre sidebar)
- ✅ Vizuálny feedback pri drag over
- ✅ Custom event `task:moved` pre cross-component komunikáciu

**Fáza 5 - Upcoming Mini Calendar:**
- ✅ `components/calendar/mini-calendar.tsx` - Kompaktný kalendár
- ✅ Task indikátory (bodky) - modrá 1-2 úlohy, oranžová/červená 3+
- ✅ Klik na deň scrolluje k úlohám daného dňa
- ✅ Integrácia do Upcoming page s quick stats

**Opravy:**
- Fix: `showQuickAdd` type error (`boolean | null` → `!!value`)

---

### v2.1 (4. januára 2026)
**Všetky Things 3 funkcie implementované:**
- ✅ Headings v projektoch s drag & drop
- ✅ When picker komponent (Today/Anytime/Someday/Scheduled)
- ✅ Today view s overdue sekciou
- ✅ Upcoming view so zoskupením podľa dátumu
- ✅ Anytime view pre úlohy bez termínu
- ✅ Someday view pre nápady na neskôr
- ✅ Logbook view s groupovaním podľa obdobia (Dnes, Včera, Tento týždeň, atď.)
- ✅ Area detail view s projektmi a voľnými úlohami
- ✅ Kanban s 5 stĺpcami (Backlog, Todo, In Progress, Review, Done)
- ✅ Globálny timer indikátor v headeri
- ✅ useGlobalTimer a useTimeTotals hooks
- ✅ Rozšírené keyboard shortcuts s kategóriami
- ✅ Mobilná navigácia s novými views

**Nové súbory:**
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/upcoming/page.tsx`
- `app/(dashboard)/anytime/page.tsx`
- `app/(dashboard)/someday/page.tsx`
- `app/(dashboard)/logbook/page.tsx`
- `app/(dashboard)/areas/[areaId]/page.tsx`
- `components/tasks/when-picker.tsx`
- `components/headings/heading-item.tsx`
- `components/headings/heading-form.tsx`
- `components/time-tracking/timer-indicator.tsx`
- `lib/hooks/use-areas.ts`
- `lib/hooks/use-headings.ts`

**Upravené súbory:**
- `lib/hooks/use-tasks.ts` - pridané Things 3 hooks
- `lib/hooks/use-time-tracking.ts` - pridané useGlobalTimer, useTimeTotals
- `lib/hooks/use-keyboard-shortcuts.ts` - rozšírené skratky
- `components/layout/sidebar.tsx` - nové navigačné odkazy
- `components/layout/header.tsx` - globálny timer indikátor
- `components/layout/mobile-nav.tsx` - kompaktný timer + nové views
- `components/ui/keyboard-shortcuts-modal.tsx` - kategórie skratiek
- `lib/utils/date.ts` - formatDurationShort pre timer

---

**Verzia:** 2.32 (New Task Form)
**Posledná aktualizácia:** 10. januára 2026
