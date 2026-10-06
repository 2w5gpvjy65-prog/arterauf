// 3D-faten. Varje fat är en riktig modell (golv, kant, glasyr, järnprickar och stämpel under) som ritas med Three.js.
// Ett enda canvas ligger över sidan och ritar varje fat i rutan för sitt element: <div data-fat="siljan" data-kind="hero|product|process">.
// Saknas WebGL ligger bilderna i img/fat-*.webp kvar. Bilderna tas fram med samma kod (se snapshot längst ner).
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BufferGeometry, BufferAttribute, PlaneGeometry, LatheGeometry,
  MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, DirectionalLight, PointLight, Color, Vector2,
  CanvasTexture, PMREMGenerator, NeutralToneMapping, SRGBColorSpace, RoomEnvironment
} from './vendor/three.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => t * t * (3 - 2 * t);
const bell = (p, a, m, b) => p < m ? ease(seg(p, a, m)) : 1 - ease(seg(p, m, b));

// Faten. Mått i decimeter (1 enhet = 10 cm). shape = [halva bredden, halva djupet, superellips-exponent].
export const FAT = {
  siljan:  { shape: [0.9, 0.6, 2.2],  wobble: 0.02,  h: 0.17, glaze: '#34566c', deep: '#16304a', clay: '#b8a68f', speck: 0.25, rough: 0.16, clear: 1, dip: 0.36, brk: 0.7, seed: 3 },
  hemus:   { shape: [0.62, 0.62, 2],  wobble: 0.018, h: 0.19, glaze: '#717d55', deep: '#454f2c', clay: '#b9a68e', speck: 0.35, rough: 0.34, clear: 0.45, dip: 0.3, brk: 0.8, seed: 11 },
  gesunda: { shape: [1.1, 0.5, 3.4],  wobble: 0.015, h: 0.15, glaze: '#ece5d8', deep: '#cdbfa6', clay: '#b6a38a', speck: 1.0, rough: 0.2, clear: 0.9, dip: 0.42, brk: 0.55, seed: 23 },
  vika:    { shape: [0.76, 0.66, 2.1], wobble: 0.085, h: 0.16, glaze: '#d9aaa2', deep: '#b17a72', clay: '#baa790', speck: 0.3, rough: 0.18, clear: 1, dip: 0.34, brk: 0.6, seed: 41 },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// Fatets kontur sedd uppifrån: superellips + långsamma vågor (handgjort), jämnt fördelade punkter längs kanten.
function outline(spec, N) {
  const r = rng(spec.seed * 7919 + 1);
  const [w, d, n] = spec.shape, e = 2 / n, M = 1440, raw = [];
  const waves = [2, 3, 4, 5].map(k => ({ k, a: r() * 2 - 1, p: r() * TAU }));
  const fine = [7, 9, 13].map(k => ({ k, a: r() * 2 - 1, p: r() * TAU }));
  for (let i = 0; i < M; i++) {
    const th = i / M * TAU, c = Math.cos(th), s = Math.sin(th);
    let k = 1;
    for (const q of waves) k += spec.wobble * q.a * Math.sin(q.k * th + q.p) * 2 / q.k;
    for (const q of fine) k += 0.0035 * q.a * Math.sin(q.k * th + q.p);
    raw.push([w * Math.sign(c) * Math.abs(c) ** e * k, d * Math.sign(s) * Math.abs(s) ** e * k]);
  }
  const len = [0];
  for (let i = 1; i <= M; i++) { const a = raw[i - 1], b = raw[i % M]; len.push(len[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const pts = [];
  for (let i = 0, j = 0; i < N; i++) {
    const L = i / N * len[M];
    while (len[j + 1] < L) j++;
    const t = (L - len[j]) / (len[j + 1] - len[j]), a = raw[j], b = raw[(j + 1) % M];
    pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
  }
  const nrm = pts.map((p, i) => {
    const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz);
    return [tz / l, -tx / l];
  });
  return { pts, nrm };
}

// Fatets profil från mitten av golvet, upp över kanten och tillbaka under botten.
// d = avstånd inåt från konturen, y = höjd. fd/fy = samma punkt när fatet är en platt lerplatta (före formningen).
function profile(spec, H, rAvg) {
  const t = 0.075, tt = t / 2, F = 0.055, fl = 0.2, rf = Math.min(0.07, H * 0.32), rb = 0.028;
  const dIn = y => fl * (H - y) + tt, dOut = y => fl * (H - y) - tt;
  const dc = dIn(F + rf) + rf, cdOut = dOut(rb) + rb, P = [];
  const add = (o) => P.push(Object.assign({ m: 'w', ins: 0, pool: 0, rim: 0, ao: 1, outerH: 0, bottom: 0 }, o));
  for (let k = 0, nF = 11; k < nF; k++) {
    const u = 1 - (1 - k / nF) ** 1.35;
    add({ m: 'f', u, d: dc, y: F, ins: 1, pool: 0.1 * (1 - u) + 0.5 * ease(seg(u, 0.55, 1)), ao: 1 - 0.28 * ease(seg(u, 0.72, 1)) });
  }
  for (let k = 0, n = 7; k <= n; k++) {
    const ph = k / n * Math.PI / 2;
    add({ d: dc - rf * Math.sin(ph), y: F + rf - rf * Math.cos(ph), ins: 1, pool: 1 - 0.45 * k / n, ao: 0.7 + 0.04 * k / n, seg: 'in' });
  }
  for (let k = 1, n = 6; k < n; k++) {
    const q = k / n, y = lerp(F + rf, H - tt, q);
    add({ d: dIn(y), y, ins: 1, pool: 0.55 * (1 - q) ** 2, rim: 0.2 * q ** 4, ao: lerp(0.76, 1, q), seg: 'in' });
  }
  const cR = fl * tt;
  for (let k = 0, n = 14; k <= n; k++) {
    const ps = k / n * Math.PI;
    add({ d: cR + tt * Math.cos(ps), y: H - tt + tt * 0.8 * Math.sin(ps), ins: 1, rim: Math.sin(ps) ** 1.5, seg: 'rim', ps });
  }
  for (let k = 1, n = 7; k < n; k++) {
    const y = lerp(H - tt, rb, k / n);
    add({ d: dOut(y), y, outerH: y / H, rim: 0.25 * (1 - k / n) ** 4, ao: lerp(1, 0.9, k / n), seg: 'out' });
  }
  for (let k = 0, n = 6; k <= n; k++) {
    const ph = (1 - k / n) * Math.PI / 2, y = rb - rb * Math.cos(ph);
    add({ d: cdOut - rb * Math.sin(ph), y, outerH: y / H, ao: 0.88, seg: 'out' });
  }
  for (let k = 8, n = 9; k >= 0; k--) add({ m: 'b', u: k / n, d: cdOut, y: 0, bottom: 1, ao: 0.86 });

  // båglängd längs profilen (för glasyren som rinner från kanten) och den platta versionen
  const radial = p => p.m === 'w' ? rAvg - p.d : p.u * (rAvg - p.d);
  let s = 0, sTop = 0;
  P.forEach((p, i) => {
    if (i) { const q = P[i - 1]; s += Math.hypot(radial(p) - radial(q), p.y - q.y); }
    p.s = s;
    if (p.seg === 'rim' && Math.abs(p.ps - Math.PI / 2) < 1e-6) sTop = s;
  });
  const first = P.find(p => p.seg === 'in'), rimStart = P.find(p => p.seg === 'rim');
  const rimEnd = P.filter(p => p.seg === 'rim').pop(), outEnd = P.filter(p => p.seg === 'out').pop();
  const dEdge = dc - (rimStart.s - first.s);
  for (const p of P) {
    p.fromRim = Math.abs(p.s - sTop) / sTop;
    if (p.seg === 'in') { p.fd = dc - (p.s - first.s); p.fy = F; }
    else if (p.seg === 'rim') { p.fd = dEdge - F / 2 * Math.sin(p.ps); p.fy = F / 2 + F / 2 * Math.cos(p.ps); }
    else if (p.seg === 'out') { p.fd = lerp(dEdge, cdOut, (p.s - rimEnd.s) / (outEnd.s - rimEnd.s)); p.fy = 0; }
    else { p.fd = p.d; p.fy = p.y; }
  }
  return { P, flatEdge: dEdge };
}

function trayGeometry(spec) {
  const N = 200, { pts, nrm } = outline(spec, N);
  const rAvg = pts.reduce((a, p) => a + Math.hypot(p[0], p[1]), 0) / N;
  const r = rng(spec.seed * 31 + 7);
  const hw = [1, 2, 3].map(k => ({ k, a: r() * 2 - 1, p: r() * TAU }));
  const sag = (x, z) => 0.004 * Math.sin(2.3 * x + spec.seed) * Math.sin(2.9 * z + 1.7);
  let M = 0, pos, flat, sh1, sh2, flatEdge = 0;
  for (let i = 0; i < N; i++) {
    let H = spec.h;
    for (const q of hw) H += spec.h * 0.045 * q.a * Math.sin(q.k * i / N * TAU + q.p);
    const prof = profile(spec, H, rAvg), P = prof.P;
    flatEdge = Math.min(flatEdge, prof.flatEdge);
    if (!pos) { M = P.length; pos = new Float32Array(M * N * 3); flat = new Float32Array(M * N * 3); sh1 = new Float32Array(M * N * 4); sh2 = new Float32Array(M * N * 4); }
    const O = pts[i], n = nrm[i];
    P.forEach((p, j) => {
      const v = j * N + i, k = 1 - ease(seg(p.u ?? 1, 0.72, 0.96));
      let x, z, fx, fz;
      if (p.m === 'w') { x = O[0] - p.d * n[0]; z = O[1] - p.d * n[1]; fx = O[0] - p.fd * n[0]; fz = O[1] - p.fd * n[1]; }
      else { x = fx = p.u * (O[0] - p.d * n[0]); z = fz = p.u * (O[1] - p.d * n[1]); }
      const dy = p.m === 'f' ? sag(x, z) * k : 0;
      pos.set([x, p.y + dy, z], v * 3);
      flat.set([fx, p.fy + dy, fz], v * 3);
      sh1.set([p.ins, p.pool, p.rim, p.ao], v * 4);
      sh2.set([p.outerH, p.bottom, p.fromRim, p.y / H], v * 4);
    });
  }
  const idx = [];
  for (let j = 0; j < M - 1; j++) for (let i = 0; i < N; i++) {
    const a = j * N + i, b = j * N + (i + 1) % N, c = (j + 1) * N + i, d = (j + 1) * N + (i + 1) % N;
    idx.push(a, b, c, b, d, c);
  }
  const flatGeo = new BufferGeometry();
  flatGeo.setAttribute('position', new BufferAttribute(flat, 3));
  flatGeo.setIndex(idx);
  flatGeo.computeVertexNormals();
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aShade1', new BufferAttribute(sh1, 4));
  geo.setAttribute('aShade2', new BufferAttribute(sh2, 4));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.morphAttributes.position = [flatGeo.getAttribute('position')];
  geo.morphAttributes.normal = [flatGeo.getAttribute('normal')];
  geo.computeBoundingSphere();
  const radius = Math.max(...pts.map(p => Math.hypot(p[0], p[1])));
  return { geo, pts, radius, fit: radius * 0.6 + rAvg * 0.4, flatRadius: radius - flatEdge };
}

// ---------- Material: lerkropp, glasyr, järnprickar, stämpel ----------
const GLSL_NOISE = /* glsl */`
float aHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(aHash(i), aHash(i + vec3(1,0,0)), f.x), mix(aHash(i + vec3(0,1,0)), aHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(aHash(i + vec3(0,0,1)), aHash(i + vec3(1,0,1)), f.x), mix(aHash(i + vec3(0,1,1)), aHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

let stampTex = null;
function stampTexture() {
  if (stampTex) return stampTex;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = g.fillStyle = '#fff'; g.lineWidth = 5;
  g.beginPath(); g.arc(128, 128, 92, 0, TAU); g.stroke();
  g.font = '600 30px Marcellus, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const word = 'ARTERA';
  [...word].forEach((ch, i) => {
    const a = -Math.PI / 2 + (i - (word.length - 1) / 2) * 0.36;
    g.save(); g.translate(128 + Math.cos(a) * 66, 128 + Math.sin(a) * 66); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
  });
  g.font = '600 26px Marcellus, Georgia, serif'; g.fillText('UF', 128, 132);
  g.font = '500 17px Georgia, serif'; g.fillText('MORA', 128, 196);
  stampTex = new CanvasTexture(c);
  return stampTex;
}

function trayMaterial(spec) {
  const u = {
    uGlazeCol: { value: new Color(spec.glaze) }, uGlazeDeep: { value: new Color(spec.deep) }, uBodyCol: { value: new Color(spec.clay) },
    uBisqueCol: { value: new Color('#ece0d2') }, uDryCol: { value: new Color('#b9b0a6') }, uWetCol: { value: new Color('#80776d') },
    uSpeckCol: { value: new Color('#4b3427') }, uSpeck: { value: spec.speck }, uGlazeRough: { value: spec.rough }, uClear: { value: spec.clear },
    uDip: { value: spec.dip }, uSeed: { value: spec.seed }, uBreak: { value: spec.brk },
    uWet: { value: 0 }, uBisque: { value: 1 }, uGlaze: { value: 1 }, uFired: { value: 1 }, uHeat: { value: 0 }, uStampOn: { value: 1 },
    uTime: { value: 0 }, uStamp: { value: stampTexture() },
  };
  const m = new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aShade1; attribute vec4 aShade2; varying vec4 vSh1; varying vec4 vSh2; varying vec3 vObj;')
      .replace('#include <project_vertex>', 'vSh1 = aShade1; vSh2 = aShade2; vObj = position;\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uGlazeCol, uGlazeDeep, uBodyCol, uBisqueCol, uDryCol, uWetCol, uSpeckCol;
uniform float uSpeck, uGlazeRough, uClear, uDip, uSeed, uBreak, uWet, uBisque, uGlaze, uFired, uHeat, uStampOn, uTime;
uniform sampler2D uStamp;
varying vec4 vSh1; varying vec4 vSh2; varying vec3 vObj;
float gMask; float gRough; float gHeight;
${GLSL_NOISE}
float speckles(vec3 p, float density) {
  vec3 i = floor(p), f = fract(p);
  float on = step(1.0 - density, aHash(i + 5.31)) * (1.0 - smoothstep(0.18, 0.45, length(fwidth(p))));
  vec3 c = 0.3 + 0.4 * vec3(aHash(i), aHash(i + 17.13), aHash(i + 31.71));
  float rad = 0.14 + 0.2 * aHash(i + 11.7);
  float d = length(f - c);
  float aa = fwidth(d) + 0.002;
  return on * (1.0 - smoothstep(rad - aa, rad + aa, d));
}
vec3 arteraBump(vec3 n, float h) {
  vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
  float dhdx = dFdx(h), dhdy = dFdy(h);
  vec3 r1 = cross(dpdy, n), r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
  return normalize(abs(det) * n - grad);
}
vec3 arteraSurface() {
  float ins = vSh1.x, pool = vSh1.y, rim = vSh1.z, ao = vSh1.w;
  float outerH = vSh2.x, bottom = vSh2.y, fromRim = vSh2.z;
  float ang = atan(vObj.z, vObj.x);
  float drip = pow(max(0.0, sin(ang * 6.0 + uSeed * 3.1)), 46.0) * (0.55 + 0.45 * sin(ang * 3.0 + uSeed));
  float dip = uDip + 0.06 * sin(ang * 2.0 + uSeed) + 0.03 * sin(ang * 5.0 + uSeed * 1.7) - 0.24 * drip;
  float outside = smoothstep(dip - 0.012, dip + 0.012, outerH);
  float n1 = vnoise(vObj * 7.0);
  float cov = smoothstep(-0.04, 0.04, uGlaze * 1.3 - fromRim - 0.15 + (n1 - 0.5) * 0.18);
  gMask = max(ins, outside) * cov;

  vec3 body = mix(uDryCol, uWetCol, uWet);
  body = mix(body, mix(uBisqueCol, uBodyCol, uFired), uBisque);
  body *= 0.93 + 0.14 * vnoise(vObj * 18.0);
  float sp = clamp(speckles(vObj * 70.0, 0.3 * uSpeck) + speckles(vObj * 29.0 + 3.1, 0.09 * uSpeck), 0.0, 1.0);
  float spAmt = sp * mix(0.12, 1.0, uFired * uBisque);
  vec3 bodyC = mix(body, uSpeckCol, spAmt * 0.8);

  float lowN = vnoise(vObj * 2.3 + uSeed), midN = vnoise(vObj * 11.0 + 4.0);
  vec3 g = uGlazeCol * (0.9 + 0.2 * lowN);
  g = mix(g, uGlazeDeep, clamp(pool * 0.85 + (midN - 0.5) * 0.3, 0.0, 1.0));
  g = mix(g, mix(uBodyCol * vec3(0.86, 0.76, 0.64), uGlazeCol, 0.3), rim * uBreak);
  g = mix(g, uSpeckCol, spAmt * 0.6);
  vec3 chalk = mix(uGlazeCol, vec3(0.86, 0.85, 0.83), 0.62) * (0.95 + 0.1 * midN);
  vec3 col = mix(bodyC, mix(chalk, g, uFired), gMask);

  vec2 suv = vObj.xz / 0.62 + 0.5;
  float st = bottom * uStampOn * texture2D(uStamp, suv).r;
  col *= 1.0 - 0.42 * st;
  col *= mix(1.0, ao, 0.85);

  // fin struktur tonas bort när den blir mindre än en pixel (annars trappsteg i flacka vinklar)
  float fw = length(fwidth(vObj));
  float rawH = vnoise(vObj * 95.0) * 0.0008 * (1.0 - smoothstep(0.2, 0.5, fw * 95.0))
             + vnoise(vObj * 31.0) * 0.0007 * (1.0 - smoothstep(0.2, 0.5, fw * 31.0)) - st * 0.006;
  float glzH = vnoise(vObj * 2.0 + uSeed) * 0.0028 + vnoise(vObj * 8.0 + 2.0) * 0.0009 * (1.0 - smoothstep(0.2, 0.5, fw * 8.0))
             + vnoise(vObj * 24.0) * 0.0006 * (1.0 - uFired) * (1.0 - smoothstep(0.2, 0.5, fw * 24.0));
  gHeight = mix(rawH, glzH, gMask);
  gRough = mix(mix(0.9, 0.6, uWet), mix(0.94, uGlazeRough + 0.08 * midN + rim * 0.12, uFired), gMask);
  col *= 1.0 - uHeat * 1.25;
  return col;
}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = arteraSurface();')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = arteraBump(normal, gHeight);')
      .replace('#include <clearcoat_normal_fragment_begin>', '#include <clearcoat_normal_fragment_begin>\n#ifdef USE_CLEARCOAT\nclearcoatNormal = arteraBump(clearcoatNormal, gHeight * gMask);\n#endif')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += mix(vec3(0.62, 0.06, 0.008), vec3(1.0, 0.26, 0.03), smoothstep(0.25, 0.85, vnoise(vObj * 4.0 + uTime * 0.4))) * uHeat * 1.15;')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat = gMask * uFired * uClear * (1.0 - 0.55 * vSh1.z);\n#endif');
  };
  m.customProgramCacheKey = () => 'artera-fat-1';
  return { material: m, u };
}

// Mjuk kontaktskugga med fatets form, ritad en gång i ett 2D-canvas.
function shadowMesh(pts, radius) {
  const S = 256, ext = radius * 1.6, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), sc = S / (2 * ext);
  const path = (k) => { g.beginPath(); pts.forEach(([x, z], i) => g[i ? 'lineTo' : 'moveTo'](S / 2 + x * k * sc - 2000, S / 2 + z * k * sc)); g.closePath(); };
  g.shadowOffsetX = 2000; g.shadowColor = 'rgba(0,0,0,0.42)'; g.shadowBlur = 26; path(1.02); g.fill();
  g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 7; path(0.93); g.fill();
  const tex = new CanvasTexture(c);
  const mesh = new Mesh(new PlaneGeometry(ext * 2, ext * 2), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: 0x2a1d15 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.001;
  mesh.renderOrder = -1;
  return mesh;
}

export function makeTray(spec) {
  const { geo, pts, radius, fit, flatRadius } = trayGeometry(spec);
  const { material, u } = trayMaterial(spec);
  const mesh = new Mesh(geo, material);
  mesh.morphTargetInfluences = [0];
  const yaw = new Group(), tilt = new Group(), root = new Group(), shadowYaw = new Group();
  const shadow = shadowMesh(pts, radius);
  yaw.add(mesh); tilt.add(yaw); shadowYaw.add(shadow); root.add(shadowYaw, tilt);
  return { root, tilt, yaw, mesh, shadow, shadowYaw, u, radius, fit, flatRadius, h: spec.h,
    setYaw(a) { yaw.rotation.y = a; shadowYaw.rotation.y = a; },
    setLift(v) { mesh.morphTargetInfluences[0] = 1 - v; shadow.scale.setScalar(lerp(flatRadius / radius, 1, v)); } };
}

// Kaveln från loggan (används i första steget av "Så gör vi")
function rollingPin() {
  const pr = [[0, -1.5], [0.03, -1.495], [0.05, -1.475], [0.056, -1.44], [0.056, -1.12], [0.064, -1.08], [0.1, -1.05], [0.118, -1.02], [0.122, -0.98]];
  const prof = [...pr, ...pr.slice().reverse().map(([x, y]) => [x, -y])].map(([x, y]) => new Vector2(x, y));
  const geo = new LatheGeometry(prof, 48);
  const mat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <project_vertex>', 'vObj = position;\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vObj;\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float gr = vnoise(vec3(vObj.x * 26.0, vObj.y * 1.2, vObj.z * 26.0) + vnoise(vObj * 3.0) * 2.0);
float ring = smoothstep(0.35, 0.75, fract(gr * 4.0));
diffuseColor.rgb = mix(vec3(0.52, 0.33, 0.19), vec3(0.34, 0.19, 0.09), ring * 0.7) * (0.9 + 0.15 * vnoise(vObj * 40.0));`);
  };
  mat.customProgramCacheKey = () => 'artera-kavel-1';
  const mesh = new Mesh(geo, mat);
  mesh.rotation.z = Math.PI / 2;
  const roll = new Group(), g = new Group();
  roll.add(mesh); g.add(roll);
  g.rotation.y = 0.42;
  g.scale.setScalar(0.8);
  g.roll = roll;
  return g;
}

const envs = new WeakMap();
function environment(renderer) {
  if (!envs.has(renderer)) { const pm = new PMREMGenerator(renderer); envs.set(renderer, pm.fromScene(new RoomEnvironment(), 0.035).texture); pm.dispose(); }
  return envs.get(renderer);
}

function buildScene(renderer, spec, kind) {
  const scene = new Scene();
  scene.environment = environment(renderer);
  scene.environmentIntensity = kind === 'process' ? 0.75 : 0.85;
  scene.environmentRotation.y = 0.6;
  const key = new DirectionalLight(0xfff4ea, kind === 'process' ? 2.4 : 2.0);
  key.position.set(-2.4, 4.2, 2.6);
  scene.add(key);
  const tray = makeTray(spec);
  scene.add(tray.root);
  const camera = new PerspectiveCamera(24, 1, 0.05, 60);
  return { scene, camera, tray };
}

// Kameran tittar snett ner på fatet och anpassar avståndet så att fatet fyller rutan.
function frameCamera(cam, aspect, R, H, elev, fill, yLook = 0) {
  const vt = Math.tan(cam.fov * Math.PI / 360), ht = vt * aspect;
  const halfH = R * Math.sin(elev) + H * Math.cos(elev) * 0.5;
  const dist = Math.max(R / ht, halfH / vt) / fill + R * Math.cos(elev) * 0.35;
  cam.aspect = aspect;
  cam.position.set(0, yLook + Math.sin(elev) * dist, Math.cos(elev) * dist);
  cam.lookAt(0, yLook, 0);
  cam.updateProjectionMatrix();
}

// ---------- Sidan ----------
function init() {
  const els = [...document.querySelectorAll('[data-fat]')];
  if (!els.length) return;
  const layer = document.createElement('div');
  layer.className = 'fat-layer';
  layer.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  layer.appendChild(canvas);
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  document.body.appendChild(layer);
  document.documentElement.classList.add('has-3d');
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.autoClear = false;

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0;
  const resize = () => {
    const w = document.documentElement.clientWidth, h = window.innerHeight;
    if (w === W && Math.abs(h - H) < 2) return;
    W = w; H = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 2 : 1.75));
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  };
  resize();
  window.addEventListener('resize', resize);

  const stages = els.map((el, i) => {
    const kind = el.dataset.kind || 'product';
    const spec = FAT[el.dataset.fat] || FAT.siljan;
    const st = Object.assign(buildScene(renderer, spec, kind), { el, kind, base: 0.5 + i * 1.7, dir: i % 2 ? -1 : 1, drag: 0, vel: 0, live: false, p: 0 });
    if (kind === 'process') setupProcess(st);
    else setupDrag(st);
    return st;
  });

  // Dra i fatet för att snurra det (med lite tröghet när man släpper)
  function setupDrag(st) {
    let x0 = null, last = 0;
    st.el.addEventListener('pointerdown', (e) => { x0 = e.clientX; last = performance.now(); st.vel = 0; st.el.classList.add('is-dragging'); });
    window.addEventListener('pointermove', (e) => {
      if (x0 === null) return;
      const dx = (e.clientX - x0) / Math.max(200, st.el.clientWidth) * 4.2, now = performance.now();
      st.drag += dx; st.vel = dx / Math.max(8, now - last) * 16; x0 = e.clientX; last = now;
    });
    const up = () => { if (x0 !== null) { x0 = null; st.el.classList.remove('is-dragging'); } };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  function setupProcess(st) {
    st.steps = [...document.querySelectorAll('.process__steps .step')];
    st.pin = rollingPin();
    st.scene.add(st.pin);
    st.glow = new PointLight(0xff7a30, 0, 6, 1.5);
    st.glow.position.set(0, 1.2, 0.8);
    st.scene.add(st.glow);
  }

  function updateProcess(st, dt, t) {
    const line = W < 900 ? st.el.getBoundingClientRect().bottom + 40 : H * 0.55;
    let target = 0, active = -1;
    st.steps.forEach((s, i) => {
      const r = s.getBoundingClientRect(), k = clamp((line - r.top) / r.height);
      target += k / st.steps.length;
      if (k > 0) active = i;
    });
    st.steps.forEach((s, i) => s.classList.toggle('is-active', i === active || (active < 0 && i === 0)));
    st.p += (target - st.p) * (1 - Math.exp(-dt * 7));
    const p = st.p, T = st.tray, u = T.u;
    // 1 kavla, 2 forma och stämpla, 3 torka och bränna, 4 glasera, 5 bränna igen
    const roll = ease(seg(p, 0.015, 0.165));
    const lift = ease(seg(p, 0.215, 0.3));
    const flip = ease(seg(p, 0.3, 0.345)) - ease(seg(p, 0.37, 0.405));
    const heat1 = bell(p, 0.44, 0.5, 0.57), heat2 = bell(p, 0.82, 0.885, 0.95);
    T.setLift(lift);
    u.uWet.value = 1 - ease(seg(p, 0.4, 0.47));
    u.uBisque.value = ease(seg(p, 0.48, 0.54));
    u.uGlaze.value = ease(seg(p, 0.61, 0.77));
    u.uFired.value = ease(seg(p, 0.875, 0.95));
    u.uHeat.value = Math.max(heat1, heat2) * 0.7;
    u.uStampOn.value = ease(seg(p, 0.33, 0.36));
    u.uTime.value = t;
    st.glow.intensity = Math.max(heat1, heat2) * 3;
    st.el.style.setProperty('--heat', Math.max(heat1, heat2).toFixed(3));
    // lerplattan blir tunnare medan kaveln rullar över den (bakifrån och fram)
    T.root.scale.y = lerp(1.8, 1, roll);
    const pinR = 0.122, pz = lerp(-1.25, 1.1, roll), out = ease(seg(p, 0.165, 0.215));
    st.pin.roll.position.set(0, (0.055 * T.root.scale.y) / 0.8 + pinR + out * 2.2, pz / 0.8 + out * 0.6);
    st.pin.roll.rotation.x = pz / 0.8 / pinR;
    st.pin.visible = p < 0.22;
    // vänd fatet och visa stämpeln under (lyft det så att det inte går under "golvet")
    const up = flip * T.radius * 0.85;
    T.tilt.position.y = T.h * 0.5 + up;
    T.mesh.position.y = -T.h * 0.5;
    T.tilt.rotation.x = -flip * 2.35;
    T.shadow.material.opacity = 1 - flip * 0.85;
    const spin = still ? 0 : t * 0.07 + window.scrollY * 0.0012;
    T.setYaw(0.4 + spin + flip * (-spin - 0.4 + 0.0));
    const R = lerp(T.flatRadius * 1.05, T.radius, lift) * (1 + 0.28 * flip);
    return { R, look: 0.08 + up * 0.9 };
  }

  let last = performance.now(), drewLast = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000;
    last = now;
    resize();
    const sy = window.scrollY;
    canvas.style.transform = `translate3d(0,${sy}px,0)`;
    const vis = [];
    for (const st of stages) {
      const r = st.el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < H && r.width > 0) vis.push([st, r]);
    }
    if (!vis.length && !drewLast) return;
    renderer.setScissorTest(false);
    renderer.clear();
    drewLast = vis.length > 0;
    renderer.setScissorTest(true);
    for (const [st, r] of vis) {
      const T = st.tray, aspect = r.width / r.height;
      if (st.kind === 'process') {
        const { R, look } = updateProcess(st, dt, t);
        frameCamera(st.camera, aspect, R, T.h, 0.62, W < 900 ? 0.86 : 0.74, look);
      } else {
        if (Math.abs(st.vel) > 0.0001 && !st.el.classList.contains('is-dragging')) { st.drag += st.vel; st.vel *= Math.pow(0.04, dt); }
        const spin = still ? 0 : (t * 0.06 + sy * 0.0021) * st.dir;
        T.setYaw(st.base + spin + st.drag);
        let elev = 0.68;
        if (st.kind === 'hero') elev = lerp(0.62, 0.95, clamp(sy / Math.max(1, H)));
        frameCamera(st.camera, aspect, T.radius, T.h, elev, st.kind === 'hero' ? 0.86 : 0.84, 0.02);
      }
      const y = H - r.bottom;
      renderer.setViewport(r.left, y, r.width, r.height);
      renderer.setScissor(r.left, y, r.width, r.height);
      renderer.render(st.scene, st.camera);
      if (!st.live) { st.live = true; st.el.classList.add('is-live'); }
    }
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stages.forEach(st => { st.live = false; st.el.classList.remove('is-live'); });
    document.documentElement.classList.remove('has-3d');
    layer.remove();
  });
  requestAnimationFrame(frame);
}

// Produktbild av ett fat (används för att ta fram img/fat-*.webp och Stripe-bilder). Inte en del av sidan.
export function snapshot(name, size = 1000, { yaw = 0.5, elev = 0.6, fill = 0.8, type = 'image/webp', quality = 0.9, background = null, aspect = 1 } = {}) {
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: !background, preserveDrawingBuffer: true });
  renderer.setPixelRatio(2);
  renderer.setSize(Math.round(size * aspect), size, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  if (background) renderer.setClearColor(new Color(background), 1); else renderer.setClearColor(0x000000, 0);
  const st = buildScene(renderer, FAT[name], 'product');
  st.tray.setYaw(yaw);
  frameCamera(st.camera, aspect, st.tray.radius, st.tray.h, elev, fill, 0.02);
  renderer.render(st.scene, st.camera);
  // dubbel upplösning skalas ner för mjuka kanter
  const out = document.createElement('canvas');
  out.width = Math.round(size * aspect); out.height = size;
  const g = out.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, 0, 0, out.width, out.height);
  renderer.dispose();
  return out.toDataURL(type, quality);
}

init();
