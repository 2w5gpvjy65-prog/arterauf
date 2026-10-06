# Elevora UF – kundmall

Mall för varje ny kundsida. Skapa ett nytt repo med **Use this template**, så får kundprojektet:
- `CLAUDE.md`: Elevoras gemensamma regler, plus en del att fylla i för kunden. Claude läser den automatiskt.
- Två skills för Claude: `ny-kundsida` (bygg och testa) och `lansera` (gå live).
- Ett neutralt skelett (inte en färdig design, varje kund får egen estetik): produktsektion med Stripe-knappar, kontaktformulär (Web3Forms), sida efter köp, köpvillkor, tack- och 404-sida.
- Säkerhetsrubriker (`_headers`) och Cloudflare-inställningar (`wrangler.jsonc`).

## Starta ett nytt kundprojekt
1. **Use this template → Create a new repository**, döp den till t.ex. `kundnamn-site` (privat).
2. Starta en Claude-session på det nya repot och skriv till exempel:
   *"Bygg en webbshop åt Norrsken Prints UF. Färg #1E2A38. Loggan är bifogad. Produkter: Kvällsbris 449 kr, Riggen 499 kr (bilder bifogade). Frakt 39 kr."*
3. Claude bygger sidan i kundens stil, skapar testlänkar i Stripe (Elevora sandbox), testar i mobil och dator och gör ett testköp.
4. Koppla repot till Cloudflare (Workers & Pages → Create → Import repository) för förhandsvisning på workers.dev.
5. När kunden är nöjd: skriv *"lansera"* så går Claude igenom resten.

## Checklista vid leverans
- [ ] Kunden har egna konton med eget mejl och tvåstegsverifiering: GitHub, Cloudflare, Stripe, Web3Forms, registrar.
- [ ] Stripe-kontot ägs av någon som är 18+, är aktiverat, och har Klarna (och Swish om det är tillåtet för det de säljer) påslaget.
- [ ] Domänen är köpt i kundens namn.
- [ ] Repot överfört: Settings → General → Danger Zone → **Transfer ownership** → kundens konto.
- [ ] Kunden har bjudit in Elevora som collaborator (GitHub) och member (Cloudflare) om de köper löpande uppdateringar.
- [ ] Kundens Cloudflare kopplat till kundens repo. Domänen tillagd (namnservrar bytta, gamla A-poster borttagna, Custom Domain för domän + www).
- [ ] Web3Forms-nyckel och Stripe Payment Links är kundens egna. Inga `buy.stripe.com/test_`-länkar kvar.
- [ ] Köpvillkor ifyllda (namn, mejl, frakt, leveranstid).
- [ ] Ett riktigt testköp gjort tillsammans med kunden, ordermejlet kom fram, köpet återbetalat.
- [ ] Mobil och dator kontrollerade.
- [ ] Offerten säger: kunden äger domän, kod och konton. Elevora får visa sidan som referens.
