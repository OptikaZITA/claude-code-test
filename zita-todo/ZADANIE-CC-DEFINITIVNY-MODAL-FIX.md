# ZADANIE PRE CLAUDE CODE: DEFINITÍVNE OPRAVENIE VŠETKÝCH MODÁLOV A POPUPOV

## Dátum: 16. február 2026
## Priorita: 🔴 KRITICKÁ
## Typ: Systémový fix — platí pre celú appku

---

## PROBLÉM

VŠETKY modály, dialógy, popupy a dropdowny v celej aplikácii sú vizuálne orezané — tlačidlá sú nalepené na spodný okraj, chýba padding, obsah sa niekedy skrýva za okraj obrazovky. Toto sa deje VŠADE — RecurrenceConfigModal, task detail, "Nové oddelenie", "Pridať čas", when picker, deadline picker, atď.

Toto NIE JE problém jednotlivých komponentov. Je to SYSTÉMOVÝ problém v layout wrapperi alebo v base modal/dialog komponente.

---

## DIAGNOSTIKA — urob NAJPRV, pred akoukoľvek opravou

### Krok 1: Nájdi overflow problém
```bash
# V prehliadači otvor DevTools → Elements
# Otvor akýkoľvek modal (napr. RecurrenceConfigModal)
# Klikni na modal element a choď po parent elementoch hore
# Hľadaj overflow: hidden, overflow: auto, overflow: scroll
# Zaznamenaj KAŽDÝ element ktorý má overflow !== visible
```

### Krok 2: Skontroluj modal/dialog base komponenty
```bash
grep -rn "overflow" --include="*.tsx" --include="*.css" components/ui/modal.tsx components/ui/dialog.tsx app/globals.css
```

### Krok 3: Skontroluj layout wrapper
```bash
grep -rn "overflow" --include="*.tsx" app/\(dashboard\)/layout.tsx components/layout/
```

---

## OPRAVA

### A) Base Modal komponent (`components/ui/modal.tsx`)

Modal MUSÍ:
1. Renderovať cez React Portal do `document.body`
2. Mať `position: fixed` s `inset: 0` (overlay)
3. Mať `z-index: 50` alebo vyššie
4. Content MUSÍ mať dostatočný padding (`p-6`) a `max-h-[90vh] overflow-y-auto`
5. NESMIE byť child elementu s `overflow: hidden`

```tsx
// components/ui/modal.tsx — SPRÁVNA implementácia
'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, size = 'md', children }: ModalProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden' // Zamkni scroll na body
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  const modal = (
    {/* Overlay */}
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Content */}
      <div 
        className={`relative z-10 w-full ${sizeClasses[size]} mx-4 bg-background rounded-xl shadow-2xl border border-border max-h-[85vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-md hover:bg-accent text-muted-foreground"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Body — scrollovateľný */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
```

**KĽÚČOVÉ BODY:**
- `createPortal(modal, document.body)` — renderuje MIMO React tree, takže žiadny parent overflow ho neovplyvní
- `fixed inset-0 z-50` — pokryje celú obrazovku
- `max-h-[85vh] flex flex-col` — modal nikdy nepresahuje 85% výšky obrazovky
- `overflow-y-auto flex-1` na body — ak je obsah dlhší, scrolluje sa len body
- `px-6 py-5` — dostatočný padding na všetkých stranách
- `shrink-0` na header — header sa nescrolluje

### B) Ak používaš shadcn/ui Dialog

Ak niektoré modály používajú shadcn/ui `<Dialog>`, skontroluj:

```tsx
// components/ui/dialog.tsx
// DialogContent MUSÍ mať:
<DialogContent className="max-h-[85vh] overflow-y-auto p-6">
  {children}
</DialogContent>
```

A tiež skontroluj že `DialogOverlay` a `DialogContent` používajú `React.createPortal` (shadcn/ui to robí cez Radix, čo by malo fungovať).

### C) Layout overflow fix

V `app/(dashboard)/layout.tsx` a `components/layout/` nájdi KAŽDÝ `overflow-hidden`:

```bash
grep -rn "overflow-hidden\|overflow-auto\|overflow-scroll" --include="*.tsx" app/ components/layout/
```

Pre KAŽDÝ nález zvaž:
- Ak je to na **main content area** → zmeň `overflow-hidden` na `overflow-x-hidden overflow-y-auto`
- Ak je to na **sidebar** → ponechaj (sidebar scrolluje nezávisle)
- Ak je to na **celom layoute** → ODSTRÁŇ, lebo blokuje portálované modály

### D) Globálne CSS zabezpečenie

V `app/globals.css` pridaj:

```css
/* Zabezpečenie že portálované modály sú vždy nad obsahom */
[data-radix-popper-content-wrapper] {
  z-index: 100 !important;
}

/* Modal portály */
.modal-portal {
  z-index: 50;
}
```

### E) Dropdowny a popovery

Pre KAŽDÝ dropdown/popover komponent (when-picker, deadline-picker, tag-selector, project-selector, assignee-selector):

Ak používa `position: absolute` relatívne k parent elementu → zmeň na Radix `<Popover>` s portálom, ALEBO použi `createPortal`.

Najjednoduchší fix: ak komponent používa shadcn/ui `<Popover>`, pridaj `modal={true}`:
```tsx
<Popover modal={true}>
  {/* ... */}
</Popover>
```

---

## TESTOVANIE

Po oprave otestuj KAŽDÝ z týchto modálov/popupov:

- [ ] RecurrenceConfigModal — otvorí sa vycentrovaný, nie orezaný, padding OK
- [ ] Task detail modal — plne viditeľný, scrollovateľný ak je dlhý
- [ ] "Nové oddelenie" modal — padding OK, farby viditeľné, tlačidlá nie sú nalepené
- [ ] "Pridať čas k úlohe" modal — plne viditeľný
- [ ] When picker dropdown v task detail — nezasahuje mimo obrazovku
- [ ] Deadline picker kalendár — plne viditeľný
- [ ] Tag selector dropdown — plne viditeľný
- [ ] Project selector dropdown — plne viditeľný
- [ ] Assignee selector dropdown — plne viditeľný
- [ ] Inline when picker v list view — nezasahuje za okraj
- [ ] Inline deadline picker v list view — nezasahuje za okraj
- [ ] Všetko funguje na veľkom aj malom monitore (skús zmenšiť okno)

## DÔLEŽITÉ

- Toto je SYSTÉMOVÝ fix — nerobí sa per-component
- Najprv oprav base modal komponent + layout overflow
- Potom skontroluj že VŠETKY modály ho používajú
- Až potom testuj jednotlivé popupy
- Ak niečo funguje cez shadcn/ui Dialog a nie cez custom Modal, zjednoť na jedno riešenie
- Git push + deploy na Vercel + over na produkcii

---

*Vytvorené: 16. február 2026*
