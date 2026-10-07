# Elevora UF – kundprojekt

Det här repot är en webbsida som **Elevora UF** bygger åt en kund. Varje kund får sin egen sida med sin egen design. Läs hela filen innan du gör något.
Övre delen innehåller Elevoras gemensamma regler och är samma i alla kundprojekt. Nedre delen innehåller kundens egna uppgifter.

**Snabbstart:** säger användaren "bygg en sida åt …" eller "nytt kundprojekt" → följ skillen `ny-kundsida`. Säger de "lansera" eller "gå live" → följ skillen `lansera`.

---

## DEL 1: Elevoras gemensamma regler (ändra inte per kund)

### Vilka vi är
- Elevora UF: ett UF-företag med tre killar från gymnasiet i Mora, Dalarna. Bygger hemsidor och webbshoppar åt UF-företag och små varumärken i hela Sverige.
- Kontakt: elevora.uf@gmail.com · elevorauf.se
- Vi använder AI (Claude) men granskar allt själva. Leverans på 1–2 veckor.

### Så vill användaren ha svar
- **Svenska**, kort, med **enkla steg-för-steg-instruktioner** om exakt var man ska trycka. Användaren sitter ofta på mobilen och skickar skärmdumpar.
- Testa i både mobil och dator, och ta skärmdumpar, innan något sägs vara klart.
- Gör saker själv när det går. Be bara användaren om det som kräver deras inloggning.
- När något nytt bestäms: uppdatera den här filen (DEL 2) i samma session.

### Arbetsgång med kunden
1. Kort gratissamtal (cirka 15 min): vad de säljer och vilken stil de vill ha.
2. Skriftlig offert med fast pris, samma vecka.
3. Första förslaget inom en vecka, förhandsvisat på en workers.dev-adress. Ändringar tills kunden är nöjd.
4. Publicering: koppla domän och betalning, gör ett testköp tillsammans med kunden.
5. Överlämning enligt checklistan i README.md.

### Priser (Elevora)
- Webbshop: UF 1 200 kr (ordinarie från 2 000 kr) · Hemsida, en sida: UF 600 kr (ordinarie 1 200 kr) · Google-profil: 400 kr · Löpande uppdateringar: 200 kr/mån.
- Kunden betalar själv domänen (cirka 200 kr/år) och betaltjänstens avgift per köp. Säg "inga månadsavgifter till oss", aldrig "gratis att ta betalt".

### Ägarskap (viktigt)
- **Kunden äger allt** på egna konton med sitt eget mejl: domän, GitHub-repo, Cloudflare, Stripe och Web3Forms.
- Elevora bjuds in som collaborator (GitHub) och member (Cloudflare). **Inga delade lösenord, inga konton i Elevoras namn.**
- Under bygget ligger repot hos Elevora. Vid leverans görs **Transfer ownership** till kundens GitHub.
- Slutar kunden köpa uppdateringar tar de bort Elevoras åtkomst, och sidan fortsätter fungera.

### Teknik (standard för alla kunder)
- Ren statisk HTML/CSS/JS, inget byggsteg. Filer: `index.html`, `css/style.css`, `js/main.js`, `tack.html` (efter formulär), `kop-klart.html` (efter köp), `kopvillkor.html`, `404.html`, `img/`.
- **Hosting: Cloudflare Workers** med statiska filer (`wrangler.jsonc`, `.assetsignore`). Build command tomt, deploy command `npx wrangler deploy`. Publiceras automatiskt från `main`.
- **Domän**: köps av kunden (t.ex. Loopia). Lägg till domänen i kundens Cloudflare (Connect a domain, Free), byt namnservrar hos registraren, ta bort gamla A-poster, och lägg till Custom Domain för både `domän.se` och `www.domän.se` under Workers → Settings → Domains & Routes.
- **Formulär**: Web3Forms. Byt `DIN-WEB3FORMS-NYCKEL` i `index.html` mot kundens nyckel. Nyckeln är publik per design.
- **Betalning**: Stripe **Payment Links** (kort, Klarna, Swish). Knapparna länkar till Stripe, så det behövs ingen server och inga hemliga nycklar i koden. Kortuppgifter når aldrig sidan. Se "Betalning" nedan.
- Höj `?v=N` på style.css och main.js i alla HTML-filer vid ändringar, så att besökare inte ser cachade versioner.
- Lägg aldrig hemliga nycklar (t.ex. Stripes secret key) i repot.

### Betalning (Stripe Payment Links)
- **En "Köp"-knapp per produkt** (och per storlek om priset skiljer). Knappen är en vanlig länk till `buy.stripe.com/...`. Ingen kundvagn. Köparen kan ändra antal i Stripes kassa.
- **Under bygget: testlänkar i Elevoras sandbox.** Använd Stripe-pluginet: `list_available_accounts_or_orgs` → kontot "Elevora sandbox" (livemode `false`). Testlänkar börjar med `buy.stripe.com/test_` och tar inga riktiga pengar.
- **Vid lansering: riktiga länkar i kundens eget Stripe-konto.** Se skillen `lansera`.
- Så skapas en länk (API via Stripe-pluginet):
  1. `PostProducts` med `name`, `description`, `images` (publika bild-URL:er) och `default_price_data: {currency: "sek", unit_amount: <pris i öre>}`.
  2. För fysiska varor: en produkt "Frakt" med kundens fraktpris (skapa en gång per butik).
  3. `PostPaymentLinks` med:
     - `managed_payments: {enabled: false}` **alltid** (annars blockeras Swish och fysiska varor)
     - `line_items`: produktens pris med `adjustable_quantity` 1–10, plus fraktraden (antal 1)
     - `shipping_address_collection: {allowed_countries: ["SE"]}` och `phone_number_collection: {enabled: true}` för fysiska varor
     - `after_completion: {type: "redirect", redirect: {url: "https://DOMÄN/kop-klart.html"}}` (under bygget: förhandsadressen)
     - `custom_text.submit.message`: leveranstid, t.ex. "Vi skickar inom 2 vardagar. Du får kvitto via mejl."
     - `metadata: {butik: "<kundens kortnamn>"}`
  4. Skicka **aldrig** `payment_method_types`. Vilka betalsätt som visas styrs i Stripe under Settings → Payment methods.
- **Swish** fungerar bara i SEK, för privatpersoner i Sverige. Stripe tillåter **inte** Swish för smycken, klockor, ädelstenar, konsthandel/gallerier eller alkohol. Säljer kunden sådant blir det kort, Klarna, Apple Pay och Google Pay. Säg det till kunden **före** offerten.
- **Moms**: UF-företag tar normalt inte ut moms. Slå inte på Stripe Tax eller `automatic_tax`.
- **Ordrar**: Stripe mejlar butiksägaren vid varje köp (Stripe → profil → Communication preferences → Successful payments) och köparen får kvitto (Settings → Customer emails → Successful payments). Ingen egen kod för ordermejl.
- **Stripe-kontot** ägs av kunden och någon som är **18 år eller äldre** (är kontoinnehavaren under 18 måste en vårdnadshavare stå som ägare). Kunden bjuder in Elevora som teammedlem (roll Developer) under bygget.
- **Testköp**: kort `4242 4242 4242 4242`, valfritt framtida datum, valfri CVC. 3D Secure: `4000 0025 0000 3155`. Nekat kort: `4000 0000 0000 0002`. Swish och Klarna i test visar en testsida där man godkänner eller nekar.

### Säkerhet
- `_headers` innehåller säkerhetsrubriker (CSP, frame-ancestors none m.m.). Lägger man till en ny extern tjänst, till exempel ett nytt typsnitt eller ett skript, måste den läggas till i CSP:n, annars blockeras den.
- Ingen inline-JavaScript, eftersom CSP:n blockerar det. Lägg JS i `js/main.js`.
- Tvåstegsverifiering på alla konton (kundens och Elevoras). Privata repon.

### Design: varje kund ska ha en EGEN sida och EGEN estetik
- Mallens utseende (färger, typsnitt, layout) är bara ett **neutralt skelett**. Det får aldrig levereras som det är, och två kunder ska aldrig se likadana ut.
- Utgå från **kundens varumärke**: logga, Instagram-flöde, produktbilder, målgrupp och känsla. Analysera dem och ta fram en egen riktning innan du bygger: färgpalett, typsnittspar, layout, bildstil och detaljer.
- Använd skillen **frontend-design** för att hitta en distinkt, genomtänkt stil. Skriv in den valda riktningen i DEL 2 under "Stil" så att nästa session fortsätter i samma stil.
- Bygg om `index.html` och `css/style.css` fritt: egna sektioner, egen hero, egen produktvisning. Behåll bara de tekniska delarna (formulär, Stripe-knappar, menyns Safari-fix, `_headers`, `wrangler.jsonc`).
- Professionellt och stilrent, inte "AI-mall": inga generiska gradienter, inte samma rundade kort överallt, inga ritade figurer i stället för foton. Kundens egna bilder, stora och snygga.
- Mobilen först, eftersom kunderna kommer från Instagram och TikTok. Testa alltid både mobil och dator med skärmdumpar.
- Visa kunden 1–2 riktningar tidigt (skiss eller startsida) innan hela sidan byggs.

---

## DEL 2: Den här kunden (fyll i vid projektstart)

- **Företag:** Artera UF · Instagram: [@arterauf](https://www.instagram.com/arterauf/) (inga inlägg ännu, okt 2026)
- **Kontaktperson:** _[namn, mejl saknas]_. Fyra tjejer från Mora: Meja, Nora, Embla och Lilly (förnamn från Instagram-bion, bekräfta att de vill stå med)
- **Säljer:** handgjorda keramikfat: kavlade lerplattor som draperas till vågiga, veckade fat (därav kaveln i loggan). Förebild: kundens foton på ett vitt fat med rosa marmorering och svarta prickar, och ett sandfärgat prickigt serveringsfat med en stor våg.
- **Tjänst och pris:** Webbshop, UF-pris 1 200 kr. Sidan är också Elevoras visningsexempel.
- **Domän:** _[domän.se saknas]_ · registrar: _[ ]_
- **Stil:**
  - Loggan (lerplatta och kavel) finns kvar i sidhuvudet och i processen (kaveln). Faten visas som i en riktig butik: stora färgade ytor kant i kant, som papper i en fotostudio. De ojämna "lerplattorna" bakom faten är borttagna eftersom sidan kändes tom och mallaktig (beslut okt 2026).
  - Färger: kalk `#F0E8DD` (loggans bakgrund, sidans botten), lera `#CFC0B0` (plattan), bränd `#2E2520` (text, knappar), sten `#73665C` (dämpad text), kavel `#B48A63` (trä, små detaljer). Glasyrer i dova pastelltoner, aldrig klara färger: Vika vit `#F5F1ED` med rosa marmorering `#EAB8C5` och svarta prickar, Gesunda sand `#CEC3B5` med mörka och ljusa prickar, Siljan dimblå `#A5B2B9`, Hemus salviagrön `#A9B09D`. Bakgrunder bakom faten (CSS-variabler): hero `#CBB4A8`, Vika `#DCC8BF`, Gesunda `#D5C7B5`, Siljan `#C5CED2`, Hemus `#C9CEBD`. Kontaktdelen har salvia som bakgrund, om oss lera. **Ingen terrakotta.**
  - Typsnitt: Marcellus (romerska versaler som i loggans ordbild) för rubriker och produktnamn, Hanken Grotesk för brödtext, Reenie Beanie för några få handskrivna anteckningar (max 3–4 på sidan).
  - Effekt: faten är riktiga 3D-modeller (Three.js, `js/fat3d.js` + `js/vendor/three.js`): en kavlad platta med tjocklek och rundad kant som draperats till vågor och veck, med mjuka skuggor (VSM), marmorering, prickar och stämpel under. Formerna och glasyrerna ställs in i `FAT` överst i `js/fat3d.js`. Faten snurrar långsamt och vrids när man scrollar, och man kan dra i dem.
  - "Så gör vi": lugn, scrollstyrd process på ett fat (Siljan). Varje steg är långt (cirka 120 % av skärmhöjden), förändringen sker i början och sedan står fatet still. Lätt inrastning (`scroll-snap` proximity) på stegens viloläge. Kameran rör sig långsamt i stället för fatet. Inget lysande eller studsande: ugnen visas som dämpat varmt ljus. Steg: kavla (kaveln rullar, kavelspår), forma (plattan draperas) och stämpla (kameran tittar in under fatet), torka (från kanten och inåt) och skröjbränna, glasera (doppas från ena sidan, kritvit och matt), glasyrbränna (blir glansig).
  - "Reducera rörelse": inget snurrar av sig självt, faten vrids bara lugnt medan man scrollar, ingen tröghet, ingen kameraåkning i processen.
  - Startsidan: hero med text till vänster och en stor färgad panel med två fat (Vika och Hemus, kompositionen `vika+hemus` i `COMPS` i `js/fat3d.js`), butiksrutor 2 × 2 (en kolumn i mobilen), "På nära håll" med närbilder på glasyrerna kant i kant, processen, om oss med en närbild på stämpeln, frågor, kontakt.
  - Produktsidor `fat/<namn>.html`: galleri som en kvadrat (kundens önskemål): vänster halva hela fatet i 3D (långsidan på höjden, gungar lugnt, går att dra), höger två bilder: undersidan med stämpeln och en närbild på glasyren. I mobilen stort 3D-fat överst och de två bilderna bredvid varandra under. Sedan pris, Köp-knapp, fakta, frågor och "Fler fat". Startsidans fat leder hit (ett drag i fatet snurrar det, ett klick öppnar sidan). Statiska bilder i `img/fat-*.webp` visas om WebGL saknas.
  - Ton: rak, varm och personlig, skriven som tjejerna själva ("vi"). Inga säljfloskler.
- **Konton (kundens):** GitHub _[ ]_ · Cloudflare _[ ]_ · Stripe _[ ]_ · Web3Forms _[ ]_
- **Betalsätt:** kort, Klarna, Swish (keramikfat är tillåtet för Swish) · **Frakt:** 39 kr, PostNord, skickas inom 2 vardagar (standard, bekräfta med kunden. Keramik kan behöva dyrare paket)
- **Produkter (förslag, byt mot riktiga):** Vika, stort vågigt fat, vit med rosa marmor, ca 36 × 24 cm, 349 kr · Gesunda, långt serveringsfat, sand, ca 40 × 19 cm, 329 kr · Siljan, runt vågigt fat, dimblå, ca Ø 24 cm, 249 kr · Hemus, litet vågigt fat, salvia, ca 20 × 14 cm, 179 kr
- **Stripe-länkar** (Elevora sandbox, redirect till `https://arterauf.2w5gpvjy65.workers.dev/kop-klart.html`):
  - Frakt 39 kr: `price_1UNgPlCygnkVBVd5XygxEKmY`
  - Vika 349 kr → https://buy.stripe.com/test_bJebJ0bBs8bQg83gkxcbC08 → _livelänk_
  - Gesunda 329 kr → https://buy.stripe.com/test_cNi14m0WO63I4pl1pDcbC09 → _livelänk_
  - Siljan 249 kr → https://buy.stripe.com/test_14AaEW490ajYcVR9W9cbC0a → _livelänk_
  - Hemus 179 kr → https://buy.stripe.com/test_7sY00i6h89fU7Bx0lzcbC0b → _livelänk_
  - De första testlänkarna (ovala fat med kant, okt 2026) är avstängda och produkterna arkiverade.
  - Köp-knapparna finns på produktsidorna i `fat/`, inte på startsidan.
  - Produktbilder i Stripe: `img/stripe-*.jpg` på den publicerade sidan (inlagda okt 2026, med `?v=2` efter omrenderingen).
- **Förhandsvisning:** https://arterauf.2w5gpvjy65.workers.dev (Cloudflare-konto 2w5gpvjy65, Elevoras under bygget). Vid lansering: byt `og:image`/`og:url` i index.html och redirect-adressen i Stripe-länkarna till kundens domän.
- **Status:** första förslag
- **Beslut och önskemål:** Inga egna produktbilder på sidan ännu, så faten visas som 3D-modeller som efterliknar kundens foton. När tjejerna har riktiga foton: lägg dem i `img/` och visa dem på produktsidorna (till exempel som bildgalleri under 3D-vyn). 3D-faten kan finnas kvar i hero och "Så gör vi".
  - Användaren vill: realistiska fat (inte tecknade), dova pastellfärger (inte barnsliga), en lugn och långsam process, en produktsida före köpet, att allt fungerar med "Reducera rörelse" på iPhone, att sidan inte känns tom eller "vibe-kodad" och att den är mjuk att använda i mobilen.
  - Mobil: ingen scroll-snap (gjorde scrollen ryckig på iPhone). Processens fat tar bara 36 % av skärmhöjden. 3D ritas med lägre upplösning (max 1,6×), enklare glasyrberäkning (`LOWQ`), halv bildfrekvens när ingen scrollar, och canvasen byggs inte om när adressfältet ändrar höjd. `js/vendor/three.js` är översatt för Safari 15 (äldre iPhones klarade inte den första versionen). Saknar telefonen flyttalsbuffertar används vanliga skuggor i stället för VSM.
  - Produktnamnen (platser runt Mora), priserna, måtten och texterna om processen är Elevoras förslag. Byt mot det tjejerna faktiskt säljer och gör.
  - Alla bilder är renderade från 3D-modellerna med `snapshot()` i `js/fat3d.js` (lägen `hel`, `under`, `detalj`, `stampel`; dubbel upplösning, nedskalad): `img/hero-faten.webp`, `img/fat-*.webp` (genomskinlig), `img/fat-*-under.webp`, `img/fat-*-detalj.webp`, `img/stampel.webp`, `img/stripe-*.jpg`, `img/og.jpg`. Ändras ett fat: rendera om bilderna.
  - Produktsidorna i `fat/` är skrivna med samma uppbyggnad. Ändras något på en, gör samma ändring på alla fyra.
  - `js/vendor/three.js` är en avskalad Three.js (r186) byggd en gång med esbuild. Det finns inget byggsteg för sidan.
  - Lokalt på Windows: kör `npx wrangler dev --port 8791 --persist-to <mapp utanför repot>`, annars laddar wrangler om i en loop (den bevakar sin egen `.wrangler`-mapp).
  - Testköp gjort 2026-10-07 (Siljan + frakt, 228 kr, kort 4242) i Elevora sandbox: betalningen gick igenom och skickade vidare till `kop-klart.html`.
