# Zadanie pre Claude Code: Oprava tagov a deadline varovania

## 1. TAGY - Presunúť bližšie k názvu

### Aktuálny problém
Tagy sú úplne vpravo, oddelené od názvu tasku.

### Požadované
Tagy majú byť hneď za názvom tasku (a ikonou poznámky ak existuje).

### Layout

```
AKTUÁLNE (ZLE):
[○] [★] asas                                          [Skuska tagu] [tag]  ▷

POŽADOVANÉ:
[○] [★] Názov tasku 📄 [TAG1] [TAG2]              3:13  ▷  📅 6.1.
        Oddelenie                                  ↑    ↑    ↑
                                                  čas  play deadline
```

### Implementácia task-item.tsx

```tsx
<div className="flex items-start gap-3 p-3">
  <Checkbox />
  <Star />
  
  {/* Hlavný obsah - názov + tagy spolu */}
  <div className="flex-1 min-w-0">
    {/* Riadok 1: Názov + poznámka + TAGY */}
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-medium">{task.title}</span>
      {task.notes && <FileText className="h-4 w-4 text-muted-foreground" />}
      
      {/* Tagy hneď za názvom */}
      {task.tags?.map(tag => (
        <span 
          key={tag.id}
          className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground"
        >
          {tag.name}
        </span>
      ))}
    </div>
    
    {/* Riadok 2: Oddelenie */}
    {task.area && (
      <span className="text-sm text-muted-foreground">{task.area.name}</span>
    )}
  </div>
  
  {/* Pravá strana - čas, play, deadline */}
  <div className="flex items-center gap-2 flex-shrink-0">
    {task.total_time && <span className="text-sm text-muted-foreground">{formatTime(task.total_time)}</span>}
    <PlayButton />
    <DeadlineBadge deadline={task.deadline} />
  </div>
</div>
```

---

## 2. DEADLINE - Farebné varovanie

### Pravidlá

| Stav | Farba | Príklad |
|------|-------|---------|
| Budúci (> 1 deň) | Sivá | 📅 15.1. |
| Zajtra | Oranžová | ⚠️ Zajtra |
| Dnes | Oranžová | ⚠️ Dnes |
| Po deadline (overdue) | Červená | 🔴 6.1. (pred 2 dňami) |

### Implementácia deadline-badge.tsx

```tsx
// components/tasks/deadline-badge.tsx

import { Calendar, AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeadlineBadgeProps {
  deadline: string | Date | null;
}

export function DeadlineBadge({ deadline }: DeadlineBadgeProps) {
  if (!deadline) return null;
  
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Určiť štýl podľa stavu
  let colorClass = "";
  let Icon = Calendar;
  
  if (diffDays < 0) {
    // OVERDUE - červená
    colorClass = "text-red-500 font-medium";
    Icon = AlertCircle;
  } else if (diffDays === 0) {
    // DNES - oranžová
    colorClass = "text-orange-500 font-medium";
    Icon = AlertTriangle;
  } else if (diffDays === 1) {
    // ZAJTRA - oranžová
    colorClass = "text-orange-500";
    Icon = AlertTriangle;
  } else {
    // BUDÚCI - sivá
    colorClass = "text-muted-foreground";
  }
  
  // Formátovať text
  let text = "";
  if (diffDays < 0) {
    text = `${formatDate(deadline)} (${Math.abs(diffDays)}d po termíne)`;
  } else if (diffDays === 0) {
    text = "Dnes";
  } else if (diffDays === 1) {
    text = "Zajtra";
  } else {
    text = formatDate(deadline);
  }
  
  return (
    <span className={cn("text-sm flex items-center gap-1", colorClass)}>
      <Icon className="h-4 w-4" />
      {text}
    </span>
  );
}

// Pomocná funkcia pre formátovanie dátumu
function formatDate(date: string | Date): string {
  const d = new Date(date);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}
```

---

## 3. SÚBORY NA ÚPRAVU

1. `components/tasks/task-item.tsx` - presunúť tagy k názvu, použiť DeadlineBadge
2. `components/tasks/deadline-badge.tsx` - nový komponent (alebo upraviť existujúci)

---

## 4. VÝSLEDOK

### Normálny task (budúci deadline)
```
[○] [★] dva [Skuska tagu] [tag]                    3:13  ▷  📅 6.1.
```

### Task po deadline (overdue) - ČERVENÝ
```
[○] [★] asas [tag]                                 1:07  ▷  🔴 3.1. (4d po termíne)
```

### Task s deadline dnes - ORANŽOVÝ
```
[○] [★] úloha [tag]                                      ▷  ⚠️ Dnes
```

### Task s deadline zajtra - ORANŽOVÝ
```
[○] [★] úloha [tag]                                      ▷  ⚠️ Zajtra
```
