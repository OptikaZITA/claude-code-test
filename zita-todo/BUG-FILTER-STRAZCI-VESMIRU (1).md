# BUG/VYLEPŠENIE: Filter "Strážci vesmíru" - oprava logiky a vizuálu

## Popis problému

1. **Filter nefunguje** - výber používateľa nefiltruje úlohy
2. **Tlačidlo je vždy modré** - aj keď nie je aktívna žiadna filtrácia
3. **Zbytočná možnosť "Všetci"** - to je default stav, nepotrebujeme ho v dropdown

---

## Požadované správanie

### Vizuálny stav tlačidla

| Stav | Vzhľad tlačidla |
|------|-----------------|
| **Nič nevybraté** (default) | Sivé tlačidlo "Strážci vesmíru" |
| **Vybraný konkrétny človek** | Modré tlačidlo "Dano ✕" |
| **Vybraté Nepriradené** | Modré tlačidlo "Nepriradené ✕" |

### Dropdown obsah

```
┌─────────────────────────────────┐
│ 👤 Dano                    (18) │
│ 👤 Katka                   (5)  │
│ 👤 Jozef                   (3)  │
│ ─────────────────────────────── │
│ 👤 Nepriradené             (5)  │
└─────────────────────────────────┘
```

**BEZ možnosti "Všetci"** - to je default stav, nie je potrebné ho vyberať.

### Zrušenie filtra

- Keď je filter aktívny (modrý), zobrazuje sa **✕** pri mene
- Klik na **✕** zruší filter → vráti sa na default (všetky úlohy, sivé tlačidlo)

---

## Príklady

### Default stav (žiadna filtrácia)
```
[ Strážci vesmíru ▼ ]  ← sivé, ako ostatné neaktívne filtre
```

### Po výbere používateľa
```
[ Dano ✕ ]  ← modré, aktívny filter
```

### Po výbere Nepriradené
```
[ Nepriradené ✕ ]  ← modré, aktívny filter
```

### Po kliknutí na ✕
```
[ Strážci vesmíru ▼ ]  ← späť na sivé, žiadna filtrácia
```

---

## Čo treba opraviť

1. **Odstrániť možnosť "Všetci"** z dropdown menu
2. **Opraviť vizuálny stav** - sivé keď nič nevybraté, modré keď filter aktívny
3. **Opraviť filtráciu** - výber používateľa musí skutočne filtrovať úlohy
4. **Pridať ✕ pre zrušenie** - keď je filter aktívny, zobraziť ✕ na zrušenie
5. **Zmeniť text tlačidla** - keď aktívny, zobraziť meno namiesto "Strážci vesmíru"

---

## Platí pre všetky zobrazenia

- ✅ List view
- ✅ Kanban view  
- ✅ Calendar view (Mesiac, Týždeň, Plánovanie)

---

## Technické poznámky

Skontrolovať:
- Komponent pre filter (pravdepodobne v `components/filters/` alebo `components/ui/`)
- State management pre assignee filter
- Query/fetch logiku - či sa `assignee_id` správne posiela
- Porovnať s inými filtrami (Status, Priorita) ktoré fungujú správne

---

*Vytvorené: 18. január 2026*
