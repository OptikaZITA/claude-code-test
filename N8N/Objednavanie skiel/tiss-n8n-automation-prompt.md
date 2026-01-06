# Claude Code Prompt: TISS Optika → Email Automatizácia v N8N

## Kontext projektu

Vytváram automatizáciu pre optiku, ktorá používa systém TISS (https://tiss.sk). Cieľom je automaticky odosielať emailové objednávky dodávateľovi (ESSILOR) pre kategóriu "Čistá výroba" - cca 35% všetkých objednávok.

**Prostredie:**
- N8N: self-hosted
- Email: Gmail SMTP
- MCP server: pripojený cez Claude Code

---

## Biznis logika

### Kategorizácia produktov (3 typy):

#### 1. INDIVIDUALIZÁCIA → EXCLUDE (nerobiť nič)
- **Identifikácia:** Produkty v samostatnej kategórii (nie "Výroba")
- **Príklady:** F360, eyecode, AVA produkty
- **Akcia:** Zastaviť, vyžaduje manuálne spracovanie (formuláre, skenovanie)

#### 2. SKLADOVKY → IGNORE (nerobiť nič)
- **Identifikácia:** Kategória produktu obsahuje "sklad" (nie "Výroba")
- **Akcia:** Objednávajú sa cez OBS web, zatiaľ neriešiť

#### 3. ČISTÁ VÝROBA → TARGET (automatizovať)
- **Identifikácia:** Kategória produktu = "Výroba"
- **Akcia:** Odoslať email dodávateľovi

### Trigger podmienka:
- Zákazka je **zaplatená** (záloha uhradená = zelený indikátor v TISS)
- **Fáza zákazky = 1** (Vytvorená zákazka)

### Fázy zákaziek v TISS:
```
1 - Vytvorená zákazka      ← TRIGGER (ak je zaplatená záloha)
2 - Objednané sklá         ← CIEĽOVÝ STAV po automatizácii
3 - Priradené sklá
4 - Začiatok brúsenia
5 - Koniec brúsenia
6 - Brúsenie skontrolované
7 - Pripravené na vyzdvihnutie
8 - Ukončená zákazka
```

### Logika zmeny fázy:
- **Po úspešnom odoslaní emailu:** Zmeniť fázu z 1 → 2
- **ALE LEN AK:** Všetky sklá v zákazke sú automatizovateľné (čistá výroba)
- **Ak zákazka obsahuje mix** (napr. 1x čistá výroba + 1x individualizácia):
  - → NEodosielať email
  - → NECHať fázu na 1
  - → Vyžaduje manuálne spracovanie celej zákazky

---

## TISS API Informácie

**Dokumentácia:** https://tiss.sk/api/help/

**Autentifikácia:**
- Token-based (získať od TISS administrátora)
- Formát: JSON cez GET/POST parameter `data`

**Základný formát volania:**
```
https://tiss.sk/api/?data={"Token":"XXX","Action":"orderSearch","Attributes":[...]}
```

**Relevantné endpointy:**
- `orderSearch` - vyhľadanie zákaziek
- `orderEdit` - úprava zákazky (na označenie "odoslané")
- `getProduct` - detail produktu
- `getProductCategory` - kategórie produktov

**Predpokladaná štruktúra zákazky (na základe UI):**
```json
{
  "OrderID": "202527710",
  "OrderNumber": "C_202527710",
  "ClientName": "Michal Habaj",
  "ClientPhone": "0948513642",
  "Created": "16.12.2025 15:32:08",
  "Status": "paid|unpaid|...",
  "Items": [
    {
      "ProductName": "Eyezen RX START Lineis 1,74 Crizal Sapphire HR EPS",
      "ProductCategory": "Okuliarové šošovky > ESSILOR > Výroba",
      "Quantity": 2,
      "UnitPrice": 23.81
    }
  ],
  "OpticsCard": {
    "Distance": {
      "R": { "Sph": -10.50, "Cyl": -1.25, "Os": 100, "Add": null, "PD": 30, "Height": 30.5 },
      "L": { "Sph": -12.00, "Cyl": -1.50, "Os": 70, "Add": null, "PD": 31, "Height": 29.5 }
    },
    "Near": {
      "R": { "Sph": null, "Cyl": null, "Os": null },
      "L": { "Sph": null, "Cyl": null, "Os": null }
    }
  },
  "Notes": "AKCIA 1+1 2.pár\nDioptrie podľa receptu od lekára.",
  "PaymentStatus": "paid",
  "PaymentAmount": 100.00
}
```

---

## Požadovaný email formát

**Odosielateľ:** ahoj@zita.sk (Gmail)
**Príjemca:** dano.grigar@gmail.com (testovací, produkčne ESSILOR)
**Predmet:** Objednávka skiel - [názov optiky] - [dátum]

**Telo emailu (plain text):**
```
Krásný den,

poprosíme Vás objednat:

[Meno zákazníka]
Akcia 1+1 [typ akcie] k [číslo zákazky]
[Názov produktu] - [voliteľne farba]
P: [sféra] [cylinder] [os]
L: [sféra] [cylinder] [os]
ADD [hodnota]
Priemer: [hodnota]

---

[Ďalší zákazník ak je viac objednávok]

---

ďíky jira a vanhur
```

**Príklad reálneho emailu:**
```
Krásný den,

poprosíme Vás objednat:

Milan Ftáčnik
Akcia 1+1 Dodatočně k Z2437378
Eyezen RX START Transitions XTRACTIVE Ormix 1,6 Crizal Sapphire HR EPS - barva sivozelená
P: -2,25 -0,75 80
L: -0,75 -0,50 85
Priemer: 70

Mária Rojková
Akcia 1+1 2. pár k Z2437378
Varilux Digitime Ormix 1,6 Crizal Sapphire HR EPS STRED
P: 0,00 -0,50 172
L: -0,25 -0,50 155
ADD 0,75
Priemer: 60/65

díky jira a vanhur
```

---

## N8N Workflow požiadavky

### Štruktúra workflow:

```
[1. TRIGGER] - Polling každých X minút
    │
    ▼
[2. TISS API - Získaj zákazky vo fáze 1 so zaplatenou zálohou]
    │
    ▼
[3. LOOP - Pre každú zákazku]
    │
    ▼
[4. CHECK - Obsahuje zákazka produkty v kategórii "Výroba"?]
    │   │
    │   ├── NIE → SKIP
    │   │
    │   └── ÁNO → CONTINUE
    │
    ▼
[5. TRANSFORM - Extrahovať údaje pre email]
    │
    ▼
[6. AGGREGATE - Zoskupiť objednávky do emailu]
    │
    ▼
[7. COMPOSE & SEND EMAIL (Gmail)]
    │
    ▼
[8. TISS API - Zmeniť fázu z 1 → 2 (orderEdit)]
    │
    ▼
[9. LOG - Zaznamenať úspešné spracovanie]
```

### Detaily jednotlivých krokov:

#### 1. TRIGGER
**Možnosť A (preferovaná):** Webhook z TISS pri zmene stavu platby
**Možnosť B (fallback):** Schedule Trigger - každých 5-15 minút polling

#### 2. TISS API Node
- HTTP Request node
- Method: GET alebo POST
- URL: `https://tiss.sk/api/`
- Query: `data` parameter s JSON

#### 3-5. FILTER Nodes
- IF node pre kontrolu platby
- IF node pre vylúčenie individualizácie
- IF node pre identifikáciu výroby

#### 6. TRANSFORM (Code node)
```javascript
// Extrahovať a formátovať údaje pre email
const item = $input.item.json;

return {
  customerName: item.ClientName,
  orderNumber: item.OrderNumber,
  action: extractAction(item.Notes), // "Akcia 1+1 2. pár" atď.
  productName: item.Items[0].ProductName,
  rightEye: {
    sph: item.OpticsCard.Distance.R.Sph,
    cyl: item.OpticsCard.Distance.R.Cyl,
    os: item.OpticsCard.Distance.R.Os
  },
  leftEye: {
    sph: item.OpticsCard.Distance.L.Sph,
    cyl: item.OpticsCard.Distance.L.Cyl,
    os: item.OpticsCard.Distance.L.Os
  },
  add: item.OpticsCard.Distance.R.Add,
  pd: item.OpticsCard.Distance.R.PD,
  height: item.OpticsCard.Distance.R.Height
};
```

#### 8. COMPOSE EMAIL (Code node)
```javascript
// Skomponovať telo emailu
const orders = $input.all();
let emailBody = "Krásný den,\n\npoprosíme Vás objednat:\n\n";

for (const order of orders) {
  const o = order.json;
  emailBody += `${o.customerName}\n`;
  emailBody += `${o.action} k ${o.orderNumber}\n`;
  emailBody += `${o.productName}\n`;
  emailBody += `P: ${o.rightEye.sph} ${o.rightEye.cyl} ${o.rightEye.os}\n`;
  emailBody += `L: ${o.leftEye.sph} ${o.leftEye.cyl} ${o.leftEye.os}\n`;
  if (o.add) emailBody += `ADD ${o.add}\n`;
  emailBody += `Priemer: ${o.pd}\n\n`;
}

emailBody += "díky jira a vanhur";

return { emailBody };
```

#### 9. Gmail Node
- Credentials: Gmail OAuth2 alebo App Password
- To: dano.grigar@gmail.com
- Subject: `Objednávka skiel - Optika Zita - {{ $now.format('DD.MM.YYYY') }}`
- Body: `{{ $json.emailBody }}`

#### 10. TISS API - Zmena fázy (HTTP Request)
Po úspešnom odoslaní emailu zavolať `orderEdit` na zmenu fázy:
```
POST https://tiss.sk/api/
data={
  "Token": "XXX",
  "Action": "orderEdit",
  "OrderID": "202527899",
  "Phase": 2
}
```
**Poznámka:** Presný názov parametra pre fázu treba overiť v API (môže byť "Phase", "Status", "Faza" atď.)

---

## Úlohy pre Claude Code

### Fáza 1: Preskúmanie API
1. Otestuj TISS API s reálnym tokenom
2. Zdokumentuj skutočnú štruktúru odpovede `orderSearch`
3. Zisti, aké filtre sú dostupné (platba, dátum, stav)
4. Over, či existuje webhook možnosť

### Fáza 2: Vytvorenie N8N Workflow
1. Vytvor základný workflow JSON
2. Nakonfiguruj HTTP Request node pre TISS API
3. Implementuj filtrovaciu logiku
4. Vytvor email composing logiku
5. Nastav Gmail node

### Fáza 3: Testovanie
1. Otestuj s reálnymi dátami
2. Over formát emailu
3. Pridaj error handling
4. Pridaj logging

### Fáza 4: Produkcia
1. Nahraď testovací email produkčným
2. Nastav vhodný trigger interval
3. Pridaj notifikácie pri chybách

---

## Konfiguračné premenné

```json
{
  "TISS_API_URL": "https://tiss.sk/api/",
  "TISS_TOKEN": "{{získať od administrátora}}",
  "EMAIL_TO": "dano.grigar@gmail.com",
  "EMAIL_FROM_NAME": "Optika Zita",
  "CATEGORY_PRODUCTION": "Výroba",
  "CATEGORY_STOCK": "sklad"
}
```

---

## Príklady reálnych produktov z TISS

### ✅ ČISTÁ VÝROBA (automatizovať):
```
Eyezen RX START Lineis 1,74 Crizal Sapphire HR EPS
Eyezen RX START Transitions XTRACTIVE Ormix 1,6 Crizal Sapphire HR EPS - sivozelená
Varilux Digitime Ormix 1,6 Crizal Sapphire HR EPS STRED
```
- Kategória: "Okuliarové šošovky ▸ ESSILOR ▸ Výroba"
- Obsahujú "RX" alebo sú v kategórii "Výroba"
- NEobsahujú F360, eyecode, AVA

### ❌ INDIVIDUALIZÁCIA (nerobiť nič):
```
Varilux XR PRO Ormix 1,6 Crizal Sapphire HR (F360+eyecode+NVB+dominantné oko)
Varilux XR PRO Stylis 1,67 Crizal Sapphire HR EPS (F360+eyecode+NVB+dominantné oko)
```
- Obsahujú "(F360+eyecode+...)" v názve
- Vyžadujú manuálne formuláre a skenovanie

### ⏸️ SKLADOVKY (ignorovať):
- Produkty v kategórii "sklad"
- Objednávajú sa cez OBS web

---

## Dôležité poznámky

1. **PD a Výška:** Vždy posielať, aj pre jednoohniskové sklá - dodávateľ ignoruje ak nepotrebuje

2. **Priemer:** Formát môže byť "70" alebo "60/65" (rôzne pre P a L)

3. **Akcia:** Extrahovať z poznámky - "AKCIA 1+1 2.pár", "Akcia 1+1 Dodatočně" atď.

4. **Viac objednávok:** Môžu byť zoskupené do jedného emailu

5. **Budúce rozšírenie:** Možnosť pridať ďalších dodávateľov (nie len ESSILOR)

---

## Začni s:

1. Najprv sa pripoj na TISS API a over štruktúru dát
2. Potom vytvor minimálny workflow, ktorý:
   - Načíta jednu zákazku
   - Vypíše jej štruktúru do logu
3. Postupne pridávaj logiku

Ak narazíš na problém s API štruktúrou, konzultuj so mnou - upravíme prompt.
