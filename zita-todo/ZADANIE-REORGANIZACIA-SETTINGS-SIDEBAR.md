# ZADANIE: Reorganizácia Settings a zjednodušenie sidebar

## Prehľad

Presunúť "Správa používateľov" do Settings stránky a zjednodušiť spodok sidebar, aby bolo viditeľné celé meno používateľa.

---

## 1. AKTUÁLNY STAV (ZLE)

### Sidebar - spodok
```
┌─────────────────────────────────────────┐
│ (N) Da...  │ ⚙️ │ 👥 │ ⚙️ │ 🚪 │
│    Ad...   │    │    │    │    │
└─────────────────────────────────────────┘
```

**Problémy:**
- Meno orezané ("Da..." namiesto "Dano")
- Príliš veľa ikoniek
- Správa používateľov vystavená v sidebar

---

## 2. NOVÝ STAV (SPRÁVNE)

### Sidebar - spodok (zjednodušený)
```
┌─────────────────────────────────────────┐
│ (N) Dano              │ ⚙️ │ 🚪 │
│     Admin             │    │    │
└─────────────────────────────────────────┘
```

**Ikonky:**
- **⚙️** - Nastavenia (otvorí /settings)
- **🚪** - Odhlásiť sa

### Settings stránka (s tabmi)

**URL:** `/settings`

**Pre bežného používateľa:**
```
┌─────────────────────────────────────────────────────┐
│ Nastavenia                                          │
├─────────────────────────────────────────────────────┤
│ [👤 Profil] [🎨 Vzhľad] [🔗 Integrácie]             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  (obsah vybraného tabu)                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Pre admina:**
```
┌─────────────────────────────────────────────────────┐
│ Nastavenia                                          │
├─────────────────────────────────────────────────────┤
│ [👤 Profil] [🎨 Vzhľad] [🔗 Integrácie] [👥 Používatelia] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  (obsah vybraného tabu)                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 3. ŠTRUKTÚRA TABOV

### Tab: Profil (👤)
- Profilová fotka (upload - viď samostatné zadanie)
- Osobné údaje (needitovateľné)
- Meno, Prezývka, Email, Pozícia

### Tab: Vzhľad (🎨)
- Farebný režim (svetlý/tmavý/systém)
- Prípadne ďalšie vizuálne preferencie

### Tab: Integrácie (🔗)
- Slack integrácia
- Email notifikácie
- Prípadne ďalšie

### Tab: Používatelia (👥) - LEN ADMIN
- Zoznam používateľov
- Pozvať používateľa
- Editovať používateľa
- Aktuálny obsah z `/settings/users`

---

## 4. URL ŠTRUKTÚRA

### Aktuálna
```
/settings           → hlavná stránka nastavení
/settings/users     → správa používateľov (len admin)
```

### Nová
```
/settings                → presmeruje na /settings/profile
/settings/profile        → profil (nové)
/settings/appearance     → vzhľad
/settings/integrations   → integrácie
/settings/users          → používatelia (len admin)
```

---

## 5. IMPLEMENTÁCIA

### Sidebar - odstrániť ikonky

**Súbor:** `components/layout/sidebar.tsx`

**Odstrániť:**
- Ikona "Správa používateľov" (👥)
- Prípadné duplicitné ikony

**Ponechať:**
- Avatar s menom
- Ikona Nastavenia (⚙️) → link na `/settings`
- Ikona Odhlásiť (🚪)

### Settings stránka - pridať taby

**Súbor:** `app/(dashboard)/settings/page.tsx`

```typescript
const tabs = [
  { id: 'profile', label: 'Profil', icon: User, href: '/settings/profile' },
  { id: 'appearance', label: 'Vzhľad', icon: Palette, href: '/settings/appearance' },
  { id: 'integrations', label: 'Integrácie', icon: Link, href: '/settings/integrations' },
];

// Pridať tab pre admina
if (currentUser?.role === 'admin') {
  tabs.push({ 
    id: 'users', 
    label: 'Používatelia', 
    icon: Users, 
    href: '/settings/users' 
  });
}
```

### Layout pre Settings

**Nový súbor:** `app/(dashboard)/settings/layout.tsx`

```typescript
export default function SettingsLayout({ children }) {
  return (
    <div>
      <h1>Nastavenia</h1>
      <SettingsTabs />
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
```

### Komponenty

**Nový súbor:** `components/settings/settings-tabs.tsx`

```typescript
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Palette, Link as LinkIcon, Users } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-user-departments';

export function SettingsTabs() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  
  const tabs = [
    { id: 'profile', label: 'Profil', icon: User, href: '/settings/profile' },
    { id: 'appearance', label: 'Vzhľad', icon: Palette, href: '/settings/appearance' },
    { id: 'integrations', label: 'Integrácie', icon: LinkIcon, href: '/settings/integrations' },
  ];
  
  if (user?.role === 'admin') {
    tabs.push({ 
      id: 'users', 
      label: 'Používatelia', 
      icon: Users, 
      href: '/settings/users' 
    });
  }
  
  return (
    <div className="flex gap-2 border-b">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 ${
              isActive 
                ? 'border-primary text-primary' 
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
```

---

## 6. SÚBORY NA ÚPRAVU

### Upraviť
```
components/layout/sidebar.tsx          # Odstrániť nadbytočné ikonky
app/(dashboard)/settings/page.tsx      # Presmerovanie na /profile
app/(dashboard)/settings/users/page.tsx # Bez zmeny (už existuje)
```

### Vytvoriť
```
app/(dashboard)/settings/layout.tsx           # Layout s tabmi
app/(dashboard)/settings/profile/page.tsx     # Profil stránka
app/(dashboard)/settings/appearance/page.tsx  # Vzhľad stránka
app/(dashboard)/settings/integrations/page.tsx # Integrácie stránka
components/settings/settings-tabs.tsx         # Tab navigácia
```

---

## 7. ACCEPTANCE CRITERIA

### Sidebar
- [ ] Zobrazujú sa len 2 ikonky: Nastavenia a Odhlásiť
- [ ] Meno používateľa je viditeľné celé (nie orezané)
- [ ] Ikona Správa používateľov je odstránená

### Settings stránka
- [ ] Má tab navigáciu (Profil, Vzhľad, Integrácie)
- [ ] Admin vidí navyše tab "Používatelia"
- [ ] Bežný používateľ NEvidí tab "Používatelia"
- [ ] URL `/settings` presmeruje na `/settings/profile`
- [ ] Každý tab má svoju stránku

### Obsah tabov
- [ ] Profil - osobné údaje + avatar upload
- [ ] Vzhľad - farebný režim
- [ ] Integrácie - Slack, Email
- [ ] Používatelia - existujúci obsah z `/settings/users`

---

## 8. POZNÁMKY

- Toto zadanie súvisí so zadaním "Upload profilovej fotky" - Profil tab bude obsahovať avatar upload
- Existujúci obsah z `/settings/users` sa presunie do tabu, nie je potrebné ho prerábať
- Tab "Používatelia" je viditeľný LEN pre rolu `admin`

---

**Priorita:** Stredná
**Dátum:** 8. január 2026
