# ZITA TODO - Návrh používateľskej príručky

## Účel dokumentu

Tento dokument predstavuje štruktúrovaný návrh používateľskej príručky pre aplikáciu ZITA TODO. Príručka je určená pre členov tímu (~20 ľudí) a má za cieľ poskytnúť komplexný návod na efektívne používanie aplikácie.

---

## Navrhovaná štruktúra príručky

### ČASŤ 1: ÚVOD A PRVÉ KROKY

#### 1.1 Čo je ZITA TODO?
- Predstavenie aplikácie a jej hlavných výhod
- Pre koho je aplikácia určená
- Kľúčové funkcie v skratke:
  - Správa úloh v štýle Things 3
  - Kanban board pre projektový manažment
  - Sledovanie času (Toggl-style)
  - Tímová spolupráca

#### 1.2 Prihlásenie do aplikácie
- Ako sa prihlásiť (email + heslo)
- Prijatie pozvánky do organizácie
- Prvé prihlásenie a nastavenie profilu
- Čo robiť pri zabudnutom hesle

#### 1.3 Prehľad rozhrania
- **Screenshot celého rozhrania s popiskami:**
  - Ľavý sidebar (navigácia)
  - Hlavný obsah (stred)
  - Detail panel (pravá strana)
  - Horná lišta (vyhľadávanie, notifikácie, profil)

---

### ČASŤ 2: NAVIGÁCIA A ZOBRAZENIA

#### 2.1 Sidebar - Hlavná navigácia
Vysvetlenie každej položky v sidebar:

| Ikona | Názov | Popis | Kedy použiť |
|-------|-------|-------|-------------|
| 📥 | Inbox | Osobný inbox pre nové úlohy | Keď chceš rýchlo zapísať úlohu |
| 👥 | Tímový Inbox | Zdieľané úlohy pre celý tím | Pre tímové úlohy bez konkrétneho projektu |
| 📅 | Dnes | Úlohy naplánované na dnes | Ranný prehľad práce |
| 🔮 | Nadchádzajúce | Naplánované úlohy + deadliny | Plánovanie dopredu |
| ⏳ | Kedykoľvek | Úlohy bez konkrétneho termínu | Keď máš voľný čas |
| 💭 | Niekedy | Nápady a "možno" úlohy | Pre budúce nápady |
| 📚 | Logbook | Dokončené úlohy | Prehľad vykonanej práce |
| 🗑️ | Kôš | Vymazané úlohy | Obnovenie omylom zmazaných úloh |

#### 2.2 Oddelenia a Projekty
- Čo je oddelenie (Area) vs projekt
- Hierarchia: Oddelenie → Projekt → Úloha
- Ako sa orientovať v štruktúre

#### 2.3 Prepínanie zobrazení
- **List view** - Klasický zoznam úloh
- **Kanban view** - Tabule so stĺpcami (Backlog, Todo, In Progress, Review, Done)
- **Calendar view** - Kalendárové zobrazenie s úlohami

---

### ČASŤ 3: PRÁCA S ÚLOHAMI

#### 3.1 Vytvorenie novej úlohy
- Rýchle pridanie (klávesová skratka `N`)
- Pridanie do konkrétneho projektu
- Pridanie cez Tímový Inbox

#### 3.2 Anatómia úlohy - Čo všetko môže úloha obsahovať
- **Názov** - Stručný popis úlohy
- **Poznámky** - Detailnejší popis (podporuje Markdown)
- **Projekt** - Kam úloha patrí
- **Tagy** - Označenie kategórie (🏭 ZITA, 🏭 eyekido, atď.)
- **When (Kedy)** - Today, Anytime, Someday, Scheduled
- **Deadline** - Tvrdý termín dokončenia
- **Priradenie** - Komu je úloha pridelená
- **Priorita** - Low, Medium, High, Urgent
- **Checklist** - Podúlohy s checkboxmi

#### 3.3 Organizácia úloh
- Presúvanie medzi projektmi
- Zmena "When" statusu
- Práca s drag & drop
- Hromadné akcie

#### 3.4 Dokončenie a mazanie úloh
- Označenie úlohy ako dokončenej
- Zmazanie úlohy (soft delete → Kôš)
- Obnovenie z koša
- Trvalé vymazanie

---

### ČASŤ 4: SLEDOVANIE ČASU (TIME TRACKING)

#### 4.1 Základy sledovania času
- Prečo sledovať čas
- Kde sa zobrazuje trackovaný čas

#### 4.2 Spustenie a zastavenie časovača
- Play/Pause tlačidlo pri úlohe
- Klávesová skratka `Cmd/Ctrl + T`
- Globálny indikátor behu časovača v headeri
- Pravidlo: Len 1 aktívny časovač naraz

#### 4.3 Časovač Dashboard (/time)
- **Filtre:**
  - Časové obdobie (Dnes, Týždeň, Mesiac, Rok, Vlastné)
  - Podľa oddelenia, projektu, používateľa, tagu
- **Grafy:**
  - Čas podľa dní (stĺpcový graf)
  - Čas podľa kategórie (koláčový graf s toggle funkcionalitou)
- **Tabuľka záznamov:**
  - Súhrnný vs detailný pohľad
  - Export do CSV

#### 4.4 Interpretácia dát
- Ako čítať grafy
- Čo znamenajú jednotlivé metriky
- Tipy na efektívne využitie dát

---

### ČASŤ 5: KANBAN BOARD

#### 5.1 Princíp Kanban
- Čo je Kanban a prečo ho používame
- Workflow: Backlog → Todo → In Progress → Review → Done

#### 5.2 Práca s Kanban boardom
- Presúvanie kariet medzi stĺpcami (drag & drop)
- Čo sa deje pri presune do "Done" (auto-complete)
- Farebné kódovanie priorít

#### 5.3 Kanban v projektoch vs oddeleniach
- Kedy použiť Kanban na úrovni projektu
- Kedy použiť Kanban na úrovni oddelenia

---

### ČASŤ 6: TÍMOVÁ SPOLUPRÁCA

#### 6.1 Tímový Inbox
- Ako funguje tímový inbox
- Kto vidí úlohy v tímovom inboxe
- Prevzatie úlohy z tímového inboxu

#### 6.2 Priraďovanie úloh
- Ako priradiť úlohu kolegovi
- Notifikácie pri priradení
- Sledovanie úloh priradených tebe

#### 6.3 Zdieľané projekty a oddelenia
- Prístupové práva (Owner, Editor, Viewer)
- Spolupráca na projektoch

#### 6.4 Slack integrácia
- Vytváranie úloh zo Slack správ
- Emoji reakcie pre zmenu statusu
- Notifikácie o deadlinoch

---

### ČASŤ 7: KALENDÁR A PLÁNOVANIE

#### 7.1 Kalendárové zobrazenie
- Mesačný pohľad
- Týždenný pohľad
- Zobrazenie úloh s termínom

#### 7.2 Time Blocking (Plánovanie času)
- Čo je time blocking
- Drag & drop úloh na časovú mriežku
- Panel nenaplánovaných úloh
- Konflikty s Google Calendar

#### 7.3 Google Calendar integrácia
- Pripojenie Google účtu
- Zobrazenie Google eventov v kalendári
- Ako sa vyhnúť konfliktom

---

### ČASŤ 8: VYHĽADÁVANIE A FILTRE

#### 8.1 Globálne vyhľadávanie
- Klávesová skratka `/`
- Čo všetko sa vyhľadáva (úlohy, projekty, oblasti)

#### 8.2 Filtrovanie úloh
- Filter podľa statusu
- Filter podľa assignee
- Filter podľa deadline
- Filter podľa priority
- Filter podľa tagov
- Kombinácia filtrov

---

### ČASŤ 9: KLÁVESOVÉ SKRATKY

#### 9.1 Navigácia
| Skratka | Akcia |
|---------|-------|
| `I` | Inbox |
| `Y` | Dnes (Today) |
| `U` | Nadchádzajúce (Upcoming) |
| `A` | Kedykoľvek (Anytime) |
| `S` | Niekedy (Someday) |
| `L` | Logbook |
| `C` | Kalendár |
| `T` | Tímový Inbox |

#### 9.2 Akcie
| Skratka | Akcia |
|---------|-------|
| `N` | Nová úloha |
| `/` | Vyhľadávanie |
| `D` | Prepnúť dark mode |
| `Cmd/Ctrl + T` | Prepnúť časovač |
| `Backspace/Delete` | Vymazať úlohu |
| `Shift + ?` | Zobraziť skratky |
| `Escape` | Zavrieť modal |

---

### ČASŤ 10: NASTAVENIA

#### 10.1 Profil používateľa
- Zmena mena a prezývky
- Nastavenie avataru
- Zmena hesla

#### 10.2 Vzhľad aplikácie
- Light mode vs Dark mode
- Farebné témy

#### 10.3 Integrácie
- Slack pripojenie
- Google Calendar pripojenie
- Email notifikácie

#### 10.4 Správa používateľov (len Admin)
- Pozvanie nových členov
- Správa rolí a oddelení
- Deaktivácia používateľov

---

### ČASŤ 11: TIPY A BEST PRACTICES

#### 11.1 Denná rutina s ZITA TODO
1. Ráno: Skontroluj "Dnes" view
2. Počas dňa: Sleduj čas pri práci na úlohách
3. Večer: Prezri "Nadchádzajúce" a naplánuj zajtra

#### 11.2 Efektívne používanie tagov
- Konzistentné pomenovanie
- Farebné kódovanie
- Kedy použiť tag vs projekt

#### 11.3 Time tracking tipy
- Sleduj čas pri každej väčšej úlohe
- Používaj popisy pre kontext
- Pravidelne kontroluj štatistiky

#### 11.4 Tímová etiketa
- Jasné názvy úloh
- Pridávanie poznámok a kontextu
- Včasné aktualizovanie statusov

---

### PRÍLOHY

#### A. Slovník pojmov
- Area (Oddelenie)
- Project (Projekt)
- Task (Úloha)
- When (Kedy) - Today, Anytime, Someday, Scheduled
- Deadline
- Time Entry
- Kanban
- Tag

#### B. FAQ - Často kladené otázky
- Čo robiť keď sa zasekne časovač?
- Ako obnoviť zmazanú úlohu?
- Prečo nevidím úlohy kolegu?
- Ako exportovať časové záznamy?

#### C. Kontakt a podpora
- Kam nahlásiť problém
- Koho kontaktovať pre pomoc

---

## Odporúčaný formát príručky

### Verzia pre tlač (PDF)
- Formát A4
- Profesionálny dizajn s logom ZITA
- Screenshoty s anotáciami
- Tlačiteľné quick reference karty

### Online verzia
- Interaktívny web s vyhľadávaním
- Video tutoriály pre kľúčové funkcie
- Aktualizovaná pri každej novej verzii

### Quick Start Guide (1-2 strany)
- Úplné minimum pre okamžitý štart
- Top 5 vecí, ktoré potrebuješ vedieť
- QR kód na plnú verziu príručky

---

## Časový odhad spracovania

| Časť | Odhadovaný čas |
|------|----------------|
| Text a štruktúra | 8-10 hodín |
| Screenshoty a anotácie | 4-6 hodín |
| Dizajn a formátovanie | 4-6 hodín |
| Video tutoriály (voliteľné) | 10-15 hodín |
| Revízia a korektúry | 2-3 hodiny |

**Celkom:** cca 20-25 hodín (bez videí)

---

## Poznámky k implementácii

1. **Screenshoty** - Odporúčam používať aktuálnu verziu aplikácie s reálnymi (ale anonymizovanými) dátami
2. **Aktualizácie** - Príručka by mala byť aktualizovaná pri každej významnej zmene (major version)
3. **Jazyk** - Slovenčina, prípadne aj anglická verzia pre medzinárodných kolegov
4. **Dostupnosť** - Odporúčam umiestniť príručku do aplikácie (link v Settings alebo Help)

---

*Dokument vytvorený: 22. januára 2026*
*Verzia aplikácie: 2.43*
