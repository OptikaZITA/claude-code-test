# ZADANIE 4A: Interaktívny výber položiek v grafe Časovača

## Kontext

V Časovači (`/time`) je pie chart "Čas podľa" s možnosťou prepnúť na Používateľ/Oddelenie/Projekt. Pod grafom je zoznam položiek s časmi a percentami.

Chceme pridať možnosť **interaktívne zapínať/vypínať položky** v tomto zozname, aby si používateľ mohol vybrať ktoré položky chce vidieť v grafe.

---

## Požiadavka

Pridať možnosť kliknutím zapínať/vypínať položky v zozname pod pie chartom.

---

## Ako to má fungovať

1. **Klik na položku v zozname** → toggle (zapne/vypne)
2. **Zapnutá položka** → farebná, zobrazená v grafe
3. **Vypnutá položka** → šedá, NIE v grafe
4. **Percentá sa prepočítajú** → vždy 100% z CHECKED položiek
5. **Celkový čas v strede grafu** → súčet len CHECKED položiek
6. **Default stav** → všetky zapnuté (ako teraz)

---

## Príklad použitia

### Všetky zapnuté (default)
```
PIE CHART: [Facility 15%] [Financie 6%] [Inovácie 16%] [...]

☑ ● Bez oddelenia    9h 53m   16%
☑ ● Facility         9h 4m    15%
☑ ● Financie         3h 21m    6%
☑ ● HR               4h 13m    7%
☑ ● Inovácie         9h 33m   16%
☑ ● Marketing        2h 54m    5%
☑ ● Newbiz           6h 30m   11%
☑ ● Prevádzka        7h 36m   13%
☑ ● Rámy             6h 55m   12%
                    ─────────────
Celkom v grafe:     60h 2m   100%
```

### Vypnem všetko okrem Facility a Financie
```
PIE CHART: [Facility 73%] [Financie 27%]  ← PREPOČÍTANÉ!

☑ ● Facility         9h 4m    73%  ← prepočítané
☑ ● Financie         3h 21m   27%  ← prepočítané
☐ ○ Bez oddelenia    9h 53m    -   ← šedé, mimo grafu
☐ ○ HR               4h 13m    -   ← šedé, mimo grafu
☐ ○ Inovácie         9h 33m    -   ← šedé, mimo grafu
☐ ○ Marketing        2h 54m    -   ← šedé, mimo grafu
☐ ○ Newbiz           6h 30m    -   ← šedé, mimo grafu
☐ ○ Prevádzka        7h 36m    -   ← šedé, mimo grafu
☐ ○ Rámy             6h 55m    -   ← šedé, mimo grafu
                    ─────────────
Celkom v grafe:     12h 25m  100%
```

---

## Vizuál

### Zapnutá položka
- Farebná bodka (ako teraz)
- Normálny text
- Čas + percento

### Vypnutá položka
- Šedá bodka
- Šedý text (`text-muted-foreground`)
- Čas bez percenta (alebo "-" namiesto percenta)
- Položka zostáva v zozname (nezmizne), len zošedne

### Interakcia
- Kliknuteľný celý riadok (nie len checkbox)
- Hover efekt na riadku
- Graf sa plynulo prekreslí (bez animácie alebo s jemnou)

---

## Technická implementácia

### State
```tsx
const [visibleItems, setVisibleItems] = useState<Set<string>>(
  new Set(allItems.map(item => item.id)) // default: všetky
);

const toggleItem = (itemId: string) => {
  setVisibleItems(prev => {
    const next = new Set(prev);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    return next;
  });
};
```

### Prepočet percent
```tsx
const visibleData = data.filter(item => visibleItems.has(item.id));
const visibleTotal = visibleData.reduce((sum, item) => sum + item.seconds, 0);

const dataWithPercentages = visibleData.map(item => ({
  ...item,
  percentage: (item.seconds / visibleTotal) * 100
}));
```

### Graf
```tsx
<PieChart>
  <Pie data={dataWithPercentages}> {/* len VISIBLE položky */}
    {dataWithPercentages.map(item => (
      <Cell key={item.id} fill={item.color} />
    ))}
  </Pie>
</PieChart>
```

---

## Use Case: Jolo a porovnanie firiem

Jolo má tasky s tagmi `🏭 ZITA`, `🏭 eyekido`, `🏭 Zita/eyekido`.

1. Prepne "Čas podľa" na **Tag**
2. Vidí všetky tagy (firmy + kompetencie + priority...)
3. **Odklikne** všetky okrem firemných tagov
4. Graf ukazuje len `🏭 ZITA` vs `🏭 eyekido` vs `🏭 Zita/eyekido`
5. Percentá sú prepočítané - vidí presné porovnanie firiem

---

## Súbory na úpravu

- `components/time-tracking/time-dashboard.tsx` alebo podobné
- Komponenta ktorá renderuje pie chart a zoznam pod ním
- Pravdepodobne využíva Recharts (`<PieChart>`, `<Pie>`, `<Cell>`)

---

## Edge cases

- Ak používateľ vypne VŠETKY položky → zobraziť prázdny graf alebo message "Vyberte aspoň jednu položku"
- Pri zmene "Čas podľa" (Používateľ → Oddelenie) → resetovať výber na všetky zapnuté
- Pri zmene filtrov v hlavičke → resetovať výber na všetky zapnuté

---

*Vytvorené: 22. január 2026*
