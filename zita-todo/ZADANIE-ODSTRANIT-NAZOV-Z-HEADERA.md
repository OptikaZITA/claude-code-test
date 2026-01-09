# ZADANIE: Odstrániť názov stránky z headera

## Prehľad

Názov stránky (napr. "Inbox", "Dnes") sa zobrazuje viackrát - zbytočná duplicita. Riešenie: odstrániť názov z headera úplne na všetkých zariadeniach.

---

## Aktuálny stav (ZLE)

### Mobile - "Inbox" sa zobrazuje 3x!
```
┌─────────────────────────────────┐
│ ZITA TODO                    ☰ │
├─────────────────────────────────┤
│ Inbox   🔍  ≡  ⊞  📅   🌙  🔔 │  ← 1. Header (ODSTRÁNIŤ!)
├─────────────────────────────────┤
│ Inbox              + Pridať    │  ← 2. Page title
├─────────────────────────────────┤
│  (obsah)                        │
├─────────────────────────────────┤
│ 📥    ⭐    👥    ⚙️           │  ← 3. Bottom nav
│ Inbox  Dnes  Tím  Nastavenia   │
└─────────────────────────────────┘
```

### Desktop - "Dnes" sa zobrazuje 2x
```
┌─────────────────────────────────────────────────────────────────┐
│ ☰  Dnes                              🔍 Hľadať...    🌙  👤    │  ← Header (ODSTRÁNIŤ!)
├────────────────────┬────────────────────────────────────────────┤
│ ★ Dnes        4    │  Dnes                        + Pridať     │  ← Page title
│ Nadchádzajúce      │                                           │
└────────────────────┴────────────────────────────────────────────┘
```

---

## Nový stav (SPRÁVNE)

### Mobile
```
┌─────────────────────────────────┐
│ ZITA TODO                    ☰ │  ← Header (len logo + hamburger)
├─────────────────────────────────┤
│ 🔍  ≡  ⊞  📅           🌙  🔔 │  ← Toolbar (bez názvu)
├─────────────────────────────────┤
│ Inbox              + Pridať    │  ← Page title (jediný názov)
├─────────────────────────────────┤
│  (obsah)                        │
├─────────────────────────────────┤
│ 📥    ⭐    👥    ⚙️           │  ← Bottom nav
│ Inbox  Dnes  Tím  Nastavenia   │
└─────────────────────────────────┘
```

### Desktop
```
┌─────────────────────────────────────────────────────────────────┐
│ ☰                                🔍 Hľadať...         🌙  👤   │  ← Header (bez názvu)
├────────────────────┬────────────────────────────────────────────┤
│ ★ Dnes        4    │  Dnes                        + Pridať     │  ← Page title
│ Nadchádzajúce      │                                           │
└────────────────────┴────────────────────────────────────────────┘
```

---

## Prečo je to OK

| Zariadenie | Ako používateľ vie kde sa nachádza |
|------------|-------------------------------------|
| Desktop | Sidebar (zvýraznená položka) + Page H1 title |
| Mobile | Bottom navigation + Page H1 title |

**Názov v headeri nie je potrebný.**

---

## Implementácia

### Súbor: `components/layout/header.tsx`

Nájdi a **odstráň** (alebo zakomentuj) zobrazenie `title`:

```tsx
// PRED
<div className="flex items-center gap-4">
  <button onClick={toggleSidebar}>
    <Menu className="w-6 h-6" />
  </button>
  <span className="text-lg font-semibold">{title}</span>  // ← ODSTRÁNIŤ
</div>

// PO
<div className="flex items-center gap-4">
  <button onClick={toggleSidebar}>
    <Menu className="w-6 h-6" />
  </button>
  {/* title removed - displayed in page H1 */}
</div>
```

### Ak header prijíma `title` ako prop

Môžeš ponechať prop (pre spätnú kompatibilitu), len ho nezobrazovať. Alebo ho odstrániť z volajúcich komponentov.

---

## Acceptance Criteria

- [ ] Názov stránky sa nezobrazuje v headeri (mobile ani desktop)
- [ ] Page H1 title ostáva viditeľný na všetkých stránkach
- [ ] Header obsahuje: hamburger menu, search, theme toggle, notifikácie, avatar
- [ ] Bottom navigation na mobile funguje správne
- [ ] Sidebar na desktope funguje správne

---

## Kde testovať

1. Desktop - všetky stránky (Inbox, Dnes, Nadchádzajúce, Oddelenia...)
2. Mobile (Chrome DevTools alebo reálny telefón)
3. Overiť že nie je žiadna duplicita názvov

---

**Priorita:** Nízka (UX vylepšenie)
**Odhadovaný čas:** 5-10 minút
**Dátum:** 9. január 2026
