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

- **Företag:** _[namn]_ · Instagram: _[@konto]_
- **Kontaktperson:** _[namn, mejl]_
- **Säljer:** _[produkter]_
- **Tjänst och pris:** _[t.ex. Webbshop, UF-pris 1 200 kr]_
- **Domän:** _[domän.se]_ · registrar: _[Loopia/one.com]_
- **Stil:** _[färger, typsnitt, känsla, referenser]_
- **Konton (kundens):** GitHub _[ ]_ · Cloudflare _[ ]_ · Stripe _[ ]_ · Web3Forms _[ ]_
- **Betalsätt:** _[kort, Klarna, Swish – eller utan Swish om de säljer smycken/klockor]_ · **Frakt:** _[t.ex. 39 kr, PostNord]_
- **Stripe-länkar:** _[produkt → testlänk → livelänk]_
- **Status:** _[skiss / första förslag / publicerad / överlämnad]_
- **Beslut och önskemål:** _[lägg till här under projektets gång]_
