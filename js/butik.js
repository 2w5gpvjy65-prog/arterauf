// Butiken: färgval, galleri på produktsidan och kundvagnen.
// Kundvagnen sparas i webbläsaren (localStorage). "Till kassan" skickar den till /api/kassa (worker/index.js),
// som skapar en betalning hos Stripe och skickar köparen dit. Priserna kommer från js/katalog.js.
import { KATALOG, FRAKT, bilder, forstaFarg } from './katalog.js';

const NYCKEL = 'artera-kundvagn';
const kr = (n) => n.toLocaleString('sv-SE') + ' kr';

// ---------- Kundvagnen ----------
function las() {
  try {
    const v = JSON.parse(localStorage.getItem(NYCKEL) || '[]');
    return Array.isArray(v) ? v.filter(r => KATALOG[r.id] && KATALOG[r.id].farger[r.farg] && r.antal >= 1).map(r => ({ id: r.id, farg: r.farg, antal: Math.min(10, Math.round(r.antal)) })) : [];
  } catch (e) { return []; }
}
let vagn = las();
function spara() {
  try { localStorage.setItem(NYCKEL, JSON.stringify(vagn)); } catch (e) { /* privat läge: kundvagnen gäller bara den här sidan */ }
  rita();
}
function lagg(id, farg, antal) {
  const r = vagn.find(x => x.id === id && x.farg === farg);
  if (r) r.antal = Math.min(10, r.antal + antal); else vagn.push({ id, farg, antal: Math.min(10, antal) });
  spara();
}
const antalVaror = () => vagn.reduce((s, r) => s + r.antal, 0);

// Panelen läggs in här i stället för i varje HTML-fil
const kv = document.createElement('div');
kv.className = 'kv';
kv.id = 'kundvagn';
kv.hidden = true;
kv.innerHTML = `
  <div class="kv__skugga" data-kv-stang></div>
  <aside class="kv__panel" role="dialog" aria-modal="true" aria-labelledby="kv-rubrik">
    <div class="kv__top">
      <h2 id="kv-rubrik">Kundvagn</h2>
      <button type="button" class="kv__stang" data-kv-stang aria-label="Stäng kundvagnen"><span></span><span></span></button>
    </div>
    <div class="kv__tom">
      <p>Kundvagnen är tom än så länge.</p>
      <a class="textlink" href="/#faten" data-kv-stang>Se faten</a>
    </div>
    <ul class="kv__lista"></ul>
    <div class="kv__fot">
      <dl class="kv__summa">
        <div><dt>Faten</dt><dd data-kv="delsumma"></dd></div>
        <div><dt>Frakt, PostNord</dt><dd>${kr(FRAKT)}</dd></div>
        <div class="kv__total"><dt>Totalt</dt><dd data-kv="total"></dd></div>
      </dl>
      <button type="button" class="btn kv__kassa">Till kassan</button>
      <p class="kv__fel" role="alert" hidden></p>
      <p class="kv__info">Du betalar med kort, Klarna eller Swish i Stripes säkra kassa. Vi skickar inom 2 vardagar.</p>
    </div>
  </aside>`;
document.body.appendChild(kv);
const panel = kv.querySelector('.kv__panel'), lista = kv.querySelector('.kv__lista'), kassaKnapp = kv.querySelector('.kv__kassa'), fel = kv.querySelector('.kv__fel');

function rad(r) {
  const p = KATALOG[r.id], b = bilder(r.id, r.farg);
  const li = document.createElement('li');
  li.className = 'kv__rad';
  const lank = `/fat/${r.id}${r.farg === forstaFarg(r.id) ? '' : '?farg=' + r.farg}`;
  li.innerHTML = `
    <a class="kv__bild" href="${lank}" tabindex="-1" aria-hidden="true"><img src="${b.foto}" alt="" width="697" height="549"></a>
    <div class="kv__mitt">
      <p class="kv__namn"><a href="${lank}">${p.namn}</a></p>
      <p class="kv__farg">${p.farger[r.farg]}</p>
      <div class="antal antal--liten">
        <button type="button" data-kv-steg="-1" aria-label="Ett ${p.namn} färre">−</button>
        <span aria-live="polite">${r.antal}</span>
        <button type="button" data-kv-steg="1" aria-label="Ett ${p.namn} till"${r.antal >= 10 ? ' disabled' : ''}>+</button>
      </div>
    </div>
    <div class="kv__hoger">
      <p class="kv__pris">${kr(p.pris * r.antal)}</p>
      <button type="button" class="kv__bort" data-kv-bort>Ta bort</button>
    </div>`;
  li.querySelectorAll('[data-kv-steg]').forEach(k => k.addEventListener('click', () => {
    r.antal += +k.dataset.kvSteg;
    if (r.antal < 1) vagn = vagn.filter(x => x !== r);
    spara();
    kv.querySelector(`.kv__rad:nth-child(${Math.max(1, vagn.indexOf(r) + 1)}) [data-kv-steg="${k.dataset.kvSteg}"]`)?.focus();
  }));
  li.querySelector('[data-kv-bort]').addEventListener('click', () => { vagn = vagn.filter(x => x !== r); spara(); panel.querySelector('.kv__stang').focus(); });
  return li;
}

function rita() {
  const n = antalVaror();
  document.querySelectorAll('[data-kv-antal]').forEach(e => { e.textContent = n; e.hidden = n === 0; });
  document.querySelectorAll('[data-kv-oppna]').forEach(e => e.setAttribute('aria-label', n ? `Kundvagn, ${n} fat` : 'Kundvagn, tom'));
  lista.replaceChildren(...vagn.map(rad));
  const sum = vagn.reduce((s, r) => s + KATALOG[r.id].pris * r.antal, 0);
  kv.querySelector('[data-kv="delsumma"]').textContent = kr(sum);
  kv.querySelector('[data-kv="total"]').textContent = kr(sum + FRAKT);
  kv.classList.toggle('kv--tom', n === 0);
  fel.hidden = true;
}

let tillbakaFokus = null, stangTimer = 0;
function oppna() {
  clearTimeout(stangTimer);
  tillbakaFokus = document.activeElement;
  kv.hidden = false;
  document.documentElement.classList.add('kv-las');
  requestAnimationFrame(() => requestAnimationFrame(() => kv.classList.add('is-open')));
  panel.querySelector('.kv__stang').focus({ preventScroll: true });
}
function stang() {
  kv.classList.remove('is-open');
  document.documentElement.classList.remove('kv-las');
  stangTimer = setTimeout(() => { kv.hidden = true; }, 320);
  if (tillbakaFokus && tillbakaFokus.focus) tillbakaFokus.focus({ preventScroll: true });
}
kv.addEventListener('click', (e) => { if (e.target.closest('[data-kv-stang]')) stang(); });
document.addEventListener('keydown', (e) => {
  if (kv.hidden) return;
  if (e.key === 'Escape') { stang(); return; }
  if (e.key !== 'Tab') return;
  // fokus stannar i panelen medan den är öppen
  const f = [...panel.querySelectorAll('a[href], button:not([disabled])')].filter(x => x.offsetParent !== null);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});
document.querySelectorAll('[data-kv-oppna]').forEach(k => k.addEventListener('click', oppna));
// kundvagnen ändrad i en annan flik
window.addEventListener('storage', (e) => { if (e.key === NYCKEL) { vagn = las(); rita(); } });

kassaKnapp.addEventListener('click', async () => {
  if (!vagn.length) return;
  kassaKnapp.disabled = true;
  kassaKnapp.textContent = 'Öppnar kassan …';
  fel.hidden = true;
  let msg = 'Ingen kontakt med kassan. Kontrollera internet och försök igen.';
  try {
    const res = await fetch('/api/kassa', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rader: vagn, tillbaka: location.pathname }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) { location.href = data.url; return; }
    msg = data.fel || 'Något gick fel. Försök igen om en stund.';
  } catch (e) { /* nätverksfel */ }
  fel.textContent = msg;
  fel.hidden = false;
  kassaKnapp.disabled = false;
  kassaKnapp.textContent = 'Till kassan';
});
// tillbaka från kassan med bakåtknappen: knappen ska gå att trycka på igen
window.addEventListener('pageshow', () => { kassaKnapp.disabled = false; kassaKnapp.textContent = 'Till kassan'; vagn = las(); rita(); });

// ---------- Färgval ----------
// Ett [data-vara]-block är en butiksruta eller hela produktsidan. Färgknapparna (.prov) byter bilder,
// färgnamn och 3D-fatets glasyr (data-farg på .stage läses av js/fat3d.js).
function byt(img, src) {
  if (img.getAttribute('src') === src) return;
  const n = new Image();
  n.src = src;
  (n.decode ? n.decode() : Promise.resolve()).catch(() => {}).then(() => { img.src = src; });
}
function valjFarg(box, farg) {
  const id = box.dataset.vara, p = KATALOG[id];
  if (!p || !p.farger[farg]) return;
  box.dataset.vald = farg;
  const b = bilder(id, farg);
  box.querySelectorAll('.prov').forEach(k => k.setAttribute('aria-pressed', String(k.dataset.farg === farg)));
  box.querySelectorAll('[data-bild]').forEach(img => {
    const t = img.dataset.bild === 'vy' ? box.dataset.vy || 'foto' : img.dataset.bild;
    if (b[t]) byt(img, b[t]);
  });
  box.querySelectorAll('[data-fargnamn]').forEach(e => { e.textContent = p.farger[farg]; });
  const vald = box.querySelector(`.prov[data-farg="${farg}"]`);
  box.querySelectorAll('[data-glasyrtext]').forEach(e => { if (vald && vald.dataset.glasyr) e.textContent = vald.dataset.glasyr; });
  box.querySelectorAll('.stage[data-fat]').forEach(s => { s.dataset.farg = farg; });
  // länkarna till produktsidan öppnar den i vald färg
  box.querySelectorAll('a[data-farglank]').forEach(a => {
    if (!a.dataset.bas) a.dataset.bas = a.getAttribute('href');
    a.setAttribute('href', a.dataset.bas + (farg === forstaFarg(id) ? '' : '?farg=' + farg));
  });
  if (box.hasAttribute('data-produkt')) {
    const u = new URL(location.href);
    if (farg === forstaFarg(id)) u.searchParams.delete('farg'); else u.searchParams.set('farg', farg);
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  }
}
document.querySelectorAll('[data-vara]').forEach(box => {
  box.querySelectorAll('.prov').forEach(k => k.addEventListener('click', () => valjFarg(box, k.dataset.farg)));
  // produktsidan: färgen från länken (?farg=bla)
  if (box.hasAttribute('data-produkt')) {
    const f = new URLSearchParams(location.search).get('farg');
    if (f && f !== box.dataset.vald) valjFarg(box, f);
  }
});

// Antal på produktsidan
document.querySelectorAll('[data-antal-val]').forEach(a => {
  const inp = a.querySelector('input');
  const satt = (v) => { inp.value = Math.min(10, Math.max(1, Math.round(+v) || 1)); a.querySelector('[data-steg="-1"]').disabled = +inp.value <= 1; a.querySelector('[data-steg="1"]').disabled = +inp.value >= 10; };
  a.querySelectorAll('[data-steg]').forEach(k => k.addEventListener('click', () => satt(+inp.value + +k.dataset.steg)));
  inp.addEventListener('change', () => satt(inp.value));
  satt(inp.value);
});

// Lägg i kundvagnen
document.querySelectorAll('[data-lagg-i]').forEach(k => k.addEventListener('click', () => {
  const box = k.closest('[data-vara]');
  if (!box) return;
  const inp = box.querySelector('[data-antal-val] input');
  lagg(box.dataset.vara, box.dataset.vald || forstaFarg(box.dataset.vara), inp ? Math.max(1, Math.min(10, +inp.value || 1)) : 1);
  oppna();
}));

// ---------- Galleriet på produktsidan ----------
// Tryck på en liten bild så blir den den stora. "Snurra i 3D" visar det levande 3D-fatet i stället för fotot.
document.querySelectorAll('.galleri').forEach(gal => {
  const box = gal.closest('[data-vara]'), stor = gal.querySelector('[data-bild="vy"]'), stage = gal.querySelector('.galleri__3d');
  const knappar = [...gal.querySelectorAll('[data-vy]')];
  knappar.forEach(k => k.addEventListener('click', () => {
    const vy = k.dataset.vy;
    box.dataset.vy = vy;
    knappar.forEach(x => x.setAttribute('aria-pressed', String(x === k)));
    const tredje = vy === '3d';
    stage.hidden = !tredje;
    stor.hidden = tredje;
    if (!tredje) { byt(stor, bilder(box.dataset.vara, box.dataset.vald)[vy]); stor.alt = k.dataset.alt || ''; }
  }));
});

// Tillbaka från kassan (Avbryt hos Stripe): öppna kundvagnen igen
if (new URLSearchParams(location.search).has('kundvagn')) {
  const u = new URL(location.href);
  u.searchParams.delete('kundvagn');
  history.replaceState(null, '', u.pathname + u.search + u.hash);
  if (vagn.length) oppna();
}
rita();
