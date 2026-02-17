# ZADANIE PRE CLAUDE CODE: DIAGNOSTIKA — NATY nemôže reorderovať tasky v Kanban

## Dátum: 17. február 2026
## Priorita: 🔴 KRITICKÁ
## Typ: LEN DIAGNOSTIKA — NEOPRAVUJ NIČ

---

## KONTEXT

NATY (member rola) nemôže reorderovať tasky v rámci Kanban stĺpca. Presun medzi stĺpcami (zmena statusu) funguje, ale zmena poradia v rámci jedného stĺpca nie. Admin (DANO) to funguje. 

**Toto je 4. pokus o opravu. Tentokrát ŽIADNA oprava — najprv diagnostika.**

---

## INŠTRUKCIE

⚠️ **NEROBÍ ŽIADNU OPRAVU kým nedokončíš všetkých 6 krokov diagnostiky a nevypíšeš výsledky.**

---

## KROK 1: RLS politiky na tasks

Spusti a vypíš KOMPLETNÝ výstup:

```sql
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'tasks';
```

---

## KROK 2: NATY user info

```sql
SELECT id, email, role, organization_id 
FROM users 
WHERE email ILIKE '%naty%';
```

---

## KROK 3: Nájdi reorder handler v kóde

```bash
grep -rn "handleTaskReorder\|handleReorder\|onDragEnd\|sort_order" \
  --include="*.tsx" \
  app/\(dashboard\)/ \
  components/tasks/kanban-board.tsx \
  components/tasks/kanban-column.tsx \
  components/tasks/kanban-card.tsx
```

Vypíš CELÝ obsah nájdeného handlera (funkciu ktorá sa volá pri drag & drop reorderi v Kanban).

---

## KROK 4: Nájdi Supabase UPDATE call pri reorderi

```bash
grep -rn -A 5 "sort_order" --include="*.tsx" \
  app/\(dashboard\)/ \
  components/tasks/
```

Nájdi presný riadok kde sa volá `supabase.from('tasks').update(...)` pri zmene `sort_order`. Vypíš celý blok kódu vrátane error handlingu.

---

## KROK 5: Skontroluj či reorder handler vôbec beží

Pridaj dočasný `console.log` do reorder handlera:

```tsx
// Na ZAČIATOK handlera pridaj:
console.log('=== REORDER START ===', { 
  taskId: active.id, 
  overTaskId: over?.id,
  newIndex,
  oldIndex 
})

// Po Supabase UPDATE pridaj:
console.log('=== REORDER RESULT ===', { data, error })
```

Deploy na Vercel. Potom sa prihláš ako NATY, otvor DevTools Console, a skús reorderovať task. **Vypíš čo sa zobrazí v Console.**

---

## KROK 6: Test UPDATE cez Supabase SQL Editor

Nájdi ID ľubovoľného NATY tasku a skús manuálny UPDATE:

```sql
-- Najprv nájdi task
SELECT id, title, sort_order, organization_id, assigned_to 
FROM tasks 
WHERE assigned_to = (SELECT id FROM users WHERE email ILIKE '%naty%')
LIMIT 3;

-- Potom skús update (nahraď TASK_ID skutočným ID)
UPDATE tasks SET sort_order = 999 WHERE id = 'TASK_ID';
```

Ak update zlyhá — vypíš error message. Ak uspeje — problém nie je v RLS ale v kóde.

---

## VÝSTUP

Po dokončení všetkých krokov vypíš REPORT v tomto formáte:

```
=== DIAGNOSTIKA: NATY REORDER BUG ===

KROK 1 - RLS politiky:
[výstup]

KROK 2 - NATY user:
[výstup]

KROK 3 - Reorder handler:
[kód]

KROK 4 - Supabase UPDATE:
[kód]

KROK 5 - Console log:
[výstup z DevTools]

KROK 6 - Manuálny SQL test:
[výstup]

ZÁVER: Problém je v [RLS / kóde / inde] pretože [dôvod].
```

**Až PO tomto reporte budem vedieť čo opraviť.**

---

*Vytvorené: 17. február 2026*
