# ZADANIE: Filter "Strážci vesmíru" (filtrovanie podľa kolegu)

## Prehľad

Nový filter pre filtrovanie taskov podľa priradeného kolegu s dynamickou logikou (rovnaká ako pri tagoch).

---

## 1. UMIESTNENIE FILTRA

### V headeri stránky

```
[Status ▼] [Termín ▼] [Priorita ▼] [Strážci vesmíru ▼]
```

### Kde sa zobrazuje

| Stránka | Zobrazuje sa filter? |
|---------|---------------------|
| Dnes | ✅ Áno |
| Nadchádzajúce | ✅ Áno |
| Kedykoľvek | ✅ Áno |
| Oddelenie (list) | ✅ Áno |
| Oddelenie (kanban) | ✅ Áno |
| Projekt | ✅ Áno |
| Inbox | ✅ Áno |
| Logbook | ✅ Áno |
| Someday | ✅ Áno |

---

## 2. DYNAMICKÁ LOGIKA

### Pravidlo (rovnaké ako pri tagoch)

**Dropdown zobrazí len kolegov, ktorí majú priradený aspoň 1 task v aktuálnom kontexte.**

### Príklady

**Príklad 1: Stránka oddelenia "Inovácie"**
- V Inováciách sú tasky priradené: Dano (5), Katka (3), Marek (0)
- Dropdown zobrazí: `Všetci | Dano | Katka`
- Marek sa nezobrazí (nemá žiadny task v Inováciách)

**Príklad 2: Stránka "Dnes"**
- V Dnes sú tasky priradené: Dano (2), Katka (1), Peter (1)
- Dropdown zobrazí: `Všetci | Dano | Katka | Peter`

**Príklad 3: Projekt "R&D prototyp"**
- V projekte sú tasky priradené: Dano (3)
- Dropdown zobrazí: `Všetci | Dano`

### Špeciálne prípady

| Situácia | Správanie |
|----------|-----------|
| Žiadni kolegovia s taskami | Filter sa nezobrazí (alebo disabled) |
| Len 1 kolega | Filter sa zobrazí s možnosťou "Všetci" + ten kolega |
| Nepriradené tasky | Pridať možnosť "Nepriradené" ? (voliteľné) |

---

## 3. UI DROPDOWN

### Vzhľad

```
┌─────────────────────────┐
│ Strážci vesmíru      ▼  │
├─────────────────────────┤
│ ○ Všetci                │
│ ─────────────────────── │
│ ○ 👤 Dano          (5)  │  ← Avatar + meno + počet taskov
│ ○ 👤 Katka         (3)  │
│ ○ 👤 Peter         (1)  │
│ ─────────────────────── │
│ ○ Nepriradené      (2)  │  ← Voliteľné
└─────────────────────────┘
```

### Možnosti zobrazenia

1. **S avatarmi** - malý avatar vedľa mena
2. **S počtom** - číslo v zátvorke (počet taskov)
3. **Abecedne** - zoradenie podľa mena

---

## 4. FILTROVANIE

### Logika

```typescript
// Pseudokód
const filteredTasks = tasks.filter(task => {
  if (selectedColleague === 'all') return true;
  if (selectedColleague === 'unassigned') return !task.assignee_id;
  return task.assignee_id === selectedColleague;
});
```

### V kombinácii s inými filtrami

Filter "Strážci vesmíru" sa kombinuje s ostatnými filtrami (AND logika):

```
Status: "In Progress" AND Priorita: "Urgent" AND Strážci vesmíru: "Dano"
→ Zobrazí tasky ktoré sú In Progress, Urgent a priradené Danovi
```

---

## 5. KANBAN VIEW

### Správanie

- Filter funguje rovnako ako v list view
- Filtrované karty sa zobrazia/skryjú podľa výberu
- Stĺpce zostávajú (aj keď prázdne po filtrovaní)

---

## 6. URL PARAMETER

### Pre zdieľanie / bookmarking

```
/areas/123?colleague=dano-id
/today?colleague=all
/projects/456?colleague=unassigned
```

---

## 7. IMPLEMENTÁCIA

### Hook

```typescript
// lib/hooks/use-colleague-filter.ts
export function useColleagueFilter(tasks: Task[]) {
  // Získaj unikátnych kolegov z taskov
  const colleagues = useMemo(() => {
    const assigneeIds = tasks
      .map(t => t.assignee_id)
      .filter(Boolean);
    
    const uniqueIds = [...new Set(assigneeIds)];
    
    // Fetch user details pre každé ID
    return uniqueIds.map(id => getUserById(id));
  }, [tasks]);
  
  return colleagues;
}
```

### Komponent

```typescript
// components/filters/colleague-filter.tsx
export function ColleagueFilter({ 
  tasks, 
  selectedColleague, 
  onSelect 
}: ColleagueFilterProps) {
  const colleagues = useColleagueFilter(tasks);
  
  if (colleagues.length === 0) return null;
  
  return (
    <Dropdown>
      <DropdownTrigger>
        Strážci vesmíru
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem value="all">Všetci</DropdownItem>
        {colleagues.map(colleague => (
          <DropdownItem key={colleague.id} value={colleague.id}>
            <Avatar src={colleague.avatar} />
            {colleague.name}
            <span>({colleague.taskCount})</span>
          </DropdownItem>
        ))}
        <DropdownItem value="unassigned">Nepriradené</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
```

---

## 8. ACCEPTANCE CRITERIA

- [ ] Filter "Strážci vesmíru" sa zobrazuje v headeri na všetkých relevantných stránkach
- [ ] Dropdown obsahuje len kolegov s taskami v aktuálnom kontexte
- [ ] Možnosť "Všetci" je vždy prítomná
- [ ] Filtrovanie funguje v list view
- [ ] Filtrovanie funguje v kanban view
- [ ] Filter sa kombinuje s ostatnými filtrami (AND)
- [ ] Ak nie sú žiadni kolegovia, filter sa nezobrazí
- [ ] URL parameter pre zdieľanie

---

## 9. POZNÁMKY

- Názov "Strážci vesmíru" je interný vtip, ale funkčný 🚀
- Rovnaká logika ako pri tagoch (dynamické zobrazovanie)
- Voliteľne: pridať "Nepriradené" pre tasky bez assignee

---

**Priorita zadania:** Stredná
**Dátum:** 8. január 2026
