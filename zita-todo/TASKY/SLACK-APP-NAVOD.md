# Návod: Vytvorenie Slack App pre ZITA TODO

## Čo budeš potrebovať

- Admin prístup do vášho Slack workspace
- URL tvojej ZITA TODO aplikácie (napr. `https://zita-todo.vercel.app`)
- 15-20 minút času

---

## Krok 1: Vytvor novú Slack App

1. **Choď na:** https://api.slack.com/apps
2. **Klikni:** "Create New App"
3. **Vyber:** "From scratch"
4. **Vyplň:**
   - App Name: `ZITA TODO`
   - Pick a workspace: Vyber váš workspace (napr. "Optika ZITA")
5. **Klikni:** "Create App"

```
┌─────────────────────────────────────────┐
│ Create an app                           │
├─────────────────────────────────────────┤
│ App Name: [ZITA TODO            ]       │
│                                         │
│ Pick a workspace to develop your app:  │
│ [Optika ZITA                    ▼]      │
│                                         │
│              [Cancel] [Create App]      │
└─────────────────────────────────────────┘
```

---

## Krok 2: Nastav Basic Information

Po vytvorení sa dostaneš na stránku App. V ľavom menu:

1. **Klikni:** "Basic Information"
2. **Scrollni dole** na "App Credentials"
3. **Skopíruj a ulož tieto hodnoty:**
   - `Client ID` → do `.env.local` ako `SLACK_CLIENT_ID`
   - `Client Secret` → do `.env.local` ako `SLACK_CLIENT_SECRET`
   - `Signing Secret` → do `.env.local` ako `SLACK_SIGNING_SECRET`

```
┌─────────────────────────────────────────┐
│ App Credentials                         │
├─────────────────────────────────────────┤
│ Client ID:                              │
│ ┌─────────────────────────────────────┐ │
│ │ 1234567890.0987654321               │ │ ← Skopíruj
│ └─────────────────────────────────────┘ │
│                                         │
│ Client Secret:                          │
│ ┌─────────────────────────────────────┐ │
│ │ ••••••••••••••••••••••  [Show]      │ │ ← Klikni Show, skopíruj
│ └─────────────────────────────────────┘ │
│                                         │
│ Signing Secret:                         │
│ ┌─────────────────────────────────────┐ │
│ │ ••••••••••••••••••••••  [Show]      │ │ ← Klikni Show, skopíruj
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Krok 3: Nastav OAuth & Permissions

1. **V ľavom menu klikni:** "OAuth & Permissions"

2. **V sekcii "Redirect URLs" klikni:** "Add New Redirect URL"

3. **Pridaj URL:**
   ```
   https://zita-todo.vercel.app/api/slack/oauth
   ```
   (Nahraď `zita-todo.vercel.app` tvojou doménou)

4. **Klikni:** "Save URLs"

5. **Scrollni na "Scopes"**

6. **V časti "Bot Token Scopes" pridaj tieto scopes** (klikni "Add an OAuth Scope"):

| Scope | Popis |
|-------|-------|
| `channels:history` | Čítať správy v public kanáloch |
| `channels:read` | Vidieť zoznam kanálov |
| `chat:write` | Posielať správy |
| `commands` | Pridávať slash commands |
| `reactions:read` | Čítať emoji reakcie |
| `reactions:write` | Pridávať emoji reakcie |
| `users:read` | Čítať info o používateľoch |

```
┌─────────────────────────────────────────┐
│ Bot Token Scopes                        │
├─────────────────────────────────────────┤
│ [+ Add an OAuth Scope]                  │
│                                         │
│ ✓ channels:history                      │
│ ✓ channels:read                         │
│ ✓ chat:write                            │
│ ✓ commands                              │
│ ✓ reactions:read                        │
│ ✓ reactions:write                       │
│ ✓ users:read                            │
└─────────────────────────────────────────┘
```

---

## Krok 4: Vytvor Message Shortcut

Toto je to tlačidlo "Poslať do ZITA" v menu správy.

1. **V ľavom menu klikni:** "Interactivity & Shortcuts"

2. **Zapni:** "Interactivity" (prepni na ON)

3. **Vyplň "Request URL":**
   ```
   https://zita-todo.vercel.app/api/slack/interaction
   ```

4. **Scrollni na "Shortcuts"**

5. **Klikni:** "Create New Shortcut"

6. **Vyber:** "On messages"

7. **Vyplň:**
   - Name: `Poslať do ZITA`
   - Short Description: `Vytvorí úlohu v ZITA TODO z tejto správy`
   - Callback ID: `send_to_zita`

8. **Klikni:** "Create"

```
┌─────────────────────────────────────────┐
│ Create New Shortcut                     │
├─────────────────────────────────────────┤
│ Where should this shortcut appear?      │
│ ○ Global                                │
│ ● On messages  ← Vyber toto            │
├─────────────────────────────────────────┤
│ Name:                                   │
│ [Poslať do ZITA                    ]    │
│                                         │
│ Short Description:                      │
│ [Vytvorí úlohu v ZITA TODO z tejto ]    │
│ [správy                             ]   │
│                                         │
│ Callback ID:                            │
│ [send_to_zita                      ]    │
│                                         │
│              [Cancel] [Create]          │
└─────────────────────────────────────────┘
```

9. **Klikni:** "Save Changes" (vpravo dole)

---

## Krok 5: Nastav Event Subscriptions

Toto umožní Slacku posielať eventy (emoji reakcie) do ZITA.

1. **V ľavom menu klikni:** "Event Subscriptions"

2. **Zapni:** "Enable Events" (prepni na ON)

3. **Vyplň "Request URL":**
   ```
   https://zita-todo.vercel.app/api/slack/events
   ```
   
   ⚠️ **Poznámka:** Slack overí URL. Ak ešte nemáš endpoint deployed, urob najprv deploy!

4. **V sekcii "Subscribe to bot events" pridaj:**

| Event | Popis |
|-------|-------|
| `reaction_added` | Keď niekto pridá emoji |
| `reaction_removed` | Keď niekto odstráni emoji |

5. **Klikni:** "Save Changes"

```
┌─────────────────────────────────────────┐
│ Subscribe to bot events                 │
├─────────────────────────────────────────┤
│ [+ Add Bot User Event]                  │
│                                         │
│ ✓ reaction_added                        │
│ ✓ reaction_removed                      │
└─────────────────────────────────────────┘
```

---

## Krok 6: Nainštaluj App do Workspace

1. **V ľavom menu klikni:** "Install App"

2. **Klikni:** "Install to Workspace"

3. **Skontroluj oprávnenia** a klikni "Allow"

4. **Skopíruj "Bot User OAuth Token":**
   - Začína na `xoxb-`
   - Tento token použiješ na posielanie správ

```
┌─────────────────────────────────────────┐
│ OAuth Tokens for Your Workspace         │
├─────────────────────────────────────────┤
│ Bot User OAuth Token:                   │
│ ┌─────────────────────────────────────┐ │
│ │ xoxb-your-token-here...           │ │ ← Skopíruj
│ └─────────────────────────────────────┘ │
│ [Copy]                                  │
└─────────────────────────────────────────┘
```

---

## Krok 7: Pridaj App do kanálov

App musí byť pridaná do kanálov, ktoré chceš sledovať.

**Pre každý kanál (#objednavky-ramov, #reklamacie, #sluby-zakaznikom):**

1. Otvor kanál v Slacku
2. Klikni na názov kanála hore
3. Klikni na tab "Integrations"
4. Klikni "Add an App"
5. Nájdi "ZITA TODO" a pridaj

**Alebo cez príkaz:**
```
/invite @ZITA TODO
```

---

## Krok 8: Otestuj

1. **Choď do #testovaci-kanal**

2. **Napíš testovaciu správu:**
   ```
   Test Zákazník // 0905123456
   Testovacia objednávka
   ```

3. **Klikni na "..." (tri bodky) pri správe**

4. **V menu by si mal vidieť:** "Poslať do ZITA"

5. **Klikni na to** → Mal by sa vytvoriť task

```
┌─────────────────────────────────────┐
│ 📩 Správa                    ...    │
├─────────────────────────────────────┤
│ Test Zákazník // 0905123456         │
│ Testovacia objednávka               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ...                             │ │
│ │ ├─ Copy link                    │ │
│ │ ├─ Pin to channel               │ │
│ │ ├─ Poslať do ZITA  ← TU!        │ │
│ │ └─ ...                          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Súhrn Environment Variables

Pridaj do `.env.local`:

```env
# Slack App (z Kroku 2)
SLACK_CLIENT_ID=1234567890.0987654321
SLACK_CLIENT_SECRET=abcdef1234567890abcdef
SLACK_SIGNING_SECRET=1234567890abcdef1234567890

# Bot Token (z Kroku 6) - alebo uložený v DB
SLACK_BOT_TOKEN=your-slack-bot-token-here
```

---

## Troubleshooting

### "Request URL didn't respond correctly"
- Skontroluj, či je ZITA TODO deployed
- Skontroluj, či endpoint vracia 200 OK
- Pre Events endpoint musíš vrátiť `{ challenge: req.challenge }`

### Shortcut sa nezobrazuje
- Skontroluj, či je app nainštalovaná v workspace
- Skontroluj, či je app pridaná do kanála
- Skús refreshnúť Slack (Cmd+R / Ctrl+R)

### Emoji sync nefunguje
- Skontroluj Event Subscriptions (Krok 5)
- Skontroluj, či máš scope `reactions:read`
- Pozri logy v Supabase / Vercel

---

## Hotovo! 🎉

Teraz máš Slack App pripravenú. Pokračuj s implementáciou API endpointov v ZITA TODO.
