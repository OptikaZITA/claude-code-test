# Prehľad portálov v oblasti optiky, optometrie a ortoptiky
## S overenými RSS feedmi

---

## ✅ PORTÁLY S POTVRDENÝMI RSS FEEDMI

| Portál | Krajina | RSS Feed URL | Stav |
|--------|---------|--------------|------|
| **Optometry Times** | USA | `https://www.optometrytimes.com/rss` | ✅ Funkčný |
| **Ophthalmology Times** | USA | `https://www.ophthalmologytimes.com/rss` | ✅ Funkčný |
| **Ophthalmology Times Europe** | Európa | `https://europe.ophthalmologytimes.com/rss` | ✅ Funkčný |
| **Vision Monday** | USA | `https://www.visionmonday.com/rss/` | ✅ Funkčný (viac feedov) |
| **Eyebizz** | Nemecko | `https://www.eyebizz.de/feed/` | ✅ Funkčný |
| **AOA News** | USA | `https://www.aoa.org/news/news-rss-feed` | ✅ Funkčný |
| **The Optical Journal** | USA | `https://www.opticaljournal.com/feed` | ✅ Funkčný |
| **Modern Retina** | USA | `https://www.modernretina.com/rss` | ✅ Funkčný |
| **Review of Optometry** | USA | Má feed (neoverená presná URL) | ⚠️ Overiť |
| **Modern Optometry** | USA | `https://www.modernod.com/rss` | ⚠️ Overiť |

---

## 📧 PORTÁLY LEN S NEWSLETTEROM (bez RSS)

| Portál | Krajina | URL | Newsletter |
|--------|---------|-----|------------|
| **Optikum.at** | Rakúsko | https://www.optikum.at | ✅ Áno |
| **Optikernetz** | Nemecko | https://www.optikernetz.de | ✅ Áno |
| **DOZ Deutsche Optikerzeitung** | Nemecko | https://www.doz-verlag.de | ✅ Áno |
| **Der Augenoptiker** | Nemecko | https://www.der-augenoptiker.de | ✅ Áno |
| **Optometry Today** | UK | https://www.aop.org.uk/ot | ✅ Áno |
| **Optician Online** | UK | https://www.opticianonline.net | ✅ Áno |
| **FODO** | UK | https://www.fodo.com | ✅ Áno |
| **World Council of Optometry** | Medzinárodné | https://worldcouncilofoptometry.info | ✅ Áno |
| **ECOO** | Európa | https://www.ecoo.info | ✅ Áno |
| **American Academy of Optometry** | USA | https://www.aaopt.org | ✅ Áno |
| **The Ophthalmologist** | Globálne | https://theophthalmologist.com | ✅ Áno |
| **Optická únia Slovenska** | Slovensko | https://ous.sk | ❓ Neznáme |

---

## 🔧 RIEŠENIE PRE PORTÁLY BEZ RSS

Pre portály bez natívneho RSS feedu môžeš použiť:

### 1. RSSHub (odporúčané)
Self-hosted riešenie na generovanie RSS z akejkoľvek stránky.
```
https://rsshub.app/
```

### 2. RSS.app
SaaS nástroj na generovanie RSS z webových stránok.
```
https://rss.app/
```

### 3. n8n HTTP Request + Cheerio
V n8n môžeš scrapovať stránky bez RSS pomocou:
- HTTP Request node → stiahne HTML
- HTML Extract node → extrahuje články
- Supabase node → uloží do databázy

---

## 📊 EYEBIZZ RSS FEEDY (OVERENÉ)

Eyebizz ponúka viacero špecializovaných RSS feedov:

| Kategória | RSS URL |
|-----------|---------|
| Všetky články | `https://www.eyebizz.de/feed/` |
| Frames & Fashion | `https://www.eyebizz.de/category/frames-fashion/feed/` |
| EYEConomy | `https://www.eyebizz.de/category/eyeconomy/feed/` |
| Vision Care | `https://www.eyebizz.de/category/vision-care/feed/` |

---

## 📊 VISION MONDAY RSS FEEDY

Vision Monday ponúka RSS na stránke: `https://www.visionmonday.com/rss/`

Obsahuje viacero kategórií feedov.

---

## 🎯 ODPORÚČANÁ STRATÉGIA PRE TVOJ PROJEKT

### Fáza 1: Začni s RSS (jednoduchšie)
1. **Optometry Times** - `optometrytimes.com/rss`
2. **Ophthalmology Times** - `ophthalmologytimes.com/rss`
3. **Vision Monday** - `visionmonday.com/rss`
4. **Eyebizz** - `eyebizz.de/feed/`
5. **AOA News** - `aoa.org/news/news-rss-feed`
6. **The Optical Journal** - `opticaljournal.com/feed`

### Fáza 2: Pridaj scraping (pre stránky bez RSS)
- Optikernetz.de
- Optikum.at
- Optometry Today (UK)
- Optician Online

### Fáza 3: Newslettre (manuálne alebo email parsing)
- DOZ Deutsche Optikerzeitung
- Der Augenoptiker
- ECOO
- World Council of Optometry

---

## 🔗 BONUS: Ďalšie RSS feedy z optiky

Z Feedspot zoznamu som našiel ďalšie užitočné feedy:

| Portál | RSS URL |
|--------|---------|
| Women in Optometry | `https://womeninoptometry.com/feed` |
| Review of Optometric Business | `https://reviewob.com/feed` |
| Natural Eye Care | `https://naturaleyecare.com/blog/feed` |
| Optometry Students | `https://optometrystudents.com/feed` |
| SPECTR Magazine (eyewear) | `https://spectr-magazine.com/feed` |
| The Eyewear Forum | `https://theeyewearforum.com/feed` |

---

## ⚠️ POZNÁMKY

1. **RSS URL môže byť aj `/feed/` alebo `/rss/`** - vyskúšaj obe varianty
2. **Niektoré feedy vyžadujú user-agent** - nastav v n8n HTTP Request
3. **Rate limiting** - nerob príliš veľa requestov, max 1x za hodinu
4. **Copyright** - nezabúdaj na pôvodný zdroj pri publikovaní

---

*Posledná aktualizácia: Január 2026*
*Overené pomocou web search*
