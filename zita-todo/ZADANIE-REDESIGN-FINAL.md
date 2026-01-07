# ZADANIE: Redizajn ZITA TODO na Lovable Design System

## Cieľ

Aplikovať Lovable dizajn naprieč CELOU aplikáciou. Toto zadanie obsahuje vizuálne aj funkčné zmeny.

**Referencia:** Lovable prototyp screenshots (priložené)

---

## ČASŤ 1: SYSTÉMOVÉ/FUNKČNÉ ZMENY

### 1.1 Sidebar ako Drawer (Toggle)

**Aktuálne:** Sidebar je vždy viditeľný
**Nové:** Sidebar je skrytý, zobrazí sa len po kliku na hamburger menu

**Správanie:**
```
Štart: Sidebar SKRYTÝ
Klik na ☰ → Sidebar sa ZOBRAZÍ (slide-in z ľava)
Klik na ☰ znova → Sidebar sa SKRYJE (slide-out)
Klik na overlay (tmavé pozadie) → Sidebar sa SKRYJE
```

**Implementácia:**
```tsx
// V layout.tsx alebo header.tsx
const [sidebarOpen, setSidebarOpen] = useState(false);

// Hamburger button
<button onClick={() => setSidebarOpen(!sidebarOpen)}>
  <Menu className="h-5 w-5" />
</button>

// Sidebar s overlay
{sidebarOpen && (
  <>
    <div 
      className="fixed inset-0 bg-black/50 z-40" 
      onClick={() => setSidebarOpen(false)} 
    />
    <aside className="fixed left-0 top-0 h-full w-64 bg-background z-50 shadow-lg">
      {/* Sidebar content */}
    </aside>
  </>
)}
```

**Súbory na úpravu:**
- `components/layout/sidebar.tsx`
- `components/layout/header.tsx`
- `app/(dashboard)/layout.tsx`

---

### 1.2 Tlačidlo "+ Pridať úlohu" - Nové správanie

**Aktuálne:** Input pole vždy viditeľné
**Nové:** Modrý button, po kliku sa zobrazí input

**Správanie:**
```
PRED KLIKOM:
┌─────────────────────────────────────────────────────────────────┐
│ Dnes                                      [+ Pridať úlohu]      │
│ ⏱️ Dnes: 4h 27m (4 úlohy)                                       │
├─────────────────────────────────────────────────────────────────┤
│ [○] [★] Úloha 1                                                 │
└─────────────────────────────────────────────────────────────────┘

PO KLIKU na button:
┌─────────────────────────────────────────────────────────────────┐
│ Dnes                                      [+ Pridať úlohu]      │
│ ⏱️ Dnes: 4h 27m (4 úlohy)                                       │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐ [Pridať] [Zrušiť]    │
│ │ Názov novej úlohy...                  │                      │
│ └───────────────────────────────────────┘                      │
├─────────────────────────────────────────────────────────────────┤
│ [○] [★] Úloha 1                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Detaily:**
- Input má oranžový/peach border (focus state)
- [Pridať] = modrý filled button
- [Zrušiť] = text link
- Enter = pridá úlohu
- Escape = zruší (skryje input)

**Implementácia:**
```tsx
const [showAddTask, setShowAddTask] = useState(false);
const [newTaskTitle, setNewTaskTitle] = useState('');

// Button v headeri stránky
<Button onClick={() => setShowAddTask(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Pridať úlohu
</Button>

// Input pole (podmienene zobrazené)
{showAddTask && (
  <div className="flex items-center gap-2 p-4 border-b">
    <Input
      value={newTaskTitle}
      onChange={(e) => setNewTaskTitle(e.target.value)}
      placeholder="Názov novej úlohy..."
      className="flex-1 border-secondary focus:border-secondary"
      autoFocus
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleAddTask();
        if (e.key === 'Escape') setShowAddTask(false);
      }}
    />
    <Button onClick={handleAddTask}>Pridať</Button>
    <button onClick={() => setShowAddTask(false)} className="text-muted-foreground">
      Zrušiť
    </button>
  </div>
)}
```

**Súbory na úpravu:**
- `app/(dashboard)/today/page.tsx`
- `app/(dashboard)/inbox/page.tsx`
- `app/(dashboard)/anytime/page.tsx`
- (všetky stránky s task listom)

---

## ČASŤ 2: VIZUÁLNE ZMENY

### 2.1 Farebná paleta

**Light Mode:**
```css
:root {
  --background: #fffcf7;        /* Krémová - hlavné pozadie */
  --foreground: #0f0f0f;        /* Čierna - text */
  --card: #ffffff;              /* Biela - karty */
  --muted: #f5f5f5;             /* Sivá - neaktívne */
  --muted-foreground: #666666;  /* Sivá - sekundárny text */
  
  --primary: #0039cc;           /* ZITA Modrá */
  --secondary: #ffbf9b;         /* Peach */
  --accent: #ffddcb;            /* Svetlá broskyňová */
  
  --success: #4aba6a;           /* Zelená */
  --warning: #ff9966;           /* Oranžová */
  --error: #cc4444;             /* Červená */
}
```

**Dark Mode:**
```css
.dark {
  --background: #141414;
  --foreground: #fffcf7;
  --card: #1f1f1f;
  --muted: #2a2a2a;
  --muted-foreground: #a1a1a6;
  
  --primary: #ffbf9b;           /* Peach - invertované */
  --secondary: #2563eb;
  --accent: #1e3a5f;
}
```

**Súbory:** `app/globals.css`, `tailwind.config.ts`

---

### 2.2 Badge "Dnes" - Zmena farby

**Aktuálne:** Oranžový s hviezdičkou
**Nové:** Modrý filled (#0039cc)

```tsx
// Zmeniť z:
<Badge variant="warning">☆ Dnes</Badge>

// Na:
<Badge className="bg-primary text-white">Dnes</Badge>
```

**Súbory:** `components/tasks/task-item.tsx`

---

### 2.3 Súhrn času - Zjednodušenie

**Aktuálne:** V boxe s ikonou
**Nové:** Prostý text pod nadpisom

```tsx
// Zmeniť z:
<div className="border rounded-lg p-4">
  <Clock /> Dnes: 2m (2 úlohy)
</div>

// Na:
<p className="text-muted-foreground text-sm flex items-center gap-2">
  <Clock className="h-4 w-4" />
  Dnes: 4h 27m (4 úlohy)
</p>
```

**Súbory:** `app/(dashboard)/today/page.tsx`

---

### 2.4 Task Item - Odstrániť expand šípku

**Aktuálne:** Šípka (>) vľavo
**Nové:** Bez šípky (čistejší dizajn)

**Nová štruktúra:**
```
[○] [★] Názov úlohy          [Dnes] [Projekt] 42m 📅 8.1.
```

**Klik na task** = rozbalí detail (bez šípky)
**Dvojklik** = tiež rozbalí

**Súbory:** `components/tasks/task-item.tsx`

---

### 2.5 Typografia

**Fonty:**
```css
--font-heading: "DM Serif Display", Georgia, serif;
--font-body: "DM Sans", system-ui, sans-serif;
```

**Pridať do `app/layout.tsx`:**
```tsx
import { DM_Serif_Display, DM_Sans } from 'next/font/google';

const dmSerifDisplay = DM_Serif_Display({ 
  weight: '400', 
  subsets: ['latin'],
  variable: '--font-heading'
});

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-body'
});

// V body:
<body className={`${dmSerifDisplay.variable} ${dmSans.variable} font-sans`}>
```

**Použitie:**
- Logo "ZITA TODO" → `font-heading`
- Nadpisy stránok (Dnes, Inbox...) → `font-heading`
- Všetko ostatné → `font-body` (default)

---

### 2.6 Header - Nový layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [☰]  [🔍 Hľadať úlohy...]              [≡][⊞][📅] [☽] [🔔•]    │
└─────────────────────────────────────────────────────────────────┘
  ↑           ↑                              ↑       ↑    ↑
  │           │                              │       │    └── Notifikácie s červenou bodkou
  │           │                              │       └── Dark mode toggle (jeden klik)
  │           │                              └── View toggle (List aktívny = modrý)
  │           └── Search (širší, viac vľavo)
  └── Hamburger menu (toggle sidebar)
```

**Súbory:** `components/layout/header.tsx`

---

### 2.7 Notifikácie - Červená bodka

Pridať červenú bodku ak sú nepřečítané notifikácie:

```tsx
<button className="relative">
  <Bell className="h-5 w-5" />
  {hasUnread && (
    <span className="absolute -top-1 -right-1 h-2 w-2 bg-error rounded-full" />
  )}
</button>
```

---

### 2.8 Deadline štýl

**Aktuálne:** Červený s ⚠️ ikonou
**Nové:** Sivý, nenápadný

```tsx
// Zmeniť z:
<span className="text-red-500">⚠️ 6. jan</span>

// Na:
<span className="text-muted-foreground text-sm">
  <Calendar className="h-3 w-3 inline mr-1" />
  8.1.
</span>
```

---

### 2.9 Formát času

**Aktuálne:** "3:08" (hodiny:minúty)
**Nové:** "42m" alebo "1h 30m"

```tsx
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
```

---

## ČASŤ 3: KONTROLNÝ ZOZNAM

### Po implementácii skontroluj:

**Systémové:**
- [ ] Hamburger menu toggle funguje
- [ ] Sidebar sa zobrazí/skryje animovane
- [ ] Overlay zatvára sidebar
- [ ] "+ Pridať úlohu" zobrazí input
- [ ] Enter pridá úlohu, Escape zruší

**Vizuálne:**
- [ ] Badge "Dnes" je modrý
- [ ] Pozadie je krémové (#fffcf7)
- [ ] Fonty DM Serif Display + DM Sans fungujú
- [ ] Súhrn času je prostý text (nie box)
- [ ] Deadline je sivý (nie červený)
- [ ] Notifikácie majú červenú bodku
- [ ] Dark mode funguje správne

**Stránky:**
- [ ] /today
- [ ] /inbox
- [ ] /inbox/team
- [ ] /upcoming
- [ ] /anytime
- [ ] /logbook
- [ ] /trash
- [ ] /time (Časovač dashboard)

---

## ČASŤ 4: POSTUP IMPLEMENTÁCIE

### Fáza 1: Základ
1. Aktualizuj `globals.css` - farby
2. Aktualizuj `tailwind.config.ts` - farby
3. Pridaj fonty do `layout.tsx`

### Fáza 2: Layout
4. Uprav `header.tsx` - hamburger, search pozícia
5. Uprav `sidebar.tsx` - drawer/overlay logika
6. Uprav `layout.tsx` - sidebar state

### Fáza 3: Komponenty
7. Uprav `task-item.tsx` - badge farba, bez šípky
8. Uprav stránky - súhrn času, pridať úlohu button

### Fáza 4: Detaily
9. Deadline štýl
10. Notifikácie bodka
11. Formát času

### Fáza 5: Testovanie
12. Otestuj všetky stránky
13. Otestuj dark mode
14. Otestuj mobile responzivitu

---

## DÔLEŽITÉ POZNÁMKY

1. **Zachovaj funkcionalitu** - meníme vizuál a UX, nie business logiku
2. **Commituj po každej fáze** - pre ľahký rollback
3. **Testuj priebežne** - po každej zmene over v prehliadači
4. **Dark mode** - vždy testuj obe témy

```bash
# Po každej fáze:
git add .
git commit -m "Redesign: [popis zmeny]"
```
