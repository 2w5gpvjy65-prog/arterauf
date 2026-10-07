// Kassan: tar emot kundvagnen från sidan och skapar en betalning hos Stripe (Checkout Session).
// Allt annat (sidorna, bilderna) skickas som vanliga statiska filer.
//
// Stripes hemliga nyckel ligger INTE i koden. Den läggs in i Cloudflare som en hemlighet med namnet
// STRIPE_SECRET_KEY: Workers & Pages → arterauf → Settings → Variables and Secrets → Add → Secret.
// Priserna hämtas från js/katalog.js, så den som handlar kan inte ändra dem.
import { KATALOG, FRAKT } from '../js/katalog.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

// Stripe vill ha formulärdata: line_items[0][price_data][currency]=sek osv.
function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (typeof v === 'object') form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export function sessionParams(rader, origin, tillbaka) {
  return {
    mode: 'payment',
    locale: 'sv',
    // Managed Payments måste vara av, annars blockeras Swish och fysiska varor (se CLAUDE.md)
    managed_payments: { enabled: false },
    line_items: rader.map(({ id, farg, antal }) => {
      const p = KATALOG[id], s = farg === Object.keys(p.farger)[0] ? '' : '-' + farg;
      return {
        quantity: antal,
        price_data: {
          currency: 'sek',
          unit_amount: p.pris * 100,
          product_data: {
            name: `${p.namn}, ${p.farger[farg].toLowerCase()}`,
            description: `${p.typ}. Handgjort i Mora.`,
            images: [`${origin}/img/stripe-${id}${s}.jpg`],
            metadata: { fat: id, farg },
          },
        },
      };
    }),
    shipping_address_collection: { allowed_countries: ['SE'] },
    phone_number_collection: { enabled: true },
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount', display_name: 'PostNord',
        fixed_amount: { amount: FRAKT * 100, currency: 'sek' },
        delivery_estimate: { minimum: { unit: 'business_day', value: 2 }, maximum: { unit: 'business_day', value: 5 } },
      },
    }],
    custom_text: { submit: { message: 'Vi skickar inom 2 vardagar. Du får kvitto via mejl.' } },
    success_url: `${origin}/kop-klart.html`,
    cancel_url: `${origin}${tillbaka}${tillbaka.includes('?') ? '&' : '?'}kundvagn=1`,
    metadata: { butik: 'artera' },
  };
}

// Kontrollerar kundvagnen: bara fat och färger som finns, 1–10 av varje, högst 20 rader
export function rensa(body) {
  const rader = Array.isArray(body && body.rader) ? body.rader : [];
  if (!rader.length || rader.length > 20) return null;
  const ut = [];
  for (const r of rader) {
    const p = r && KATALOG[r.id];
    const antal = Number(r && r.antal);
    if (!p || !Object.prototype.hasOwnProperty.call(p.farger, r.farg) || !Number.isInteger(antal) || antal < 1 || antal > 10) return null;
    ut.push({ id: r.id, farg: r.farg, antal });
  }
  return ut;
}

async function kassa(request, env) {
  if (request.method !== 'POST') return json({ fel: 'Fel metod.' }, 405);
  const url = new URL(request.url);
  // bara sidan själv får skapa betalningar
  const from = request.headers.get('origin');
  if (from && from !== url.origin) return json({ fel: 'Fel avsändare.' }, 403);
  if (!env.STRIPE_SECRET_KEY) return json({ fel: 'Kassan är inte kopplad till Stripe ännu.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ fel: 'Kunde inte läsa kundvagnen.' }, 400); }
  const rader = rensa(body);
  if (!rader) return json({ fel: 'Något i kundvagnen stämmer inte. Ladda om sidan och försök igen.' }, 400);
  const t = typeof body.tillbaka === 'string' && /^\/[\w\-./]*$/.test(body.tillbaka) && !body.tillbaka.startsWith('//') ? body.tillbaka : '/';
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: form(sessionParams(rader, url.origin, t)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    console.log('Stripe-fel', res.status, data.error && data.error.message);
    return json({ fel: 'Kassan svarar inte just nu. Försök igen om en stund.' }, 502);
  }
  return json({ url: data.url });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/kassa') return kassa(request, env);
    return env.ASSETS.fetch(request);
  },
};
