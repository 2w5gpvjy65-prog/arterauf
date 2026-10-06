---
name: lansera
description: Lansera en färdig kundsida: riktiga Stripe-länkar i kundens eget konto, domän, testköp och överlämning. Använd när användaren skriver "lansera", "gå live", "publicera på riktigt" eller "kunden är nöjd".
---

# Lansera kundsidan

Läs `CLAUDE.md` först. Kunden ska äga allt.

## 1. Kolla att kunden har gjort sitt
Fråga användaren om det som saknas, som en kort checklista de kan skicka vidare till kunden:

**Stripe** (stripe.com, kundens mejl, ägaren 18 år eller äldre):
1. Skapa konto och fyll i allt under "Activate payments" (personuppgifter, bankkonto för utbetalningar).
2. Settings → Payment methods: slå på **Klarna** och **Swish** (Swish går inte för smycken, klockor eller konst).
3. Settings → Managed payments: **av**.
4. Profilbilden → Profile → Communication preferences → **Successful payments** på (ordermejl).
5. Settings → Customer emails → **Successful payments** på (kvitto till köparen).
6. Settings → Team → bjud in Elevoras mejl med rollen **Developer**.

**Domän**: köpt i kundens namn. **Cloudflare**: konto med kundens mejl, Elevora inbjuden som member. **Web3Forms**: nyckel skapad med kundens mejl.

## 2. Riktiga Stripe-länkar
- Kör `list_available_accounts_or_orgs`. Syns kundens konto med livemode `true`: skapa samma produkter, frakt och Payment Links där, enligt "Betalning" i `CLAUDE.md`, med `after_completion` till `https://KUNDENS-DOMÄN/kop-klart.html`.
- Syns det inte: ge användaren den här klickguiden per produkt och be om länkarna:
  Stripe → Payment Links → **+ New** → lägg till produkt med namn, bild och pris i SEK → bocka i "Let customers adjust quantity" → lägg till produkten "Frakt" → Options: "Collect customers' addresses" (Shipping, Sverige) och "Require customers to provide a phone number" → After payment: "Don't show confirmation page", ange `https://KUNDENS-DOMÄN/kop-klart.html` → **Create link** → **Copy**.
- Byt alla testlänkar mot de riktiga. `grep -r "buy.stripe.com/test_"` ska inte hitta något.
- Fyll i kolumnen "livelänk" i DEL 2.

## 3. Sista koll av sidan
- `kopvillkor.html` har kundens namn, mejl, frakt och leveranstid.
- Web3Forms-nyckeln och `redirect` i formuläret pekar på kundens domän.
- Höj `?v=N` på CSS och JS.

## 4. Domän
Följ "Domän" under Teknik i `CLAUDE.md`. Ge användaren stegen för namnservrar hos registraren och vänta tills `https://domän.se` och `https://www.domän.se` svarar.

## 5. Riktigt testköp
Tillsammans med kunden: köp den billigaste produkten med ett riktigt kort, kolla att ordermejlet kommer fram, och återbetala sedan i Stripe (Payments → köpet → **Refund**).

## 6. Överlämning
Gå igenom "Checklista vid leverans" i `README.md`. Sätt status "publicerad" i DEL 2. Rapportera kort på svenska vad som är klart och vad som återstår.
