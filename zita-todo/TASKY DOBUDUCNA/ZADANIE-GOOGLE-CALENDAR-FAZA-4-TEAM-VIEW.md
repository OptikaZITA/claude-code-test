# ZADANIE: Google Calendar - Fáza 4: Team Calendar View

## Kontext

Fáza 2 implementovala osobný Google Calendar - každý používateľ vidí len svoj kalendár. Táto fáza pridáva možnosť vidieť kalendáre kolegov na jednom mieste.

### Závislosti

- ✅ **Fáza 2 dokončená** - Osobný Google Calendar (read-only)
- ⏳ **Fáza 3** - Time blocking (môže byť paralelne)

---

## Požiadavky

### 1. Opt-in zdieľanie kalendára

Každý používateľ si sám rozhodne či zdieľa svoj kalendár s kolegami.

**Settings → Integrácie → Google Calendar:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Google Calendar                                    [Pripojené ✓]│
├─────────────────────────────────────────────────────────────────┤
│ Účet: dano@zita.sk                                              │
│                                                                 │
│ ☑️ Zdieľať môj kalendár s kolegami                              │
│    Kolegovia uvidia vaše eventy v Team Calendar view            │
│                                                                 │
│ Viditeľnosť detailov:                                           │
│ ○ Len čas (busy/free)                                           │
│ ● Názov eventu                                                  │
│ ○ Všetky detaily (názov, miesto, popis)                         │
│                                                                 │
│                              [Odpojiť]  [Uložiť]                │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Team Calendar view

V Plánovacom zobrazení pridať filter pre výber kolegov:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Plánovanie                          Zobraziť: [Ja + Kolegovia ▼]        │
│                                                                         │
│                                     ┌─────────────────────────┐         │
│                                     │ ○ Len ja                │         │
│                                     │ ● Ja + Kolegovia        │         │
│                                     │ ○ Len kolegovia         │         │
│                                     │ ─────────────────────── │         │
│                                     │ ☑️ Dano                  │         │
│                                     │ ☑️ Katka                 │         │
│                                     │ ☐ Jano (nezdieľa)       │         │
│                                     │ ☑️ Optika                │         │
│                                     └─────────────────────────┘         │
├─────────────────────────────────────────────────────────────────────────┤
│         │ Po 13      │ Ut 14       │ St 15       │ Št 16       │       │
├─────────┼────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ 09:00   │            │ 📅 Dano     │ 📅 Katka    │             │       │
│         │            │ Porada      │ Call klient │             │       │
├─────────┼────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ 10:00   │ 📅 Optika  │             │ 📅 Dano     │ 📅 Katka    │       │
│         │ Stretnutie │             │ Workshop    │ Školenie    │       │
├─────────┼────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ 11:00   │            │ 📅 Katka    │             │             │       │
│         │            │ 1:1 meeting │             │             │       │
└─────────┴────────────┴─────────────┴─────────────┴─────────────┴───────┘
```

### 3. Vizuálne odlíšenie

Eventy rôznych ľudí majú rôzne farby/štýly:

| Koho event | Štýl |
|------------|------|
| Môj | Plná farba (ako doteraz) |
| Kolegu | Svetlejšia/pastelová + meno |
| Viacero v rovnakom čase | Stacked/vedľa seba |

```
┌─────────────────────────────┐
│ 09:00                       │
│ ┌─────────┐ ┌─────────────┐ │
│ │ 📅 Môj  │ │ 📅 Katka    │ │
│ │ Porada  │ │ Call klient │ │
│ │ (tmavé) │ │ (svetlé)    │ │
│ └─────────┘ └─────────────┘ │
└─────────────────────────────┘
```

### 4. Úrovne viditeľnosti

Používateľ si vyberie čo kolegovia uvidia:

| Úroveň | Čo vidia kolegovia |
|--------|---------------------|
| **Len čas** | Farebný blok "Obsadené" bez názvu |
| **Názov eventu** | Čas + názov eventu |
| **Všetky detaily** | Čas + názov + miesto + popis |

---

## Databázová štruktúra

### Rozšírenie USER_INTEGRATIONS

```sql
-- Pridať polia pre team calendar sharing
ALTER TABLE user_integrations ADD COLUMN share_with_team boolean DEFAULT false;
ALTER TABLE user_integrations ADD COLUMN share_visibility text DEFAULT 'title';
-- share_visibility: 'busy' | 'title' | 'full'
```

### Alebo nová tabuľka GOOGLE_CALENDAR_SETTINGS

```sql
CREATE TABLE google_calendar_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL UNIQUE,
  share_with_team boolean DEFAULT false,
  share_visibility text DEFAULT 'title',  -- 'busy' | 'title' | 'full'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## API implementácia

### 1. Endpoint pre získanie team calendars

```typescript
// app/api/google/team-events/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');
  const userIds = searchParams.get('userIds')?.split(',');
  
  // 1. Získať používateľov ktorí zdieľajú kalendár
  const { data: sharingUsers } = await supabase
    .from('google_calendar_settings')
    .select('user_id, share_visibility')
    .eq('share_with_team', true)
    .in('user_id', userIds || []);
  
  // 2. Pre každého používateľa získať eventy
  const allEvents = await Promise.all(
    sharingUsers.map(async (user) => {
      const token = await getGoogleToken(user.user_id);
      const events = await fetchGoogleEvents(token, startDate, endDate);
      
      // Filtrovať podľa visibility
      return events.map(event => ({
        ...filterByVisibility(event, user.share_visibility),
        user_id: user.user_id,
      }));
    })
  );
  
  return Response.json({ events: allEvents.flat() });
}

function filterByVisibility(event, visibility) {
  switch (visibility) {
    case 'busy':
      return {
        id: event.id,
        start: event.start,
        end: event.end,
        summary: 'Obsadené',
        isBusy: true,
      };
    case 'title':
      return {
        id: event.id,
        start: event.start,
        end: event.end,
        summary: event.summary,
      };
    case 'full':
      return event;
  }
}
```

### 2. Hook pre team calendar

```typescript
// lib/hooks/use-team-calendar.ts

export function useTeamCalendarEvents(
  startDate: Date,
  endDate: Date,
  userIds: string[]
) {
  return useQuery({
    queryKey: ['team-calendar-events', startDate, endDate, userIds],
    queryFn: async () => {
      const response = await fetch(
        `/api/google/team-events?` + new URLSearchParams({
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          userIds: userIds.join(','),
        })
      );
      return response.json();
    },
    enabled: userIds.length > 0,
  });
}

export function useSharingUsers() {
  return useQuery({
    queryKey: ['sharing-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('google_calendar_settings')
        .select(`
          user_id,
          share_visibility,
          users (id, nickname, full_name, avatar_url)
        `)
        .eq('share_with_team', true);
      
      return data;
    },
  });
}
```

---

## Komponenty

### 1. Team Calendar Filter

```typescript
// components/calendar/team-calendar-filter.tsx

interface TeamCalendarFilterProps {
  selectedUsers: string[];
  onSelectionChange: (userIds: string[]) => void;
}

export function TeamCalendarFilter({ 
  selectedUsers, 
  onSelectionChange 
}: TeamCalendarFilterProps) {
  const { data: sharingUsers } = useSharingUsers();
  const { data: currentUser } = useCurrentUser();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Zobraziť: {getFilterLabel(selectedUsers)}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={...}>
          <DropdownMenuRadioItem value="me">Len ja</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="all">Ja + Kolegovia</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="team">Len kolegovia</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        
        {sharingUsers?.map(user => (
          <DropdownMenuCheckboxItem
            key={user.user_id}
            checked={selectedUsers.includes(user.user_id)}
            onCheckedChange={(checked) => {
              if (checked) {
                onSelectionChange([...selectedUsers, user.user_id]);
              } else {
                onSelectionChange(selectedUsers.filter(id => id !== user.user_id));
              }
            }}
          >
            <Avatar className="h-5 w-5 mr-2">
              <AvatarImage src={user.users.avatar_url} />
            </Avatar>
            {user.users.nickname || user.users.full_name}
          </DropdownMenuCheckboxItem>
        ))}
        
        {/* Používatelia ktorí nezdieľajú */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Nezdieľajú kalendár:
        </DropdownMenuLabel>
        {nonSharingUsers?.map(user => (
          <DropdownMenuItem disabled key={user.id}>
            <Avatar className="h-5 w-5 mr-2 opacity-50">
              <AvatarImage src={user.avatar_url} />
            </Avatar>
            <span className="text-muted-foreground">
              {user.nickname || user.full_name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 2. Calendar Sharing Settings

```typescript
// components/settings/calendar-sharing-settings.tsx

export function CalendarSharingSettings() {
  const { data: settings, isLoading } = useCalendarSettings();
  const updateSettings = useUpdateCalendarSettings();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zdieľanie kalendára</CardTitle>
        <CardDescription>
          Povoľte kolegom vidieť váš Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="share-toggle">
            Zdieľať môj kalendár s kolegami
          </Label>
          <Switch
            id="share-toggle"
            checked={settings?.share_with_team}
            onCheckedChange={(checked) => 
              updateSettings.mutate({ share_with_team: checked })
            }
          />
        </div>
        
        {settings?.share_with_team && (
          <div className="space-y-2">
            <Label>Viditeľnosť detailov</Label>
            <RadioGroup
              value={settings?.share_visibility}
              onValueChange={(value) => 
                updateSettings.mutate({ share_visibility: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="busy" id="busy" />
                <Label htmlFor="busy">
                  Len čas (busy/free)
                  <span className="text-muted-foreground text-sm block">
                    Kolegovia vidia len kedy ste obsadený
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="title" id="title" />
                <Label htmlFor="title">
                  Názov eventu
                  <span className="text-muted-foreground text-sm block">
                    Kolegovia vidia čas a názov
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full">
                  Všetky detaily
                  <span className="text-muted-foreground text-sm block">
                    Kolegovia vidia všetko vrátane popisu a miesta
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Farby pre používateľov

Každý používateľ má priradenú farbu pre jeho eventy:

```typescript
const USER_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
  { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800' },
];

function getUserColor(userId: string, allUserIds: string[]) {
  const index = allUserIds.indexOf(userId) % USER_COLORS.length;
  return USER_COLORS[index];
}
```

---

## Legenda

V pravom sidebari pridať legendu:

```
┌─────────────────────────────┐
│ Legenda                     │
├─────────────────────────────┤
│ 🔵 Dano                     │
│ 🟢 Katka                    │
│ 🟣 Optika                   │
│ ─────────────────────────── │
│ ⬜ ZITA TODO úlohy          │
│ 📅 Google Calendar          │
└─────────────────────────────┘
```

---

## API Rate Limiting

Google Calendar API má limity. Optimalizácie:

1. **Cache:** Uložiť eventy do cache na 5-10 minút
2. **Batch:** Načítať eventy všetkých používateľov paralelne
3. **Lazy loading:** Načítať eventy len viditeľného týždňa
4. **Background refresh:** Aktualizovať cache na pozadí

---

## Bezpečnosť a súkromie

- ✅ Používateľ musí explicitne povoliť zdieľanie
- ✅ Môže si vybrať úroveň detailov
- ✅ Môže kedykoľvek vypnúť zdieľanie
- ✅ Tokeny sú uložené bezpečne (len vlastné)
- ✅ Eventy sa načítavajú cez backend (nie priamo z frontendu)

---

## Testovanie

Po implementácii overiť:

- [ ] Používateľ môže povoliť/zakázať zdieľanie v Settings
- [ ] Výber úrovne viditeľnosti funguje
- [ ] Filter v Plánovacom view zobrazuje zdieľajúcich kolegov
- [ ] Eventy kolegov sa zobrazujú v kalendári
- [ ] Správna farba/štýl pre každého kolegu
- [ ] "Busy" mód ukazuje len obsadený čas bez názvu
- [ ] Používatelia ktorí nezdieľajú sú viditeľní ale disabled
- [ ] Legenda ukazuje kto je kto
- [ ] Výkon je akceptovateľný (caching)

---

## Odhadovaný čas

| Časť | Odhad |
|------|-------|
| DB migrácia + settings UI | 0.5 dňa |
| API endpoint pre team events | 1 deň |
| Team calendar filter komponent | 0.5 dňa |
| Vizuálne odlíšenie eventov | 1 deň |
| Legenda + polish | 0.5 dňa |
| Testovanie | 0.5 dňa |
| **Celkovo** | **~4 dni** |

---

*Vytvorené: 19. január 2026*
*Fáza: 4 z 4 (Google Calendar)*
*Prerekvizity: Fáza 2 dokončená*
