# ZITA TODO - Inline Task UI Špecifikácia

**Vytvorené:** 4. januára 2026
**Referencia:** Things 3 desktop app

---

## Cieľ

Prepracovať TaskCard komponent na inline rozbaľovací štýl ako Things 3. Žiadny modal/overlay - task sa rozbalí priamo v zozname.

---

## 1. Rozbalenie tasku

### Desktop:
- **Dvojklik** na task = rozbalí sa inline
- **Klik mimo** task = zbalí sa späť

### Mobile:
- **Jeden klik** na task = rozbalí sa inline
- **Klik mimo** task = zbalí sa späť

### Pravidlá:
- Len jeden task môže byť rozbalený naraz
- Pri rozbalení iného tasku sa predchádzajúci automaticky zbalí
- Escape klávesa zbalí rozbalený task

---

## 2. Štruktúra rozbaleného tasku

```
┌─────────────────────────────────────────────────────────────────┐
│ ☐ Title (editovateľný inline)                                   │
│                                                                 │
│   Notes (šedý text, editovateľný textarea)                      │
│                                                                 │
│   ⭐ Today ×                          🏷️Tags  📁Projekt  🚩Deadline│
│                                                                 │
│                                       (metadata: assignee, atď) │
└─────────────────────────────────────────────────────────────────┘
```

### Layout:
- **Riadok 1:** Checkbox + Title (väčší font, editovateľný)
- **Riadok 2:** Notes (šedý text, textarea s auto-resize)
- **Riadok 3:** When badge (vľavo) + Toolbar ikony (vpravo)
- **Riadok 4:** Metadáta (vpravo zarovnané)

---

## 3. When Picker (⭐ Today)

### Zobrazenie:
- Chip/badge vľavo dole v rozbalenom tasku
- Farba podľa typu: Today = žltá, Someday = hnedá, Scheduled = modrá
- × ikona pre rýchle vymazanie (Clear)

### Dropdown po kliku:
```
┌────────────────────────┐
│ When                   │
├────────────────────────┤
│ ⭐ Today          ✓    │
│ 🌙 This Evening        │
├────────────────────────┤
│ Mon Tue Wed Thu Fri Sat Sun │
│  5   6   7   8   9  10  11  │
│ 12  13  14  15  16  17  18  │
│ 19  20  21  22  23  24  >   │
├────────────────────────┤
│ 📦 Someday             │
│ + Add Reminder         │
├────────────────────────┤
│ [      Clear      ]    │
└────────────────────────┘
```

### Akcie:
- Today → `when_type = 'today'`
- This Evening → `when_type = 'today'` + evening flag (ak podporované)
- Kalendár dátum → `when_type = 'scheduled'`, `when_date = selected_date`
- Someday → `when_type = 'someday'`
- Clear → `when_type = 'inbox'`, `when_date = null`

---

## 4. Tags (🏷️)

### Ikona:
- Tag ikona vpravo v toolbare
- Ak task má tagy, zobraziť počet alebo bodku

### Dropdown po kliku:
```
┌────────────────────────┐
│ 🔍 Search/Create tag   │
├────────────────────────┤
│ ◇ BYT                  │
│ ◇ PRIORITA           > │
│ ◇ TAG                  │
│ ◇ AI                   │
│ ◆ Oftalmolog      ✓    │
│ ◇ TERAZ                │
│ ◇ TOTO                 │
└────────────────────────┘
```

### Funkcie:
- Input na vrchu pre vyhľadávanie existujúcich tagov
- Ak tag neexistuje, možnosť vytvoriť nový (Enter)
- Multi-select (viacero tagov naraz)
- Checkmark pri vybraných tagoch

---

## 5. Projekt/Oblast (📁)

### Ikona:
- Folder/List ikona vpravo v toolbare
- Nahradí Things 3 "Checklist" ikonu

### Dropdown po kliku:
```
┌────────────────────────┐
│ Projekt / Oblast       │
├────────────────────────┤
│ OBLASTI:               │
│   📁 Marketing         │
│   📁 Development       │
├────────────────────────┤
│ PROJEKTY:              │
│   📋 Q1 Launch         │
│   📋 Website Redesign  │
├────────────────────────┤
│ ✕ Bez projektu         │
└────────────────────────┘
```

### Funkcie:
- Zoznam oblastí (areas) a projektov
- Single-select
- Aktualizuje `project_id` alebo `area_id`
- Možnosť odstrániť priradenie ("Bez projektu")

---

## 6. Deadline (🚩)

### Ikona:
- Vlajka ikona vpravo v toolbare
- Ak task má deadline, zobraziť červenú farbu alebo dátum

### Dropdown po kliku:
```
┌────────────────────────────────┐
│ 🚩 Deadline                    │
├────────────────────────────────┤
│ Mon Tue Wed Thu Fri Sat Sun    │
│ 29  30  31  Jan  2   3   [4]   │
│  5   6   7   8   9  10  11     │
│ 12  13  14  15  16  17  18     │
│ 19  20  21  22  23  24  25     │
│ 26  27  28  29  30  31  Feb    │
├────────────────────────────────┤
│ [      Clear      ]            │
└────────────────────────────────┘
```

### Funkcie:
- Kalendár picker
- Aktualizuje `deadline` pole
- Clear button pre odstránenie deadline
- Vizuálne zvýraznenie ak je deadline v minulosti (overdue)

---

## 7. Zbalený task (normálny stav)

```
┌─────────────────────────────────────────────────────────────────┐
│ ☐ Task title                              ⭐ Today  🚩 Jan 10   │
└─────────────────────────────────────────────────────────────────┘
```

### Zobrazuje len:
- Checkbox
- Title
- When badge (malý, ak nastavený)
- Deadline badge (malý, ak nastavený)
- Prípadne tag indikátor (bodka alebo počet)

---

## 8. Súbory na vytvorenie/úpravu

### Nové súbory:
```
components/tasks/task-card-expanded.tsx    # Rozbalený stav tasku
components/tasks/inline-when-picker.tsx    # When dropdown
components/tasks/inline-tag-selector.tsx   # Tags dropdown
components/tasks/inline-project-selector.tsx # Projekt/Oblast dropdown
components/tasks/inline-deadline-picker.tsx  # Deadline kalendár
```

### Upraviť:
```
components/tasks/task-card.tsx             # Pridať expand/collapse logiku
components/tasks/task-list.tsx             # Spravovať ktorý task je rozbalený
```

---

## 9. Použité komponenty (shadcn/ui)

- `Popover` - pre všetky dropdown menu
- `Command` - pre vyhľadávanie v tagoch
- `Calendar` - pre When a Deadline pickery
- `Badge` - pre When a Deadline zobrazenie
- `Input` - pre inline editovanie title a notes
- `Textarea` - pre notes s auto-resize
- `Checkbox` - pre task completion

---

## 10. Hooky a state management

### Použiť existujúce:
- `useTasks` - CRUD operácie pre tasky
- `useProjects` - zoznam projektov
- `useAreas` - zoznam oblastí
- `useTags` / `useTaskTags` - tagy

### Nový state:
- `expandedTaskId` - ID práve rozbaleného tasku (null ak žiadny)
- Spravovať na úrovni `task-list.tsx` alebo cez context

---

## 11. Príkaz pre Claude Code

```
Prepracuj TaskCard komponent na inline rozbaľovací štýl podľa TASK-INLINE-UI-SPEC.md. 

Hlavné zmeny:
1. Dvojklik (desktop) / klik (mobile) rozbalí task inline - žiadny modal
2. Rozbalený task zobrazí: editovateľný title, notes, When picker, Tags, Projekt selector, Deadline picker
3. When picker ako chip vľavo s dropdown (Today/Evening/kalendár/Someday/Clear)
4. Tags dropdown s vyhľadávaním a možnosťou vytvoriť nový tag
5. Projekt/Oblast dropdown namiesto checklist ikony
6. Deadline s kalendár pickerom
7. Len jeden task rozbalený naraz
8. Escape alebo klik mimo zbalí task

Použi shadcn/ui: Popover, Command, Calendar, Badge, Input, Textarea.
Zachovaj existujúce hooky: useTasks, useProjects, useAreas, useTags.
```

---

## 12. Vizuálna referencia

### Things 3 rozbalený task:
- Biely box s jemným tieňom
- Title väčším fontom
- Notes šedou farbou pod title
- When badge žltý s ikonou hviezdičky
- Toolbar ikony vpravo (Tags, Checklist, Deadline)
- Metadáta (Area, Repeats) vpravo dole menším fontom

### ZITA TODO by mal mať podobný štýl s úpravami:
- Checklist ikona → Projekt/Oblast ikona
- Pridať podporu pre tímové funkcie (assignee) ak potrebné
