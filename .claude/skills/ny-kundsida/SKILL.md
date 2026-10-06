---
name: ny-kundsida
description: Bygg en ny kundsida eller webbshop från Elevoras kundmall. Använd när användaren skriver till exempel "bygg en sida åt X", "nytt kundprojekt", "gör en webbshop med den här färgen och loggan" eller bifogar en kunds logga och produkter.
---

# Ny kundsida

Målet: från en kort beskrivning ("bygg en sida åt X, den här färgen, den här loggan") till en färdig, snygg förhandsvisning med fungerande testköp. Läs `CLAUDE.md` först. Allt där gäller.

## 1. Samla in (fråga bara det som saknas, i ett enda meddelande)
- Företagsnamn och vad de säljer
- Färg(er) och logga (bifogad bild eller länk)
- Produkter: namn, pris, bild, gärna en mening om varje
- Instagram-konto (för stil och bilder), om de har ett
- Frakt och leveranstid. Saknas det: 39 kr och "inom 2 vardagar"

Säljer de smycken, klockor eller konst: säg direkt att Swish inte går via Stripe för det (se `CLAUDE.md`).

## 2. Fyll i DEL 2 i `CLAUDE.md`
Företag, säljer, betalsätt, frakt och status "första förslag".

## 3. Bestäm stil
Använd skillen `frontend-design`. Utgå från loggan, färgerna och produktbilderna. Bestäm palett, typsnittspar och layout som passar just den här kunden. Skriv riktningen under "Stil" i DEL 2.

## 4. Bygg
- Byt alla platshållare: `KUNDNAMN`, `DOMAN.SE`, `"name"` i `wrangler.jsonc`, favicon (gör den från loggan), bilder i `img/`.
- Bygg om `index.html` och `css/style.css` i kundens stil. Behåll de tekniska delarna (Köp-länkar, formulär, menyn, `_headers`).
- Uppdatera `kop-klart.html`, `kopvillkor.html`, `tack.html` och `404.html` med kundens namn, stil, frakt och kontakt.
- Lägg till nya externa typsnitt i CSP:n i `_headers`.
- Saknas Web3Forms-nyckel: låt `DIN-WEB3FORMS-NYCKEL` stå kvar och skriv det i rapporten.

## 5. Skapa testlänkar i Stripe
Följ "Betalning" i `CLAUDE.md`: produkter, frakt och Payment Links i **Elevora sandbox** (livemode `false`). `after_completion` pekar på förhandsadressen + `/kop-klart.html` (lokalt: `http://localhost:8787/kop-klart.html`). Lägg in länkarna i Köp-knapparna och i DEL 2.

Produktbilder i Stripe måste vara publika URL:er. Finns inga än: hoppa över `images`.

## 6. Testa
1. Starta sidan lokalt: `npx wrangler dev --port 8787`.
2. Skärmdumpar i mobil (390 px bred) och dator (1280 px) med Playwright. Kolla meny, produkter, formulär, köpvillkor och att inget är trasigt eller blockeras av CSP:n (läs konsolen).
3. Tryck på en Köp-knapp: Stripes kassa ska visa rätt produkt, pris och frakt.
4. Gör ett testköp med kort `4242 4242 4242 4242` (framtida datum, valfri CVC, påhittad adress). Du ska hamna på `kop-klart.html`.
5. Rätta det som ser fel ut och testa igen.

## 7. Spara
Commita med en tydlig svensk beskrivning och pusha till arbetsgrenen. Cloudflare visar förhandsvisningen på workers.dev när repot är kopplat.

## 8. Rapportera (kort, på svenska)
- 2 skärmdumpar (mobil och dator) och förhandslänken
- Vad som är klart
- **Det här behöver ni eller kunden göra**, i punktform, bara det som kräver deras inloggning (till exempel Web3Forms-nyckel, Stripe-konto, domän)
