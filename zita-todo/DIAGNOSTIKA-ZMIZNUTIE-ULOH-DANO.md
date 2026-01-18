# DIAGNOSTIKA: Zmiznuté úlohy používateľa Dano

## Situácia

1. Používateľ "Dano" (dano.grigar@gmail.com) mal úlohy v systéme
2. Admin ho deaktivoval
3. Po deaktivácii úlohy zmizli zo všetkých zobrazení
4. Admin ho reaktivoval (teraz je "Aktívny")
5. Úlohy sa STÁLE NEZOBRAZUJÚ

---

## Krok 1: Zisti či úlohy existujú v databáze

Spusti tieto SQL queries v Supabase:

```sql
-- 1. Koľko úloh je celkovo v systéme?
SELECT COUNT(*) as total_tasks FROM tasks WHERE deleted_at IS NULL;

-- 2. Nájdi ID používateľa Dano
SELECT id, email, name, status FROM users WHERE email = 'dano.grigar@gmail.com';

-- 3. Koľko úloh má priradených tento používateľ?
SELECT COUNT(*) as dano_tasks 
FROM tasks 
WHERE assignee_id = (SELECT id FROM users WHERE email = 'dano.grigar@gmail.com')
AND deleted_at IS NULL;

-- 4. Ukáž niekoľko jeho úloh (ak existujú)
SELECT id, title, status, assignee_id, created_at 
FROM tasks 
WHERE assignee_id = (SELECT id FROM users WHERE email = 'dano.grigar@gmail.com')
AND deleted_at IS NULL
LIMIT 10;

-- 5. Existujú úlohy bez assignee (osirelé)?
SELECT COUNT(*) as orphaned_tasks 
FROM tasks 
WHERE assignee_id IS NULL 
AND deleted_at IS NULL;

-- 6. Skontroluj či úlohy neboli soft-deleted
SELECT COUNT(*) as soft_deleted 
FROM tasks 
WHERE assignee_id = (SELECT id FROM users WHERE email = 'dano.grigar@gmail.com')
AND deleted_at IS NOT NULL;
```

---

## Krok 2: Ak úlohy EXISTUJÚ v databáze

Problém je v aplikačnej vrstve. Skontroluj:

### A) Query pre načítanie úloh
- Súbor: pravdepodobne `lib/hooks/use-tasks.ts` alebo podobný
- Hľadaj: JOIN na users tabuľku alebo filter podľa `users.status`
- Problém: Query možno filtruje len úlohy kde `users.status = 'active'`

### B) RLS (Row Level Security) politiky
- Skontroluj RLS politiky na tabuľke `tasks` v Supabase
- Možno RLS blokuje prístup k úlohám neaktívnych používateľov

### C) Oprava
- Úlohy by sa mali zobrazovať BEZ OHĽADU na status assignee
- Odstráň filter podľa `users.status` z query pre úlohy

---

## Krok 3: Ak úlohy NEEXISTUJÚ v databáze

Zisti čo sa stalo:

### A) Skontroluj triggery
```sql
-- Existuje trigger ktorý maže úlohy pri deaktivácii?
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' OR event_object_table = 'tasks';
```

### B) Skontroluj foreign key constraints
```sql
-- Je na tasks.assignee_id CASCADE DELETE?
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'tasks';
```

### C) Ak boli zmazané
- Skontroluj či Supabase má point-in-time recovery
- Možno bude potrebné obnoviť z backup

---

## Očakávaný výstup

Po spustení diagnostiky mi povedz:

1. **Koľko úloh je celkovo v DB?**
2. **Koľko úloh má Dano priradených?**
3. **Aký je status používateľa Dano v DB?**
4. **Ak úlohy existujú - kde v kóde je problém?**
5. **Ak neexistujú - čo ich zmazalo?**

---

*Vytvorené: 18. január 2026*
*Priorita: KRITICKÁ*
