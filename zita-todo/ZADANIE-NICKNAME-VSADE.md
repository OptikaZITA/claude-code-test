# ZADANIE: Zjednotenie zobrazovania mena - Nickname všade

## Prehľad

Zjednotiť zobrazovanie mena používateľa naprieč celou aplikáciou. Primárne sa má zobrazovať **nickname**, nie full_name.

---

## Pravidlo

| Kontext | Zobrazovať | Príklad |
|---------|-----------|---------|
| **Všade v UI** | nickname | "Dano" |
| **Admin / Settings** | nickname + full_name | "Dano (Daniel Grigar)" |
| **Profil používateľa** | oboje | nickname aj full_name |
| **Fallback** | full_name ak nickname neexistuje | "Daniel Grigar" |

---

## Audit - Miesta na kontrolu

### 1. Filtre
| Miesto | Súbor | Aktuálne | Správne |
|--------|-------|----------|---------|
| Strážci vesmíru dropdown | `components/filters/cascading-filter-bar.tsx` | full_name (orezané) | nickname |
| Assignee filter (mobile bottom sheet) | `components/filters/filter-bottom-sheet.tsx` | ? | nickname |

### 2. Sidebar
| Miesto | Súbor | Aktuálne | Správne |
|--------|-------|----------|---------|
| Používateľ dole | `components/layout/sidebar.tsx` | nickname ✓ | ✓ OK |

### 3. Task komponenty
| Miesto | Súbor | Aktuálne | Správne |
|--------|-------|----------|---------|
| Avatar tooltip | `components/tasks/task-item.tsx` | ? | nickname |
| Assignee selector dropdown | `components/tasks/assignee-selector.tsx` | ? | nickname |
| Task detail - assignee | `components/tasks/task-detail.tsx` | ? | nickname |

### 4. Time tracking
| Miesto | Súbor | Aktuálne | Správne |
|--------|-------|----------|---------|
| Time dashboard - kto trackoval | `components/time-tracking/time-dashboard-table.tsx` | ? | nickname |
| Time entries list | `app/(dashboard)/time/page.tsx` | ? | nickname |

### 5. Team funkcie
| Miesto | Súbor | Aktuálne | Správne |
|--------|-------|----------|---------|
| Team Inbox - kto poslal úlohu | `app/(dashboard)/inbox/team/page.tsx` | ? | nickname |
| Komentáre (ak existujú) | `components/comments/*` | ? | nickname |

### 6. Settings / Admin
| Miesto | Súbor | Aktuálne | Správne |
|--------|-------|----------|---------|
| Users zoznam | `app/(dashboard)/settings/users/page.tsx` | ? | nickname + (full_name) |
| User row | `components/users/user-row.tsx` | ? | nickname + full_name |
| Edit user modal | `components/users/edit-user-modal.tsx` | ? | oboje zobrazené |
| Invite user modal | `components/users/invite-user-modal.tsx` | ? | N/A |

### 7. Notifikácie
| Miesto | Súbor | Aktuálne | Správne |
|--------|-------|----------|---------|
| Push notifikácie | ? | ? | nickname |
| Email notifikácie | ? | ? | nickname |

---

## Implementácia

### Helper funkcia

Vytvoriť helper funkciu pre konzistentné zobrazovanie mena:

```typescript
// lib/utils/user.ts

export function getDisplayName(user: { nickname?: string | null; full_name?: string | null }): string {
  return user.nickname || user.full_name || 'Neznámy'
}

export function getFullDisplayName(user: { nickname?: string | null; full_name?: string | null }): string {
  if (user.nickname && user.full_name && user.nickname !== user.full_name) {
    return `${user.nickname} (${user.full_name})`
  }
  return user.nickname || user.full_name || 'Neznámy'
}
```

### Použitie

```typescript
// Bežné zobrazenie
<span>{getDisplayName(user)}</span>  // "Dano"

// Admin zobrazenie
<span>{getFullDisplayName(user)}</span>  // "Dano (Daniel Grigar)"

// S fallbackom
<span>{user.nickname ?? user.full_name ?? 'Nepriradené'}</span>
```

---

## Acceptance Criteria

### Filtre
- [ ] Strážci vesmíru dropdown zobrazuje nickname
- [ ] Mobile filter bottom sheet zobrazuje nickname

### Task komponenty
- [ ] Avatar tooltip zobrazuje nickname
- [ ] Assignee selector dropdown zobrazuje nickname
- [ ] Task detail assignee zobrazuje nickname

### Time tracking
- [ ] Time dashboard tabuľka zobrazuje nickname
- [ ] Time entries zobrazujú nickname

### Team funkcie
- [ ] Team Inbox zobrazuje nickname odosielateľa

### Settings (výnimka)
- [ ] Users zoznam zobrazuje nickname + full_name v zátvorke
- [ ] User detail zobrazuje oboje

### Všeobecné
- [ ] Helper funkcia `getDisplayName()` vytvorená a použitá
- [ ] Fallback na full_name ak nickname neexistuje
- [ ] Žiadne miesto v UI nezobrazuje orezané meno ("Daniel Grig...")

---

## Poznámky

### Dátový model
```sql
-- users tabuľka
nickname (text)     -- Primárne zobrazované meno ("Dano")
full_name (text)    -- Celé meno ("Daniel Grigar")
```

### Priorita zobrazovania
1. `nickname` - ak existuje
2. `full_name` - fallback
3. `"Neznámy"` alebo `"Nepriradené"` - ak ani jedno neexistuje

---

**Priorita:** Nízka (konzistencia UI)
**Odhadovaný čas:** 1-2 hodiny
**Dátum:** 11. január 2026
