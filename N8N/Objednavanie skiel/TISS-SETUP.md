# TISS Optika - N8N Workflow Setup

## Prehľad workflow

```
Schedule (5 min) → TISS API → Filter (Paid + Phase 1) → Classify Products
    ↓
[Individualizácia?] → Log manuálne
    ↓
[Čistá výroba] → Transform → Aggregate → Compose Email → Gmail
    ↓
TISS API (Phase → 2) → Log výsledok
```

## 1. Import workflow do N8N

1. Otvor N8N dashboard
2. Klikni na **Import from File** alebo **Workflows → Import**
3. Nahraj súbor `tiss-optika-workflow.json`

## 2. Nastavenie Variables v N8N

V N8N choď do **Settings → Variables** a pridaj:

| Variable | Hodnota | Popis |
|----------|---------|-------|
| `TISS_TOKEN` | `tvoj-token-z-tiss` | API token od TISS administrátora |
| `EMAIL_TO` | `dano.grigar@gmail.com` | Testovací email (produkčne ESSILOR) |

## 3. Nastavenie Gmail Credentials

1. V N8N choď do **Credentials**
2. Pridaj **Gmail OAuth2** alebo **Gmail App Password**
3. V node "Odošli email (Gmail)" vyber tieto credentials

### Gmail OAuth2 (odporúčané)
- Vyžaduje Google Cloud projekt s Gmail API
- Bezpečnejšie pre produkciu

### Gmail App Password (jednoduchšie)
1. Zapni 2FA na Google účte
2. Vygeneruj App Password: Google Account → Security → App passwords
3. Použi email + app password ako credentials

## 4. Overenie API štruktúry

Pred spustením workflow otestuj TISS API manuálne:

```bash
curl "https://tiss.sk/api/?data=$(echo '{"Token":"TVOJ_TOKEN","Action":"orderSearch","DateFrom":"2024-12-01","DateTo":"2024-12-31"}' | jq -sRr @uri)"
```

### Dôležité: Overiť názvy polí

API dokumentácia ukazuje tieto polia pre optické parametre:
- `d_r_sd`, `d_l_sd` - sféra (možno `sph`)
- `d_r_cyl`, `d_l_cyl` - cylinder
- `d_r_os`, `d_l_os` - os
- `d_r_add`, `d_l_add` - add
- `d_r_pd`, `d_l_pd` - PD

**Ak sa nezhodujú**, uprav node "Klasifikuj produkty" - mapovanie v sekcii `optics`.

## 5. Testovanie

### A. Manuálne spustenie

1. V N8N klikni na workflow
2. Klikni **Execute Workflow**
3. Skontroluj výstupy jednotlivých nodes

### B. Test s mock dátami

Pre testovanie bez reálneho API môžeš dočasne nahradiť node "TISS - Získaj objednávky" za "Code" node s testovacími dátami:

```javascript
return {
  json: {
    Result: "OK",
    Orders: [
      {
        OrderNumber: "TEST001",
        ClientName: "Test Zákazník",
        IsPaid: true,
        Phase: 1,
        Items: [
          {
            Name: "Eyezen RX START Lineis 1,74 Crizal Sapphire HR EPS",
            Category: "Okuliarové šošovky > ESSILOR > Výroba"
          }
        ],
        d_r_sd: -2.00,
        d_r_cyl: -0.50,
        d_r_os: 180,
        d_l_sd: -1.75,
        d_l_cyl: -0.25,
        d_l_os: 175,
        d_r_pd: 32,
        d_l_pd: 31,
        Note: "Akcia 1+1 2. pár"
      }
    ]
  }
};
```

## 6. Produkčné nasadenie

### Checklist pred produkciou

- [ ] TISS_TOKEN je nastavený správne
- [ ] Gmail credentials fungujú
- [ ] Email príjemca zmenený na produkčný (ESSILOR)
- [ ] Interval triggeru je vhodný (5 min default)
- [ ] Overená štruktúra API odpovedí

### Zmena intervalu

V node "Schedule Trigger" môžeš zmeniť interval:
- Testovanie: 1 minúta
- Produkcia: 5-15 minút

## 7. Troubleshooting

### API vracia prázdne Orders

- Skontroluj DateFrom/DateTo rozsah
- Over či existujú objednávky vo fáze 1 so zaplatenou zálohou

### Email sa neodosiela

- Skontroluj Gmail credentials
- Over že aggregate node má dáta
- Pozri execution log

### Produkty nie sú správne klasifikované

Uprav keywords v node "Klasifikuj produkty":
```javascript
const INDIVIDUALIZATION_KEYWORDS = ['F360', 'eyecode', 'AVA', 'NVB', 'dominantné oko'];
const PRODUCTION_KEYWORD = 'Výroba';
```

### Zmena fázy nefunguje

- Over názov parametra (Phase vs Status vs Faza)
- Skontroluj API odpoveď v execution log

## 8. Rozšírenia

### Webhook trigger (namiesto pollingu)

Ak TISS podporuje webhooky, nahraď Schedule Trigger za Webhook:
1. Pridaj "Webhook" node
2. Nastav URL v TISS na volanie tohto webhooku pri zmene platby

### Notifikácie pri chybách

Pridaj node po "API Error Handler":
- Slack notification
- Email notification
- Discord webhook

### Viacerí dodávatelia

Pre iných dodávateľov ako ESSILOR:
1. Duplikuj transformačnú a email logiku
2. Pridaj filter na dodávateľa v kategórii produktu
