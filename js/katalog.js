// Faten som går att köpa: namn, pris och färger. Används av kundvagnen (js/butik.js) och kassan (worker/index.js),
// så priset som tas betalt kommer alltid härifrån. Ändrar ni ett pris: ändra här, på produktsidan i fat/ och i butiken på startsidan.
// Färgnycklarna är desamma som i FARGER i js/fat3d.js. Den första färgen är den som syns på originalfotot.
export const FRAKT = 39;

export const KATALOG = {
  vika: { namn: 'Vika', pris: 349, typ: 'Stort vågigt fat', farger: { rosa: 'Rosa marmor', bla: 'Blå marmor', salvia: 'Grön marmor' } },
  gesunda: { namn: 'Gesunda', pris: 329, typ: 'Långt serveringsfat', farger: { sand: 'Sand', kritvit: 'Kritvit', rose: 'Rosé' } },
  siljan: { namn: 'Siljan', pris: 249, typ: 'Runt vågigt fat', farger: { dimbla: 'Dimblå', salvia: 'Salviagrön', rose: 'Rosé' } },
  hemus: { namn: 'Hemus', pris: 179, typ: 'Litet vågigt fat', farger: { salvia: 'Salviagrön', dimbla: 'Dimblå', kritvit: 'Kritvit' } },
};

export const forstaFarg = (id) => Object.keys(KATALOG[id].farger)[0];

// Bilderna för ett fat i en viss färg. Originalfärgen har inget tillägg i filnamnet (foto-vika.webp),
// de andra har färgen efter namnet (foto-vika-bla.webp).
export function bilder(id, farg) {
  const s = farg && farg !== forstaFarg(id) ? '-' + farg : '';
  return {
    foto: `/img/foto-${id}${s}.webp`,
    detalj: `/img/foto-${id}${s}-detalj.webp`,
    fat: `/img/fat-${id}${s}.webp`,
    under: `/img/fat-${id}${s}-under.webp`,
    stripe: `/img/stripe-${id}${s}.jpg`,
    prov: `/img/prov-${id}-${farg || forstaFarg(id)}.webp`,
  };
}
