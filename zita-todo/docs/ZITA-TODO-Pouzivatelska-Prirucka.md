# ZITA TODO
## Používateľská príručka

**Verzia:** 2.44  
**Dátum:** 3. februára 2026

---

# Obsah

1. [Úvod](#1-úvod)
2. [Prihlásenie a účet](#2-prihlásenie-a-účet)
3. [Prehľad rozhrania](#3-prehľad-rozhrania)
4. [Navigácia - Sidebar](#4-navigácia---sidebar)
5. [Práca s úlohami](#5-práca-s-úlohami)
6. [Oddelenia a projekty](#6-oddelenia-a-projekty)
7. [Sledovanie času](#7-sledovanie-času)
8. [Kalendár a plánovanie](#8-kalendár-a-plánovanie)
9. [Filtrovanie a vyhľadávanie](#9-filtrovanie-a-vyhľadávanie)
10. [Klávesové skratky](#10-klávesové-skratky)
11. [Nastavenia](#11-nastavenia)
12. [Mobilná verzia](#12-mobilná-verzia)

---

# 1. Úvod

## Čo je ZITA TODO?

ZITA TODO je tímová produktivita aplikácia navrhnutá pre efektívnu správu úloh, projektov a času. Kombinuje najlepšie vlastnosti aplikácií ako Things 3 a Toggl:

- ✅ **Správa úloh** s flexibilným workflow
- 📁 **Organizácia** do oddelení a projektov
- ⏱️ **Sledovanie času** v štýle Toggl
- 📊 **Kanban zobrazenie** pre vizuálny prehľad
- 👥 **Tímová spolupráca** s priradovaním úloh
- 🔗 **Slack integrácia** pre automatické vytváranie úloh

## Štruktúra dát

```
┌─────────────────────────────────────────┐
│              ORGANIZÁCIA                │
├─────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    │
│  │  ODDELENIE  │    │  ODDELENIE  │    │
│  │   (Area)    │    │   (Area)    │    │
│  ├─────────────┤    ├─────────────┤    │
│  │  📁 Projekt │    │  📁 Projekt │    │
│  │    └ Úloha  │    │    └ Úloha  │    │
│  │    └ Úloha  │    │  📁 Projekt │    │
│  │  📁 Projekt │    │    └ Úloha  │    │
│  └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────┘
```

**Hierarchia:** Organizácia → Oddelenie → Projekt → Úloha

---

# 2. Prihlásenie a účet

## 2.1 Prihlásenie

1. Otvorte aplikáciu na adrese vašej organizácie
2. Zadajte **email** a **heslo**
3. Kliknite na **"Prihlásiť sa"**

```
┌──────────────────────────────────┐
│         ZITA TODO                │
│   Prihláste sa do svojho účtu    │
│                                  │
│  Email:                          │
│  ┌────────────────────────────┐  │
│  │ vas@email.sk               │  │
│  └────────────────────────────┘  │
│                                  │
│  Heslo:                          │
│  ┌────────────────────────────┐  │
│  │ ••••••••              👁   │  │
│  └────────────────────────────┘  │
│                                  │
│         Zabudnuté heslo?         │ ← Kliknite pre obnovenie
│                                  │
│  ┌────────────────────────────┐  │
│  │      Prihlásiť sa          │  │
│  └────────────────────────────┘  │
│                                  │
│  Máte pozvánku? Prijať pozvánku  │
└──────────────────────────────────┘
```

## 2.2 Obnovenie hesla

Ak ste zabudli heslo:

1. Na prihlasovacej stránke kliknite **"Zabudnuté heslo?"**
2. Zadajte svoj **email**
3. Kliknite **"Odoslať odkaz na obnovenie"**
4. Skontrolujte emailovú schránku
5. Kliknite na odkaz v emaile
6. Zadajte **nové heslo** (min. 6 znakov)
7. Potvrďte heslo a kliknite **"Zmeniť heslo"**

## 2.3 Prijatie pozvánky

Ak ste dostali pozvánku do organizácie:

1. Kliknite na odkaz v pozvánke
2. Vyplňte požadované údaje (meno, heslo)
3. Kliknite **"Vytvoriť účet"**

---

# 3. Prehľad rozhrania

## Hlavné časti obrazovky

```
┌─────────┬────────────────────────────────────────────────┐
│         │  📋 Dnes              🔍  ☀️/🌙  👤           │ ← Header
│ SIDEBAR │─────────────────────────────────────────────────│
│         │  [Status ▼] [Osoba ▼] [Deadline ▼] [Tagy ▼]    │ ← Filtre
│ 📥 Inbox│─────────────────────────────────────────────────│
│ 📅 Dnes │                                                 │
│ 🔮 Nadch│  ☐ Pripraviť prezentáciu          ▶️  📅 Dnes  │
│ ⏳ Kedyk│  ☐ Odpovedať na emaily            ▶️           │
│ 📁 Oddel│  ☐ Meeting s klientom             ▶️  📅 Zajtra│
│   └ Proj│                                                 │
│ ⚙️ Nast │                                    [+ Úloha]    │
│         │                                                 │
└─────────┴────────────────────────────────────────────────┘
     ↑                        ↑                       ↑
  Navigácia             Zoznam úloh              Hlavná oblasť
```

### Časti rozhrania:

| Časť | Popis |
|------|-------|
| **Header** | Názov aktuálnej stránky, vyhľadávanie, prepínač režimu, profil |
| **Sidebar** | Navigácia medzi zobrazeniami a oddeleniami |
| **Filtre** | Dropdown menu pre filtrovanie úloh |
| **Hlavná oblasť** | Zoznam úloh, Kanban tabuľa alebo kalendár |

---

# 4. Navigácia - Sidebar

Sidebar (bočný panel) je váš hlavný nástroj pre navigáciu v aplikácii.

## Štruktúra sidebaru

```
┌────────────────────────────┐
│  📥 Inbox           [12]   │ ← Osobné úlohy na spracovanie
│  👥 Tímový inbox     [5]   │ ← Tímové úlohy
│────────────────────────────│
│  📅 Dnes            [🔴3]  │ ← Úlohy na dnes + po termíne
│  🔮 Nadchádzajúce    [8]   │ ← Naplánované úlohy
│  ⏳ Kedykoľvek      [15]   │ ← Úlohy bez termínu
│  💭 Niekedy          [4]   │ ← Úlohy "niekedy v budúcnosti"
│  📚 Logbook               │ ← Dokončené úlohy
│  🗑️ Kôš                    │ ← Vymazané úlohy
│────────────────────────────│
│  📁 Oddelenia             │
│    ▼ 💼 Marketing         │ ← Klik = rozbalenie
│        📁 Kampaň Q1       │ ← Projekt v oddelení
│        📁 Social media    │
│    ▶ 🛠️ Vývoj             │ ← Zrolované oddelenie
│────────────────────────────│
│  ⚙️ Nastavenia            │
└────────────────────────────┘
```

## Popis jednotlivých sekcií

### 📥 Inbox (Osobný)
Vaše osobné úlohy, ktoré ešte nie sú zaradené do projektu. Sem padajú nové úlohy, ktoré si potrebujete spracovať.

### 👥 Tímový inbox
Úlohy vytvorené pre celý tím alebo zo Slack integrácie. Môžete si ich priradiť alebo delegovať.

### 📅 Dnes
- Úlohy označené ako "Dnes"
- Úlohy s deadline dnes
- **Úlohy po termíne** (červená badge)

### 🔮 Nadchádzajúce
Úlohy naplánované na konkrétny budúci dátum.

### ⏳ Kedykoľvek
Úlohy bez konkrétneho termínu, ktoré môžete spraviť kedykoľvek.

### 💭 Niekedy
Úlohy "na neskôr" - nápady a plány bez urgentnosti.

### 📚 Logbook
História dokončených úloh zoradená podľa dátumu dokončenia.

### 🗑️ Kôš
Vymazané úlohy a projekty. Môžete ich obnoviť alebo natrvalo odstrániť.

---

# 5. Práca s úlohami

## 5.1 Vytvorenie novej úlohy

### Spôsob 1: Rýchle pridanie
1. Kliknite na tlačidlo **[+ Pridať úlohu]** alebo **⊕**
2. Napíšte názov úlohy
3. Stlačte **Enter**

### Spôsob 2: Klávesová skratka
1. Stlačte klávesu **N**
2. Otvorí sa formulár pre novú úlohu

### Spôsob 3: V projekte
V detaile projektu kliknite na malý **⊕** button vedľa názvu projektu.

## 5.2 Úprava úlohy

Kliknite na úlohu pre otvorenie detailu:

```
┌─────────────────────────────────────────┐
│ ☐ Názov úlohy                       [×] │
├─────────────────────────────────────────┤
│ 📝 Poznámky                             │
│ ┌─────────────────────────────────────┐ │
│ │ Tu môžete písať poznámky...         │ │
│ │ Podporuje markdown formátovanie.    │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 📁 Projekt:    [Vyberte projekt ▼]      │
│ 🏷️ Tagy:       [marketing] [+]          │
├─────────────────────────────────────────┤
│ 📅 Kedy:       [Dnes ▼]                 │
│ 🎯 Deadline:   [15. feb 2026]           │
│ 🔄 Opakovanie: [Žiadne ▼]               │
├─────────────────────────────────────────┤
│ 👤 Priradené:  [Ján Novák ▼]            │
│ 🚦 Priorita:   [Vysoká ▼]               │
│ 📊 Status:     [In Progress ▼]          │
├─────────────────────────────────────────┤
│ ✅ Checklist                            │
│    ☑ Krok 1 - hotový                    │
│    ☐ Krok 2 - čaká                      │
│    [+ Pridať položku]                   │
├─────────────────────────────────────────┤
│ ⏱️ Čas: 2h 30m          [▶️ Štart]      │
└─────────────────────────────────────────┘
```

## 5.3 Atribúty úlohy

| Atribút | Ikona | Popis |
|---------|-------|-------|
| **Projekt** | 📁 | Zaradenie do projektu |
| **Tagy** | 🏷️ | Farebné štítky pre kategorizáciu |
| **Kedy** | 📅 | Dnes / Kedykoľvek / Niekedy / Naplánované |
| **Deadline** | 🎯 | Tvrdý termín dokončenia |
| **Opakovanie** | 🔄 | Automatické opakovanie (denne, týždenne...) |
| **Priradené** | 👤 | Kto je zodpovedný za úlohu |
| **Priorita** | 🚦 | Nízka / Stredná / Vysoká / Urgentná |
| **Status** | 📊 | Backlog / Todo / In Progress / Review / Done |
| **Checklist** | ✅ | Podúlohy v rámci úlohy |

## 5.4 Hodnoty "Kedy"

| Hodnota | Ikona | Kedy použiť |
|---------|-------|-------------|
| **Inbox** | 📥 | Nové úlohy na spracovanie |
| **Dnes** | 📅 | Úlohy, ktoré chcete spraviť dnes |
| **Kedykoľvek** | ⏳ | Bez konkrétneho termínu |
| **Niekedy** | 💭 | Nápady na budúcnosť |
| **Naplánované** | 🔮 | Na konkrétny budúci dátum |

## 5.5 Statusy (Kanban stĺpce)

| Status | Farba | Význam |
|--------|-------|--------|
| **Backlog** | ⚪ Sivá | Čaká na spracovanie |
| **Todo** | 🔵 Modrá | Pripravené na prácu |
| **In Progress** | 🟠 Oranžová | Práve sa na tom pracuje |
| **Review** | 🟣 Fialová | Čaká na kontrolu |
| **Done** | 🟢 Zelená | Dokončené |

## 5.6 Dokončenie úlohy

1. Kliknite na **checkbox** ☐ vedľa názvu úlohy
2. Úloha sa označí ako dokončená ✅
3. Presunie sa do **Logbook**

**Poznámka:** Pri dokončení úlohy bez sledovaného času sa zobrazí dialóg pre rýchle zadanie času.

## 5.7 Vymazanie úlohy

- **Desktop:** Stlačte **Delete** alebo **Backspace** keď je úloha rozbalená
- **Mobile:** Potiahnite úlohu doľava (swipe)
- **Drag & drop:** Pretiahnite úlohu do 🗑️ Kôš v sidebar

Vymazané úlohy sa presunú do Koša, odkiaľ ich môžete obnoviť.

## 5.8 Hromadné akcie (Mobile/Tablet)

Pri označení viacerých úloh sa zobrazí spodný panel s akciami:

```
┌────────────────────────────────────────────────────┐
│ 3 označené [×] │ ✓Hotovo │ ⭐Dnes │ 📊 │ 👤 │ 📅 │ 🗑️ │
└────────────────────────────────────────────────────┘
```

**Klávesové skratky pre hromadné akcie (Desktop):**
- **D** - Označiť ako hotové
- **T** - Pridať do Dnes
- **1-5** - Zmeniť status
- **A** - Priradiť osobe
- **L** - Nastaviť deadline

---

# 6. Oddelenia a projekty

## 6.1 Štruktúra

```
📁 Oddelenie (Area)
 ├── 📁 Projekt 1
 │    ├── ☐ Úloha A
 │    └── ☐ Úloha B
 ├── 📁 Projekt 2
 │    └── ☐ Úloha C
 └── ☐ Voľná úloha (bez projektu)
```

## 6.2 Oddelenia (Areas)

Oddelenia reprezentujú hlavné oblasti vašej práce (napr. Marketing, Vývoj, HR).

### Zobrazenie oddelenia
1. V sidebar kliknite na oddelenie
2. Zobrazia sa všetky **projekty** a **voľné úlohy**
3. Prázdne projekty sú automaticky **zrolované**

### Funkcie v oddelení:
- **Prepínanie zobrazenia:** 📋 List / 📊 Kanban / 📅 Kalendár
- **Drag & drop projektov:** Preusporiadajte poradie projektov
- **Filtrovanie:** Rovnaké filtre ako v ostatných zobrazeniach

## 6.3 Projekty

Projekty zoskupujú súvisiace úlohy v rámci oddelenia.

### Vytvorenie projektu
1. V oddelení kliknite **[+ Pridať projekt]**
2. Zadajte **názov**
3. Voliteľne nastavte **deadline** a **farbu**
4. Kliknite **Vytvoriť**

### Detail projektu

```
┌──────────────────────────────────────────────────────┐
│  📁 Optimalizácia procesov • 4/7 (57%) ⊕        🗑️  │
│  📅 Deadline: 31.1.2026                              │
├──────────────────────────────────────────────────────┤
│  [📋 List] [📊 Kanban] [📅 Kalendár]                 │
├──────────────────────────────────────────────────────┤
│  ☐ Analýza súčasného stavu         ▶️  📅 Dnes     │
│  ☐ Návrh vylepšení                 ▶️              │
│  ☑ Schválenie rozpočtu             ✓               │
│  ☑ Kick-off meeting                ✓               │
└──────────────────────────────────────────────────────┘
```

### Inline editácia v projekte

- **Klik na názov:** Zmena názvu projektu
- **Klik na deadline:** Zmena alebo pridanie deadline
- **⊕ button:** Rýchle pridanie úlohy
- **🗑️ button:** Vymazanie projektu

### Progress projektu

V hlavičke projektu vidíte:
- **4/7** = 4 dokončené zo 7 celkovo
- **(57%)** = percentuálny postup

## 6.4 Kanban zobrazenie

Prepnite na Kanban kliknutím na 📊 ikonu:

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ BACKLOG  │   TODO   │IN PROGRES│  REVIEW  │   DONE   │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │          │ ┌──────┐ │
│ │Úloha1│ │ │Úloha2│ │ │Úloha3│ │          │ │Úloha4│ │
│ │⏱️ 2h │ │ │📅 Pon│ │ │👤 JN │ │          │ │✓     │ │
│ └──────┘ │ └──────┘ │ └──────┘ │          │ └──────┘ │
│ ┌──────┐ │          │          │          │          │
│ │Úloha5│ │          │          │          │          │
│ └──────┘ │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

**Funkcie:**
- **Drag & drop** kartičiek medzi stĺpcami
- **Klik** na kartičku = otvorenie detailu
- Automatická zmena **statusu** pri presune

---

# 7. Sledovanie času

## 7.1 Spustenie časovača

### Spôsob 1: V zozname úloh
Kliknite na tlačidlo **▶️** vedľa úlohy.

### Spôsob 2: V detaile úlohy
Kliknite na **[▶️ Štart]** v sekcii ⏱️ Čas.

### Spôsob 3: Klávesová skratka
**Cmd/Ctrl + T** na vybranej úlohe.

## 7.2 Bežiaci časovač

Keď beží časovač, vidíte:
- **V headeri:** Globálny indikátor s názvom úlohy a časom
- **Pri úlohe:** Zelené tlačidlo ⏹️ s bežiacim časom

```
┌─────────────────────────────────────────────────────┐
│ 📋 Dnes    ⏱️ Analýza 00:23:45    🔍  ☀️  👤       │
└─────────────────────────────────────────────────────┘
```

**Dôležité:** Môžete mať **len 1 aktívny časovač**. Spustenie nového automaticky zastaví predchádzajúci.

## 7.3 Zastavenie časovača

- Kliknite na **⏹️** tlačidlo
- Alebo spustite časovač na inej úlohe

## 7.4 Prehľad času

### V detaile úlohy:
```
┌─────────────────────────────────┐
│ ⏱️ Čas                          │
│                                 │
│ Celkovo:    5h 23m             │
│ Dnes:       1h 45m             │
│ Včera:      2h 30m             │
│                                 │
│ Záznamy:                        │
│ • 1h 30m (10:00 - 11:30)       │
│ • 45m    (14:00 - 14:45)       │
└─────────────────────────────────┘
```

### Dashboard času (📊 Časovač v menu):
- **Filtrovanie** podľa obdobia, projektu, osoby, tagov
- **Zoskupenie** podľa dňa, projektu, osoby, úlohy, tagu
- **Grafy** - koláčový a stĺpcový
- **Export** do CSV/PDF

---

# 8. Kalendár a plánovanie

## 8.1 Kalendárové zobrazenie

Prepnite na kalendár kliknutím na 📅 ikonu v headeri.

### Mesačný pohľad:
```
┌──────────────────────────────────────────────┐
│        ◀  Február 2026  ▶                    │
├──────┬──────┬──────┬──────┬──────┬──────┬────┤
│  Po  │  Ut  │  St  │  Št  │  Pi  │  So  │ Ne │
├──────┼──────┼──────┼──────┼──────┼──────┼────┤
│      │      │      │      │      │  1   │  2 │
│      │      │      │      │      │      │    │
├──────┼──────┼──────┼──────┼──────┼──────┼────┤
│  3   │  4   │  5   │  6   │  7   │  8   │  9 │
│ •••  │ ••   │      │ •    │      │      │    │
├──────┼──────┼──────┼──────┼──────┼──────┼────┤
│ 10   │ 11   │ 12   │ 13   │ 14   │ 15   │ 16 │
│      │ •    │      │      │ •••• │      │    │
└──────┴──────┴──────┴──────┴──────┴──────┴────┘
```

**Legenda bodiek:**
- **•** = 1-2 úlohy
- **••** = 3+ úlohy
- **🔴** = Úlohy po termíne

### Týždenný pohľad (Time Blocking):
- Zobrazenie pracovných hodín 07:00 - 19:00
- Drag & drop úloh na časové sloty
- Detekcia konfliktov s Google Calendar

## 8.2 Drag & drop na dátum

1. V sidebar začnite ťahať úlohu
2. Pustite ju na 📅 ikonu kalendára
3. Vyberte dátum v mini-kalendári

---

# 9. Filtrovanie a vyhľadávanie

## 9.1 Filtrovací panel

```
┌────────────────────────────────────────────────────────┐
│ [Status ▼] [Osoba ▼] [Deadline ▼] [Priorita ▼] [Tagy ▼]│
└────────────────────────────────────────────────────────┘
```

### Dostupné filtre:

| Filter | Možnosti |
|--------|----------|
| **Status** | Backlog, Todo, In Progress, Review, Done |
| **Osoba** | Všetci / Nepriradené / Konkrétna osoba |
| **Deadline** | Dnes / Tento týždeň / Tento mesiac / Po termíne |
| **Priorita** | Nízka / Stredná / Vysoká / Urgentná |
| **Tagy** | Výber z dostupných tagov |

### Aktívne filtre:
- Modrá farba = filter je aktívny
- Kliknite **×** pre zrušenie filtra
- **"Zrušiť filtre"** odstráni všetky

## 9.2 Vyhľadávanie

1. Kliknite na 🔍 v headeri alebo stlačte **/**
2. Napíšte hľadaný text
3. Výsledky sa zobrazujú okamžite

---

# 10. Klávesové skratky

## Navigácia

| Skratka | Akcia |
|---------|-------|
| **I** | Inbox |
| **Y** | Dnes |
| **U** | Nadchádzajúce |
| **A** | Kedykoľvek |
| **S** | Niekedy |
| **L** | Logbook |
| **C** | Kalendár |
| **T** | Tímový Inbox |

## Akcie

| Skratka | Akcia |
|---------|-------|
| **N** | Nová úloha |
| **/** | Vyhľadávanie |
| **D** | Prepnúť dark/light mode |
| **Cmd/Ctrl + T** | Spustiť/zastaviť časovač |
| **Delete / Backspace** | Vymazať rozbalenú úlohu |
| **Escape** | Zavrieť modal/detail |
| **Shift + ?** | Zobraziť všetky skratky |

## Hromadné akcie (pri označených úlohách)

| Skratka | Akcia |
|---------|-------|
| **D** | Označiť ako hotové |
| **T** | Pridať do Dnes |
| **1-5** | Zmeniť status (1=Backlog ... 5=Done) |
| **A** | Priradiť osobe |
| **L** | Nastaviť deadline |

---

# 11. Nastavenia

Prístup cez ⚙️ **Nastavenia** v sidebar.

## 11.1 Profil

- Zmena **mena** a **prezývky**
- Nastavenie **avataru**
- Zmena **hesla**

## 11.2 Vzhľad

- **Farebný režim:** Svetlý / Tmavý / Automatický
- Jazyk rozhrania

## 11.3 Integrácie

### Slack
- Pripojenie Slack workspace
- Automatické vytváranie úloh zo správ
- Zmena statusu cez emoji reakcie

### Email notifikácie
- Denný súhrn úloh
- Upozornenia na deadliny
- Komentáre k úlohám

## 11.4 Správa používateľov (Admin)

Len pre administrátorov:
- Pozvanie nových používateľov
- Zmena rolí (Admin / Člen / HR)
- Priradenie do oddelení
- Deaktivácia účtov

---

# 12. Mobilná verzia

ZITA TODO je plne responzívna aplikácia optimalizovaná pre mobilné zariadenia.

## Rozdiely oproti desktopovej verzii

| Funkcia | Desktop | Mobile |
|---------|---------|--------|
| Sidebar | Vždy viditeľný | Skrytý, otvára sa hamburger menu |
| Filtrovací panel | Rozbalený | Zrolovaný do bottom sheet |
| Drag & drop | Štandardný | Touch optimalizovaný |
| Hromadné akcie | Klávesové skratky | Spodný action bar |
| Vymazanie úlohy | Delete klávesa | Swipe doľava |

## Swipe gestá

- **Swipe doľava:** Vymazať úlohu
- **Dlhé podržanie:** Začať drag & drop

## FAB tlačidlo

Floating Action Button (plávajúce tlačidlo) **+** v pravom dolnom rohu pre rýchle pridanie úlohy.

---

# Potrebujete pomoc?

Ak máte otázky alebo problémy:
1. Skontrolujte túto príručku
2. Použite klávesovú skratku **Shift + ?** pre rýchlu pomoc
3. Kontaktujte administrátora vašej organizácie

---

*ZITA TODO v2.44 - Používateľská príručka*  
*Posledná aktualizácia: 3. februára 2026*
