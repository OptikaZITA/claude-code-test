# ZADANIE PRE CLAUDE CODE: Hromadné UI/UX opravy

## Dátum: 16. február 2026
## Priorita: 🟡 STREDNÁ

---

## BUG 1: Orezané popupy a dropdowny

### Problém
V list view a task detail modáli sa dropdown/popup okná (kalendár, when picker, deadline picker) orezávajú — časť je skrytá a treba scrollovať.

### Riešenie
Všetky dropdown/popup komponenty musia používať **portal rendering** — renderovať sa do `document.body` namiesto do parent elementu. Tým sa vyhnú `overflow: hidden` na parent kontajneroch.

Skontroluj a oprav tieto komponenty:
- `components/tasks/when-picker.tsx`
- `components/tasks/inline-when-picker.tsx`
- `components/tasks/deadline-picker.tsx`
- `components/tasks/inline-deadline-picker.tsx`
- `components/tasks/inline-tag-selector.tsx`
- `components/tasks/inline-project-selector.tsx`
- `components/tasks/inline-location-selector.tsx`
- `components/tasks/assignee-selector.tsx`

Pre každý z nich:

```tsx
// Použi React Portal pre dropdown obsah
import { createPortal } from 'react-dom'

// Namiesto:
{isOpen && (
  <div className="absolute top-full ...">
    {/* dropdown content */}
  </div>
)}

// Použi:
{isOpen && createPortal(
  <div 
    className="fixed z-[9999]"
    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
  >
    {/* dropdown content */}
  </div>,
  document.body
)}
```

**Pozíciu vypočítaj** z `getBoundingClientRect()` trigger elementu:
```tsx
const triggerRef = useRef<HTMLButtonElement>(null)

const openDropdown = () => {
  if (triggerRef.current) {
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
    })
  }
  setIsOpen(true)
}
```

**Ak komponent už používa shadcn/ui Popover alebo DropdownMenu** — tieto by mali automaticky riešiť portál. Skontroluj či majú `modal={true}` alebo `portal` prop.

---

## BUG 2: Rovnaká ikona pre deadline a prioritu

### Problém
V rozbalenom task iteme (list view) sa pre deadline aj prioritu používa rovnaká ikona vlajky (🚩). Používateľ ich nevie rozlíšiť.

### Riešenie
Zmeň ikonu pre **deadline** na kalendárovú ikonu:

```tsx
// Pre DEADLINE - použi CalendarClock alebo CalendarDays
import { CalendarClock } from 'lucide-react'
// <CalendarClock className="h-4 w-4" />

// Pre PRIORITU - ponechaj vlajku
import { Flag } from 'lucide-react'
// <Flag className="h-4 w-4" />
```

Nájdi v `task-item.tsx` (riadky ~280-320) kde sa renderujú inline akcie a zmeň ikonu pri deadline buttone.

Tiež skontroluj `task-item-expanded.tsx` ak sa tam používa rovnaká ikona.

---

## BUG 3: When picker "Naplánované" — zlý UX v task detail

### Problém
V task detail modáli (po kliknutí na task), when picker "Naplánované":
1. Kliknem "Naplánované" → zobrazí sa date input s `dd/mm/yyyy`
2. Dropdown sa **okamžite zbalí** → musím ho znova otvoriť
3. Natívny date input (ikona kalendára) **nefunguje** alebo je ťažko klikateľný
4. Príliš veľa klikov na jednoduchú akciu

### Riešenie

#### A) Dropdown sa nesmie zatvárať po kliknutí na "Naplánované"
V `when-picker.tsx` (alebo kde sa renderuje when dropdown v task detail):

```tsx
// Pri kliknutí na "Naplánované" NEZATVÁRAJ dropdown
const handleScheduledClick = () => {
  setShowDatePicker(true)  // Zobraz date picker
  // NEROBÍ setIsOpen(false) !!!
}
```

#### B) Nahraď natívny date input vizuálnym kalendárom
Namiesto `<input type="date" />` použi rovnaký kalendár komponent ako pri deadline pickeri. Pravdepodobne už existuje v projekte — hľadaj `Calendar` z shadcn/ui alebo custom implementáciu.

```tsx
// Namiesto:
<input type="date" value={date} onChange={...} />

// Použi:
import { Calendar } from '@/components/ui/calendar'

<Calendar
  mode="single"
  selected={selectedDate}
  onSelect={(date) => {
    handleDateSelect(date)
    setIsOpen(false)  // Zatvor AŽ po vybraní dátumu
  }}
  initialFocus
/>
```

#### C) Celkový flow by mal byť:
1. Klik na "Kedykoľvek" → otvorí sa dropdown
2. Klik na "Naplánované" → dropdown zostane otvorený, zobrazí sa kalendár
3. Klik na dátum v kalendári → dropdown sa zatvorí, dátum sa uloží
4. **Maximálne 3 kliky** na nastavenie dátumu

---

## SÚHRN ZMIEN

| Bug | Súbory | Zmena |
|-----|--------|-------|
| Orezané popupy | when-picker, deadline-picker, tag-selector, atď. | Portal rendering alebo overflow fix |
| Rovnaké ikony | task-item.tsx, task-item-expanded.tsx | Deadline: CalendarClock, Priorita: Flag |
| When picker UX | when-picker.tsx v task detail | Nezbaliť po "Naplánované", vizuálny kalendár |

## TESTOVANIE

- [ ] List view: rozbal task → klikni deadline → kalendár sa zobrazí celý (nie orezaný)
- [ ] List view: rozbal task → ikona deadline ≠ ikona priority
- [ ] Task detail modal: Kedy → Naplánované → zobrazí sa kalendár → vyber dátum → 3 kliky max
- [ ] Kanban: klikni na kartu → task detail → rovnaké testovanie
- [ ] Mobilná verzia: dropdowny sa zobrazujú správne
- [ ] Git push + deploy na Vercel

---

*Vytvorené: 16. február 2026*
