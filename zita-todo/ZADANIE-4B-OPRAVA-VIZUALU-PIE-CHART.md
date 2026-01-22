# ZADANIE 4B: Oprava vizuálu pie chartu v Časovači

## Kontext

Pie chart "Čas podľa" v Časovači má vizuálne problémy - je chaotický, text prekrýva graf, layout sa rozťahuje.

---

## Aktuálne problémy

1. **Graf je rozdelený chaoticky** - segmenty idú hore aj dole nekonzistentne
2. **Text "60h 2m celkovo" prekrýva segmenty** - je v strede ale segmenty ho prekrývajú
3. **Legenda je oddelená od grafu** - napravo, neprehľadné
4. **Layout sa rozťahuje** - celé okno sa natiahne a rozbíja obrazovku
5. **Font ide cez graf** - texty sa prekrývajú so segmentami
6. **Polkruh vs celý kruh** - niekedy sa zobrazuje ako polkruh

---

## Požadovaný výsledok

### Čistý, kompaktný dizajn

```
┌─────────────────────────────────────┐
│           Čas podľa                 │
│     [Oddelenie ▼]      [◐] [▥]     │
│                                     │
│         ┌─────────────┐             │
│        /   ████████    \            │
│       │   ██████████    │           │
│       │    60h 2m       │           │
│       │    celkovo      │           │
│       │   ██████████    │           │
│        \   ████████    /            │
│         └─────────────┘             │
│                                     │
│  ☑ ● Facility      9h 4m     15%   │
│  ☑ ● Financie      3h 21m     6%   │
│  ☑ ● Inovácie      9h 33m    16%   │
│  ☑ ● ...                            │
└─────────────────────────────────────┘
```

### Pravidlá

1. **Donut chart** (nie pie) - s dierou v strede pre text
2. **Text v strede** - celkový čas, neprekrýva segmenty
3. **Legenda POD grafom** - integrovaná so zoznamom (checkboxy zo Zadania 4A)
4. **Fixná veľkosť** - graf má max šírku/výšku, nerozťahuje sa
5. **Celý kruh** - nie polkruh, konzistentný tvar

---

## Špecifikácia dizajnu

### Rozmery
- Graf: max 200x200px (alebo responsívne s max-width)
- Vnútorný radius (diera): 60% vonkajšieho
- Padding okolo grafu: 16px

### Farby
- Použiť existujúce farby pre segmenty
- Text v strede: `text-foreground` (hlavný), `text-muted-foreground` (label "celkovo")

### Text v strede
```
60h 2m      ← väčší font, bold
celkovo     ← menší font, muted
```

### Legenda/Zoznam
- Pod grafom, nie vedľa
- Kompaktné riadky
- Checkbox + farebná bodka + názov + čas + percento
- Scrollovateľné ak je veľa položiek (max-height)

---

## Technická implementácia

### Recharts Donut Chart
```tsx
<PieChart width={200} height={200}>
  <Pie
    data={data}
    innerRadius={60}      // Diera v strede
    outerRadius={80}
    paddingAngle={2}      // Medzera medzi segmentami
    dataKey="value"
  >
    {data.map((entry, index) => (
      <Cell key={index} fill={entry.color} stroke="none" />
    ))}
  </Pie>
</PieChart>

{/* Text v strede - absolútne pozicovaný */}
<div className="absolute inset-0 flex flex-col items-center justify-center">
  <span className="text-2xl font-bold">60h 2m</span>
  <span className="text-sm text-muted-foreground">celkovo</span>
</div>
```

### Container
```tsx
<div className="flex flex-col items-center">
  {/* Graf wrapper - fixná veľkosť */}
  <div className="relative w-[200px] h-[200px]">
    <PieChart ... />
    <CenterText ... />
  </div>
  
  {/* Legenda/zoznam - pod grafom */}
  <div className="w-full mt-4 max-h-[200px] overflow-y-auto">
    {items.map(item => (
      <LegendRow key={item.id} ... />
    ))}
  </div>
</div>
```

---

## Pred vs Po

### PRED (aktuálny stav)
- Chaotický polkruh
- Text prekrytý segmentami
- Legenda napravo
- Rozťahuje sa

### PO (požadovaný stav)
- Čistý donut chart
- Text v strede dierky
- Legenda pod grafom (s checkboxami)
- Fixná veľkosť, kompaktné

---

## Súbory na úpravu

- `components/time-tracking/time-dashboard.tsx`
- Alebo komponenta pre pie chart sekciu
- CSS/Tailwind pre layout

---

## Poznámky

- Toto zadanie nadväzuje na ZADANIE 4A (interaktívny výber)
- Legenda sa spojí s checkboxami zo Zadania 4A
- Môže byť potrebné upraviť aj bar chart view (prepínač ◐/▥)

---

*Vytvorené: 22. január 2026*
