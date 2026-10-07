// 3D-faten. Varje fat är en riktig modell av en kavlad lerplatta som draperats till vågor och veck,
// med glasyr, marmorering, järnprickar, mjuka skuggor och en stämpel under. Ritas med Three.js.
// Ett enda canvas ligger över sidan och ritar varje fat i rutan för sitt element:
//   <div data-fat="vika" data-kind="hero|product|viewer|process">
// Saknas WebGL ligger bilderna i img/fat-*.webp kvar. Bilderna tas fram med samma kod (se snapshot längst ner).
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BufferGeometry, BufferAttribute, PlaneGeometry, LatheGeometry,
  MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, ShadowMaterial, DirectionalLight, PointLight, SpotLight, Color, Vector2, Vector3,
  CanvasTexture, PMREMGenerator, NeutralToneMapping, SRGBColorSpace, VSMShadowMap, PCFShadowMap, BoxGeometry, BackSide
} from './vendor/three.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => t * t * (3 - 2 * t);
const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const bell = (p, a, m, b) => p < m ? ease(seg(p, a, m)) : 1 - ease(seg(p, m, b));
const smoothstep = (a, b, x) => ease(seg(x, a, b));

// Faten. Mått i decimeter (1 enhet = 10 cm).
// size = halva bredden och djupet, n = hur rektangulär formen är, lobes = mjuka bulor i konturen [k, styrka, fas],
// lift = hur mycket kanten viker sig uppåt, liftWaves = vågor längs kanten, folds = veck [från, till, bredd, höjd],
// curl = en ände som viker sig upp. Glasyren beskrivs i glaze.
export const FAT = {
  vika: {
    detail: [0.78, 0.3],
    size: [1.8, 1.2], n: 2.3, seed: 5, T: 0.065,
    lobes: [[2, 0.05, 0.6], [3, 0.055, 2.2], [4, 0.03, 4.0], [6, 0.012, 1.0]],
    lift: 0.3, liftFrom: 0.28, liftWaves: [[3, 0.95, 0.4], [5, 0.45, 2.1], [2, 0.3, 1.0]],
    folds: [{ p0: [-1.75, 0.85], p1: [0.55, -0.4], w: 0.27, h: 0.17 }, { p0: [1.7, -0.5], p1: [0.5, 0.2], w: 0.22, h: -0.05 }],
    glaze: { base: '#f5f1ed', deep: '#eee7e2', marble: '#eab8c5', marbleDeep: '#d98ea4', marbleAmt: 1, speck: 0.7, speckScale: 34, grain: 0, speckCol: '#262120', lightSpeck: 0, rough: 0.1, clear: 1, edgeCol: '#ffffff', edgeAmt: 0, mottle: 0.02, clay: '#e4dbd0' },
  },
  gesunda: {
    detail: [-0.62, 0.55],
    size: [2.0, 0.95], n: 2.8, seed: 17, T: 0.07,
    lobes: [[2, 0.03, 1.3], [3, 0.045, 0.2], [5, 0.02, 2.6]],
    lift: 0.12, liftFrom: 0.45, liftWaves: [[2, 0.6, 1.0], [4, 0.45, 0.3]],
    folds: [{ p0: [-0.55, -1.2], p1: [0.1, 1.1], w: 0.32, h: 0.28 }],
    curl: { ang: 0, s0: 1.25, R: 0.45, max: 0.85 },
    glaze: { base: '#cec3b5', deep: '#b6a896', marble: '#000000', marbleDeep: '#000000', marbleAmt: 0, speck: 1.0, speckScale: 42, grain: 1, speckCol: '#4c3d31', lightSpeck: 1.0, rough: 0.56, clear: 0.1, edgeCol: '#ddd4c8', edgeAmt: 0.35, mottle: 0.13, clay: '#cbbfae' },
  },
  siljan: {
    detail: [0.72, 0.5],
    size: [1.2, 1.12], n: 2, seed: 29, T: 0.06,
    lobes: [[3, 0.03, 0.5], [5, 0.035, 1.4], [7, 0.015, 0.3]],
    lift: 0.2, liftFrom: 0.3, liftWaves: [[4, 0.7, 0.2], [3, 0.3, 1.1], [6, 0.15, 0.5]],
    folds: [],
    glaze: { base: '#a5b2b9', deep: '#86959e', marble: '#000000', marbleDeep: '#000000', marbleAmt: 0, speck: 0.35, speckScale: 38, grain: 0.3, speckCol: '#3a3836', lightSpeck: 0, rough: 0.24, clear: 0.6, edgeCol: '#e6e9e6', edgeAmt: 0.35, mottle: 0.09, clay: '#e2d9cd' },
  },
  hemus: {
    detail: [0.62, -0.45],
    size: [1.0, 0.7], n: 2.3, seed: 43, T: 0.06,
    lobes: [[2, 0.04, 0.9], [3, 0.05, 2.6], [4, 0.03, 1.2]],
    lift: 0.19, liftFrom: 0.35, liftWaves: [[2, 0.95, -0.6], [4, 0.4, 1.8]],
    folds: [{ p0: [0.95, 0.6], p1: [0.15, -0.15], w: 0.2, h: 0.07 }],
    glaze: { base: '#a9b09d', deep: '#8c9583', marble: '#000000', marbleDeep: '#000000', marbleAmt: 0, speck: 0.45, speckScale: 38, grain: 0.4, speckCol: '#3d3a32', lightSpeck: 0, rough: 0.42, clear: 0.22, edgeCol: '#e2e4d8', edgeAmt: 0.55, mottle: 0.08, clay: '#ddd3c6' },
  },
};

// ---------- Formen ----------
function shape(spec) {
  const [w, d] = spec.size, n = spec.n, e = 2 / n;
  const k = th => { let v = 1; for (const [kk, a, p] of spec.lobes) v += a * Math.sin(kk * th + p); return v; };
  // vinkeln på superellipsen för en punkt, och hur långt ut mot kanten punkten ligger (0 = mitten, 1 = kanten)
  const paramAngle = (x, z) => Math.atan2(Math.sign(z) * Math.abs(z / d) ** (n / 2), Math.sign(x) * Math.abs(x / w) ** (n / 2));
  const rho = (x, z) => ((Math.abs(x) / w) ** n + (Math.abs(z) / d) ** n) ** (1 / n) / k(paramAngle(x, z));
  const edgeAt = th => { const c = Math.cos(th), s = Math.sin(th), kk = k(th); return [w * Math.sign(c) * Math.abs(c) ** e * kk, d * Math.sign(s) * Math.abs(s) ** e * kk]; };

  // mittytan: platt platta (x, 0, z) som lyfts i kanterna, får veck och ibland en uppvikt ände
  const mid = (x, z) => {
    const r = rho(x, z), th = paramAngle(x, z);
    let wv = 1;
    for (const [kk, a, p] of spec.liftWaves) wv += a * Math.sin(kk * th + p);
    const eL = smoothstep(spec.liftFrom, 1.08, r);
    let y = spec.lift * eL * eL * Math.max(0.04, wv);
    for (const f of spec.folds) {
      const ax = f.p1[0] - f.p0[0], az = f.p1[1] - f.p0[1], L = Math.hypot(ax, az), ux = ax / L, uz = az / L;
      const dx = x - f.p0[0], dz = z - f.p0[1], along = (dx * ux + dz * uz) / L, perp = -dx * uz + dz * ux;
      const win = smoothstep(-0.2, 0.25, along) * (1 - smoothstep(0.75, 1.15, along));
      y += f.h * Math.exp(-((perp / f.w) ** 2)) * win;
    }
    let X = x, Y = y, Z = z;
    const c = spec.curl;
    if (c) {
      const ca = Math.cos(c.ang), sa = Math.sin(c.ang), s = X * ca + Z * sa, t = -X * sa + Z * ca;
      if (s > c.s0) {
        const L = s - c.s0, a = Math.min(L / c.R, c.max), rest = L - a * c.R, R = c.R - Y;
        const s2 = c.s0 + R * Math.sin(a) + rest * Math.cos(a), y2 = c.R - R * Math.cos(a) + rest * Math.sin(a);
        X = s2 * ca - t * sa; Z = s2 * sa + t * ca; Y = y2;
      }
    }
    return [X, Y, Z];
  };
  return { mid, rho, edgeAt, paramAngle };
}

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// Konturen med jämnt fördelade punkter längs kanten
function outline(sh, N) {
  const M = 1600, raw = [], ths = [];
  for (let i = 0; i < M; i++) { const th = i / M * TAU; raw.push(sh.edgeAt(th)); ths.push(th); }
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

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function platterGeometry(spec) {
  const sh = shape(spec), N = 240, T = spec.T, half = T / 2;
  const { pts, nrm } = outline(sh, N);
  const eps = 0.004;
  const normalAt = (x, z) => norm(cross(sub(sh.mid(x, z + eps), sh.mid(x, z - eps)), sub(sh.mid(x + eps, z), sh.mid(x - eps, z))));
  const thick = (x, z) => 1 + 0.08 * Math.sin(3.1 * x + spec.seed) * Math.sin(2.7 * z + 1.3);
  // dalar i ytan blir lite mörkare (glasyren samlas och ljuset når sämre)
  const aoAt = (x, z) => {
    const h = 0.07, y0 = sh.mid(x, z)[1];
    const lap = (sh.mid(x + h, z)[1] + sh.mid(x - h, z)[1] + sh.mid(x, z + h)[1] + sh.mid(x, z - h)[1] - 4 * y0) / (h * h);
    return 1 - clamp(lap * 0.07, 0, 0.32) + clamp(-lap * 0.02, 0, 0.05);
  };
  // profilen: ovansidan från mitten ut, runt den rundade kanten, undersidan tillbaka in
  const prof = [];
  const nT = 30, nE = 12, nB = 22;
  for (let k = 0; k <= nT; k++) prof.push({ kind: 'top', u: 1 - (1 - k / nT) ** 1.3 });
  for (let k = 1; k < nE; k++) prof.push({ kind: 'edge', psi: k / nE * Math.PI });
  for (let k = nB; k >= 0; k--) prof.push({ kind: 'bot', u: 1 - (1 - k / nB) ** 1.3 });
  const M = prof.length, V = M * N;
  const pos = new Float32Array(V * 3), flat = new Float32Array(V * 3), rest = new Float32Array(V * 3), info = new Float32Array(V * 4);
  for (let i = 0; i < N; i++) {
    const O = pts[i], no = nrm[i];
    const Mo = sh.mid(O[0], O[1]), No = normalAt(O[0], O[1]);
    let E = sub(sh.mid(O[0] + no[0] * eps, O[1] + no[1] * eps), sh.mid(O[0] - no[0] * eps, O[1] - no[1] * eps));
    E = norm(sub(E, No.map(v => v * dot(E, No))));
    const tE = thick(O[0], O[1]), aoE = aoAt(O[0] * 0.97, O[1] * 0.97);
    prof.forEach((p, j) => {
      const v = j * N + i;
      if (p.kind === 'edge') {
        const c = Math.cos(p.psi) * half * tE, s = Math.sin(p.psi) * half * tE;
        pos.set([Mo[0] + No[0] * c + E[0] * s, Mo[1] + No[1] * c + E[1] * s, Mo[2] + No[2] * c + E[2] * s], v * 3);
        flat.set([O[0] + no[0] * s, half + c, O[1] + no[1] * s], v * 3);
        rest.set([O[0] + no[0] * s, Math.cos(p.psi), O[1] + no[1] * s], v * 3);
        info.set([1, Math.sin(p.psi), lerp(aoE, 1, 0.5), Math.cos(p.psi) < -0.2 ? 1 : 0], v * 4);
      } else {
        const x = p.u * O[0], z = p.u * O[1], m = sh.mid(x, z), nn = normalAt(x, z), sgn = p.kind === 'top' ? 1 : -1, o = sgn * half * thick(x, z);
        pos.set([m[0] + nn[0] * o, m[1] + nn[1] * o, m[2] + nn[2] * o], v * 3);
        flat.set([x, half + o, z], v * 3);
        rest.set([x, sgn, z], v * 3);
        const ao = aoAt(x, z);
        info.set([p.u, 0, sgn > 0 ? ao : lerp(0.82, ao, 0.4), sgn > 0 ? 0 : 1], v * 4);
      }
    });
  }
  // fatet vilar på bordet
  let minY = Infinity;
  for (let v = 0; v < V; v++) minY = Math.min(minY, pos[v * 3 + 1]);
  let rH = 0, maxY = 0;
  for (let v = 0; v < V; v++) { pos[v * 3 + 1] -= minY; rH = Math.max(rH, Math.hypot(pos[v * 3], pos[v * 3 + 2])); maxY = Math.max(maxY, pos[v * 3 + 1]); }
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
  geo.setAttribute('aRest', new BufferAttribute(rest, 3));
  geo.setAttribute('aInfo', new BufferAttribute(info, 4));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.morphAttributes.position = [flatGeo.getAttribute('position')];
  geo.morphAttributes.normal = [flatGeo.getAttribute('normal')];
  geo.computeBoundingSphere();
  const flatR = Math.max(...pts.map(p => Math.hypot(p[0], p[1])));
  return { geo, pts, radius: rH, height: maxY, flatRadius: flatR };
}

// ---------- Material: lera, glasyr, marmorering, prickar, stämpel ----------
const GLSL_NOISE = /* glsl */`
float aHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(aHash(i), aHash(i + vec3(1,0,0)), f.x), mix(aHash(i + vec3(0,1,0)), aHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(aHash(i + vec3(0,0,1)), aHash(i + vec3(1,0,1)), f.x), mix(aHash(i + vec3(0,1,1)), aHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
#ifdef LOWQ
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s / 0.875; }
#else
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s / 0.9375; }
#endif
`;

// Stämpeln ritas i 1024 px och mjukas upp lite, så att kanterna blir avfasade som i riktig lera.
let stampTex = null;
function drawStamp(c) {
  const S = 1024, k = S / 256, g = c.getContext('2d');
  const sharp = document.createElement('canvas'); sharp.width = sharp.height = S;
  const h = sharp.getContext('2d');
  h.fillStyle = '#000'; h.fillRect(0, 0, S, S);
  h.strokeStyle = h.fillStyle = '#fff'; h.lineWidth = 5 * k;
  h.beginPath(); h.arc(128 * k, 128 * k, 92 * k, 0, TAU); h.stroke();
  h.font = `400 ${31 * k}px Marcellus, Georgia, serif`; h.textAlign = 'center'; h.textBaseline = 'middle';
  const word = 'ARTERA';
  [...word].forEach((ch, i) => {
    const a = -Math.PI / 2 + (i - (word.length - 1) / 2) * 0.36;
    h.save(); h.translate((128 + Math.cos(a) * 66) * k, (128 + Math.sin(a) * 66) * k); h.rotate(a + Math.PI / 2); h.fillText(ch, 0, 0); h.restore();
  });
  h.font = `400 ${27 * k}px Marcellus, Georgia, serif`; h.fillText('UF', 128 * k, 132 * k);
  h.font = `400 ${18 * k}px Marcellus, Georgia, serif`; h.fillText('MORA', 128 * k, 196 * k);
  // mjuk kant: ner till halva storleken och tillbaka
  const half = document.createElement('canvas'); half.width = half.height = S / 2;
  const hg = half.getContext('2d'); hg.imageSmoothingQuality = 'high'; hg.drawImage(sharp, 0, 0, S / 2, S / 2);
  g.imageSmoothingQuality = 'high';
  g.drawImage(half, 0, 0, S, S);
}
function stampTexture() {
  if (stampTex) return stampTex;
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  drawStamp(c);
  stampTex = new CanvasTexture(c);
  stampTex.anisotropy = 4;
  // rita om när typsnittet Marcellus har laddats
  if (document.fonts && document.fonts.load) document.fonts.load('400 120px Marcellus').then(() => { drawStamp(c); stampTex.needsUpdate = true; }).catch(() => {});
  return stampTex;
}

function platterMaterial(spec) {
  const gz = spec.glaze;
  const u = {
    uBase: { value: new Color(gz.base) }, uDeep: { value: new Color(gz.deep) }, uMarble: { value: new Color(gz.marble) }, uMarbleDeep: { value: new Color(gz.marbleDeep) },
    uMarbleAmt: { value: gz.marbleAmt }, uEdgeCol: { value: new Color(gz.edgeCol) }, uEdgeAmt: { value: gz.edgeAmt }, uMottle: { value: gz.mottle },
    uSpeck: { value: gz.speck }, uSpeckScale: { value: gz.speckScale }, uGrain: { value: gz.grain }, uSpeckCol: { value: new Color(gz.speckCol) }, uLightSpeck: { value: gz.lightSpeck }, uRough: { value: gz.rough }, uClear: { value: gz.clear },
    uClayCol: { value: new Color(gz.clay) }, uBisqueCol: { value: new Color('#eee5da') }, uDryCol: { value: new Color('#bab2a8') }, uWetCol: { value: new Color('#7a7269') },
    uSeed: { value: spec.seed }, uExtent: { value: spec.size[0] * 1.15 }, uFoot: { value: 0.5 },
    uDry: { value: 1 }, uBisque: { value: 1 }, uGlaze: { value: 1 }, uFired: { value: 1 }, uStampOn: { value: 1 },
    uPinZ: { value: 99 }, uLump: { value: 0 }, uMarks: { value: 0 }, uStamp: { value: stampTexture() },
  };
  const m = new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.07 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aRest; attribute vec4 aInfo; varying vec3 vRest; varying vec4 vInfo;')
      .replace('#include <project_vertex>', 'vRest = aRest; vInfo = aInfo;\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uBase, uDeep, uMarble, uMarbleDeep, uEdgeCol, uSpeckCol, uClayCol, uBisqueCol, uDryCol, uWetCol;
uniform float uSpeckScale, uGrain;
uniform float uMarbleAmt, uEdgeAmt, uMottle, uSpeck, uLightSpeck, uRough, uClear, uSeed, uExtent, uFoot;
uniform float uDry, uBisque, uGlaze, uFired, uStampOn, uPinZ, uLump, uMarks;
uniform sampler2D uStamp;
varying vec3 vRest; varying vec4 vInfo;
float gMask; float gRough; float gHeight;
${GLSL_NOISE}
float gHalo;
float speckles(vec3 p, float density) {
  vec3 i = floor(p), f = fract(p);
  float on = step(1.0 - density, aHash(i + 5.31)) * (1.0 - smoothstep(0.4, 0.9, length(fwidth(p))));
  vec3 c = 0.3 + 0.4 * vec3(aHash(i), aHash(i + 17.13), aHash(i + 31.71));
  float big = step(0.93, aHash(i + 2.2));
  float rad = 0.1 + 0.16 * aHash(i + 11.7) + big * 0.12;
  float d = length(f - c);
  float aa = fwidth(d) + 0.002;
  gHalo = max(gHalo, on * (1.0 - smoothstep(rad, rad * 2.4, d)) * 0.5);
  return on * (1.0 - smoothstep(rad - aa, rad + aa, d));
}
float marble(vec3 q) {
  vec2 w = vec2(fbm(q * 1.4), fbm(q * 1.4 + vec3(5.2, 1.3, 2.7)));
  float f = fbm(q + vec3(w.x, 0.0, w.y) * 1.9);
  float clouds = smoothstep(0.5, 0.76, f);
  float v = fbm(q * 2.1 + vec3(w.y, 0.0, w.x) * 2.4);
  float veins = 1.0 - smoothstep(0.0, 0.028, abs(v - 0.54));
  return clamp(clouds * 0.85 + veins * 0.45 * smoothstep(0.35, 0.6, f), 0.0, 1.0);
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
  vec3 P = vec3(vRest.x, vRest.y * 0.35, vRest.z);
  float rho = vInfo.x, edge = vInfo.y, ao = vInfo.z, bottom = vInfo.w;
  float fw = length(fwidth(P));
  float n1 = vnoise(P * 3.0 + 1.7);
  // glasyren: fatet doppas från ena sidan
  float front = vRest.x / uExtent * 0.5 + 0.5;
  float cov = smoothstep(-0.03, 0.03, uGlaze * 1.3 - 0.15 - front + (n1 - 0.5) * 0.14);
  float foot = bottom * (1.0 - smoothstep(uFoot - 0.03, uFoot + 0.03, rho));
  gMask = cov * (1.0 - foot);
  // leran: blöt, torkar från kanten och inåt, skröjbränns, bränns
  float dryF = smoothstep(-0.08, 0.08, uDry * 1.4 - 0.2 - (1.0 - rho) + (n1 - 0.5) * 0.2);
  vec3 body = mix(uWetCol, uDryCol, dryF);
  body = mix(body, mix(uBisqueCol, uClayCol, uFired), uBisque);
  body *= 0.95 + 0.1 * vnoise(P * 16.0);
  gHalo = 0.0;
  float sp = clamp(speckles(P * uSpeckScale, 0.26 * uSpeck) + speckles(P * uSpeckScale * 0.45 + 3.1, 0.07 * uSpeck), 0.0, 1.0);
  float halo = gHalo;
  float spAmt = sp * mix(0.12, 1.0, uFired * uBisque);
  vec3 bodyC = mix(body, uSpeckCol * 1.5, spAmt * 0.45);
  // glasyren
  float lowN = fbm(P * 1.6 + uSeed);
  vec3 g = uBase * (1.0 - uMottle + 2.0 * uMottle * lowN);
  if (uMarbleAmt > 0.0) {
    vec3 q = P * 0.85 + vec3(uSeed * 1.7, 0.0, uSeed);
    float mm = marble(q);
#ifdef LOWQ
    float dp = 0.0;
#else
    float dp = smoothstep(0.6, 0.8, fbm(q * 3.0 + 9.0)) * mm;
#endif
    g = mix(g, uMarble, mm * uMarbleAmt);
    g = mix(g, uMarbleDeep, dp * uMarbleAmt * 0.7);
  }
  g = mix(g, uDeep, clamp((1.0 - ao) * 2.4, 0.0, 1.0) * 0.85);
  g = mix(g, uEdgeCol, edge * uEdgeAmt);
  g = mix(g, vec3(0.97, 0.95, 0.91), speckles(P * 36.0 + 7.7, 0.22 * uLightSpeck) * 0.6);
  g *= 1.0 + (vnoise(P * 34.0) - 0.5) * 0.22 * uGrain * (1.0 - smoothstep(0.25, 0.6, fw * 34.0));
  g = mix(g, mix(uSpeckCol, vec3(0.55, 0.4, 0.3), 0.6), halo * 0.22 * uFired * uBisque);
  g = mix(g, uSpeckCol, spAmt * 0.9);
  vec3 chalk = mix(g, vec3(0.92, 0.91, 0.89), 0.5) * (0.97 + 0.06 * vnoise(P * 9.0));
  vec3 col = mix(bodyC, mix(chalk, g, uFired), gMask);
  // stämpeln under fatet
  float st = foot * uStampOn * texture2D(uStamp, vRest.xz / 0.62 + 0.5).r;
  col *= 1.0 - 0.4 * st;
  col *= mix(1.0, ao, 0.85);
  // ytstruktur: lerkorn, ojämn lera före kavlingen, kavelspår, glasyrens mjuka vågor
  float rolled = 1.0 - smoothstep(uPinZ - 0.06, uPinZ + 0.06, vRest.z);
  float lump = (1.0 - rolled) * uLump * (fbm(P * 2.3) - 0.5) * 0.016;
  float marks = rolled * uMarks * sin(vRest.z * 24.0 + vnoise(P * 3.0) * 2.5) * 0.00055;
  float rawH = vnoise(P * 80.0) * 0.0006 * (1.0 - smoothstep(0.2, 0.5, fw * 80.0))
             + vnoise(P * 27.0) * 0.0007 * (1.0 - smoothstep(0.2, 0.5, fw * 27.0)) + lump + marks - st * 0.006;
  float glzH = (fbm(P * 1.1 + 3.0) - 0.5) * 0.006 + (lowN - 0.5) * 0.002 + vnoise(P * 7.0) * 0.0007 * (1.0 - smoothstep(0.2, 0.5, fw * 7.0))
             + vnoise(P * 22.0) * 0.0006 * (1.0 - uFired) * (1.0 - smoothstep(0.2, 0.5, fw * 22.0));
  gHeight = mix(rawH, glzH, gMask);
  float wetR = mix(0.48, 0.9, max(dryF, uBisque));
  gRough = mix(wetR, mix(0.95, uRough + 0.06 * n1, uFired), gMask);
  return col;
}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = arteraSurface();')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = arteraBump(normal, gHeight);')
      .replace('#include <clearcoat_normal_fragment_begin>', '#include <clearcoat_normal_fragment_begin>\n#ifdef USE_CLEARCOAT\nclearcoatNormal = arteraBump(clearcoatNormal, gHeight * gMask);\n#endif')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat = gMask * uFired * uClear;\n#endif');
  };
  if (lowQuality) m.defines = { LOWQ: '' };
  m.customProgramCacheKey = () => 'artera-platta-2';
  return { material: m, u };
}

// Mjuk kontaktskugga där fatet ligger mot bordet (själva skuggorna kommer från ljuset)
function contactShadow(pts, radius) {
  const S = 256, ext = radius * 1.4, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), sc = S / (2 * ext);
  g.beginPath();
  pts.forEach(([x, z], i) => g[i ? 'lineTo' : 'moveTo'](S / 2 + x * 0.62 * sc - 2000, S / 2 + z * 0.62 * sc));
  g.closePath();
  g.shadowOffsetX = 2000; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 22; g.fill();
  const mesh = new Mesh(new PlaneGeometry(ext * 2, ext * 2), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false, color: 0x2a1d15, opacity: 0.55 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  mesh.renderOrder = -1;
  return mesh;
}

export function makePlatter(spec) {
  const { geo, pts, radius, height, flatRadius } = platterGeometry(spec);
  const { material, u } = platterMaterial(spec);
  const mesh = new Mesh(geo, material);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.morphTargetInfluences = [0];
  const yaw = new Group(), root = new Group(), contact = contactShadow(pts, radius);
  yaw.add(mesh, contact);
  root.add(yaw);
  return { root, yaw, mesh, contact, u, radius, height, flatRadius,
    setYaw(a) { yaw.rotation.y = a; },
    setLift(v) { mesh.morphTargetInfluences[0] = 1 - v; } };
}

// Kaveln från loggan (första steget i "Så gör vi")
function rollingPin() {
  const pr = [[0, -1.85], [0.05, -1.845], [0.078, -1.82], [0.085, -1.78], [0.085, -1.45], [0.095, -1.41], [0.15, -1.38], [0.192, -1.35], [0.2, -1.31]];
  const prof = [...pr, ...pr.slice().reverse().map(([x, y]) => [x, -y])].map(([x, y]) => new Vector2(x, y));
  const mat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <project_vertex>', 'vObj = position;\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vObj;\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float gr = vnoise(vec3(vObj.x * 22.0, vObj.y * 1.1, vObj.z * 22.0) + vnoise(vObj * 2.5) * 2.0);
float ring = smoothstep(0.3, 0.8, fract(gr * 3.5));
diffuseColor.rgb = mix(vec3(0.58, 0.37, 0.2), vec3(0.4, 0.23, 0.11), ring * 0.55) * (0.92 + 0.12 * vnoise(vObj * 36.0));`);
  };
  mat.customProgramCacheKey = () => 'artera-kavel-2';
  const mesh = new Mesh(new LatheGeometry(prof, 48), mat);
  mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = true;
  const roll = new Group(), g = new Group();
  roll.add(mesh); g.add(roll);
  g.roll = roll;
  return g;
}

// Ett ekbord av plankor, som på ett riktigt produktfoto. Långt bort blir bordet mjukt oskarpt (som med en kamera).
function woodTable() {
  const u = { uFocus: { value: 10 } };
  const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFocus = u.uFocus;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <project_vertex>', 'vW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uFocus;
varying vec3 vW;
float tRough;
${GLSL_NOISE}
vec3 woodColor(out float bump) {
  float pw = 1.75;
  vec2 wp = vec2(vW.x * 0.906 - vW.z * 0.423, vW.x * 0.423 + vW.z * 0.906);
  float pz = wp.y / pw + 0.37, plank = floor(pz), fz = fract(pz);
  float rnd = aHash(vec3(plank, 3.1, 7.7));
  float x = wp.x * 0.55 + rnd * 37.0, y = (fz - 0.5) * pw;
  float n = fbm(vec3(x * 0.35, y * 3.2, rnd * 9.0));
  float rings = fract(y * 2.6 + n * 2.4 + sin(x * 0.45 + rnd * 6.0) * 0.35);
  float ring = smoothstep(0.0, 0.22, rings) * (1.0 - smoothstep(0.4, 0.98, rings));
  float streak = vnoise(vec3(x * 0.6, y * 30.0, rnd * 3.0)) * 0.6 + vnoise(vec3(x * 1.7, y * 75.0, rnd * 5.0)) * 0.4;
  float pores = vnoise(vec3(x * 6.0, y * 120.0, rnd));
  float tone = fbm(vec3(x * 0.12, y * 0.9, rnd * 4.0));
  vec3 light = vec3(0.30, 0.185, 0.095), dark = vec3(0.13, 0.072, 0.035);
  vec3 col = mix(light, dark, clamp(ring * 0.28 + streak * 0.34 + pores * 0.14 + (tone - 0.5) * 0.5, 0.0, 1.0));
  col *= 0.86 + 0.28 * rnd;
  // kvistar här och där
  vec2 kc = vec2(floor(wp.x / 4.0) * 4.0 + 2.0 + (aHash(vec3(plank, 9.0, 1.0)) - 0.5) * 2.5, (plank + 0.5 - 0.37) * pw);
  float kd = length((wp - kc) * vec2(1.0, 2.2));
  float knot = step(0.6, aHash(vec3(plank, floor(wp.x / 4.0), 4.0))) * (1.0 - smoothstep(0.04, 0.12, kd));
  col = mix(col, dark * 0.7, knot);
  float seam = smoothstep(0.0, 0.01, fz) * (1.0 - smoothstep(0.99, 1.0, fz));
  col *= mix(0.32, 1.0, seam);
  bump = (ring * 0.6 + streak * 0.3 + pores * 0.25) * 0.0016 - (1.0 - seam) * 0.004;
  tRough = 0.5 + 0.2 * streak;
  // långt bort: mindre detaljer, som när kameran fokuserar på fatet
  float far = smoothstep(uFocus * 0.95, uFocus * 1.8, length(vViewPosition));
  col = mix(col, mix(light, dark, 0.32) * (0.86 + 0.28 * rnd), far * 0.8);
  bump *= 1.0 - far;
  return col;
}
vec3 woodBump(vec3 nrm, float h) {
  vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
  float dhdx = dFdx(h), dhdy = dFdy(h);
  vec3 r1 = cross(dpdy, nrm), r2 = cross(nrm, dpdx);
  float det = dot(dpdx, r1);
  return normalize(abs(det) * nrm - sign(det) * (dhdx * r1 + dhdy * r2));
}
float gWoodH;`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = woodColor(gWoodH);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = woodBump(normal, gWoodH);');
  };
  if (lowQuality) m.defines = { LOWQ: '' };
  m.customProgramCacheKey = () => 'artera-bord-1';
  const mesh = new Mesh(new PlaneGeometry(70, 70), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.001;
  mesh.receiveShadow = true;
  mesh.userData.u = u;
  return mesh;
}

// Ljusmönster för solen: fönsterkarm och en kvist med smala blad (som på ett sommarbord)
let goboTex = null;
function goboTexture() {
  if (goboTex) return goboTex;
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), r = rng(77);
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgb(28,24,22)';
  // fönsterkarm: ett lodrätt och ett vågrätt spröjs, lite utanför mitten
  g.fillRect(S * 0.76, 0, S * 0.05, S);
  g.fillRect(0, S * 0.22, S, S * 0.04);
  // kvistar med smala olivblad uppe till vänster och längs ena kanten
  const branch = (x0, y0, ang, len, n) => {
    g.save(); g.translate(x0, y0); g.rotate(ang);
    g.lineWidth = 5; g.strokeStyle = 'rgb(28,24,22)';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, len * 0.08, len, 0); g.stroke();
    for (let i = 0; i < n; i++) {
      const t = 0.12 + i / n * 0.86, side = i % 2 ? 1 : -1;
      g.save(); g.translate(len * t, len * 0.04 * Math.sin(t * 3));
      g.rotate(side * (0.55 + r() * 0.5));
      g.beginPath(); g.ellipse(46 + r() * 12, 0, 46 + r() * 18, 9 + r() * 5, 0, 0, TAU); g.fill();
      g.restore();
    }
    g.restore();
  };
  branch(-30, S * 0.08, 0.35, S * 0.62, 26);
  branch(S * 0.1, S * 0.42, -0.08, S * 0.36, 16);
  branch(-20, S * 0.7, -0.25, S * 0.5, 20);
  branch(S * 1.02, S * 0.6, -2.85, S * 0.34, 14);
  branch(S * 0.95, S * 1.0, -2.5, S * 0.36, 14);
  // mjuka skuggkanter: ner och upp i storlek
  const small = document.createElement('canvas'); small.width = small.height = S / 8;
  const sg = small.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(c, 0, 0, S / 8, S / 8);
  g.clearRect(0, 0, S, S); g.imageSmoothingQuality = 'high'; g.drawImage(small, 0, 0, S, S);
  goboTex = new CanvasTexture(c);
  goboTex.colorSpace = SRGBColorSpace;
  return goboTex;
}

function studio() {
  const s = new Scene();
  const panel = (w, h, c, pos, look) => { const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(...c) })); m.position.set(...pos); m.lookAt(...look); s.add(m); };
  const room = new Mesh(new BoxGeometry(24, 14, 24), new MeshBasicMaterial({ color: new Color(0.34, 0.31, 0.28), side: BackSide }));
  room.position.y = 5; s.add(room);
  panel(8, 6, [9, 8.7, 8.2], [-9, 6, 5], [0, 1, 0]);        // fönster
  panel(3, 6, [5, 4.8, 4.6], [-6, 5, -7], [0, 1, 0]);       // smalt fönster bakom
  panel(7, 7, [1.3, 1.25, 1.2], [9, 3, 3], [0, 1, 0]);      // reflexskärm
  panel(10, 10, [1.8, 1.75, 1.7], [0, 11.5, 0], [0, 0, 0]); // tak
  const floor = new Mesh(new PlaneGeometry(24, 24), new MeshBasicMaterial({ color: new Color(0.5, 0.43, 0.37) }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.95; s.add(floor);
  return s;
}
const envs = new WeakMap();
function environment(renderer) {
  if (!envs.has(renderer)) { const pm = new PMREMGenerator(renderer); envs.set(renderer, pm.fromScene(studio(), 0.03).texture); pm.dispose(); }
  return envs.get(renderer);
}
let lowQuality = false;
// Kompositioner med flera fat (stillebenet överst på startsidan)
const COMPS = {
  'vika+hemus': [{ id: 'vika', x: -0.6, z: -0.45, yaw: 0.25 }, { id: 'hemus', x: 1.5, z: 0.95, yaw: -0.9 }],
};

function buildScene(renderer, name, kind, table = kind !== 'process') {
  const scene = new Scene();
  scene.environment = environment(renderer);
  scene.environmentIntensity = 0.55;
  const list = COMPS[name] || [{ id: FAT[name] ? name : 'vika', x: 0, z: 0, yaw: 0 }];
  const turn = new Group();
  scene.add(turn);
  // kompositionen centreras kring mitten så att den snurrar runt sig själv
  let cw = 0, cx = 0, cz = 0;
  list.forEach((c) => { const r = FAT[c.id].size[0]; cw += r; cx += c.x * r; cz += c.z * r; });
  cx /= cw; cz /= cw;
  const platters = list.map((c) => {
    const p = makePlatter(FAT[c.id]);
    p.root.position.set(c.x - cx, 0, c.z - cz);
    p.root.rotation.y = c.yaw;
    turn.add(p.root);
    return p;
  });
  const platter = platters[0];
  let fitR = 0, fitH = 0;
  list.forEach((c, i) => { fitR = Math.max(fitR, Math.hypot(c.x - cx, c.z - cz) + platters[i].radius); fitH = Math.max(fitH, platters[i].height); });
  // nyckelljus snett uppifrån med mjuka skuggor, som från ett fönster
  const key = new DirectionalLight(0xfff5ec, 1.55);
  key.position.set(-2.6, 5.2, 2.4);
  key.castShadow = true;
  const S = fitR * 2.2;
  Object.assign(key.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 0.5, far: 14 });
  key.shadow.camera.updateProjectionMatrix();
  // mindre skuggkarta på mobil sparar minne (skuggan är ändå mjuk)
  const sm = kind === 'snapshot' || window.innerWidth >= 700 ? 1024 : 512;
  key.shadow.mapSize.set(sm, sm);
  key.shadow.radius = 6;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const under = new DirectionalLight(0xfff3e8, 0);
  under.position.set(0.6, -4, 2.5);
  scene.add(under);
  let ground, wood = null;
  if (table) {
    // bordet i varmt, lågt solljus genom ett fönster (som på kundens referensfoto)
    wood = woodTable();
    scene.add(wood);
    ground = wood;
    key.castShadow = false;
    key.intensity = 0.5;
    key.position.set(3, 4, 4);
    scene.environmentIntensity = 0.42;
    const sun = new SpotLight(0xffe4c4, 2.7, 0, 0.7, 0.45, 0);
    sun.position.set(-6.5, 8.5, -5);
    sun.target.position.set(0.4, 0, 0.6);
    sun.map = goboTexture();
    sun.castShadow = true;
    sun.shadow.mapSize.set(sm, sm);
    sun.shadow.radius = 5;
    sun.shadow.blurSamples = 16;
    sun.shadow.bias = -0.0003;
    sun.shadow.camera.near = 4; sun.shadow.camera.far = 30;
    scene.add(sun, sun.target);
  } else {
    ground = new Mesh(new PlaneGeometry(S * 1.8, S * 1.8), new ShadowMaterial({ color: 0x2a1d15, opacity: kind === 'process' ? 0.42 : 0.24 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }
  const camera = new PerspectiveCamera(24, 1, 0.05, 80);
  const pos = platter.mesh.geometry.getAttribute('position'), foot = [];
  for (let i = 0; i < pos.count; i += 7) foot.push([pos.getX(i), pos.getZ(i)]);
  const extent = (a0, a1) => {
    let rx = 0, rz = 0;
    for (let a = a0; a <= a1 + 1e-6; a += 0.05) {
      const c = Math.cos(a), sn = Math.sin(a);
      for (const [x, z] of foot) { rx = Math.max(rx, Math.abs(x * c + z * sn)); rz = Math.max(rz, Math.abs(-x * sn + z * c)); }
    }
    return [rx, rz];
  };
  return { scene, camera, platter, platters, turn, fitR, fitH, key, ground, under, extent, wood };
}

// Kameran tittar på fatet från en höjdvinkel (el) och ett varv (az), och anpassar avståndet så att fatet fyller rutan.
// R är fatets radie; Rz (valfri) är djupet om det skiljer sig från bredden.
function frameCamera(cam, aspect, R, H, el, fill, yLook = 0, az = 0, Rz = R) {
  const vt = Math.tan(cam.fov * Math.PI / 360), ht = vt * aspect;
  const halfH = Rz * Math.abs(Math.sin(el)) + H * Math.cos(el) * 0.5;
  const dist = Math.max(R / ht, halfH / vt) / fill + Rz * Math.cos(el) * 0.3;
  cam.aspect = aspect;
  cam.position.set(Math.sin(az) * Math.cos(el) * dist, yLook + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
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
  // mobil: lägre upplösning och lättare glasyrberäkning, så att scrollen är mjuk
  const mobile = matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
  lowQuality = mobile;
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: mobile ? 'default' : 'high-performance' });
  } catch (e) { return; }
  document.body.appendChild(layer);
  document.documentElement.classList.add('has-3d');
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.autoClear = false;
  renderer.shadowMap.enabled = true;
  // mjuka skuggor kräver flyttalsbuffertar; saknas de (äldre telefoner) används vanliga skuggor
  const ext = renderer.extensions;
  renderer.shadowMap.type = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float') ? VSMShadowMap : PCFShadowMap;

  // "Reducera rörelse" (iPhone: Inställningar → Hjälpmedel → Rörelse): inget snurrar av sig självt,
  // faten vrids bara lugnt medan man scrollar och stannar direkt, ingen tröghet.
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let still = motion.matches;
  motion.addEventListener?.('change', (e) => { still = e.matches; });

  // Canvasen byggs bara om när bredden ändras. På iPhone ändras höjden hela tiden när adressfältet
  // krymper och växer, så där görs den lika hög som skärmen från början och krymper aldrig.
  let W = 0, H = 0;
  const resize = () => {
    const w = document.documentElement.clientWidth;
    let h = window.innerHeight;
    if (mobile) h = Math.max(h, Math.round(window.screen.height || 0), w === W ? H : 0);
    if (w === W && Math.abs(h - H) < 2) return;
    W = w; H = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 1.75));
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  };
  resize();
  window.addEventListener('resize', resize);

  const stages = els.map((el, i) => {
    const kind = el.dataset.kind || 'product';
    const st = Object.assign(buildScene(renderer, el.dataset.fat, kind), {
      el, kind, base: 0.35 + i * 1.9, dir: i % 2 ? -1 : 1, drag: 0, vel: 0, live: false, p: 0,
      el0: kind === 'viewer' ? 0.62 : 0.66, camEl: 0.62, camAz: 0, viewEl: 0.62, lastTouch: -1e9, auto: 0,
    });
    if (kind === 'process') setupProcess(st);
    else setupDrag(st);
    return st;
  });

  // Dra i fatet för att snurra det. Är rutan en länk räknas ett drag inte som ett klick.
  function setupDrag(st) {
    let x0 = null, last = 0, moved = 0;
    st.el.addEventListener('pointerdown', (e) => { x0 = e.clientX; moved = 0; last = performance.now(); st.vel = 0; st.el.classList.add('is-dragging'); });
    window.addEventListener('pointermove', (e) => {
      if (x0 === null) return;
      const px = e.clientX - x0, dx = px / Math.max(200, st.el.clientWidth) * 4.2, now = performance.now();
      moved += Math.abs(px); st.drag += dx; st.vel = still ? 0 : dx / Math.max(8, now - last) * 16; x0 = e.clientX; last = now; st.lastTouch = now;
    });
    const up = () => { if (x0 !== null) { x0 = null; st.el.classList.remove('is-dragging'); } };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    st.el.addEventListener('click', (e) => { if (moved > 8) e.preventDefault(); });
    st.el.addEventListener('dragstart', (e) => e.preventDefault());
  }

  function setupProcess(st) {
    st.steps = [...document.querySelectorAll('.process__steps .step')];
    st.pin = rollingPin();
    st.scene.add(st.pin);
    st.kiln = new PointLight(0xff7a30, 0, 7, 1.6);
    st.kiln.position.set(-1.8, 0.35, 1.4);
    st.scene.add(st.kiln);
    st.keyBase = new Color(0xfff5ec);
    st.keyWarm = new Color(0xffa766);
  }

  // "Så gör vi": P går från 0 till 5, ett heltal per steg. Varje förändring sker i början av steget,
  // sedan står fatet still en stund så att man hinner se resultatet.
  function updateProcess(st, dt) {
    const line = W < 900 ? st.el.getBoundingClientRect().bottom + 40 : H * 0.55;
    let target = 0, active = -1;
    st.steps.forEach((s, i) => {
      const r = s.getBoundingClientRect(), k = clamp((line - r.top) / r.height);
      target += k;
      if (k > 0) active = i;
    });
    st.steps.forEach((s, i) => s.classList.toggle('is-active', i === active || (active < 0 && i === 0)));
    st.p += (target - st.p) * (1 - Math.exp(-dt * (still ? 12 : 3.2)));
    const P = st.p, T = st.platter, u = T.u;
    // 1 kavla
    // kaveln rullar bakifrån och fram, lyfts sedan bort bakåt innan steget står still
    const roll = easeIO(seg(P, 0.08, 0.52)), pinOut = easeIO(seg(P, 0.52, 0.76));
    u.uPinZ.value = lerp(-1.75, 1.75, roll);
    u.uLump.value = 1;
    u.uMarks.value = lerp(1, 0.3, ease(seg(P, 1.1, 1.5)));
    T.root.scale.set(lerp(0.95, 1, roll), lerp(1.3, 1, roll), lerp(0.95, 1, roll));
    const pinR = 0.2, pz = lerp(-1.75, 1.75, roll);
    st.pin.roll.position.set(0, 0.06 * T.root.scale.y + pinR + pinOut * 3.2, lerp(pz, -2.6, pinOut));
    st.pin.roll.rotation.x = pz / pinR;
    st.pin.visible = P < 0.78;
    // 2 forma och stämpla: plattan läggs över en form och får sina vågor, sedan tittar kameran in under fatet
    const lift = easeIO(seg(P, 1.1, 1.55));
    T.setLift(lift);
    u.uStampOn.value = ease(seg(P, 1.66, 1.76));
    const under = easeIO(seg(P, 1.55, 1.86)) - easeIO(seg(P, 2.0, 2.32));
    // 3 torka och skröjbränna
    u.uDry.value = ease(seg(P, 2.1, 2.45));
    const kiln1 = bell(P, 2.48, 2.66, 2.92);
    u.uBisque.value = ease(seg(P, 2.56, 2.82));
    // 4 glasera
    u.uGlaze.value = easeIO(seg(P, 3.1, 3.7));
    // 5 glasyrbränna
    const kiln2 = bell(P, 4.04, 4.3, 4.72);
    u.uFired.value = ease(seg(P, 4.3, 4.7));
    // ugnsljus: rummet mörknar och lyses upp varmt från sidan, fatet självt lyser inte
    const k = Math.max(kiln1, kiln2);
    st.key.intensity = lerp(1.7, 0.35, k);
    st.key.color.copy(st.keyBase).lerp(st.keyWarm, k);
    st.kiln.intensity = k * 6;
    st.under.intensity = under * 1.8;
    st.scene.environmentIntensity = lerp(0.6, 0.15, k);
    st.el.style.setProperty('--heat', k.toFixed(3));
    T.setYaw(0.3);
    const az = still ? 0.15 : lerp(-0.5, 0.85, ease(seg(P, 0, 5)));
    const el = lerp(lerp(0.86, 0.62, ease(seg(P, 0.2, 1.4))), still ? -0.55 : -0.8, under);
    const R = lerp(T.flatRadius * 1.08, T.radius, lift);
    return { R, el, az };
  }

  let last = performance.now(), drewLast = false, lastSY = -1, lastScroll = 0, tick = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    resize();
    const sy = window.scrollY;
    if (sy !== lastSY) { lastSY = sy; lastScroll = now; }
    // i mobilen räcker halva bildfrekvensen när ingen scrollar eller drar (svalare telefon, mjukare scroll)
    const busy = now - lastScroll < 250 || stages.some(st => st.el.classList.contains('is-dragging') || Math.abs(st.vel) > 0.0005);
    if (mobile && !busy && (tick++ % 2)) return;
    const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000;
    last = now;
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
      const T = st.platter, aspect = r.width / r.height;
      if (st.kind === 'process') {
        const { R, el, az } = updateProcess(st, dt);
        frameCamera(st.camera, aspect, R, T.height, el, W < 900 ? 0.9 : 0.78, 0.05, az);
      } else {
        const turn = (a) => { st.turn.rotation.y = a; };
        if (Math.abs(st.vel) > 0.0001 && !st.el.classList.contains('is-dragging')) { st.drag += st.vel; st.vel *= Math.pow(0.04, dt); }
        const idle = now - st.lastTouch > 4000;
        if (st.kind === 'viewer') {
          const tall = aspect < 0.8;
          if (tall) {
            // smal, hög ruta: fatets långsida går på höjden och fatet gungar lugnt fram och tillbaka
            const SW = 0.55;
            st.drag = clamp(st.drag, -SW, SW);
            if (!st.tallFit) st.tallFit = st.extent(Math.PI / 2 - SW - 0.3, Math.PI / 2 + SW + 0.3);
            const sway = still ? 0 : Math.sin(t * 0.35) * 0.3;
            turn(Math.PI / 2 + sway + st.drag);
            frameCamera(st.camera, aspect, st.tallFit[0], st.fitH, 1.05, 0.94, st.fitH * 0.3, 0, st.tallFit[1]);
          } else {
            if (!still && idle) st.auto += dt * 0.12;
            turn(st.base + st.auto + st.drag + sy * (still ? 0.0008 : 0.0016));
            frameCamera(st.camera, aspect, st.fitR, st.fitH, 0.62, 0.86, st.fitH * 0.3);
          }
        } else {
          const spin = still ? sy * 0.0009 : t * 0.05 + sy * 0.0018;
          turn(st.base + spin * st.dir + st.drag);
          const el = st.kind === 'hero' ? lerp(0.62, 0.86, clamp(sy / Math.max(1, H))) : 0.66;
          frameCamera(st.camera, aspect, st.fitR, st.fitH, el, st.kind === 'hero' ? 0.92 : 0.8, st.fitH * 0.25);
        }
      }
      if (st.wood) st.wood.userData.u.uFocus.value = st.camera.position.length();
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
export function snapshot(name, size = 1000, { yaw = 0.5, el = 0.64, fill = 0.84, type = 'image/webp', quality = 0.9, background = null, aspect = 1, mode = 'hel', az = 0.4, table = null } = {}) {
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: !background, preserveDrawingBuffer: true });
  renderer.setPixelRatio(2);
  renderer.setSize(Math.round(size * aspect), size, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap;
  if (background) renderer.setClearColor(new Color(background), 1); else renderer.setClearColor(0x000000, 0);
  const st = buildScene(renderer, name, 'snapshot', table ?? (mode === 'hel' || mode === 'detalj'));
  let focus = new Vector3(0, st.fitH * 0.25, 0);
  st.turn.rotation.y = yaw;
  st.scene.updateMatrixWorld(true);
  if (mode === 'hel') {
    frameCamera(st.camera, aspect, st.fitR, st.fitH, el, fill, st.fitH * 0.25);
  } else if (mode === 'under') {
    st.under.intensity = 2.4;
    st.platter.contact.visible = false;
    frameCamera(st.camera, aspect, st.fitR, st.fitH, -0.9, fill, st.fitH * 0.35, az);
  } else {
    // närbild: kameran nära en punkt på fatet (glasyren uppifrån, stämpeln underifrån)
    const spec = FAT[name], g = st.platter.mesh.geometry, pos = g.getAttribute('position'), rest = g.getAttribute('aRest');
    const stamp = mode === 'stampel', side = stamp ? -1 : 1;
    const [fx, fz] = stamp ? [0, 0] : (spec.detail || [0.55, 0.35]);
    let best = 0, bd = Infinity;
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(rest.getY(i) - side) > 0.01) continue;
      const d = (rest.getX(i) - fx * spec.size[0]) ** 2 + (rest.getZ(i) - fz * spec.size[1]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    const p = st.platter.mesh.localToWorld(new Vector3(pos.getX(best), pos.getY(best), pos.getZ(best)));
    const e = stamp ? -1.25 : 0.72, dist = stamp ? 1.5 : 2.6;
    if (stamp) { st.under.intensity = 2.2; st.platter.contact.visible = false; }
    st.camera.aspect = aspect;
    st.camera.position.set(p.x + Math.sin(az) * Math.cos(e) * dist, p.y + Math.sin(e) * dist, p.z + Math.cos(az) * Math.cos(e) * dist);
    st.camera.lookAt(p);
    focus = p;
    st.camera.updateProjectionMatrix();
  }
  if (st.wood) st.wood.userData.u.uFocus.value = st.camera.position.distanceTo(focus);
  renderer.render(st.scene, st.camera);
  const out = document.createElement('canvas');
  out.width = Math.round(size * aspect); out.height = size;
  const g = out.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, 0, 0, out.width, out.height);
  renderer.dispose();
  return out.toDataURL(type, quality);
}

init();
