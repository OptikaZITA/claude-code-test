# ZADANIE: Uzavretie projektu — kompletná funkcionalita

## Priorita: 🟡 STREDNÁ
## Dátum: 29. mája 2026
## Nahlásil: Jolo (Strategická rada) + Dano (Admin)

---

## POŽIADAVKA

Používateľ chce vedieť uzavrieť celý projekt v rámci oddelenia. Uzavretý projekt zmizne z aktívnych, ale ostane dohľadateľný v histórii. Ak projekt obsahuje nedokončené tasky, systém sa opýta čo s nimi.

---

## ČASŤ 1: Tlačidlo na uzavretie projektu

### Kde sa zobrazí

V **project view** (detail projektu) pridať akciu "Uzavrieť projekt". Umiestnenie:
- Ikona ✓ alebo menu (tri bodky) pri názve projektu → "Uzavrieť projekt"
- Rovnako v **list view oddelenia** — pravý klik alebo menu pri projekte

### Kto môže uzavrieť projekt
- Admin: áno
- Member: len projekty ktoré vytvoril (alebo áno pre všetky — podľa aktuálnej logiky)
- Strategická rada: áno

---

## ČASŤ 2: Dialóg pri uzatváraní

### Ak projekt NEMÁ nedokončené tasky

Jednoduchý confirmation dialóg:

```
Uzavrieť projekt "Vyhodnocovanie efektivity Jolo"?

Všetky úlohy v tomto projekte sú dokončené.

[Zrušiť]  [Uzavrieť projekt]
```

Po potvrdení:
```sql
UPDATE projects SET status = 'completed', completed_at = NOW() WHERE id = ?;
```

### Ak projekt MÁ nedokončené tasky

Zobraz dialóg s prehľadom nedokončených taskov a voľbou:

```tsx
<Dialog>
  <DialogHeader>
    Uzavrieť projekt "{project.title}"?
  </DialogHeader>
  
  <DialogContent>
    <p>Tento projekt má {activeTasks.length} nedokončených úloh:</p>
    
    <ul className="space-y-1 my-4">
      {activeTasks.map(task => (
        <li key={task.id} className="flex items-center gap-2 text-sm">
          <Circle className="h-4 w-4 text-muted-foreground" />
          {task.title}
        </li>
      ))}
    </ul>
    
    <p className="font-medium">Čo s nimi?</p>
    
    <RadioGroup value={taskAction} onValueChange={setTaskAction}>
      <RadioGroupItem value="complete">
        Dokončiť všetky (označiť ako hotové)
      </RadioGroupItem>
      <RadioGroupItem value="inbox">
        Presunúť do Inboxu (bez projektu)
      </RadioGroupItem>
      <RadioGroupItem value="trash">
        Zrušiť všetky (presunúť do Koša)
      </RadioGroupItem>
      <RadioGroupItem value="individual">
        Nechaj ma vybrať jednotlivo
      </RadioGroupItem>
    </RadioGroup>
    
    {/* Ak vybral "individual" */}
    {taskAction === 'individual' && (
      <div className="mt-4 space-y-2">
        {activeTasks.map(task => (
          <div key={task.id} className="flex items-center justify-between">
            <span className="text-sm">{task.title}</span>
            <Select value={taskDecisions[task.id]} onValueChange={v => setTaskDecisions({...taskDecisions, [task.id]: v})}>
              <SelectItem value="complete">Dokončiť</SelectItem>
              <SelectItem value="inbox">Do Inboxu</SelectItem>
              <SelectItem value="trash">Zrušiť</SelectItem>
            </Select>
          </div>
        ))}
      </div>
    )}
  </DialogContent>
  
  <DialogFooter>
    <Button variant="outline" onClick={onClose}>Zrušiť</Button>
    <Button onClick={handleCloseProject}>Uzavrieť projekt</Button>
  </DialogFooter>
</Dialog>
```

### Spracovanie podľa výberu

```tsx
async function handleCloseProject() {
  // 1. Spracuj nedokončené tasky podľa výberu
  for (const task of activeTasks) {
    const action = taskAction === 'individual' 
      ? taskDecisions[task.id] 
      : taskAction;
    
    switch (action) {
      case 'complete':
        await updateTask(task.id, { 
          status: 'done', 
          completed_at: new Date().toISOString() 
        });
        break;
      case 'inbox':
        await updateTask(task.id, { 
          project_id: null, 
          area_id: null,
          when_type: 'inbox'
        });
        break;
      case 'trash':
        await updateTask(task.id, { 
          deleted_at: new Date().toISOString() 
        });
        break;
    }
  }
  
  // 2. Uzavri projekt
  await updateProject(project.id, { 
    status: 'completed', 
    completed_at: new Date().toISOString() 
  });
  
  // 3. Zatvor dialóg + refresh UI
  onClose();
}
```

---

## ČASŤ 3: Zobrazenie uzavretých projektov

### V oddelení (list view)

Pod aktívnymi projektmi pridať zbaliteľnú sekciu:

```tsx
{completedProjects.length > 0 && (
  <div className="mt-6 border-t border-border/50 pt-3">
    <button 
      onClick={() => setShowCompleted(!showCompleted)}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronRight className={cn("h-4 w-4 transition-transform", showCompleted && "rotate-90")} />
      Dokončené projekty ({completedProjects.length})
    </button>
    
    {showCompleted && (
      <div className="mt-2 space-y-2">
        {completedProjects.map(project => (
          <div key={project.id} className="opacity-50 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="line-through">{project.title}</span>
            <span className="text-xs text-muted-foreground">
              Uzavretý {formatDate(project.completed_at)}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

**Defaultne zbalené** — neruší pri bežnej práci.

### V Logbooku

Uzavreté projekty sa zobrazujú v Logbooku medzi dokončenými taskami:

```tsx
// V Logbooku — pridať sekciu alebo miešať s taskami
<div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
  <FolderCheck className="h-4 w-4 text-green-500" />
  <span className="font-medium">Projekt uzavretý: {project.title}</span>
  <span className="text-xs text-muted-foreground">{project.area?.title}</span>
  <span className="text-xs text-muted-foreground">{formatDate(project.completed_at)}</span>
</div>
```

---

## ČASŤ 4: Znovuotvorenie projektu

V sekcii "Dokončené projekty" alebo v Logbooku — po kliknutí na uzavretý projekt zobraziť možnosť:

```tsx
<Button variant="outline" size="sm" onClick={() => reopenProject(project.id)}>
  Znova otvoriť
</Button>
```

```tsx
async function reopenProject(projectId: string) {
  await updateProject(projectId, { 
    status: 'active', 
    completed_at: null 
  });
}
```

Projekt sa vráti medzi aktívne. Tasky, ktoré boli pri uzatváraní dokončené/presunuté, ostávajú v svojom stave — nevrátia sa automaticky.

---

## ČASŤ 5: Query zmeny

### Aktívne projekty (existujúce query)

Skontroluj, že query pre zobrazenie projektov v oddelení filtruje len aktívne:

```tsx
const { data: activeProjects } = await supabase
  .from('projects')
  .select('id, title, status, sort_order, completed_at')
  .eq('area_id', areaId)
  .eq('status', 'active')
  .order('sort_order');
```

### Dokončené projekty (nový query)

```tsx
const { data: completedProjects } = await supabase
  .from('projects')
  .select('id, title, status, completed_at')
  .eq('area_id', areaId)
  .eq('status', 'completed')
  .order('completed_at', { ascending: false });
```

### Logbook query

Pridaj dokončené projekty do Logbook query:

```tsx
const { data: completedProjects } = await supabase
  .from('projects')
  .select('id, title, area_id, completed_at')
  .eq('status', 'completed')
  .order('completed_at', { ascending: false })
  .limit(50);
```

---

## DATABÁZOVÉ ZMENY

Žiadne — tabuľka `projects` už má:
- `status` s hodnotou `'completed'`
- `completed_at` timestamp

Stačí ich používať.

---

## TESTOVANIE

1. Otvor projekt **bez** nedokončených taskov → "Uzavrieť" → jednoduchý dialóg → potvrdí → projekt zmizne z aktívnych ✅
2. Otvor projekt **s** 3 nedokončenými taskami → dialóg zobrazí tasky + voľby ✅
3. Vyber "Dokončiť všetky" → uzavri → tasky sú dokončené, projekt uzavretý ✅
4. Vyber "Presunúť do Inboxu" → uzavri → tasky sú v Inboxe bez projektu ✅
5. Vyber "Zrušiť všetky" → uzavri → tasky sú v Koši ✅
6. Vyber "Jednotlivo" → nastav rôzne akcie → uzavri → každý task spracovaný podľa výberu ✅
7. V oddelení sa zobrazí "Dokončené projekty (1)" → rozklik → vidno uzavretý projekt ✅
8. V Logbooku sa zobrazí uzavretý projekt ✅
9. Klikni "Znova otvoriť" → projekt sa vráti medzi aktívne ✅
10. Over pre admin aj member rolu ✅

---

## ⛔ ZAKÁZANÉ

- **NEPOUŽÍVAJ `window.location.reload()`**
- **NEMEŇ štruktúru tabuľky `projects`** — všetko potrebné už existuje
- **NEPUSHUJ kým `npx tsc --noEmit` neprejde s 0 errormi**
