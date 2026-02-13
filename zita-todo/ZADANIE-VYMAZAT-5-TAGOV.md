# ZADANIE: Vymazať konkrétne tagy (NIE všetky okrem 4)

## Požiadavka

Vymazať LEN tieto konkrétne tagy. Ostatné tagy v systéme ponechať.

---

## Tagy na VYMAZANIE (presný zoznam - 5 tagov)

| Tag | Akcia |
|-----|-------|
| TREBA RIEŠIŤ | ❌ VYMAZAŤ |
| RIEŠIM | ❌ VYMAZAŤ |
| ČAKÁM NA ZÁKAZNÍKA | ❌ VYMAZAŤ |
| ČAKÁM NA DODÁVATEĽA | ❌ VYMAZAŤ |
| ČAKÁM NA DORUČENIE | ❌ VYMAZAŤ |

---

## Tagy na PONECHANIE (a všetky ostatné)

| Tag | Akcia |
|-----|-------|
| URGENT | ✅ PONECHAŤ |
| PRE ZÁKAZNÍKA | ✅ PONECHAŤ |
| PREDAJNÝ RÁM | ✅ PONECHAŤ |
| PRE ZAMESTNANCA | ✅ PONECHAŤ |
| Všetky ostatné tagy | ✅ PONECHAŤ |

---

## Implementácia

### SQL

```sql
-- 1. Najprv odstrániť väzby z task_tags
DELETE FROM task_tags 
WHERE tag_id IN (
  SELECT id FROM tags 
  WHERE title IN (
    'TREBA RIEŠIŤ',
    'RIEŠIM', 
    'ČAKÁM NA ZÁKAZNÍKA',
    'ČAKÁM NA DODÁVATEĽA',
    'ČAKÁM NA DORUČENIE'
  )
);

-- 2. Vymazať samotné tagy
DELETE FROM tags 
WHERE title IN (
  'TREBA RIEŠIŤ',
  'RIEŠIM',
  'ČAKÁM NA ZÁKAZNÍKA', 
  'ČAKÁM NA DODÁVATEĽA',
  'ČAKÁM NA DORUČENIE'
);
```

### Supabase API

```typescript
const TAGS_TO_DELETE = [
  'TREBA RIEŠIŤ',
  'RIEŠIM',
  'ČAKÁM NA ZÁKAZNÍKA',
  'ČAKÁM NA DODÁVATEĽA',
  'ČAKÁM NA DORUČENIE',
];

async function deleteSpecificTags() {
  // 1. Nájsť ID tagov na vymazanie
  const { data: tagsToDelete } = await supabase
    .from('tags')
    .select('id, title')
    .in('title', TAGS_TO_DELETE);

  if (!tagsToDelete || tagsToDelete.length === 0) {
    console.log('No matching tags found');
    return;
  }

  console.log('Tags to delete:', tagsToDelete.map(t => t.title));

  const tagIds = tagsToDelete.map(t => t.id);

  // 2. Vymazať väzby z task_tags
  const { error: taskTagsError } = await supabase
    .from('task_tags')
    .delete()
    .in('tag_id', tagIds);

  if (taskTagsError) {
    console.error('Error deleting task_tags:', taskTagsError);
    return;
  }

  // 3. Vymazať tagy
  const { error: tagsError } = await supabase
    .from('tags')
    .delete()
    .in('id', tagIds);

  if (tagsError) {
    console.error('Error deleting tags:', tagsError);
    return;
  }

  console.log(`Successfully deleted ${tagsToDelete.length} tags`);
}

deleteSpecificTags();
```

---

## Kontrola pred vymazaním

```sql
-- Skontrolovať ktoré tagy budú vymazané
SELECT id, title, color FROM tags 
WHERE title IN (
  'TREBA RIEŠIŤ',
  'RIEŠIM',
  'ČAKÁM NA ZÁKAZNÍKA',
  'ČAKÁM NA DODÁVATEĽA', 
  'ČAKÁM NA DORUČENIE'
);

-- Skontrolovať koľko taskov má tieto tagy
SELECT t.title, COUNT(tt.task_id) as task_count
FROM tags t
LEFT JOIN task_tags tt ON t.id = tt.tag_id
WHERE t.title IN (
  'TREBA RIEŠIŤ',
  'RIEŠIM',
  'ČAKÁM NA ZÁKAZNÍKA',
  'ČAKÁM NA DODÁVATEĽA',
  'ČAKÁM NA DORUČENIE'
)
GROUP BY t.title;
```

---

## Výsledok

Po vymazaní:
- ❌ TREBA RIEŠIŤ - vymazaný
- ❌ RIEŠIM - vymazaný
- ❌ ČAKÁM NA ZÁKAZNÍKA - vymazaný
- ❌ ČAKÁM NA DODÁVATEĽA - vymazaný
- ❌ ČAKÁM NA DORUČENIE - vymazaný
- ✅ URGENT - zostáva
- ✅ PRE ZÁKAZNÍKA - zostáva
- ✅ PREDAJNÝ RÁM - zostáva
- ✅ PRE ZAMESTNANCA - zostáva
- ✅ Všetky ostatné tagy - zostávajú

---

*Vytvorené: 12. február 2026*
