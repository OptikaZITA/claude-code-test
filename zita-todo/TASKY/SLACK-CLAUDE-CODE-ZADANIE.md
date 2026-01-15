# ZITA TODO - Slack Integrácia
## Zadanie pre Claude Code

---

## Kontext

ZITA TODO je Next.js 16+ aplikácia s Supabase backendom. Potrebujeme pridať Slack integráciu, ktorá umožní:
1. Vytvárať tasky zo Slack správ
2. Synchronizovať statusy medzi ZITA a Slackom
3. Posielať notifikácie do Slacku

**Dokumentácia:** Pozri CLAUDE.md pre kompletný kontext projektu.

---

## Úloha 1: API Endpointy pre Slack

### Vytvor tieto súbory:

```
app/api/slack/
├── interaction/route.ts    # Slack shortcut/interakcie
├── events/route.ts         # Slack eventy (emoji, správy)
├── oauth/route.ts          # OAuth callback pre pripojenie
└── notify/route.ts         # Odosielanie správ do Slacku
```

---

### 1.1 `/api/slack/interaction/route.ts`

**Účel:** Spracovať Slack shortcut "Poslať do ZITA"

**Request od Slacku:**
```typescript
// Slack posiela application/x-www-form-urlencoded
// s `payload` JSON stringom

interface SlackInteractionPayload {
  type: 'shortcut' | 'message_action' | 'view_submission';
  callback_id: string;
  trigger_id: string;
  user: {
    id: string;
    username: string;
    name: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  message?: {
    ts: string;
    text: string;
    user: string;
    permalink?: string;
  };
  team: {
    id: string;
    domain: string;
  };
}
```

**Logika:**
1. Verifikuj Slack signing secret
2. Parsuj payload
3. Ak `type === 'message_action'`:
   - Získaj konfiguráciu kanála z `slack_channel_configs`
   - Ak konfigurácia existuje → vytvor task
   - Ak nie → vráť error modal
4. Pošli reply do Slack threadu
5. Vráť 200 OK

**Vytvorenie tasku:**
```typescript
const task = {
  title: parseTitle(message.text, channelConfig),
  notes: formatNotes(message),
  user_id: getCurrentUserId(), // alebo system user
  organization_id: channelConfig.organization_id,
  area_id: channelConfig.area_id,
  project_id: channelConfig.project_id,
  assignee_id: channelConfig.default_assignee_id,
  priority: channelConfig.default_priority,
  when_type: 'today',
  deadline: addDays(new Date(), channelConfig.default_deadline_days),
  source: 'slack',
  source_url: message.permalink,
};
```

---

### 1.2 `/api/slack/events/route.ts`

**Účel:** Spracovať Slack eventy (emoji reakcie)

**Request od Slacku:**
```typescript
interface SlackEventPayload {
  type: 'url_verification' | 'event_callback';
  challenge?: string;  // Pre URL verification
  event?: {
    type: 'reaction_added' | 'reaction_removed';
    user: string;
    reaction: string;  // emoji name bez ":"
    item: {
      type: 'message';
      channel: string;
      ts: string;
    };
  };
  team_id: string;
}
```

**Logika:**
1. Ak `type === 'url_verification'` → vráť `{ challenge }`
2. Verifikuj Slack signing secret
3. Ak `event.type === 'reaction_added'`:
   - Nájdi task podľa `slack_task_links` (channel + ts)
   - Mapuj emoji na status:
     ```
     📋 (clipboard) → backlog
     🔄 (arrows_counterclockwise) → in_progress  
     👀 (eyes) → review
     ✅ (white_check_mark) → done
     ❌ (x) → canceled
     ```
   - Aktualizuj task status
4. Vráť 200 OK

---

### 1.3 `/api/slack/oauth/route.ts`

**Účel:** OAuth callback po pripojení Slack workspace

**Query params:** `code`, `state`

**Logika:**
1. Exchange `code` za access token cez Slack OAuth API
2. Ulož token do `slack_workspace_connections`
3. Redirect na `/settings?slack=connected`

---

### 1.4 `/api/slack/notify/route.ts`

**Účel:** Interný endpoint pre posielanie správ do Slacku

**Request:**
```typescript
interface NotifyRequest {
  type: 'task_created' | 'status_changed' | 'deadline_warning' | 'overdue';
  task_id: string;
  channel_id?: string;  // Ak nie je, použije sa kanál z slack_task_links
  user_id?: string;     // Pre DM
}
```

**Logika:**
1. Načítaj task a slack_task_link
2. Načítaj bot token z `slack_workspace_connections`
3. Podľa `type` vytvor správu:
   - `task_created`: "✅ Task vytvorený: [názov]"
   - `status_changed`: Pridaj emoji + reply
   - `deadline_warning`: "⚠️ Deadline o X dní"
   - `overdue`: "🚨 Task je po deadline!"
4. Pošli cez Slack API (`chat.postMessage` alebo `reactions.add`)
5. Zaloguj do `slack_notification_logs`

---

## Úloha 2: Slack Utility funkcie

### Vytvor: `lib/slack/index.ts`

```typescript
// Verifikácia Slack requestov
export function verifySlackRequest(
  signature: string,
  timestamp: string,
  body: string,
  signingSecret: string
): boolean;

// Parsovanie názvu tasku zo správy
export function parseTaskTitle(
  messageText: string,
  channelName: string
): string;

// Formátovanie poznámok
export function formatTaskNotes(
  message: SlackMessage,
  permalink: string
): string;

// Mapovanie emoji na status
export function emojiToStatus(emoji: string): TaskStatus | null;

// Mapovanie status na emoji
export function statusToEmoji(status: TaskStatus): string;

// Slack API client
export class SlackClient {
  constructor(botToken: string);
  
  async postMessage(channel: string, text: string, threadTs?: string): Promise<void>;
  async addReaction(channel: string, timestamp: string, emoji: string): Promise<void>;
  async removeReaction(channel: string, timestamp: string, emoji: string): Promise<void>;
  async getPermalink(channel: string, timestamp: string): Promise<string>;
}
```

---

## Úloha 3: UI Komponenty

### 3.1 `components/integrations/slack-integration-settings.tsx`

**Účel:** Nastavenia Slack integrácie v Settings

**Funkcie:**
- Zobraziť stav pripojenia (pripojené/nepripojené)
- Tlačidlo "Pripojiť Slack" (OAuth flow)
- Zoznam nakonfigurovaných kanálov
- Pridať/upraviť/odstrániť konfiguráciu kanála

**UI:**
```
┌─────────────────────────────────────────────────────┐
│ Slack integrácia                                    │
├─────────────────────────────────────────────────────┤
│ Stav: ✅ Pripojené (Optika ZITA workspace)          │
│ [Odpojiť]                                           │
├─────────────────────────────────────────────────────┤
│ Sledované kanály:                                   │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ #objednavky-ramov              [Upraviť] [🗑️]  │ │
│ │ → Prevádzka / Objednávky                        │ │
│ │ → Deadline: +7 dní | Assignee: Naty             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [+ Pridať kanál]                                    │
├─────────────────────────────────────────────────────┤
│ Notifikácie:                                        │
│ ☑️ Pri vytvorení tasku                             │
│ ☑️ Pri nečinnosti (po 2 dňoch)                     │
│ ☑️ Pred deadline (5 dní)                           │
└─────────────────────────────────────────────────────┘
```

---

### 3.2 `components/integrations/slack-channel-config-modal.tsx`

**Účel:** Modal pre pridanie/úpravu konfigurácie kanála

**Props:**
```typescript
interface Props {
  isOpen: boolean;
  onClose: () => void;
  config?: SlackChannelConfig;  // undefined = nový
  onSave: (config: SlackChannelConfig) => void;
}
```

**Polia:**
- Slack kanál (dropdown z dostupných kanálov)
- Oddelenie (dropdown)
- Projekt (dropdown, filtrovaný podľa oddelenia)
- Default assignee (dropdown)
- Default deadline (number input, dni)
- Default priorita (dropdown)
- Použiť AI parsing (checkbox)

---

## Úloha 4: Hooks

### `lib/hooks/use-slack-integration.ts`

```typescript
export function useSlackConnection() {
  // Vráti stav pripojenia Slack workspace
  return {
    isConnected: boolean;
    workspace: SlackWorkspaceConnection | null;
    isLoading: boolean;
    connect: () => void;  // Spustí OAuth flow
    disconnect: () => Promise<void>;
  };
}

export function useSlackChannelConfigs() {
  // CRUD pre konfigurácie kanálov
  return {
    configs: SlackChannelConfig[];
    isLoading: boolean;
    createConfig: (config: Partial<SlackChannelConfig>) => Promise<void>;
    updateConfig: (id: string, config: Partial<SlackChannelConfig>) => Promise<void>;
    deleteConfig: (id: string) => Promise<void>;
  };
}
```

---

## Úloha 5: Cron Job pre notifikácie

### `app/api/cron/slack-notifications/route.ts`

**Účel:** Denne kontrolovať tasky a posielať notifikácie

**Spúšťanie:** Vercel Cron alebo externý scheduler (denne o 9:00)

**Logika:**
1. Načítaj všetky tasky so `source = 'slack'` a `status != 'done'`
2. Pre každý task skontroluj:
   - Ak `updated_at` > 2 dni → pošli "bez aktivity" notifikáciu
   - Ak deadline o 5 dní → pošli "blíži sa deadline"
   - Ak deadline < dnes → pošli "po deadline"
3. Zaloguj všetky notifikácie

---

## Environment Variables

Pridaj do `.env.local`:

```env
# Slack App credentials
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret

# Voliteľné - pre AI parsing
OPENAI_API_KEY=your_openai_key
```

---

## TypeScript Typy

Pridaj do `types/index.ts`:

```typescript
// Slack Channel Config
export interface SlackChannelConfig {
  id: string;
  organization_id: string;
  slack_channel_id: string;
  slack_channel_name: string;
  area_id: string | null;
  project_id: string | null;
  default_assignee_id: string | null;
  default_deadline_days: number;
  default_priority: 'low' | 'medium' | 'high' | 'urgent';
  use_ai_parsing: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Slack Task Link
export interface SlackTaskLink {
  id: string;
  task_id: string;
  slack_channel_id: string;
  slack_message_ts: string;
  slack_thread_ts: string | null;
  slack_team_id: string | null;
  slack_user_id: string | null;
  slack_user_name: string | null;
  slack_permalink: string | null;
  original_text: string | null;
  last_synced_at: string;
  last_zita_status: string | null;
  last_slack_emoji: string | null;
  created_at: string;
}

// Slack Workspace Connection
export interface SlackWorkspaceConnection {
  id: string;
  organization_id: string;
  slack_team_id: string;
  slack_team_name: string | null;
  slack_bot_token: string;
  slack_bot_user_id: string | null;
  is_active: boolean;
  connected_by: string | null;
  connected_at: string;
}

// Task source extension
export type TaskSource = 'manual' | 'slack' | 'email' | 'api';
```

---

## Poradie implementácie

1. **Najprv:** SQL migrácia (spusti v Supabase)
2. **Potom:** TypeScript typy
3. **Potom:** `lib/slack/index.ts` utility
4. **Potom:** API endpointy (interaction → events → oauth → notify)
5. **Potom:** Hooks
6. **Potom:** UI komponenty
7. **Nakoniec:** Cron job

---

## Testovanie

1. Vytvor Slack App (pozri SLACK-APP-NAVOD.md)
2. Nastav webhook URL na `https://your-domain.vercel.app/api/slack/interaction`
3. Pridaj shortcut "Poslať do ZITA"
4. Otestuj na #testovaci-kanal
