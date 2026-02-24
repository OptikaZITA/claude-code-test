# eyekido — Automatizácia lekárskych správ (n8n workflow)

## Kompletný súhrn projektu | Stav k 24.02.2026

---

## 📋 Prehľad projektu

**Cieľ:** Automaticky spracovať lekárske správy z detského očného centra eyekido — extrahovať dáta z PDF, preformulovať odporúčania do zrozumiteľnej formy pre rodičov, zašifrovať PDF a odoslať email rodičovi.

**Platforma:** n8n (self-hosted na `optikazita.app.n8n.cloud`)
**Workflow:** "Eyekido - Medical Report → Encrypted PDF → Email to Parent"
**URL:** `https://optikazita.app.n8n.cloud/workflow/ABWvp2MqoACljuuk`

---

## 🏗️ Architektúra workflow (14 nodov)

```
Google Drive Trigger → Google Drive - Download PDF → Extract From File →
Code - Build AI Request → HTTP Request - AI Extract Data (Claude API) →
Code - Parse Extracted Data → Code - Build Rewrite Request →
HTTP Request - AI Rewrite Recommendations (Claude API) →
Code - Merge Data → Code - Pass Binary Forward →
HTTP Request - Encrypt PDF (GCP Cloud Function) →
Code - Prepare Attachment → Gmail - Send Email → Google Drive - Move file
```

### Detailný popis nodov:
1. **Google Drive Trigger** — monitoruje priečinok "Lekárske správy" na Google Drive, credential: Google Drive account 2
2. **Google Drive - Download PDF** — stiahne PDF podľa ID z triggera (`{{ $json.id }}`)
3. **Extract From File** — extrahuje text z PDF (Extract From PDF)
4. **Code - Build AI Request** — zostaví request pre Claude API na extrakciu štruktúrovaných dát
5. **HTTP Request - AI Extract Data** — POST na `https://api.anthropic.com/v1/messages` (Claude Sonnet), extrahuje: meno dieťaťa, rodné číslo, email rodiča, diagnózu, odporúčania, dátum vyšetrenia
6. **Code - Parse Extracted Data** — parsuje JSON odpoveď, obsahuje regex fallback na email, počíta heslo (posledné 4 číslice RČ)
7. **Code - Build Rewrite Request** — zostaví prompt pre Claude na preformulovanie odporúčaní do ľudskej reči
8. **HTTP Request - AI Rewrite** — Claude prepíše lekárske odporúčania zrozumiteľne pre rodiča
9. **Code - Merge Data** — zlúči extrahované dáta s preformulovanými odporúčaniami
10. **Code - Pass Binary Forward** — prenesie binárne PDF dáta ďalej
11. **HTTP Request - Encrypt PDF** — POST na GCP Cloud Function, zašifruje PDF heslom (posledné 4 číslice RČ)
12. **Code - Prepare Attachment** — pripraví prílohu pre Gmail
13. **Gmail - Send Email** — odošle email rodičovi s HTML šablónou a zaheslovaným PDF
14. **Google Drive - Move file** — presunie spracované PDF do priečinka "SPRACOVANE" (NOVÉ)

---

## ✅ Vyriešené problémy

### 1. Email extraction bug ("Invalid email address")
- **Symptóm:** Gmail node padal s "Invalid email address '' in the 'To' field"
- **Root cause:** TISS systém negeneruje email rodiča do PDF textovej vrstvy. Email bol buď úplne chýbajúci, alebo pridaný ako Mac Preview anotácia (neextrahovateľná)
- **Riešenie:** Email musí byť v textovej vrstve PDF. Regex fallback v kóde je správny (riadky 28-33 v Code - Parse Extracted Data), ale potrebuje email v texte
- **Code - Parse Extracted Data** — regex fallback:
```javascript
if (!data.email_rodica || data.email_rodica === '' || data.email_rodica === null) {
  const pdfText = $('Extract From File').first().json.text || '';
  const emailMatch = pdfText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    data.email_rodica = emailMatch[0];
  }
}
```

### 2. Pinned data v Google Drive Trigger
- **Symptóm:** Workflow stále spracovával staré PDF namiesto nového
- **Root cause:** n8n má funkciu "pinned data", ktorá cachuje výstup nodu z posledného behu
- **Riešenie:** Unpin data cez "Unpin workflow data" dialóg na trigger node

### 3. Move file node — validačná chyba
- **Symptóm:** "The workflow has issues and cannot be executed" — všetky executions zlyhávali za 30-41ms
- **Root cause:** n8n validoval File ID v Move node ešte pred spustením, ale ID bolo expression z triggera (neexistovalo v editor móde)
- **Riešenie:** Prepnúť File pole na Expression mode s `{{ $('Google Drive Trigger').first().json.id }}` — validácia prejde keď sú dostupné dáta z predchádzajúcich nodov

### 4. Move file — File not found (404)
- **Symptóm:** "File not found: 10Vep5c8bM_Nf9J_BO5oSODs7MqGa0eGC"
- **Root cause:** Predošlý úspešný beh presunul PDF do SPRACOVANE, ale pinned trigger data stále referencovali starý (presunutý) súbor
- **Riešenie:** Normálne správanie — každé PDF sa spracuje práve raz, potom sa presunie. Nový beh vyžaduje nový upload

### 5. Branding — "eyekido" s malým "e"
- **Zmena:** V Code - Build Rewrite Request: `"Si priateľská asistentka detskej očnej kliniky Eyekido"` → `"eyekido"`
- Gmail Subject a HTML Message už boli správne s malým "e"

---

## 📧 Email šablóna — nový dizajn (ROZPRACOVANÉ)

### Aktuálny stav
Vytvorená nová HTML email šablóna (v3) podľa eyekido brand guidelines.

### Šablóna v3 — dizajnové princípy (z brand guideline)
- **Primárna farba:** oranžová `#FF5420` (Normal Red z guidelines)
- **Pozadie emailu:** Light Sand `#FFF4D0`
- **Footer:** Dark Grey `#726C58`
- **Písmo:** Studio Feixen Edgy (na webe), v emaile fallback na Segoe UI / Arial
- **Tón komunikácie:** odborný, ľudský, hravý, so štipkou športu
- **Brand paleta (z guidelines):**
  - Dark: Grey #726C58, Red #AA0000, Purple #751DD3, Sand #BC8000, Orange #FF7700, Green #007500, Blue #00369D, Pink #B7008E
  - Normal: Red #FF5420, Purple #A769F6, Sand #EFCD96, Orange #FF9A00, Green #00BA3E, Blue #72D0FF, Pink #FFAADE
  - Light: Sand #FFF4D0, Green #ABEC93, Purple #CDACFF, Red #FFADA8, Orange #FFE815

### Štruktúra emailu
1. **Header** — oranžový (#FF5420) na celú šírku, biele logo eyekido, "Očné centrum pre deti"
2. **Body** — pozdrav s menom rodiča, info o prílohe
3. **Password box** — Light Sand pozadie, info o zaheslovaní PDF
4. **Odporúčania lekárky** — box s oranžovým akcentom, preformulované odporúčania
5. **Podpis lekárky** — okrúhla fotka + meno: MUDr. Petra Hlaváčová, PhD., FEBO (Detská oftalmologička, eyekido)
6. **Closing** — "Tím eyekido" v oranžovej
7. **Footer** — Dark Grey, logo, adresa (Pradiareň — Svätoplukova 2A), kontakty

### N8n premenné v šablóne
```
{{ $json.krstne_meno_rodica }}    — krstné meno rodiča
{{ $json.meno_dietata }}           — celé meno dieťaťa  
{{ $json.datum_vysetrenia }}       — dátum vyšetrenia
{{ $json.odporucania_html }}       — preformulované odporúčania (z AI Rewrite)
```

### Gmail node nastavenia
- **Email Type:** HTML
- **Subject:** `Lekárska správa z vyšetrenia — {{ $json.meno_dietata }} | eyekido`
- **Message:** HTML šablóna (celý kód)
- **To:** `{{ $json.email_rodica }}`

### Súbory šablóny
- `eyekido_email_v3.html` — produkčná šablóna s n8n premennými (na vloženie do Gmail node)
- `eyekido_email_PREVIEW.html` — náhľad s vloženým base64 logom a vzorovými dátami (na kontrolu v prehliadači)

---

## 🖼️ Hosting obrázkov pre email — NEDOKONČENÉ

### Problém
Logo a fotka lekárky musia byť na verejnej HTTPS URL, aby sa zobrazili v emailových klientoch.

### Plánované riešenie: Google Cloud Storage
- **Bucket:** `eyekido-assets` (vytvorený v GCP projekte `eyekido-lekarske-spravy`)
- **Problém:** Organizačná politika GCP blokuje verejný prístup (`Public access prevention enforced at organisation level`) — nemožno pridať `allUsers` s `Storage Object Viewer` rolou
- **Stav:** ZABLOKOVANÉ

### Alternatívne riešenie
Požiadať developera (BRACKETS / khn office, martin@khn.sk) o upload 2 súborov na eyekido.sk:
- `eyekido_logotype_central_RGB_10-30_white.png` → `https://eyekido.sk/images/email/eyekido_logotype_central_RGB_10-30_white.png`
- `petra-cropped.webp` → `https://eyekido.sk/images/email/petra-cropped.webp`

### Obrázky zatiaľ dostupné online (z eyekido.sk)
- Fotka Petry: `https://eyekido.sk/images/our-team/petra-cropped.webp`
- Banner ambulancie: `https://eyekido.sk/images/home/room/room_pyuld9_c_scale,w_1800.webp`
- Banner vyšetrovne: `https://eyekido.sk/images/home/vysetrovna/eyekido-office_jhtz7j_c_scale,w_1320.webp`

### Keď budú URL obrázkov hotové
V `eyekido_email_v3.html`:
1. Nahradiť textové "eyekido" v headeri za: `<img src="https://FINALNA-URL/eyekido_logotype_central_RGB_10-30_white.png" alt="eyekido" width="180">`
2. Fotka Petry už ukazuje na: `https://eyekido.sk/images/our-team/petra-cropped.webp` (funguje)
3. Skopírovať celý HTML do Gmail node → Message field

---

## 📄 Testovacie PDF súbory

### TISS PDF s emailom (pre testovanie workflow)
Vytvorené 3 TISS PDF s pridaným `ahoj@zita.sk` vedľa mena rodiča v textovej vrstve:

| Súbor | Dieťa | Rodič | RČ | Heslo (posledné 4) |
|-------|-------|-------|----|-----|
| `TISS_s_emailom.pdf` | Tamia Majerák | Katarína Majerák | 1553139005 | 9005 |
| `TISS2_s_emailom.pdf` | Karolina Hamosova | Viera Hamosova | 1459049064 | 9064 |
| `TISS3_s_emailom.pdf` | Nina Viktória Petrovič | Veronika Fričová | 2053099081 | 9081 |

Všetky PDF sú reálne TISS exporty s pridaným emailom overlay (text "/ ahoj@zita.sk" vedľa mena rodiča na strane 1).

### Postup testovania
1. Nahrať PDF do priečinka "Lekárske správy" na Google Drive
2. Počkať na automatický trigger (workflow je Active)
3. Skontrolovať v Executions tabe úspešný beh
4. Overiť email na ahoj@zita.sk
5. Overiť presun PDF do priečinka "SPRACOVANE"

---

## ⚠️ Známe bugy a TODO

### Otvorené bugy (z pôvodnej dokumentácie, neadresované)
- **BUG 1:** Password prefix "=" v HTTP Request - Encrypt PDF
- **BUG 2:** Gmail To field prefix "="
- **BUG 3:** Gmail credential verification (vysetrenie@eyekido.sk vs optika@zita.sk)

### TODO — email šablóna
- [ ] Vyriešiť hosting obrázkov (GCS bucket alebo eyekido.sk)
- [ ] Nahrať biele logo PNG na verejnú URL
- [ ] Aktualizovať HTML šablónu s finálnymi URL obrázkov
- [ ] Vložiť finálnu šablónu do Gmail node
- [ ] Otestovať zobrazenie v Gmail, Apple Mail, Outlook
- [ ] Zvážiť dynamickú fotku lekárky (keď pribudnú ďalšie lekárky)

### TODO — produkcia
- [ ] TISS integrácia — email rodiča musí byť v textovej vrstve PDF (nie anotácia)
- [ ] Error handling — ak email extraction zlyhá, poslať notifikáciu namiesto crashu
- [ ] Overiť šifrovanie PDF v rôznych PDF čítačkách
- [ ] Monitorovať automatický trigger a Move node v produkcii

---

## 📁 Súbory a credentials

### Google Drive štruktúra
- **Lekárske správy/** — zdrojový priečinok (monitorovaný trigger nodom)
- **SPRACOVANE/** — cieľový priečinok pre spracované správy

### GCP projekt
- **Projekt:** `eyekido-lekarske-spravy` (project ID: `eyekido-lekarske-spravy`)
- **Cloud Function:** encrypt-pdf (šifrovanie PDF)
- **Cloud Storage bucket:** `eyekido-assets` (vytvorený, ale verejný prístup blokovaný org policy)

### Credentials v n8n
- **Google Drive account 2** — pre trigger, download, move
- **Gmail** — pre odosielanie emailov (aktuálne optika@zita.sk, v produkcii vysetrenie@eyekido.sk)
- **Anthropic API** — pre Claude AI (extrakcia dát + rewrite odporúčaní)

### Brand guidelines
- **Dizajn manuál:** `Eyekido_design-guideline_04-03-2024.pdf` (od khn office)
- **Písmo:** Studio Feixen Edgy (Regular + Semibold) — OpenType features: ss01, ss03, ss04, ss05, ss10
- **Web:** https://eyekido.sk
- **Developer:** BRACKETS (www.meetbrackets.com)
- **Brand dizajn:** khn office (martin@khn.sk)

### Code - Build Rewrite Request (aktuálny kód)
```javascript
const data = $input.first().json;
const requestBody = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1500,
  temperature: 0.3,
  messages: [
    {
      role: 'user',
      content: `Si priateľská asistentka detskej očnej kliniky eyekido. Preformuluj nasledujúce lekárske odporúčania do zrozumiteľnej formy pre rodiča. Použi jednoduchý, ľudský jazyk bez odborných termínov (ale zachovaj podstatu a všetky konkrétne inštrukcie). Nepoužívaj odrážky ani formátovanie - píš plynulým textom, prehľadne, v krátkych odsekoch. Píš v slovenčine. Nepridávaj žiadny úvod ani záver, len preformulované odporúčania.
Originálne odporúčania lekárky:
${data.odporucania || ''}
Diagnóza:
${data.diagnoza || ''}
Doporučená kontrola:
${data.doporucena_kontrola || ''}`
    }
  ]
};
return [{ json: { ...data, requestBody } }];
```

---

## 🕐 Chronológia sessions

### Session 1 (23.02.2026, ~20:00-21:00)
- Identifikácia "Invalid email address" bugu
- Analýza workflow architektúry
- Zistenie, že email nie je v PDF textovej vrstve

### Session 2 (23.02.2026, ~21:00-23:00)  
- Vytvorenie testovacích PDF s emailom
- Unpin trigger data
- Úspešné end-to-end spustenie (ID#143, 17.461s)
- Pridanie Move file nodu (archivácia do SPRACOVANE)
- Riešenie Move file validačných problémov

### Session 3 (23.02.2026 23:00 - 24.02.2026 09:40)
- Oprava Move file expression (By ID + Expression mode)
- Úspešné automatické spustenie workflow s Move
- Zmena "Eyekido" → "eyekido" v Build Rewrite Request
- Vytvorenie 3 TISS PDF s emailom (reálne lekárske správy)
- Návrh novej HTML email šablóny (v1, v2, v3)
- Brand guidelines integrácia (farby, logo, fotka lekárky)
- Pokus o GCS bucket pre hosting obrázkov (zablokované org policy)
- Lekárka: MUDr. Petra Hlaváčová, PhD., FEBO

---

*Posledná aktualizácia: 24.02.2026, 09:40*
