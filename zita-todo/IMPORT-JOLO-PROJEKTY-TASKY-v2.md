# IMPORT: Projekty a Tasky pre Jola (Matej Žoldoš) - v2

## Kontext

Import dát z Excel súboru pre používateľa Jola (Matej Žoldoš).

**Jolo už má účet** - priradiť mu všetky tasky priamo.

---

## Zdrojový súbor

Súbor: `/mnt/user-data/uploads/Copy_of_PROJEKTY_JOLO_JANUAR_2026__1_.xlsx`

Obsahuje 2 taby:
- **Projekty** - 7 projektov
- **Tasky** - 113 taskov

---

## KROK 1: Zistiť potrebné ID

```sql
-- Organization ID
SELECT id FROM organizations LIMIT 1;

-- Jolo user ID
SELECT id FROM users WHERE email = 'matej@zita.sk';

-- Area ID pre Financie
SELECT id FROM areas WHERE title ILIKE '%financie%' AND is_global = true;

-- Area ID pre Facility
SELECT id FROM areas WHERE title ILIKE '%facility%' AND is_global = true;

-- Existujúce tagy
SELECT id, title FROM tags WHERE title IN ('Buffer', 'Projekt manazment', 'EYEKIDO');

-- Existujúci projekt METRIKY
SELECT id FROM projects WHERE title ILIKE '%metriky%';
```

---

## KROK 2: Vytvoriť chýbajúce entity

### Tagy (ak neexistujú)
```sql
-- Vytvor tagy ak neexistujú
INSERT INTO tags (title, color, organization_id)
SELECT 'Buffer', '#8E8E93', '<org_id>'
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE title = 'Buffer' AND organization_id = '<org_id>');

INSERT INTO tags (title, color, organization_id)
SELECT 'Projekt manazment', '#007AFF', '<org_id>'
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE title = 'Projekt manazment' AND organization_id = '<org_id>');

INSERT INTO tags (title, color, organization_id)
SELECT 'EYEKIDO', '#FF9500', '<org_id>'
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE title = 'EYEKIDO' AND organization_id = '<org_id>');
```

### Projekt METRIKY (ak neexistuje)
```sql
INSERT INTO projects (title, area_id, organization_id, status, notes)
SELECT 'METRIKY', '<financie_area_id>', '<org_id>', 'active', 'Projekt pre metriky a dashboardy'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE title ILIKE '%metriky%' AND organization_id = '<org_id>');
```

---

## KROK 3: Import 7 projektov

Všetky projekty vytvor pod oddelením **Financie**, okrem "Vylepšenie zázemia" ktorý ide pod **Facility**.

| Projekt | Oddelenie | Status | Deadline | Tag |
|---------|-----------|--------|----------|-----|
| Automatické dashboardy Tiss (predaj, rezervácie, sklad...) | Financie | active | 31.1.2026 | - |
| Automatické dashboardy Navision (P&L, cieľ vs. realita vs. minulý rok) | Financie | active | 31.1.2026 | - |
| Automatizovaný cash report Tatrabanka + Navision | Financie | active | 31.1.2026 | - |
| Automatizácia úhrad Navision | Financie | active | 31.1.2026 | - |
| Vylepšenie zázemia | **Facility** | active | 31.1.2026 | - |
| Automatické dashboardy Tiss (eyekido) | Financie | active | 31.1.2026 | **EYEKIDO** |
| Automaticke dashboardy projekty | Financie | active | 31.1.2026 | - |

Poznámky k projektom sú v Exceli v stĺpci POZNÁMKA.

---

## KROK 4: Import 113 taskov

### Pravidlá pre zaradenie taskov

| KOMPETENCIA v Exceli | Kam zaradiť |
|---------------------|-------------|
| **Financie** | area_id = Financie, project_id = NULL |
| **Metriky** | area_id = Financie, project_id = METRIKY |
| **Facility** | area_id = Facility, project_id = NULL |
| **Buffer** | area_id = NULL, project_id = NULL, tag = "Buffer" |
| **Projekt manazment** | area_id = NULL, project_id = NULL, tag = "Projekt manazment" |

### Pravidlá pre EYEKIDO tag

| FIRMA v Exceli | Tag |
|----------------|-----|
| Zita | žiadny |
| eyekido | **EYEKIDO** |
| Zita/eyekido | **EYEKIDO** |

### Čo pridať ku každému tasku

1. **title** = stĺpec TASK
2. **notes** = stĺpec POZNAMKY (ak existuje)
3. **assignee_id** = Jolo (matej@zita.sk)
4. **when_date** = stĺpec DATUM (ak existuje)
5. **status** = 'completed' (sú to trackované tasky)
6. **organization_id** = org_id

### Time entries

Pre každý task ktorý má TRVANIE:
1. Vytvor task
2. Vytvor time_entry s:
   - todo_id = task.id
   - user_id = Jolo
   - duration_seconds = parsované z TRVANIE (formát H:MM:SS)
   - started_at = DATUM + START (ak existuje)
   - stopped_at = DATUM + END (ak existuje)
   - project_id = task.project_id
   - area_id = task.area_id

### Konverzia času

```python
def parse_duration(duration_str):
    """Konvertuje 'H:MM:SS' alebo 'HH:MM:SS' na sekundy"""
    if not duration_str or pd.isna(duration_str):
        return 0
    parts = str(duration_str).split(':')
    hours = int(parts[0]) if len(parts) > 0 else 0
    minutes = int(parts[1]) if len(parts) > 1 else 0
    seconds = int(parts[2]) if len(parts) > 2 else 0
    return hours * 3600 + minutes * 60 + seconds
```

---

## KROK 5: Implementácia

Odporúčam vytvoriť Python/Node script ktorý:

1. Načíta Excel súbor
2. Pripojí sa na Supabase
3. Vytvorí chýbajúce tagy a projekt METRIKY
4. Pre každý projekt v tabe "Projekty":
   - Vytvorí projekt s príslušným area_id
   - Pridá tag EYEKIDO ak je firma eyekido
5. Pre každý task v tabe "Tasky":
   - Vytvorí task s príslušným area_id, project_id, assignee_id
   - Pridá tagy (Buffer/Projekt manazment/EYEKIDO)
   - Ak má TRVANIE, vytvorí time_entry
6. Vypíše súhrn importu

---

## Očakávaný výsledok

Po importe:
- [ ] 7 projektov vytvorených (pod Financie/Facility)
- [ ] 113 taskov vytvorených a priradených Jolovi
- [ ] Tasky s Metriky kompetenciou sú pod projektom METRIKY
- [ ] Tasky s Buffer/Projekt manazment kompetenciou majú príslušný tag
- [ ] Tasky s eyekido/Zita/eyekido firmou majú tag EYEKIDO
- [ ] Time entries vytvorené pre tasky s TRVANIE
- [ ] Poznámky priradené k taskom

---

## Súbory

- Excel: `/mnt/user-data/uploads/Copy_of_PROJEKTY_JOLO_JANUAR_2026__1_.xlsx`
- Taby: "Projekty", "Tasky"

---

*Aktualizované: 20. január 2026*
