/*
 * Gloryland city map (GOTR-0008): a stylised 3D diorama of an original sunny coastal city with
 * neon nights. Everything is generated at load time from the layout below (no external assets).
 * three.js r128 (global THREE). Not wired into the game yet.
 *
 *   const map = GlorylandMap.build(scene, { time: 'day' | 'night', renderer, shadowSize: 2048, seed, environment: true });
 *   map.places   -> [{ id, name, sub, chapter, kind: 'chapter'|'place'|'side', state, anchor: Vector3 (pin tip),
 *                      focus: { x, z, dist } (where a "travel" tap should move the map camera) }]
 *   map.bounds   -> { x0, x1, z0, z1 } pan limits for the map camera target
 *   map.update(dt, camera, renderer)  animates water, Ferris wheel, lighthouse; keeps glow sprite sizes right
 *   map.focusShadows(x, z, radius)    fits the sun's shadow box to the visible area (call when the view changes;
 *                                      with renderer.shadowMap.autoUpdate = false the shadow pass runs only then)
 *   map.stats()  -> { meshes, instances, triangles }
 *   map.dispose()
 * environment: false leaves scene.fog / scene.background alone. Day and night are separate builds (about 1 s).
 *
 * World axes: x east, z south (towards the default camera), y up. 1 unit is about 4 m.
 * Sea level y = 0, flat land y = LAND_Y.
 */
(function (root) {
'use strict';
const THREE = root.THREE;

/* ------------------------------------------------------------------ small math */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mulberry(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let R = mulberry(1);
const rnd = (a = 0, b = 1) => a + (b - a) * R();
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(R() * arr.length) % arr.length];
const chance = p => R() < p;
const C = hex => new THREE.Color(hex).convertSRGBToLinear();
const CS = hex => new THREE.Color(hex); // sRGB, for canvas / unlit use
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v);
}
const fbm = (x, z) => vnoise(x, z) * .55 + vnoise(x * 2.13, z * 2.13) * .3 + vnoise(x * 4.37, z * 4.37) * .15;
function inPoly(x, z, P) {
  let ins = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const xi = P[i][0], zi = P[i][1], xj = P[j][0], zj = P[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) ins = !ins;
  }
  return ins;
}
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz;
  const t = l ? clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1) : 0;
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
function polyDist(x, z, P, closed = true) {
  let d = 1e9; const n = closed ? P.length : P.length - 1;
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % P.length]; d = Math.min(d, segDist(x, z, a[0], a[1], b[0], b[1])); }
  return d;
}

/* ------------------------------------------------------------------ constants and palette */
const LAND_Y = 0.4, CURB = 0.14, BLOCK_Y = LAND_Y + CURB, FLOOR = 0.95;
const GROUND = { x0: -116, z0: -90, w: 232, h: 160 };   // painted ground texture covers this rectangle

const PAL = {
  grass: '#8cc35b', grass2: '#7db752', grass3: '#9dcd69', park: '#74b951', lawn: '#90cb63', fairDirt: '#d4b98f',
  sand: '#f3e0b2', sandDry: '#f7e8c4', sandWet: '#d8bb86', pave: '#e4dccd', pave2: '#d6ccb9', plaza: '#ebe2d2',
  curb: '#f3eee4', curbSide: '#d2cabb', asphalt: '#596171', asphalt2: '#636b7a', line: '#f4f1e6', lineY: '#f2c24f',
  concrete: '#c7c1b5', quayTop: '#d3cab9', quayWall: '#ada392', quayWallDark: '#7c7468',
  rock: '#b59d7f', rock2: '#9c856b', rockDark: '#7c6856', cliffTop: '#95bf63',
  terracotta: ['#c9653d', '#bd5a34', '#d27448', '#b55d3b', '#c97250', '#a95238'],
  slateRoof: '#5d6878', roofFlat: '#c3bcaf', roofFlat2: '#aca597', roofDark: '#6c7380',
  trunk: '#8a6446', palmTrunk: '#a07a55', leaf: ['#5fae4e', '#4f9e45', '#6fbb55', '#4a9a52', '#7cc05a'],
  pine: ['#3f8a52', '#367d4b', '#4b9658'], palmLeaf: '#5fab3f',
  oldTown: ['#f4e4c4', '#f6d3b6', '#eaf0db', '#f7e9ad', '#dbe9ee', '#f3cdaa', '#f0e8dc', '#f5dccd', '#e4ecd0'],
  market: ['#f4d27c', '#ef9f78', '#a2d5c9', '#f3e2c8', '#e8aaa5', '#f6c58e', '#c9dcae'],
  hotel: ['#ffb4c8', '#93e0cf', '#ffe08c', '#c9b4ff', '#ffc597', '#9fd2ff', '#ff9fb0'],
  office: ['#9fc7e8', '#7fd1d6', '#c8d3de', '#e8c9a0', '#b6c2ff', '#e9eef3', '#8fb5d9', '#d8c3a8'],
  apartment: ['#efe6d6', '#e6d2bd', '#d9e2e6', '#f2ddc8', '#e1e6d3', '#f0e9dd'],
  industrial: ['#b6573e', '#3f7f8d', '#8f9ba4', '#c9a15c', '#6d8460', '#a4483a', '#56708a'],
  awning: [['#e8473b', '#ffffff'], ['#f2b632', '#ffffff'], ['#2fa59a', '#ffffff'], ['#f07f3c', '#fff4e0'], ['#3c7fc0', '#ffffff'], ['#d63d6d', '#fff1f4']],
  car: ['#e84a3d', '#f4f1ea', '#3b7dd8', '#f2c14e', '#2f3a4a', '#9aa5b1', '#45b39d', '#f08a3c', '#ffffff', '#c23b5a'],
  neon: ['#ff3fa4', '#3ff0ff', '#b56bff', '#ffe14a', '#ff5a3c', '#5cff8a']
};

/* ------------------------------------------------------------------ geometry batching */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _nm = new THREE.Matrix3();
function M(x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return _m.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
}
/** Collects triangle soup (positions, normals, colours, optional uv and tint) and turns it into one mesh. */
class Batch {
  constructor(o = {}) { this.p = []; this.n = []; this.c = []; this.uv = o.uv ? [] : null; this.t = o.tint ? [] : null; }
  get tris() { return this.p.length / 9; }
  /** Append a prepared non-indexed geometry transformed by matrix m. ao: darken toward local y0. */
  add(geo, m, color, o = {}) {
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, U = geo.attributes.uv && geo.attributes.uv.array;
    const e = m.elements, nm = _nm.getNormalMatrix(m).elements, ao = o.ao || 0, top = o.top, tint = o.tint;
    for (let i = 0, k = 0; i < P.length; i += 3, k += 2) {
      const x = P[i], y = P[i + 1], z = P[i + 2];
      this.p.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      const a = N[i], b = N[i + 1], cc = N[i + 2];
      let nx = nm[0] * a + nm[3] * b + nm[6] * cc, ny = nm[1] * a + nm[4] * b + nm[7] * cc, nz = nm[2] * a + nm[5] * b + nm[8] * cc;
      const l = Math.hypot(nx, ny, nz) || 1; this.n.push(nx / l, ny / l, nz / l);
      let col = color;
      if (top && ny / l > 0.7) col = top;
      const k2 = ao ? 1 - ao * (1 - sstep(0, 0.55, y)) : 1;
      this.c.push(col.r * k2, col.g * k2, col.b * k2);
      if (this.uv) this.uv.push(U ? U[k] : 0, U ? U[k + 1] : 0);
      if (this.t) { const tc = tint || col; this.t.push(tc.r, tc.g, tc.b); }
    }
  }
  /** One triangle with explicit vertex colours (c1, c2 default to c0). */
  tri(a, b, c, c0, c1, c2, uv) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    this.p.push(...a, ...b, ...c); this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    c1 = c1 || c0; c2 = c2 || c0;
    this.c.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
    if (this.uv) this.uv.push(...(uv || [0, 0, 0, 0, 0, 0]));
    if (this.t) this.t.push(1, 1, 1, 1, 1, 1, 1, 1, 1);
  }
  /** Quad a-b-c-d counter-clockwise seen from the front. cb colours the a/b edge (bottom). */
  quad(a, b, c, d, ct, cb, uv, tint) {
    cb = cb || ct;
    this.tri(a, b, c, cb, cb, ct, uv && [uv[0], uv[1], uv[2], uv[3], uv[4], uv[5]]);
    this.tri(a, c, d, cb, ct, ct, uv && [uv[0], uv[1], uv[4], uv[5], uv[6], uv[7]]);
    if (tint && this.t) { const t = this.t, n = t.length; for (let i = n - 18; i < n; i += 3) { t[i] = tint.r; t[i + 1] = tint.g; t[i + 2] = tint.b; } }
  }
  /** Quad whose winding is chosen so the face normal points along dir. ct colours c/d, cb colours a/b. */
  quadF(a, b, c, d, ct, cb, dir, uv, tint) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * dir[0] + ny * dir[1] + nz * dir[2] >= 0) this.quad(a, b, c, d, ct, cb, uv, tint);
    else this.quad(b, a, d, c, ct, cb, uv && [uv[2], uv[3], uv[0], uv[1], uv[6], uv[7], uv[4], uv[5]], tint);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.t) g.setAttribute('tint', new THREE.Float32BufferAttribute(this.t, 3));
    g.computeBoundingSphere();
    return g;
  }
}
const P = {};
function proto(geo, flat) { const g = geo.index ? geo.toNonIndexed() : geo; if (flat) g.computeVertexNormals(); return g; }
function initProtos() {
  if (P.box) return;
  P.box = proto(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0));
  P.cyl5 = proto(new THREE.CylinderGeometry(1, 1, 1, 5, 1).translate(0, .5, 0), true);
  P.cyl5o = proto(new THREE.CylinderGeometry(1, 1, 1, 5, 1, true).translate(0, .5, 0), true);
  P.cone6o = proto(new THREE.ConeGeometry(1, 1, 6, 1, true).translate(0, .5, 0), true);
  P.cyl6 = proto(new THREE.CylinderGeometry(1, 1, 1, 6, 1).translate(0, .5, 0), true);
  P.cyl8 = proto(new THREE.CylinderGeometry(1, 1, 1, 8, 1).translate(0, .5, 0), true);
  P.cyl12 = proto(new THREE.CylinderGeometry(1, 1, 1, 12, 1).translate(0, .5, 0));
  P.cyl20 = proto(new THREE.CylinderGeometry(1, 1, 1, 20, 1).translate(0, .5, 0));
  P.cone4 = proto(new THREE.ConeGeometry(1, 1, 4, 1).translate(0, .5, 0), true);
  P.cone6 = proto(new THREE.ConeGeometry(1, 1, 6, 1).translate(0, .5, 0), true);
  P.cone8 = proto(new THREE.ConeGeometry(1, 1, 8, 1).translate(0, .5, 0), true);
  P.cone12 = proto(new THREE.ConeGeometry(1, 1, 12, 1).translate(0, .5, 0), true);
  P.ico = proto(new THREE.IcosahedronGeometry(1, 0), true);
  P.ico1 = proto(new THREE.IcosahedronGeometry(1, 1), true);
  P.sph = proto(new THREE.SphereGeometry(1, 14, 10));
  P.hemi = proto(new THREE.SphereGeometry(1, 28, 9, 0, TAU, 0, Math.PI / 2));
  P.hemiLow = proto(new THREE.SphereGeometry(1, 12, 5, 0, TAU, 0, Math.PI / 2), true);
  P.plane = proto(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
}
/** Local frame for an object rotated by ry around Y and placed at (x, z): three.js rotation convention. */
function frame(x, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return { x, z, ry, p: (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c] };
}

/* ------------------------------------------------------------------ canvas helpers */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texture(cv, o = {}) {
  const t = new THREE.CanvasTexture(cv);
  t.encoding = o.linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
  t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = o.aniso || 1;
  if (o.nomip) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  return t;
}

/* ------------------------------------------------------------------ facade textures
 * Each style is a 4 x 4 tile of (bay x storey) cells. Alpha marks what the per-building tint colours
 * (walls, 255) and what keeps its own colour (glass, frames, 128). The emissive map lights windows at night. */
const FACADE = {
  plaster: { bay: 1.55, floor: FLOOR }, brick: { bay: 1.6, floor: FLOOR }, apartment: { bay: 2.1, floor: FLOOR },
  office: { bay: 1.5, floor: 0.9 }, deco: { bay: 1.9, floor: 1.0 }, industrial: { bay: 2.4, floor: 1.3 }, shop: { bay: 2.0, floor: 1.3 }
};
function paintFacades(night, aniso) {
  const out = {};
  const CELL = 128, N = 4, SZ = CELL * N, EC = 32;
  for (const style of Object.keys(FACADE)) {
    const cv = canvas(SZ, SZ), mk = canvas(SZ, SZ), em = canvas(EC * N, EC * N);
    const c = cv.getContext('2d'), m = mk.getContext('2d'), e = em.getContext('2d');
    e.fillStyle = '#000'; e.fillRect(0, 0, em.width, em.height);
    const r = mulberry(style.length * 977 + 13);
    const rr = (a, b) => a + (b - a) * r();
    let ox = 0, oy = 0;
    const rect = (x, y, w, h, col, tinted) => { c.fillStyle = col; c.fillRect(ox + x, oy + y, w, h); m.fillStyle = tinted ? '#fff' : '#000'; m.fillRect(ox + x, oy + y, w, h); };
    const glassGrad = (x, y, w, h, top, bot) => { const g = c.createLinearGradient(0, oy + y, 0, oy + y + h); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(ox + x, oy + y, w, h); m.fillStyle = '#000'; m.fillRect(ox + x, oy + y, w, h); };
    const lit = (x, y, w, h, p, cols) => {
      if (r() > p) return;
      const k = EC / CELL, col = pick2(r, cols || ['#ffd18a', '#ffe2ae', '#ffc977', '#ffe9c9', '#cfe2ff', '#ffb867']);
      e.globalAlpha = rr(0.55, 1); e.fillStyle = col; e.fillRect((ox + x) * k, (oy + y) * k, Math.max(1, w * k), Math.max(1, h * k)); e.globalAlpha = 1;
    };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      ox = i * CELL; oy = j * CELL;
      if (style === 'plaster') {
        rect(0, 0, CELL, CELL, '#ffffff', true);
        for (let k = 0; k < 40; k++) rect(rr(0, CELL), rr(0, CELL), rr(2, 6), rr(2, 6), r() < .5 ? '#f3f3f3' : '#fafafa', true);
        rect(0, CELL - 7, CELL, 7, '#e2e2e2', true); rect(0, CELL - 8, CELL, 1, '#c9c9c9', true);
        const ww = 40, wh = 62, wx = (CELL - ww) / 2, wy = 26;
        rect(wx - 22, wy, 18, wh, '#5f8574', false); rect(wx + ww + 4, wy, 18, wh, '#5f8574', false);
        for (let s = 0; s < 6; s++) { rect(wx - 22, wy + 4 + s * 10, 18, 2, '#4d6e60', false); rect(wx + ww + 4, wy + 4 + s * 10, 18, 2, '#4d6e60', false); }
        rect(wx - 3, wy - 3, ww + 6, wh + 6, '#f8f6f0', false);
        glassGrad(wx, wy, ww, wh, '#7f9fb7', '#3f5870');
        rect(wx + ww / 2 - 1.5, wy, 3, wh, '#f8f6f0', false); rect(wx, wy + 22, ww, 3, '#f8f6f0', false);
        rect(wx - 6, wy + wh + 3, ww + 12, 5, '#d9d9d9', true);
        if (r() < .3) { rect(wx - 12, wy + wh - 16, ww + 24, 3, '#30343a', false); for (let b = 0; b < 9; b++) rect(wx - 12 + b * 8, wy + wh - 16, 2, 16, '#30343a', false); rect(wx - 14, wy + wh, ww + 28, 4, '#cfcfcf', true); }
        lit(wx, wy, ww, wh, 0.5);
      } else if (style === 'brick') {
        rect(0, 0, CELL, CELL, '#f2f2f2', true);
        for (let row = 0; row < 16; row++) for (let b = -1; b < 5; b++) { const bx = b * 32 + (row % 2) * 16; rect(bx + 1, row * 8 + 1, 30, 6, `rgb(${rr(196, 226) | 0},${rr(196, 226) | 0},${rr(196, 226) | 0})`, true); }
        const ww = 44, wh = 60, wx = (CELL - ww) / 2, wy = 30;
        rect(wx - 4, wy - 10, ww + 8, 10, '#ece6da', false); rect(wx + ww / 2 - 5, wy - 12, 10, 12, '#f4efe6', false);
        rect(wx - 3, wy - 2, ww + 6, wh + 4, '#f5f3ee', false);
        glassGrad(wx, wy, ww, wh, '#86a5bc', '#3c556c');
        rect(wx + ww / 2 - 1.5, wy, 3, wh, '#f5f3ee', false); rect(wx, wy + wh / 2, ww, 3, '#f5f3ee', false);
        rect(wx - 6, wy + wh + 2, ww + 12, 6, '#e3ddd1', false);
        lit(wx, wy, ww, wh, 0.55);
      } else if (style === 'apartment') {
        rect(0, 0, CELL, CELL, '#ffffff', true);
        rect(0, CELL - 5, CELL, 5, '#dedede', true);
        const ww = 84, wh = 56, wx = (CELL - ww) / 2, wy = 30;
        rect(wx - 3, wy - 3, ww + 6, wh + 6, '#f4f4f4', false);
        glassGrad(wx, wy, ww, wh, '#8aaac0', '#41596f');
        rect(wx + ww / 3, wy, 3, wh, '#f4f4f4', false); rect(wx + ww * 2 / 3, wy, 3, wh, '#f4f4f4', false);
        if ((i + j) % 2 === 0) { rect(4, wy + wh - 18, CELL - 8, 18, '#b9d3df', false); rect(4, wy + wh - 20, CELL - 8, 3, '#e9e9e9', false); rect(0, wy + wh, CELL, 8, '#ececec', false); if (r() < .5) rect(rr(10, 90), wy + wh - 26, 14, 10, '#5c9e4c', false); }
        lit(wx, wy, ww, wh, 0.5);
      } else if (style === 'office') {
        rect(0, 0, CELL, CELL, '#ffffff', true);
        const tone = rr(-12, 12);
        const g1 = `rgb(${172 + tone | 0},${190 + tone | 0},${206 + tone | 0})`, g2 = `rgb(${78 + tone | 0},${94 + tone | 0},${112 + tone | 0})`;
        glassGrad(5, 4, CELL - 10, CELL - 34, g1, g2);
        c.globalAlpha = .18; c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(ox + 20 + j * 10, oy + 4); c.lineTo(ox + 44 + j * 10, oy + 4); c.lineTo(ox + 14 + j * 10, oy + CELL - 30); c.lineTo(ox - 10 + j * 10, oy + CELL - 30); c.fill(); c.globalAlpha = 1;
        rect(CELL / 2 - 1, 4, 2, CELL - 34, '#dfe5ea', true);
        rect(0, CELL - 30, CELL, 30, '#d4d4d4', true); rect(0, CELL - 30, CELL, 3, '#ececec', true);
        lit(5, 4, CELL - 10, CELL - 34, 0.62, ['#e8f1ff', '#fff2d6', '#d6e8ff', '#ffe7b5']);
      } else if (style === 'deco') {
        rect(0, 0, CELL, CELL, '#f4f4f4', true);
        if (i % 2 === 0) rect(0, 0, 14, CELL, '#ffffff', true);
        const ww = 74, wh = 46, wx = 30, wy = 38;
        rect(wx - 6, wy - 9, ww + 12, 6, '#ffffff', false); rect(wx - 6, wy - 3, ww + 12, 3, '#c9c9c9', true);
        glassGrad(wx, wy, ww, wh, '#8fb4c8', '#3f6178');
        rect(wx + ww / 2 - 1, wy, 2, wh, '#f2f2f2', false);
        rect(0, CELL - 10, CELL, 4, '#e2e2e2', true);
        lit(wx, wy, ww, wh, 0.6, ['#ffd0e6', '#ffe0a6', '#c9f7ff', '#ffd18a']);
      } else if (style === 'industrial') {
        for (let k = 0; k < 16; k++) rect(k * 8, 0, 8, CELL, k % 2 ? '#dcdcdc' : '#f4f4f4', true);
        const g = c.createLinearGradient(0, oy + CELL - 40, 0, oy + CELL); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,50,40,.22)'); c.fillStyle = g; c.fillRect(ox, oy + CELL - 40, CELL, 40);
        if (j % 2 === 0) { rect(6, 14, CELL - 12, 24, '#e6e6e6', false); glassGrad(10, 17, CELL - 20, 18, '#9ab7c8', '#5a7890'); for (let k = 1; k < 4; k++) rect(10 + k * (CELL - 20) / 4, 17, 2, 18, '#e6e6e6', false); lit(10, 17, CELL - 20, 18, 0.35, ['#ffd9a0', '#d8ecff']); }
      } else if (style === 'shop') {
        rect(0, 0, CELL, CELL, '#ffffff', true);
        rect(0, 0, CELL, 30, '#c4c4c4', true); rect(0, 28, CELL, 3, '#9a9a9a', true);
        const door = i % 2 === 1;
        rect(6, 38, CELL - 12, CELL - 40, '#f0eee8', false);
        const g = c.createLinearGradient(0, oy + 42, 0, oy + CELL - 4); g.addColorStop(0, '#f2dfb8'); g.addColorStop(.5, '#b99a76'); g.addColorStop(1, '#5d4c3d');
        c.fillStyle = g; c.fillRect(ox + 10, oy + 42, CELL - 20, CELL - 46); m.fillStyle = '#000'; m.fillRect(ox + 10, oy + 42, CELL - 20, CELL - 46);
        for (let s = 0; s < 3; s++) rect(10, 62 + s * 18, CELL - 20, 3, '#8a7058', false);
        for (let s = 0; s < 10; s++) rect(rr(12, CELL - 22), rr(50, 108), rr(4, 9), rr(4, 8), pick2(r, ['#e2574c', '#f2c14e', '#4fa3c7', '#7bc06b', '#ffffff']), false);
        if (door) { rect(CELL - 44, 44, 30, CELL - 44, '#3c4048', false); rect(CELL - 40, 48, 22, 40, '#7a95aa', false); }
        rect(CELL / 2 - 1, 42, 2, CELL - 46, '#f0eee8', false);
        lit(10, 42, CELL - 20, CELL - 46, 0.95, ['#ffe2a8', '#fff0cf', '#ffd38a']);
      }
    }
    // alpha := 255 for tinted walls, 128 for own-colour parts
    const id = c.getImageData(0, 0, SZ, SZ), md = m.getImageData(0, 0, SZ, SZ).data;
    for (let k = 0; k < id.data.length; k += 4) id.data[k + 3] = md[k] > 127 ? 255 : 128;
    c.putImageData(id, 0, 0);
    out[style] = { map: texture(cv, { aniso }), emissive: night ? texture(em, { aniso }) : null };
  }
  return out;
}
function pick2(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }

/* ------------------------------------------------------------------ materials */
function facadeMaterial(tex, night, rough, glassK = .18) {
  const mat = new THREE.MeshStandardMaterial({ map: tex.map, vertexColors: true, roughness: rough, metalness: 0 });
  if (night) { mat.emissive = new THREE.Color(1, 1, 1); mat.emissiveMap = tex.emissive; mat.emissiveIntensity = 1.9; }
  mat.onBeforeCompile = sh => {
    sh.uniforms.glassK = { value: glassK };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 tint;\nvarying vec3 vTint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = tint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTint;\nuniform float glassK;')
      .replace('#include <map_fragment>', 'vec4 texelColor = mapTexelToLinear( texture2D( map, vUv ) );\nfloat tintM = smoothstep( 0.62, 0.9, texelColor.a );\ndiffuseColor.rgb *= mix( texelColor.rgb * mix( vec3( 1.0 ), vTint, glassK ), texelColor.rgb * vTint, tintM );');
  };
  mat.customProgramCacheKey = () => 'gl-facade';
  return mat;
}
/** Ground material: samples the painted ground texture from world position (no per-vertex uv needed). */
function groundMaterial(tex) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.95, metalness: 0 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.gRect = { value: new THREE.Vector4(GROUND.x0, GROUND.z0, GROUND.w, GROUND.h) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vGW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGW = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vGW;\nuniform vec4 gRect;')
      .replace('#include <map_fragment>', 'vec2 gUv = clamp( ( vGW - gRect.xy ) / gRect.zw, vec2( 0.0005 ), vec2( 0.9995 ) );\ndiffuseColor *= mapTexelToLinear( texture2D( map, vec2( gUv.x, 1.0 - gUv.y ) ) );');
  };
  mat.customProgramCacheKey = () => 'gl-ground';
  return mat;
}
function waterMaterial(distTex, rect, night) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: night ? 0.32 : 0.38, metalness: 0.0 });
  const u = {
    wDist: { value: distTex }, wRect: { value: new THREE.Vector4(...rect) }, wTime: { value: 0 },
    wShallow: { value: C(night ? '#1f6f86' : '#63d8d0') }, wMid: { value: C(night ? '#12466a' : '#22a0c0') },
    wDeep: { value: C(night ? '#0b2c4f' : '#1a78ae') }, wAbyss: { value: C(night ? '#08203d' : '#15558c') },
    wFoam: { value: C(night ? '#9fc4d8' : '#ffffff') }
  };
  mat.userData.u = u;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWW = ( modelMatrix * vec4( transformed, 1.0 ) ).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vWW; uniform sampler2D wDist; uniform vec4 wRect; uniform float wTime;
uniform vec3 wShallow, wMid, wDeep, wAbyss, wFoam;
float wHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(wHash(i), wHash(i+vec2(1,0)), u.x), mix(wHash(i+vec2(0,1)), wHash(i+vec2(1,1)), u.x), u.y); }`)
      .replace('#include <color_fragment>', `
vec2 dUv = (vWW - wRect.xy) / wRect.zw;
float inside = step(0.0, dUv.x) * step(0.0, dUv.y) * step(dUv.x, 1.0) * step(dUv.y, 1.0);
vec4 dTex = texture2D(wDist, vec2(dUv.x, 1.0 - dUv.y));
float dist = mix(40.0, dTex.r * 40.0, inside), dNat = mix(40.0, dTex.g * 40.0, inside);
float n1 = wNoise(vWW * 0.18 + vec2(wTime * 0.05, wTime * 0.03));
float n2 = wNoise(vWW * 0.07 - vec2(wTime * 0.02, -wTime * 0.015));
vec3 wc = mix(wMid, wDeep, smoothstep(1.5, 11.0, dist + (n1 - 0.5) * 3.0));
wc = mix(wc, wAbyss, smoothstep(15.0, 34.0, dist));
wc = mix(wc, wShallow, 1.0 - smoothstep(0.3, 5.0, dNat + (n1 - 0.5) * 1.4));
wc *= 0.95 + 0.1 * n2;
float band = sin(dNat * 2.4 - wTime * 1.6 + n1 * 5.0);
float foam = smoothstep(0.62, 0.0, dist) * mix(0.45, 0.9, 1.0 - smoothstep(0.0, 2.0, dNat)) + smoothstep(0.82, 0.98, band) * (1.0 - smoothstep(0.4, 3.4, dNat)) * 0.55;
diffuseColor.rgb = mix(wc, wFoam, clamp(foam, 0.0, 1.0));`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
{ vec2 q = vWW; float t = wTime;
  vec3 wn = vec3(0.0, 1.0, 0.0);
  wn.x += 0.05 * sin(q.x * 0.33 + q.y * 0.19 + t * 1.1) + 0.03 * sin(q.x * 0.71 - q.y * 0.41 + t * 1.7);
  wn.z += 0.05 * sin(q.y * 0.29 - q.x * 0.17 + t * 0.9) + 0.03 * sin(q.y * 0.79 + q.x * 0.27 - t * 1.3);
  normal = normalize((viewMatrix * vec4(normalize(wn), 0.0)).xyz); }`);
  };
  mat.customProgramCacheKey = () => 'gl-water' + (night ? 'n' : 'd');
  return mat;
}
function glowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 600 }, uTime: { value: 0 } },
    vertexShader: `attribute float size; attribute vec3 gcolor; attribute float phase; varying vec3 vC; uniform float uScale; uniform float uTime;
      void main(){ vC = gcolor * (0.85 + 0.15 * sin(uTime * 3.0 + phase * 6.2831)); vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(size * uScale / -mv.z, 1.0, 256.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0;
      float a = exp(-r * r * 5.0) * 0.9 + exp(-r * r * 40.0) * 0.6; a *= 1.0 - smoothstep(0.85, 1.0, r);
      gl_FragColor = vec4(vC * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
}
function radialTexture(stops) {
  const cv = canvas(128, 128), c = cv.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) g.addColorStop(o, col);
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  return texture(cv, { clamp: true });
}

/* ------------------------------------------------------------------ the layout
 * Coast points run from the north-west round to the east; sea lies to the south-west/south.
 * Segment type applies from a point to the next one. */
const COAST = [
  [-140, -110, 'rock'], [-112, -76, 'rock'], [-104, -63, 'cliff'], [-107, -51, 'cliff'], [-103, -40, 'cliff'],
  [-94, -33, 'rock'], [-86, -29, 'beach'], [-77, -20, 'rock'], [-70, -12, 'quay'],
  [-21, 39, 'quay'], [-21, 53, 'quay'], [23, 53, 'quay'], [23, 40, 'quay'],
  [31, 37.5, 'beach'], [50, 36, 'beach'], [72, 36, 'beach'], [92, 36.5, 'beach'], [116, 37, 'beach'],
  [170, 37.5, 'beach'], [420, 38, 'none'], [420, -420, 'none'], [-300, -420, 'none']
];
const LAND = COAST.map(p => [p[0], p[1]]);
const Q0 = [-70, -12], Q1 = [-21, 39];
const QU = (() => { const dx = Q1[0] - Q0[0], dz = Q1[1] - Q0[1], l = Math.hypot(dx, dz); return [dx / l, dz / l]; })();
const QW = [QU[1], -QU[0]];          // inland (north-east) from the downtown quay
const QL = Math.hypot(Q1[0] - Q0[0], Q1[1] - Q0[1]);
const qpt = (u, w) => [Q0[0] + QU[0] * u + QW[0] * w, Q0[1] + QU[1] * u + QW[1] * w];
const HILL = { x: -8, z: -54, r: 24.5, top: 12.6, h: 9.5 };
const FORT = { x: -94, z: -50, poly: [[-110, -64], [-112, -50], [-107, -37], [-96, -35], [-86, -40], [-84, -52], [-90, -62], [-100, -67]], h: 5.2 };
const ISLAND = { x: -90, z: 52, poly: [] };
const DOME = (() => { const b = qpt(27, 0); return { x: b[0] - QW[0] * 22, z: b[1] - QW[1] * 22, r: 9.5, bx: b[0], bz: b[1] }; })();
const TECH = { x: 99, z: 57 };

/* ------------------------------------------------------------------ build */
function build(scene, opts = {}) {
  const NIGHT = opts.time === 'night';
  R = mulberry(opts.seed || 20261111);
  initProtos();
  const aniso = opts.renderer ? Math.min(8, opts.renderer.capabilities.getMaxAnisotropy()) : 4;
  const group = new THREE.Group(); group.name = 'Gloryland map (' + (NIGHT ? 'night' : 'day') + ')';
  const disposables = [];
  const W = { disposables,
    NIGHT, group, debugGrid: !!opts.debugGrid,
    solid: new Batch(), ground: new Batch(), marks: new Batch(), glowSolid: new Batch(), beams: new Batch(),
    facade: {}, inst: {}, glow: { p: [], c: [], s: [], ph: [] }, pools: [], signs: [], places: [], blocks: [], roads: [], cars: [],
    reserve: [], animated: [], paint: [], occ: [], beamList: []
  };
  for (const s of Object.keys(FACADE)) W.facade[s] = new Batch({ uv: true, tint: true });

  layoutWorld(W);
  buildLand(W);
  buildDistricts(W);
  buildLandmarks(W);
  buildVegetation(W);
  buildTraffic(W);

  /* ---- materials and meshes */
  const groundTex = paintGround(W);
  const facadeTex = paintFacades(NIGHT, aniso);
  const add = (mesh, cast = true, recv = true) => { mesh.castShadow = cast; mesh.receiveShadow = recv; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); group.add(mesh); disposables.push(mesh.geometry, mesh.material); return mesh; };
  const solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  add(new THREE.Mesh(W.solid.geometry(), solidMat)).name = 'solid';
  const gm = groundMaterial(groundTex); disposables.push(groundTex);
  if (NIGHT) gm.color.setRGB(.62, .7, .95);
  add(new THREE.Mesh(W.ground.geometry(), gm), false, true).name = 'ground';
  const marksMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  add(new THREE.Mesh(W.marks.geometry(), marksMat), false, true).name = 'road marks';
  for (const s of Object.keys(FACADE)) {
    if (!W.facade[s].tris) continue;
    const mat = facadeMaterial(facadeTex[s], NIGHT, s === 'office' ? 0.45 : s === 'deco' ? 0.7 : 0.85, s === 'office' ? .75 : s === 'deco' ? .3 : .12);
    disposables.push(facadeTex[s].map); if (facadeTex[s].emissive) disposables.push(facadeTex[s].emissive);
    add(new THREE.Mesh(W.facade[s].geometry(), mat)).name = 'facade ' + s;
  }
  if (W.glowSolid.tris) add(new THREE.Mesh(W.glowSolid.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })), false, false).name = 'lit';
  buildWater(W, add, disposables);
  buildInstances(W, add);
  buildSigns(W, add, disposables);
  if (NIGHT) buildNightFx(W, add, disposables);
  buildWheel(W, solidMat, disposables);
  if (W.clouds && W.clouds.tris) add(new THREE.Mesh(W.clouds.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: new THREE.Color(.16, .17, .19) })), false, false).name = 'clouds';

  /* ---- lights and atmosphere */
  const sunDir = NIGHT ? new THREE.Vector3(0.45, 0.8, -0.4).normalize() : new THREE.Vector3(-0.62, 0.72, 0.32).normalize();
  const hemi = NIGHT ? new THREE.HemisphereLight(0x3a4f9a, 0x15142a, 0.2) : new THREE.HemisphereLight(0xd9eeff, 0xcdb88c, 0.62);
  const sun = new THREE.DirectionalLight(NIGHT ? 0x8fa8ff : 0xfff0d6, NIGHT ? 0.22 : 1.55);
  sun.castShadow = true; sun.shadow.mapSize.set(opts.shadowSize || 2048, opts.shadowSize || 2048); // 2048 for phones
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const sc = sun.shadow.camera; sc.near = 1; sc.far = 600;
  const amb = new THREE.AmbientLight(NIGHT ? 0x232a5c : 0xffffff, NIGHT ? 0.1 : 0.05);
  group.add(hemi, sun, sun.target, amb);
  const fogColor = new THREE.Color(NIGHT ? 0x161b38 : 0xcfe4ee);
  if (opts.environment !== false) {
    scene.fog = new THREE.Fog(fogColor, 260, 700);
    scene.background = new THREE.Color(NIGHT ? 0x0d1128 : 0xbfdcec);
  }
  function focusShadows(x, z, radius) {
    sun.target.position.set(x, 0, z); sun.target.updateMatrixWorld();
    sun.position.set(x + sunDir.x * 300, sunDir.y * 300, z + sunDir.z * 300); sun.updateMatrixWorld();
    sc.left = -radius; sc.right = radius; sc.top = radius; sc.bottom = -radius; sc.updateProjectionMatrix();
  }
  focusShadows(0, -5, 130);
  scene.add(group);

  let t = 0;
  function update(dt, camera, renderer) {
    t += dt;
    if (W.waterMat) W.waterMat.userData.u.wTime.value = t;
    if (W.glowMat) {
      W.glowMat.uniforms.uTime.value = t;
      if (camera && renderer) { const h = renderer.domElement.height; W.glowMat.uniforms.uScale.value = h / (2 * Math.tan(camera.fov * Math.PI / 360)); }
    }
    for (const a of W.animated) a(t, dt);
  }
  function stats() {
    let tris = 0, inst = 0, meshes = 0;
    group.traverse(o => {
      if (!o.isMesh && !o.isPoints) return; meshes++;
      const g = o.geometry, n = g.index ? g.index.count : g.attributes.position.count;
      if (o.isInstancedMesh) { inst += o.count; tris += n / 3 * o.count; } else if (o.isMesh) tris += n / 3;
    });
    return { meshes, instances: inst, triangles: Math.round(tris) };
  }
  return {
    group, places: W.places, route: (a, b) => streetRoute(W, a, b), sun, hemi, fogColor, night: NIGHT, focusShadows, update, stats,
    bounds: { x0: -108, x1: 108, z0: -74, z1: 66 },
    dispose() { scene.remove(group); for (const d of disposables) d && d.dispose && d.dispose(); }
  };
}


/**
 * Street route (GOTR-0058): a path from one place to another along the street network, for the Adventure route dots.
 * Walkable cells (1 unit grid) = the asphalt around every block (its expanded rectangle minus the block itself) plus the
 * main road ribbons; A* with 8 moves (no corner cutting) and a cost for hugging buildings so the line follows the street centre.
 * Returns [[x,z],...] or null when the places are not connected by streets.
 */
function streetRoute(W, a, b) {
  const X0 = -110, Z0 = -76, NX = 220, NZ = 144, ok = new Uint8Array(NX * NZ), idx = (x, z) => (z - Z0) * NX + (x - X0);
  const inRect = (bl, px, pz, ex) => { const c = Math.cos(bl.ang), s = Math.sin(bl.ang), dx = px - bl.x, dz = pz - bl.z, lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) <= bl.w / 2 + ex && Math.abs(lz) <= bl.d / 2 + ex; };
  const box = (bl, ex) => { const r = Math.hypot(bl.w, bl.d) / 2 + ex; return [Math.max(X0, Math.floor(bl.x - r)), Math.min(X0 + NX - 1, Math.ceil(bl.x + r)), Math.max(Z0, Math.floor(bl.z - r)), Math.min(Z0 + NZ - 1, Math.ceil(bl.z + r))]; };
  for (const bl of W.blocks) { const [x0, x1, z0, z1] = box(bl, bl.street); for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (inRect(bl, x + .5, z + .5, bl.street)) ok[idx(x, z)] = 1; }
  for (const r of W.roads) for (let i = 0; i < r.pts.length - 1; i++) {
    const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], len = Math.hypot(bx - ax, bz - az), hw = r.w / 2;
    for (let t = 0; t <= len; t += .5) { const px = ax + (bx - ax) * t / len, pz = az + (bz - az) * t / len; for (let dz = -Math.ceil(hw); dz <= Math.ceil(hw); dz++) for (let dx = -Math.ceil(hw); dx <= Math.ceil(hw); dx++) { const x = Math.floor(px) + dx, z = Math.floor(pz) + dz; if (x >= X0 && x < X0 + NX && z >= Z0 && z < Z0 + NZ && Math.hypot(x + .5 - px, z + .5 - pz) <= hw) ok[idx(x, z)] = 1; } }
  }
  const blocked = new Uint8Array(NX * NZ);
  for (const bl of W.blocks) { const [x0, x1, z0, z1] = box(bl, 0); for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (inRect(bl, x + .5, z + .5, -.3)) blocked[idx(x, z)] = 1; }
  // Streets first; where two places are not joined by streets (the Docks), open ground between the buildings is allowed at a high cost.
  const landMemo = new Int8Array(NX * NZ), land = (x, z) => { const i = idx(x, z); return landMemo[i] ? landMemo[i] > 0 : (landMemo[i] = landOK(x + .5, z + .5, 1) ? 1 : -1) > 0; };
  const inGrid = (x, z) => x >= X0 && x < X0 + NX && z >= Z0 && z < Z0 + NZ;
  const walk = (x, z) => inGrid(x, z) && !blocked[idx(x, z)] && (ok[idx(x, z)] || land(x, z));
  const near = p => { const cx = Math.floor(p.x), cz = Math.floor(p.z); for (let r = 0; r < 14; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === r && walk(cx + dx, cz + dz)) return [cx + dx, cz + dz]; return null; };
  const s0 = near(a), g0 = near(b); if (!s0 || !g0) return null;
  const gi = idx(g0[0], g0[1]), dist = new Float32Array(NX * NZ).fill(1e9), prev = new Int32Array(NX * NZ).fill(-1), done = new Uint8Array(NX * NZ);
  const heap = [[0, idx(s0[0], s0[1])]]; dist[heap[0][1]] = 0;
  const push = it => { heap.push(it); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  // Cells a tall block hides from the default chapter camera (yaw .24, pitch .9: looking north-north-west from the south) cost extra,
  // so the dots prefer streets the player can see. A block of about 6 units hides what lies within 6 / tan(pitch) behind it.
  const hid = new Int8Array(NX * NZ), hidden = (x, z) => { const i = idx(x, z); if (hid[i]) return hid[i] > 0; let h = false; for (let d = 1; d <= 5 && !h; d++) { const bx = Math.round(x + Math.sin(.24) * d), bz = Math.round(z + Math.cos(.24) * d); if (inGrid(bx, bz) && blocked[idx(bx, bz)]) h = true; } hid[i] = h ? 1 : -1; return h; };
  const edge = (x, z) => { let n = 0; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!walk(x + dx, z + dz)) n++; return n ? 1.6 : 0; };
  while (heap.length) {
    const [d, cur] = pop(); if (done[cur]) continue; done[cur] = 1; if (cur === gi) break;
    const cx = cur % NX + X0, cz = Math.floor(cur / NX) + Z0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue; const nx = cx + dx, nz = cz + dz; if (!walk(nx, nz)) continue; if (dx && dz && (!walk(cx + dx, cz) || !walk(cx, cz + dz))) continue;
      const ni = idx(nx, nz), nd = d + (dx && dz ? 1.414 : 1) + edge(nx, nz); if (nd < dist[ni]) { dist[ni] = nd; prev[ni] = cur; push([nd, ni]); }
    }
  }
  if (prev[gi] < 0 && gi !== idx(s0[0], s0[1])) return null;
  const pts = []; for (let c = gi; c >= 0; c = prev[c]) pts.push([c % NX + X0 + .5, Math.floor(c / NX) + Z0 + .5]);
  return pts.reverse();
}

/* ------------------------------------------------------------------ layout pass: districts, roads, reserved areas */
function layoutWorld(W) {
  W.reserve.push({ x: HILL.x, z: HILL.z, r: HILL.r + 1.5 }, { x: FORT.x, z: FORT.z, r: 15 });
}
function landOK(x, z, margin) { return inPoly(x, z, LAND) && polyDist(x, z, LAND) > margin; }
function reserved(W, x, z, pad = 0) { for (const r of W.reserve) if (Math.hypot(x - r.x, z - r.z) < r.r + pad) return true; return false; }

/* ------------------------------------------------------------------ land, coast, beaches */
function buildLand(W) {
  // flat land top (ground material)
  const shape = new THREE.Shape(LAND.map(p => new THREE.Vector2(p[0], -p[1])));
  const sg = new THREE.ShapeGeometry(shape); sg.rotateX(-Math.PI / 2); sg.translate(0, LAND_Y, 0);
  W.ground.add(proto(sg), M(0, 0, 0), C('#ffffff'));
  // coast edges
  const wallTop = C(PAL.quayTop), wall = C(PAL.quayWall), wallDark = C(PAL.quayWallDark);
  for (let i = 0; i < COAST.length - 1; i++) {
    const [ax, az, type] = COAST[i], [bx, bz] = COAST[i + 1];
    if (type === 'none') continue;
    const len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len; // seaward normal: land lies to the left of the walk
    if (type === 'quay') {
      W.solid.quadF([ax, -1.2, az], [bx, -1.2, bz], [bx, LAND_Y, bz], [ax, LAND_Y, az], wall, wallDark, [nx, 0, nz]);
      // coping stones
      W.solid.quadF([ax + nx * .25, LAND_Y + .1, az + nz * .25], [bx + nx * .25, LAND_Y + .1, bz + nz * .25], [bx - nx * .5, LAND_Y + .1, bz - nz * .5], [ax - nx * .5, LAND_Y + .1, az - nz * .5], wallTop, wallTop, [0, 1, 0]);
      W.solid.quadF([ax + nx * .25, LAND_Y - .05, az + nz * .25], [bx + nx * .25, LAND_Y - .05, bz + nz * .25], [bx + nx * .25, LAND_Y + .1, bz + nz * .25], [ax + nx * .25, LAND_Y + .1, az + nz * .25], wallTop, wallTop, [nx, 0, nz]);
      // fenders / ladders
      for (let s = 3; s < len - 2; s += rnd(5, 8)) {
        const x = ax + (bx - ax) * s / len + nx * .3, z = az + (bz - az) * s / len + nz * .3;
        W.solid.add(P.box, M(x, -0.8, z, .35, 1.1, .35, Math.atan2(nx, nz)), C('#2e3238'));
      }
    } else if (type === 'rock' || type === 'cliff') {
      W.solid.quadF([ax, -1.2, az], [bx, -1.2, bz], [bx, LAND_Y, bz], [ax, LAND_Y, az], C(PAL.rock2), C(PAL.rockDark), [nx, 0, nz]);
      const steps = Math.ceil(len / 2.2);
      for (let s = 0; s <= steps; s++) {
        const f = s / steps, x = ax + (bx - ax) * f + nx * rnd(-.4, .9), z = az + (bz - az) * f + nz * rnd(-.4, .9);
        const sz = rnd(1.2, 2.6), hh = rnd(.8, 1.8);
        W.solid.add(P.ico, M(x, LAND_Y - .5, z, sz, hh, sz * rnd(.8, 1.2), rnd(0, TAU), rnd(-.2, .2)), C(pick([PAL.rock, PAL.rock2, '#c2ab8c'])));
      }
    } else if (type === 'beach') {
      W.solid.quadF([ax, -1.2, az], [bx, -1.2, bz], [bx, LAND_Y, bz], [ax, LAND_Y, az], C(PAL.sandWet), C(PAL.sandWet), [nx, 0, nz]);
    }
  }
  // beach ribbons along consecutive beach segments
  const runs = []; let run = null;
  for (let i = 0; i < COAST.length - 1; i++) {
    if (COAST[i][2] === 'beach') { if (!run) { run = [COAST[i]]; runs.push(run); } run.push(COAST[i + 1]); } else run = null;
  }
  for (const r of runs) beachRibbon(W, r.map(p => [p[0], p[1]]), false);
}
/** A sloping sand strip seaward of a polyline (land to the right when walking along it). */
function beachRibbon(W, pts, closed, sc = 1) {
  const prof = [[0, LAND_Y], [3.2 * sc, 0.33], [6.2 * sc, 0.16], [7.6 * sc, 0.0], [10.5 * sc, -0.75]];
  const cols = [C(PAL.sandDry), C(PAL.sand), C(PAL.sand), C(PAL.sandWet), C('#bfa676')];
  const n = pts.length, rows = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = next[0] - prev[0], dz = next[1] - prev[1]; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    const nx = -dz, nz = dx;
    rows.push(prof.map(([o, y]) => [pts[i][0] + nx * o * (1 + 0.12 * Math.sin(i * 1.7)), y, pts[i][1] + nz * o * (1 + 0.12 * Math.sin(i * 1.7))]));
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const A = rows[i], B = rows[(i + 1) % n];
    for (let k = 0; k < prof.length - 1; k++) W.solid.quadF(A[k + 1], B[k + 1], B[k], A[k], cols[k], cols[k + 1], [0, 1, 0]);
  }
}

/* ------------------------------------------------------------------ water and distance field */
function buildWater(W, add, disposables) {
  // rasterise everything above water, then an exact Euclidean distance transform (Felzenszwalb)
  const rect = [-150, -130, 330, 240], RES = 0.6;
  const w = Math.round(rect[2] / RES), h = Math.round(rect[3] / RES);
  const cv = canvas(w, h), c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff';
  const X = x => (x - rect[0]) / RES, Y = z => (z - rect[1]) / RES;
  const poly = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.closePath(); c.fill(); };
  poly(LAND);
  for (const s of W.waterLand || []) poly(s);
  const beachW = 7.6;
  c.strokeStyle = '#fff'; c.lineJoin = 'round'; c.lineCap = 'round';
  for (let i = 0; i < COAST.length - 1; i++) if (COAST[i][2] === 'beach') { c.lineWidth = beachW * 2 / RES; c.beginPath(); c.moveTo(X(COAST[i][0]), Y(COAST[i][1])); c.lineTo(X(COAST[i + 1][0]), Y(COAST[i + 1][1])); c.stroke(); }
  for (const [b, bw] of W.waterBeaches || []) { c.lineWidth = bw * 2 / RES; c.beginPath(); b.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.closePath(); c.stroke(); }
  for (const d of W.waterDiscs || []) { c.beginPath(); c.arc(X(d[0]), Y(d[1]), d[2] / RES, 0, TAU); c.fill(); }
  // natural shores only (beaches, rocks, islands): the shallow turquoise hugs these, not the quays
  const cn = canvas(w, h), n = cn.getContext('2d');
  n.fillStyle = '#000'; n.fillRect(0, 0, w, h); n.fillStyle = '#fff'; n.strokeStyle = '#fff'; n.lineJoin = 'round'; n.lineCap = 'round';
  for (let i = 0; i < COAST.length - 1; i++) { const t = COAST[i][2]; if (t === 'quay' || t === 'none') continue; n.lineWidth = (t === 'beach' ? beachW * 2 : 2.4) / RES; n.beginPath(); n.moveTo(X(COAST[i][0]), Y(COAST[i][1])); n.lineTo(X(COAST[i + 1][0]), Y(COAST[i + 1][1])); n.stroke(); }
  for (const [b, bw] of W.waterBeaches || []) { n.beginPath(); b.forEach((p, i) => i ? n.lineTo(X(p[0]), Y(p[1])) : n.moveTo(X(p[0]), Y(p[1]))); n.closePath(); n.fill(); n.lineWidth = bw * 2 / RES; n.stroke(); }
  n.beginPath(); FORT.poly.forEach((p, i) => i ? n.lineTo(X(p[0]), Y(p[1])) : n.moveTo(X(p[0]), Y(p[1]))); n.closePath(); n.fill();
  const img = c.getImageData(0, 0, w, h).data, imn = n.getImageData(0, 0, w, h).data, INF = 1e20, f = new Float64Array(w * h), g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) { f[i] = img[i * 4] > 127 ? 0 : INF; g[i] = imn[i * 4] > 127 ? 0 : INF; }
  edt(f, w, h); edt(g, w, h);
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = Math.min(255, Math.round(Math.sqrt(f[i]) * RES / 40 * 255)); data[i * 4 + 1] = Math.min(255, Math.round(Math.sqrt(g[i]) * RES / 40 * 255)); data[i * 4 + 2] = 0; data[i * 4 + 3] = 255; }
  // DataTexture rows: row 0 = first row of data = z = rect.z0; shader samples (u, 1 - v) so flip here
  const flipped = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) flipped.set(data.subarray(y * w * 4, (y + 1) * w * 4), (h - 1 - y) * w * 4);
  const tex = new THREE.DataTexture(flipped, w, h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true; disposables.push(tex);
  const mat = waterMaterial(tex, rect, W.NIGHT); W.waterMat = mat;
  const geo = new THREE.PlaneGeometry(1400, 1400, 1, 1).rotateX(-Math.PI / 2);
  const mesh = add(new THREE.Mesh(geo, mat), false, true); mesh.name = 'sea';
}
function edt(f, w, h) {
  const n = Math.max(w, h), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1), g = new Float64Array(n);
  const pass = (len) => {
    let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
    for (let q = 1; q < len; q++) {
      let s; do { const r = v[k]; s = ((g[q] + q * q) - (g[r] + r * r)) / (2 * q - 2 * r); } while (s <= z[k] && --k >= 0);
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    k = 0; for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; const r = v[k]; d[q] = (q - r) * (q - r) + g[r]; }
  };
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) g[y] = f[y * w + x]; pass(h); for (let y = 0; y < h; y++) f[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) g[x] = f[y * w + x]; pass(w); for (let x = 0; x < w; x++) f[y * w + x] = d[x]; }
}

/* ------------------------------------------------------------------ blocks (raised pavement plates) */
function roundRect(cx, cz, w, d, ang, rad, seg = 3) {
  const pts = [], fr = frame(cx, cz, ang), hw = w / 2, hd = d / 2; rad = Math.min(rad, hw * .9, hd * .9);
  const corners = [[hw - rad, hd - rad, 0], [-hw + rad, hd - rad, Math.PI / 2], [-hw + rad, -hd + rad, Math.PI], [hw - rad, -hd + rad, Math.PI * 1.5]];
  for (const [x, z, a0] of corners) for (let k = 0; k <= seg; k++) { const a = a0 + k / seg * Math.PI / 2; pts.push(fr.p(x + Math.cos(a) * rad, z + Math.sin(a) * rad)); }
  return pts;
}
/** Raised plate: textured top (ground material) and light curb sides. */
function plate(W, pts, y0 = LAND_Y, y1 = BLOCK_Y, side) {
  let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[1]; } cx /= pts.length; cz /= pts.length;
  const white = C('#ffffff'), sc = side || C(PAL.curbSide), st = C(PAL.curb);
  const n = pts.length;
  // determine winding so the top faces up
  let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const ccw = area < 0; // in x/z with z south, a negative shoelace is counter-clockwise seen from above
  for (let i = 0; i < n; i++) {
    let a = pts[i], b = pts[(i + 1) % n]; if (!ccw) [a, b] = [b, a];
    W.ground.tri([cx, y1, cz], [b[0], y1, b[1]], [a[0], y1, a[1]], white);
    W.solid.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], st, sc);
  }
}

/* ------------------------------------------------------------------ buildings */
const roofCol = () => C(pick(PAL.terracotta));
/** Box building with textured walls. o: {x,z,ry,w,d,y0,floors,style,tint,shop:[sides],shopTint,roof,roofColor,roofH,parapet,ao} */
function building(W, o) {
  const st = FACADE[o.style], fr = frame(o.x, o.z, o.ry || 0), hw = o.w / 2, hd = o.d / 2, y0 = o.y0 ?? BLOCK_Y;
  const shopH = o.shop ? FACADE.shop.floor : 0;
  const top = y0 + shopH + o.floors * st.floor;
  const corners = [fr.p(-hw, hd), fr.p(hw, hd), fr.p(hw, -hd), fr.p(-hw, -hd)]; // front-left, front-right, back-right, back-left
  const uOff = rint(0, 3) / 4, vOff = o.style === 'industrial' ? 0 : rint(0, 3) / 4;
  const wallBand = (style, yA, yB, tint, sidesMask, aoA, aoB) => {
    const s = FACADE[style], B = W.facade[style];
    for (let k = 0; k < 4; k++) {
      if (sidesMask && !sidesMask.includes(k)) continue;
      const a = corners[k], b = corners[(k + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const bays = Math.max(1, Math.round(len / s.bay)), u1 = bays / 4, v0 = (yA - y0 - (style === 'shop' ? 0 : shopH)) / s.floor / 4 + vOff, v1 = v0 + (yB - yA) / s.floor / 4;
      const cA = C('#ffffff').multiplyScalar(aoA), cB = C('#ffffff').multiplyScalar(aoB);
      B.quad([a[0], yA, a[1]], [b[0], yA, b[1]], [b[0], yB, b[1]], [a[0], yB, a[1]], cB, cA, [uOff, v0, uOff + u1, v0, uOff + u1, v1, uOff, v1], tint);
    }
  };
  const aoAt = y => 0.74 + 0.26 * sstep(0, 2.6, y - y0);
  if (o.shop) {
    wallBand('shop', y0, y0 + shopH, o.shopTint || o.tint, null, aoAt(y0), aoAt(y0 + shopH));
  }
  const ys = y0 + shopH;
  if (top - ys > 4) { // split tall walls so the soft ground shade stays near the ground
    wallBand(o.style, ys, ys + 2 * st.floor, o.tint, null, aoAt(ys), aoAt(ys + 2 * st.floor));
    wallBand(o.style, ys + 2 * st.floor, top, o.tint, null, 1, 1);
  } else wallBand(o.style, ys, top, o.tint, null, aoAt(ys), aoAt(top));
  // roof
  const rc = o.roofColor || C(PAL.roofFlat);
  const roof = o.roof || 'flat';
  if (roof === 'flat') flatRoof(W, fr, o.w, o.d, top, rc, o.parapetColor || shade(o.tint, 0.92), o.rooftop !== false);
  else if (roof === 'hip') hipRoof(W, fr, o.w + .3, o.d + .3, top, o.roofH || Math.min(o.w, o.d) * .42, rc);
  else if (roof === 'gable') gableRoof(W, fr, o.w + .3, o.d + .3, top, o.roofH || Math.min(o.w, o.d) * .45, rc, o.tint);
  if (o.shop && o.awning) awnings(W, fr, o.w, o.d, y0 + shopH - 0.15, o.awning, o.awningSides || [0]);
  return top;
}
function shade(c, k) { return c.clone().multiplyScalar(k); }
function flatRoof(W, fr, w, d, y, roofC, parC, details) {
  const hw = w / 2, hd = d / 2, t = 0.16, ph = 0.28;
  W.solid.add(P.box, M(...xyz(fr, 0, y, 0), w - .02, .06, d - .02, fr.ry), roofC);
  for (const [lx, lz, sw, sd] of [[0, hd - t / 2, w, t], [0, -hd + t / 2, w, t], [hw - t / 2, 0, t, d], [-hw + t / 2, 0, t, d]])
    W.solid.add(P.box, M(...xyz(fr, lx, y, lz), sw + .04, ph, sd + .04, fr.ry), parC);
  if (!details) return;
  const n = w * d > 30 ? rint(1, 3) : rint(0, 2);
  for (let k = 0; k < n; k++) {
    const bw = rnd(.6, Math.min(2.2, w * .35)), bd = rnd(.6, Math.min(2, d * .35)), lx = rnd(-hw + bw / 2 + .4, hw - bw / 2 - .4), lz = rnd(-hd + bd / 2 + .4, hd - bd / 2 - .4);
    W.solid.add(P.box, M(...xyz(fr, lx, y, lz), bw, rnd(.3, .6), bd, fr.ry), C(pick(['#d9d6cf', '#c8c4bc', '#b4b9bf'])));
  }
  if (w * d > 24 && chance(.35)) { const lx = rnd(-hw + 1, hw - 1), lz = rnd(-hd + 1, hd - 1); W.solid.add(P.cyl8, M(...xyz(fr, lx, y + .5, lz), .45, .7, .45), C('#9a7b5b')); W.solid.add(P.cone8, M(...xyz(fr, lx, y + 1.2, lz), .5, .3, .5), C('#6e5944')); for (const [a, b] of [[-.3, -.3], [.3, .3], [-.3, .3], [.3, -.3]]) W.solid.add(P.box, M(...xyz(fr, lx + a, y, lz + b), .06, .5, .06), C('#555')); }
}
function xyz(fr, lx, y, lz) { const p = fr.p(lx, lz); return [p[0], y, p[1]]; }
function hipRoof(W, fr, w, d, y, h, col) {
  const hw = w / 2, hd = d / 2, along = w >= d, r = along ? (w - d) / 2 : (d - w) / 2;
  const p = (lx, ly, lz) => { const q = fr.p(lx, lz); return [q[0], y + ly, q[1]]; };
  const r1 = along ? p(-r, h, 0) : p(0, h, -r), r2 = along ? p(r, h, 0) : p(0, h, r);
  const fl = p(-hw, 0, hd), fr2 = p(hw, 0, hd), br = p(hw, 0, -hd), bl = p(-hw, 0, -hd);
  const lo = shade(col, .82);
  if (along) {
    W.solid.quad(fl, fr2, r2, r1, col, lo); W.solid.quad(br, bl, r1, r2, col, lo);
    W.solid.tri(fr2, br, r2, lo, lo, col); W.solid.tri(bl, fl, r1, lo, lo, col);
  } else {
    W.solid.quad(fr2, br, r1, r2, col, lo); W.solid.quad(bl, fl, r2, r1, col, lo);
    W.solid.tri(fl, fr2, r2, lo, lo, col); W.solid.tri(br, bl, r1, lo, lo, col);
  }
  // eave underside shadow strip
  W.solid.quad(p(-hw, -.08, hd), p(hw, -.08, hd), fr2, fl, shade(col, .55));
}
function gableRoof(W, fr, w, d, y, h, col, wallTint) {
  const hw = w / 2, hd = d / 2, along = w >= d;
  const p = (lx, ly, lz) => { const q = fr.p(lx, lz); return [q[0], y + ly, q[1]]; };
  const lo = shade(col, .8), gc = wallTint ? shade(wallTint, .93) : col;
  if (along) {
    const a = p(-hw, h, 0), b = p(hw, h, 0);
    W.solid.quad(p(-hw, 0, hd), p(hw, 0, hd), b, a, col, lo); W.solid.quad(p(hw, 0, -hd), p(-hw, 0, -hd), a, b, col, lo);
    W.solid.tri(p(hw - .15, 0, hd - .15), p(hw - .15, 0, -hd + .15), p(hw - .15, h - .1, 0), gc); W.solid.tri(p(-hw + .15, 0, -hd + .15), p(-hw + .15, 0, hd - .15), p(-hw + .15, h - .1, 0), gc);
  } else {
    const a = p(0, h, -hd), b = p(0, h, hd);
    W.solid.quad(p(hw, 0, hd), p(hw, 0, -hd), a, b, col, lo); W.solid.quad(p(-hw, 0, -hd), p(-hw, 0, hd), b, a, col, lo);
    W.solid.tri(p(-hw + .15, 0, hd - .15), p(hw - .15, 0, hd - .15), p(0, h - .1, hd - .15), gc); W.solid.tri(p(hw - .15, 0, -hd + .15), p(-hw + .15, 0, -hd + .15), p(0, h - .1, -hd + .15), gc);
  }
}
/** Striped shop awnings on given local sides (0 front +z, 1 right +x, 2 back, 3 left). */
function awnings(W, fr, w, d, y, colors, sides) {
  const [c1, c2] = colors.map(C);
  for (const s of sides) {
    const len = (s % 2 === 0 ? w : d) - 0.3, out = 0.75, drop = 0.38, n = Math.max(3, Math.round(len / 0.32));
    for (let k = 0; k < n; k++) {
      const a = -len / 2 + k * len / n, b = a + len / n, col = k % 2 ? c2 : c1;
      const pt = (along, o, yy) => {
        let lx, lz; const hw = w / 2, hd = d / 2;
        if (s === 0) { lx = along; lz = hd + o; } else if (s === 2) { lx = -along; lz = -hd - o; } else if (s === 1) { lx = hw + o; lz = -along; } else { lx = -hw - o; lz = along; }
        const q = fr.p(lx, lz); return [q[0], yy, q[1]];
      };
      W.solid.quad(pt(a, out, y - drop), pt(b, out, y - drop), pt(b, 0, y), pt(a, 0, y), col);
      W.solid.quad(pt(a, out, y - drop - .14), pt(b, out, y - drop - .14), pt(b, out, y - drop), pt(a, out, y - drop), shade(col, .9));
    }
  }
}

/* ------------------------------------------------------------------ districts (grid generator) */
/** Grid district: origin, axes (unit u and w vectors), column and row spans in local units. */
function grid(W, def) {
  const [ux, uz] = def.U, [wx, wz] = def.Wv, blocks = [];
  const at = (u, w) => [def.o[0] + ux * u + wx * w, def.o[1] + uz * u + wz * w];
  const ang = -Math.atan2(uz, ux);
  def.cols.forEach((cu, i) => def.rows.forEach((rw, j) => {
    const cu0 = cu[0], cu1 = cu[1], rw0 = rw[0], rw1 = rw[1];
    const kind = def.kind ? def.kind(i, j) : 'build'; if (!kind) return;
    const pts = [at(cu0, rw0), at(cu1, rw0), at(cu1, rw1), at(cu0, rw1), at((cu0 + cu1) / 2, (rw0 + rw1) / 2)];
    if (kind !== 'force' && !pts.every(p => landOK(p[0], p[1], def.margin ?? 2) && !reserved(W, p[0], p[1], 1) && (!def.poly || inPoly(p[0], p[1], def.poly)))) return;
    const c = at((cu0 + cu1) / 2, (rw0 + rw1) / 2);
    blocks.push({ district: def.name, i, j, x: c[0], z: c[1], w: cu1 - cu0, d: rw1 - rw0, ang, kind: kind === 'force' ? 'build' : kind, street: def.street, u0: cu0, u1: cu1, w0: rw0, w1: rw1, at });
  }));
  W.blocks.push(...blocks);
  W.grids = W.grids || []; W.grids.push({ def, blocks, at, ang });
  return blocks;
}

function buildDistricts(W) {
  /* Downtown: grid parallel to the bay quay */
  const dt = grid(W, {
    name: 'downtown', o: Q0, U: QU, Wv: QW, street: 4,
    cols: [[3, 15], [19, 31], [35, 47], [51, 62]], rows: [[8, 20], [24, 35], [39, 50]], margin: 1,
    kind: (i, j) => (i === 3 && j === 0) ? 'boxingclub' : (i === 3 && j === 2) ? 'sportshall' : (i === 3 && j === 1) ? 'field' : (i === 1 && j === 1) ? 'plaza' : 'build'
  });
  W.downtown = dt;
  /* Old Town: small irregular blocks */
  const otU = [Math.cos(.02), Math.sin(.02)], otW = [-otU[1], otU[0]];
  W.oldtown = grid(W, {
    name: 'oldtown', o: [37, -71], U: otU, Wv: otW, street: 3,
    cols: [[0, 9], [12, 21.5], [24.5, 33], [36, 45], [48, 56.5]], rows: [[0, 8.5], [11.5, 20], [23, 31.5]], margin: 2,
    kind: (i, j) => (i === 2 && j === 1) ? 'square' : (i === 1 && j === 2) ? 'homegym' : 'build'
  });
  /* Market Row: one long pedestrian market street between two rows of blocks */
  const mrU = [Math.cos(.06), Math.sin(.06)], mrW = [-mrU[1], mrU[0]];
  W.marketFrame = { o: [17, -24], U: mrU, Wv: mrW };
  W.market = grid(W, {
    name: 'market', o: [17, -24], U: mrU, Wv: mrW, street: 3,
    cols: [[0, 10], [13, 23], [26, 36], [39, 49]], rows: [[-12, -3.5], [3.5, 12]], margin: 2,
    kind: (i, j) => (i === 3 && j === 0) ? 'markethall' : 'build'
  });
  /* Neon Strip hotels facing the beach boulevard */
  W.hotels = grid(W, {
    name: 'neon', o: [28, 15], U: [1, 0], Wv: [0, 1], street: 3,
    cols: [[0, 10], [13, 23], [26, 36], [39, 49], [52, 62], [65, 75]], rows: [[-6.5, 5]], margin: 1
  });
  /* suburbs and filler */
  W.suburbN = grid(W, {
    name: 'suburb', o: [16, -72], U: [1, 0], Wv: [0, 1], street: 2.6,
    cols: [[0, 8], [10.6, 18.6]], rows: [[0, 8], [10.6, 18.6], [21.2, 29.2]], margin: 2
  });
  W.suburbW = grid(W, {
    name: 'suburb', o: Q0, U: QU, Wv: QW, street: 2.6,
    cols: [[-42, -34], [-31.4, -23.4], [-20.8, -12.8], [-10.2, -2.2]], rows: [[12, 20], [22.6, 30.6], [33.2, 41.2], [43.8, 51.8], [54.4, 62.4], [65, 73]], margin: 2.5,
    poly: [[-86, -80], [-31, -80], [-31, -56], [-66, -18], [-78, -24], [-84, -36]]
  });
  W.parkStrip = grid(W, {
    name: 'park', o: [20, -6], U: [1, 0], Wv: [0, 1], street: 3,
    cols: [[0, 14], [17, 31], [34, 48]], rows: [[0, 10]], margin: 2, kind: () => 'park'
  });

  for (const b of W.blocks) {
    const pts = roundRect(b.x, b.z, b.w, b.d, b.ang, 1.1);
    plate(W, pts);
    b.pts = pts;
    fillBlock(W, b);
  }
  // Market street plaza between the two rows
  const mf = W.marketFrame, mat = (u, w) => [mf.o[0] + mf.U[0] * u + mf.Wv[0] * w, mf.o[1] + mf.U[1] * u + mf.Wv[1] * w];
  W.marketStreet = [mat(-1.5, -3.5), mat(50.5, -3.5), mat(50.5, 3.5), mat(-1.5, 3.5)];
}

/* -------- block fillers */
function fillBlock(W, b) {
  const fr = frame(b.x, b.z, b.ang), hw = b.w / 2, hd = b.d / 2;
  switch (b.district) {
    case 'downtown': return b.kind === 'build' ? downtownBlock(W, b, fr) : null;
    case 'oldtown': return b.kind === 'build' ? rowHouses(W, b, fr, PAL.oldTown, 2, 3) : null;
    case 'market': return b.kind === 'build' ? marketBlock(W, b, fr) : null;
    case 'neon': return hotelBlock(W, b, fr);
    case 'suburb': return suburbBlock(W, b, fr);
      }
}
function downtownBlock(W, b, fr) {
  const core = qpt(36, 38), dist = Math.hypot(b.x - core[0], b.z - core[1]), tall = clamp(1 - dist / 40, 0, 1);
  if (tall > .25 || chance(.25)) {
    // one landmark tower on a podium
    const corner = [pick([-1, 1]), pick([-1, 1])], tw = b.w * rnd(.5, .6), td = b.d * rnd(.5, .6);
    const lx = corner[0] * (b.w / 2 - .7 - tw / 2), lz = corner[1] * (b.d / 2 - .7 - td / 2), [x, z] = fr.p(lx, lz);
    const tint = C(pick(PAL.office)), floors = Math.round(lerp(10, 27, tall) * rnd(.8, 1.15));
    const podium = building(W, { x: b.x, z: b.z, ry: fr.ry, w: b.w - 1.3, d: b.d - 1.3, floors: 1, style: 'office', tint: C('#e9e6df'), shop: true, shopTint: C('#ece6dc'), roofColor: C('#b7b9b4'), rooftop: false, awning: pick(PAL.awning), awningSides: [1] });
    tower(W, x, z, fr.ry, tw, td, podium, floors, tint);
    // a second slimmer building on the opposite corner
    const [x2, z2] = fr.p(-lx * .95, -lz * .95);
    building(W, { x: x2, z: z2, ry: fr.ry, w: b.w * .36, d: b.d * .36, y0: podium, floors: rint(3, 9), style: pick(['apartment', 'office']), tint: C(pick(PAL.apartment)), roofColor: C(PAL.roofFlat) });
  } else {
    const lw = (b.w - 1.2) / 2, ld = (b.d - 1.2) / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const [x, z] = fr.p(-b.w / 2 + .6 + lw * (i + .5), -b.d / 2 + .6 + ld * (j + .5));
      const style = pick(['apartment', 'office', 'apartment', 'brick']);
      building(W, { x, z, ry: fr.ry, w: lw - rnd(.4, .9), d: ld - rnd(.4, .9), floors: rint(4, 9), style, tint: C(pick(style === 'office' ? PAL.office : style === 'brick' ? ['#c9876b', '#b9a08a', '#d8b48f'] : PAL.apartment)), shop: chance(.7), shopTint: C('#ebe4d8'), roofColor: C(pick([PAL.roofFlat, PAL.roofFlat2])), awning: pick(PAL.awning), awningSides: [0, 1] });
    }
  }
}
/** Downtown tower: one of several silhouettes, with crown details and night lights. */
function tower(W, x, z, ry, w, d, y0, floors, tint) {
  const kind = pick(['setback', 'round', 'stepped', 'spire', 'setback', 'round']), fl = FACADE.office.floor;
  let top;
  if (kind === 'round') {
    const r = Math.min(w, d) / 2;
    top = prism(W, x, z, r, 12, y0, floors, 'office', tint);
    W.solid.add(P.cyl12, M(x, top, z, r * .9, .9, r * .9), shade(tint, .9));
    W.solid.add(P.cyl12, M(x, top + .9, z, r * .55, 1.6, r * .55), C('#e9eef3'));
    crownLights(W, x, top + .9, z, r * .9, 12);
    top += 2.5;
  } else if (kind === 'stepped') {
    const f1 = Math.round(floors * .55), f2 = Math.round(floors * .3), f3 = floors - f1 - f2;
    let t = building(W, { x, z, ry, w, d, y0, floors: f1, style: 'office', tint, roofColor: C(PAL.roofFlat2), rooftop: false });
    t = building(W, { x, z, ry, w: w * .78, d: d * .78, y0: t, floors: f2, style: 'office', tint, roofColor: C(PAL.roofFlat2), rooftop: false });
    top = building(W, { x, z, ry, w: w * .55, d: d * .55, y0: t, floors: Math.max(2, f3), style: 'office', tint, roofColor: C(PAL.roofFlat2) });
    crownBox(W, x, top, z, ry, w * .55, d * .55);
  } else if (kind === 'spire') {
    top = building(W, { x, z, ry, w, d, y0, floors, style: 'office', tint, roofColor: C(PAL.roofFlat2), rooftop: false });
    const f = frame(x, z, ry);
    W.solid.add(P.cone4, M(x, top, z, Math.min(w, d) * .62, 3.2, Math.min(w, d) * .62, ry + Math.PI / 4), shade(tint, .85).lerp(C('#dfe8f0'), .4));
    rod(W.solid, [x, top + 3, z], [x, top + 6.2, z], .07, C('#dfe3e8'));
    crownBox(W, x, top, z, ry, w, d); void f;
    top += 6.2;
  } else {
    top = building(W, { x, z, ry, w, d, y0, floors, style: 'office', tint, roofColor: C(PAL.roofFlat2), rooftop: false });
    const f2 = rint(3, 6), w2 = w * rnd(.6, .72), d2 = d * rnd(.6, .72);
    top = building(W, { x, z, ry, w: w2, d: d2, y0: top, floors: f2, style: 'office', tint, roofColor: C(PAL.roofFlat2) });
    if (chance(.5)) helipad(W, x, top + .08, z, Math.min(w2, d2) * .38); else { rod(W.solid, [x, top, z], [x, top + rnd(2, 4), z], .06, C('#d7dbe0')); }
    crownBox(W, x, top, z, ry, w2, d2);
  }
  glow(W, x, top + .2, z, '#ff3b30', 1, 1);
  void fl;
  return top;
}
function crownBox(W, x, y, z, ry, w, d) {
  const f = frame(x, z, ry), c = [f.p(-w / 2, d / 2), f.p(w / 2, d / 2), f.p(w / 2, -d / 2), f.p(-w / 2, -d / 2)];
  const col = pick(['#7fe8ff', '#ffffff', '#ffd27a']);
  if (W.NIGHT) for (let k = 0; k < 4; k++) neon(W, [[c[k][0], y + .3, c[k][1]], [c[(k + 1) % 4][0], y + .3, c[(k + 1) % 4][1]]], col, .07, .35);
}
function crownLights(W, x, y, z, r, n) { if (!W.NIGHT) return; for (let k = 0; k < n * 2; k++) { const a = k / (n * 2) * TAU; glow(W, x + Math.cos(a) * r, y + .5, z + Math.sin(a) * r, '#7fe8ff', 1.1, .7); } }
/** Polygonal (round) building with textured walls. */
function prism(W, x, z, r, n, y0, floors, style, tint) {
  const st = FACADE[style], top = y0 + floors * st.floor, B = W.facade[style], vOff = rint(0, 3) / 4;
  for (let k = 0; k < n; k++) {
    const a0 = k / n * TAU, a1 = (k + 1) / n * TAU, am = (a0 + a1) / 2;
    const p0 = [x + Math.cos(a0) * r, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, z + Math.sin(a1) * r];
    const u1 = Math.max(1, Math.round(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / st.bay)) / 4, v1 = vOff + floors / 4;
    B.quadF([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], top, p1[1]], [p0[0], top, p0[1]], C('#ffffff'), C('#ffffff').multiplyScalar(.85), [Math.cos(am), 0, Math.sin(am)], [0, vOff, u1, vOff, u1, v1, 0, v1], tint);
  }
  W.solid.add(P.cyl12, M(x, top - .02, z, r * 1.02, .3, r * 1.02), shade(tint, .95).lerp(C('#ffffff'), .5));
  return top + .28;
}
function helipad(W, x, y, z, r) {
  W.solid.add(P.cyl20, M(x, y, z, r, .05, r), C('#4a5260'));
  W.marks.add(P.box, M(x, y + .06, z, r * .14, .01, r * .9), C('#f3f0e6')); W.marks.add(P.box, M(x - r * .3, y + .06, z, r * .14, .01, r * .9), C('#f3f0e6')); W.marks.add(P.box, M(x + r * .3, y + .06, z, r * .14, .01, r * .9), C('#f3f0e6'));
}
/** Perimeter row houses with a courtyard: the classic old town block. */
function rowHouses(W, b, fr, palette, fMin, fMax, skip) {
  const depth = rnd(3.2, 3.8), inset = .45, hw = b.w / 2, hd = b.d / 2, rows = [];
  // front (+z) and back (-z) rows along x, sides along z between them
  rows.push({ side: 0, a: -hw + inset, b: hw - inset, fixed: hd - inset - depth / 2 });
  rows.push({ side: 2, a: -hw + inset, b: hw - inset, fixed: -hd + inset + depth / 2 });
  const zA = -hd + inset + depth, zB = hd - inset - depth;
  if (zB - zA > 2.4) { rows.push({ side: 1, a: zA, b: zB, fixed: hw - inset - depth / 2 }); rows.push({ side: 3, a: zA, b: zB, fixed: -hw + inset + depth / 2 }); }
  for (const r of rows) {
    let pos = r.a;
    while (r.b - pos > 2.2) {
      let wdt = rnd(2.4, 3.8); if (r.b - pos - wdt < 2.4) wdt = r.b - pos;
      const mid = pos + wdt / 2, dpt = depth + rnd(-.25, .2);
      let lx, lz, rot;
      if (r.side === 0) { lx = mid; lz = r.fixed; rot = 0; } else if (r.side === 2) { lx = -mid; lz = r.fixed; rot = Math.PI; }
      else if (r.side === 1) { lx = r.fixed; lz = -mid; rot = Math.PI / 2; } else { lx = r.fixed; lz = mid; rot = -Math.PI / 2; }
      if (skip && skip(lx, lz)) { pos += wdt; continue; }
      const [x, z] = fr.p(lx, lz), floors = rint(fMin, fMax), roof = chance(.62) ? 'hip' : 'gable';
      const shopFront = r.side === 0 && chance(.35);
      const top = building(W, { x, z, ry: fr.ry + rot, w: wdt - .02, d: dpt, floors, style: chance(.18) ? 'brick' : 'plaster', tint: C(pick(palette)), roof, roofColor: roofCol(), roofH: rnd(.9, 1.3), shop: shopFront, shopTint: C(pick(palette)), awning: pick(PAL.awning) });
      if (chance(.45)) { const f2 = frame(x, z, fr.ry + rot); W.solid.add(P.box, M(...xyz(f2, rnd(-wdt / 3, wdt / 3), top + .2, rnd(-.6, .6)), .35, .9, .35, f2.ry), C('#b9a99a')); }
      pos += wdt;
    }
  }
  // courtyard tree
  if (zB - zA > 1.5 && b.w > 6) { const [x, z] = fr.p(rnd(-1, 1), rnd(-.5, .5)); W.inst.trees = W.inst.trees || []; W.inst.trees.push({ x, y: BLOCK_Y, z, s: rnd(.7, 1) }); }
}
function marketBlock(W, b, fr) {
  // buildings face the market street: north row faces +w (local +z), south row faces -w
  const facing = b.j === 0 ? 0 : 2, n = Math.max(2, Math.round(b.w / 3.4)), lw = (b.w - .9) / n, depth = b.d - 1.4;
  for (let k = 0; k < n; k++) {
    const lx = -b.w / 2 + .45 + lw * (k + .5);
    const [x, z] = fr.p(lx, 0);
    building(W, { x, z, ry: fr.ry + (facing ? Math.PI : 0), w: lw - .04, d: depth - rnd(0, .8), floors: rint(2, 4), style: pick(['plaster', 'apartment', 'brick', 'plaster']), tint: C(pick(PAL.market)), shop: true, shopTint: C(pick(PAL.market)), awning: pick(PAL.awning), roof: chance(.5) ? 'flat' : 'hip', roofColor: chance(.5) ? roofCol() : C(PAL.roofFlat) });
  }
}
function hotelBlock(W, b, fr) {
  const floors = rint(4, 7), tint = C(pick(PAL.hotel)), trim = C('#fbf8f2'), w = b.w - 1.6, d = b.d - 2.6;
  const [x, z] = fr.p(0, .2);
  const top = building(W, { x, z, ry: 0, w, d, floors, style: 'deco', tint, shop: true, shopTint: C('#f7f1e8'), roofColor: shade(tint, .8).lerp(C('#c9bfae'), .55), parapetColor: trim, awning: pick(PAL.awning), rooftop: false });
  const y1 = BLOCK_Y + FACADE.shop.floor, fz = z + d / 2;
  // streamline eyebrows on the front facade
  for (let f = 1; f <= floors; f++) W.solid.add(P.box, M(x, y1 + f * FACADE.deco.floor - .1, fz + .16, w + .12, .1, .34), trim);
  // rounded corner tower and stepped crown
  const side = chance(.5) ? -1 : 1, cr = 1.35, cx = x + side * (w / 2 - cr * .6), cz = fz - cr * .6, ch = top + rnd(1.2, 2.6);
  W.solid.add(P.cyl20, M(cx, BLOCK_Y, cz, cr, ch - BLOCK_Y, cr), tint, { ao: .25 });
  for (let f = 1; f <= floors; f++) W.solid.add(P.cyl20, M(cx, y1 + f * FACADE.deco.floor - .1, cz, cr + .08, .1, cr + .08), trim);
  W.solid.add(P.cyl20, M(cx, ch, cz, cr + .12, .22, cr + .12), trim);
  rod(W.solid, [cx, ch + .2, cz], [cx, ch + 1.8, cz], .05, trim);
  W.solid.add(P.box, M(x - side * w * .12, top, z, w * .34, 1.3, d * .4), trim, { top: shade(tint, .85) });
  W.solid.add(P.box, M(x - side * w * .12, top + 1.3, z, w * .2, .7, d * .26), tint);
  // entrance canopy
  W.solid.add(P.box, M(x - side * w * .18, y1 - .25, fz + .75, 2.4, .16, 1.5), trim);
  for (const s2 of [-1, 1]) rod(W.solid, [x - side * w * .18 + s2 * 1.05, BLOCK_Y, fz + 1.4], [x - side * w * .18 + s2 * 1.05, y1 - .25, fz + 1.4], .04, C('#c9b892'));
  b.hotelTop = top; b.hotelW = w; b.hotelD = d; b.hotelX = x; b.hotelZ = z; b.hotelTint = tint; b.hotelSide = side; b.hotelCorner = [cx, ch, cz];
}
function suburbBlock(W, b, fr) {
  const lots = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [sx, sz] of lots) {
    if (chance(.12)) continue;
    const lx = sx * b.w / 4, lz = sz * b.d / 4, [x, z] = fr.p(lx + rnd(-.3, .3), lz + rnd(-.3, .3));
    const w = rnd(2.4, 3.2), d = rnd(2.2, 2.8), rot = fr.ry + (sz > 0 ? 0 : Math.PI);
    building(W, { x, z, ry: rot, w, d, floors: rint(1, 2), style: 'plaster', tint: C(pick(PAL.oldTown)), roof: 'hip', roofColor: chance(.7) ? roofCol() : C(PAL.slateRoof), roofH: rnd(.8, 1.1) });
    W.inst.trees = W.inst.trees || []; if (chance(.8)) { const [tx, tz] = fr.p(lx + sx * 1.6, lz - sz * 1.3); W.inst.trees.push({ x: tx, y: BLOCK_Y, z: tz, s: rnd(.6, .9) }); }
    if (chance(.4)) { const [px, pz] = fr.p(lx - sx * .8, lz - sz * 1.5); b.pools = b.pools || []; b.pools.push([px, pz, fr.ry]); }
  }
}
function midriseBlock(W, b, fr) {
  const n = 2;
  for (let k = 0; k < n; k++) {
    const lx = (k - .5) * b.w / 2, [x, z] = fr.p(lx, rnd(-.3, .3));
    building(W, { x, z, ry: fr.ry, w: b.w / 2 - 1, d: b.d - 1.6, floors: rint(4, 7), style: 'apartment', tint: C(pick(PAL.apartment)), shop: chance(.5), shopTint: C('#efe8dc'), roofColor: C(PAL.roofFlat), awning: pick(PAL.awning) });
  }
}

/* ------------------------------------------------------------------ shared builders */
const UP = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
function beamM(a, b, tx, tz) {
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _d.length() || 1e-6; _d.multiplyScalar(1 / len);
  if (_d.y < -0.99999) _q.set(1, 0, 0, 0); else _q.setFromUnitVectors(UP, _d);
  return _m.compose(_v.set(a[0], a[1], a[2]), _q, _s.set(tx, len, tz ?? tx));
}
const beam = (B, a, b, t, col, t2) => B.add(P.box, beamM(a, b, t, t2), col);
const rod = (B, a, b, r, col, pr) => B.add(pr || P.cyl6, beamM(a, b, r, r), col);
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const WHITE = () => new THREE.Color(1, 1, 1);
function glow(W, x, y, z, hex, size, k = 1) { if (!W.NIGHT) return; const c = CS(hex); W.glow.p.push(x, y, z); W.glow.c.push(c.r * k, c.g * k, c.b * k); W.glow.s.push(size); W.glow.ph.push(R()); }
function pool(W, x, z, r, hex, k = 1, y = BLOCK_Y, stretch = 1) { if (W.NIGHT) W.pools.push({ x, z, r, rz: r * stretch, c: CS(hex).multiplyScalar(k), y }); }
/** Neon tube: pale glass by day, glowing at night (unlit mesh plus soft glow sprites). */
function neon(W, pts, hex, t = 0.09, glowK = .5) {
  const col = W.NIGHT ? C(hex).lerp(WHITE(), .3).multiplyScalar(1.5) : C(hex).lerp(WHITE(), .45);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    beam(W.NIGHT ? W.glowSolid : W.solid, a, b, t, col);
    if (W.NIGHT && glowK > 0) { const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.round(L / 1.3)); for (let k = 0; k <= n; k++) { const f = k / n; glow(W, lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f), hex, 1.7, glowK); } }
  }
}
/** Lit window panel: dark glass by day, warm light at night. */
function litQuad(W, a, b, c, d, dir, hexNight, hexDay = '#33445a') {
  if (W.NIGHT) W.glowSolid.quadF(a, b, c, d, C(hexNight), C(hexNight), dir); else W.solid.quadF(a, b, c, d, C(hexDay), C(hexDay), dir);
}
function occupy(W, kind, data) { W.occ.push([kind, data]); }

const SIGN_FONT = '"Inter Display","Inter","Arial Black",Impact,system-ui,sans-serif';
let _measure = null;
function textW(text, px) { if (!_measure) _measure = canvas(8, 8).getContext('2d'); _measure.font = `900 ${px}px ${SIGN_FONT}`; return _measure.measureText(text).width; }
/** Register a sign. o: { text, x, y (top), z, ry, h, style: 'board'|'letters'|'blade', fg, bg, glow, board (depth), boardColor, flat } */
function sign(W, o) {
  const FS = 56, pad = o.style === 'letters' ? 11 : 20;
  if (o.style === 'blade') { o.cw = 88; o.ch = o.text.length * 60 + 2 * pad; }
  else { o.cw = Math.ceil(textW(o.text, FS) * 0.9 + 2 * pad); o.ch = 86; }
  o.w = o.h * o.cw / o.ch; o.pad = pad; o.fs = FS;
  if (o.board) {
    const fr = frame(o.x, o.z, o.ry), [bx, bz] = fr.p(0, -o.board / 2);
    W.solid.add(P.box, M(bx, o.y - o.h - .07, bz, o.w + .14, o.h + .14, o.board, o.ry), C(o.boardColor || '#262b36'));
  }
  W.signs.push(o); return o;
}
function roundRectPath(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function drawSign(c, s, night) {
  const fg = s.fg || '#ffffff', bg = s.bg || '#e11d2e', gl = s.glow || fg;
  c.save(); c.translate(s.ax, s.ay);
  const font = `900 ${s.fs}px ${SIGN_FONT}`;
  const text = (fill, blur, mode) => {
    c.font = font; c.textBaseline = 'middle'; c.textAlign = 'center'; c.shadowBlur = blur; c.shadowColor = blur ? gl : 'transparent';
    const put = (t, x, y) => { if (mode === 'stroke') c.strokeText(t, x, y); else c.fillText(t, x, y); };
    if (mode === 'stroke') { c.strokeStyle = fill; c.lineWidth = 8; c.lineJoin = 'round'; } else c.fillStyle = fill;
    if (s.style === 'blade') [...s.text].forEach((ch, i) => put(ch, s.cw / 2, s.pad + 31 + i * 60));
    else { c.save(); c.translate(s.cw / 2, s.ch / 2 + 3); c.scale(0.9, 1); put(s.text, 0, 0); c.restore(); }
  };
  if (!night) {
    if (s.style !== 'letters') { roundRectPath(c, 2, 2, s.cw - 4, s.ch - 4, 12); c.fillStyle = bg; c.fill(); c.lineWidth = 4; c.strokeStyle = s.edge || 'rgba(255,255,255,.9)'; c.stroke(); }
    else text(s.outline || 'rgba(24,28,38,.95)', 0, 'stroke');
    text(fg, 0);
  } else {
    if (s.style !== 'letters' && s.lit !== false) { roundRectPath(c, 2, 2, s.cw - 4, s.ch - 4, 12); const k = new THREE.Color(bg).multiplyScalar(.32); c.fillStyle = '#' + k.getHexString(); c.fill(); c.lineWidth = 3.5; c.strokeStyle = gl; c.shadowBlur = 11; c.shadowColor = gl; c.stroke(); c.shadowBlur = 0; }
    text(gl, 20); text(gl, 9); text('#' + new THREE.Color(gl).lerp(new THREE.Color(1, 1, 1), .6).getHexString(), 3);
  }
  c.restore();
}

/* ------------------------------------------------------------------ geometry helpers for landmarks */
/** Barrel vault along local x of frame fr, centred at (cx, cz), springing at yB. */
function vault(B, fr, cx, cz, len, rad, ky, yB, col, col2, endCol, seg = 12) {
  const p = (lx, y, lz) => { const q = fr.p(cx + lx, cz + lz); return [q[0], y, q[1]]; };
  for (let k = 0; k < seg; k++) {
    const a0 = Math.PI * k / seg, a1 = Math.PI * (k + 1) / seg, m = (a0 + a1) / 2;
    const z0 = Math.cos(a0) * rad, y0 = yB + Math.sin(a0) * rad * ky, z1 = Math.cos(a1) * rad, y1 = yB + Math.sin(a1) * rad * ky;
    const dir = sub3(p(0, yB + Math.sin(m) * rad, Math.cos(m) * rad), p(0, yB, 0));
    const c = k % 2 ? col2 : col;
    B.quadF(p(-len / 2, y0, z0), p(len / 2, y0, z0), p(len / 2, y1, z1), p(-len / 2, y1, z1), c, c, dir);
    for (const sx of [-1, 1]) B.tri(...(() => { const t = [p(sx * len / 2, yB, 0), p(sx * len / 2, y0, z0), p(sx * len / 2, y1, z1)]; return sx > 0 ? t : [t[0], t[2], t[1]]; })(), endCol);
  }
}
/** Ring of wall quads around an ellipse (rx, rz) between y0 and y1; colour per segment by fn. */
function ellipseWall(B, cx, cz, rx, rz, y0, y1, n, colFn, inward) {
  for (let k = 0; k < n; k++) {
    const a0 = k / n * TAU, a1 = (k + 1) / n * TAU, am = (a0 + a1) / 2;
    const p0 = [cx + Math.cos(a0) * rx, cz + Math.sin(a0) * rz], p1 = [cx + Math.cos(a1) * rx, cz + Math.sin(a1) * rz];
    const dir = [Math.cos(am) / rx * (inward ? -1 : 1), 0, Math.sin(am) / rz * (inward ? -1 : 1)];
    const c = colFn(k, am);
    B.quadF([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], c, Array.isArray(c) ? c[1] : c, dir);
  }
}
/** Ring surface between two ellipse scales at heights ya (outer) and yb (inner). */
function ellipseRing(B, cx, cz, rx, rz, sa, sb, ya, yb, n, colFn, up = 1) {
  for (let k = 0; k < n; k++) {
    const a0 = k / n * TAU, a1 = (k + 1) / n * TAU;
    const P0 = (s, y, a) => [cx + Math.cos(a) * rx * s, y, cz + Math.sin(a) * rz * s];
    const c = colFn(k, (a0 + a1) / 2);
    B.quadF(P0(sa, ya, a0), P0(sa, ya, a1), P0(sb, yb, a1), P0(sb, yb, a0), c, c, [0, up, 0]);
  }
}
/** Striped circus tent: drum wall plus cone roof. */
function tent(W, x, z, r, wallH, roofH, y0, c1, c2, n = 16) {
  const A = C(c1), Bc = C(c2);
  for (let k = 0; k < n; k++) {
    const a0 = k / n * TAU, a1 = (k + 1) / n * TAU, am = (a0 + a1) / 2, col = k % 2 ? A : Bc;
    const p = (a, rr, y) => [x + Math.cos(a) * rr, y, z + Math.sin(a) * rr];
    W.solid.quadF(p(a0, r, y0), p(a1, r, y0), p(a1, r, y0 + wallH), p(a0, r, y0 + wallH), col, shade(col, .8), [Math.cos(am), 0, Math.sin(am)]);
    W.solid.tri(p(a1, r * 1.08, y0 + wallH - .1), p(a0, r * 1.08, y0 + wallH - .1), [x, y0 + wallH + roofH, z], col);
    W.solid.tri(p(a0, r * 1.08, y0 + wallH - .1), p(a1, r * 1.08, y0 + wallH - .1), p(am, r * 1.12, y0 + wallH - .45), shade(col, .9));
  }
  rod(W.solid, [x, y0 + wallH + roofH - .1, z], [x, y0 + wallH + roofH + 1.1, z], .05, C('#5a4a3a'));
  W.solid.tri([x, y0 + wallH + roofH + 1.1, z], [x + .9, y0 + wallH + roofH + .85, z], [x, y0 + wallH + roofH + .6, z], C(c2));
  W.solid.tri([x, y0 + wallH + roofH + 1.1, z], [x, y0 + wallH + roofH + .6, z], [x + .9, y0 + wallH + roofH + .85, z], C(c2));
}
function densify(poly, step) {
  const out = [];
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]); }
  return out;
}
/** Rocky plateau with layered cliff walls and a grassy top. Returns the top ring. */
function plateau(W, poly, yTop, inset = 1.4) {
  const pts = densify(poly, 1.8); let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[1]; } cx /= pts.length; cz /= pts.length;
  const layers = [[-1.6, 0], [yTop * .3, .35], [yTop * .62, .75], [yTop * .86, 1.05], [yTop, inset]];
  const cols = [C('#8c7862'), C('#a88f73'), C('#c0a888'), C('#cdb798'), C('#93bd62')];
  const rings = layers.map(([y, ins], li) => pts.map((p, i) => {
    const dx = p[0] - cx, dz = p[1] - cz, L = Math.hypot(dx, dz), jit = li && li < 4 ? (hash2(i * 1.3, li) - .5) * 1.1 : 0;
    const k = (L - ins - jit) / L; return [cx + dx * k, y + (li && li < 4 ? (hash2(i * 3.1, li * 7) - .5) * .7 : 0), cz + dz * k];
  }));
  for (let li = 0; li < rings.length - 1; li++) for (let i = 0; i < pts.length; i++) {
    const a = rings[li][i], b = rings[li][(i + 1) % pts.length], c = rings[li + 1][(i + 1) % pts.length], d = rings[li + 1][i];
    const dir = [(a[0] + b[0]) / 2 - cx, 0, (a[2] + b[2]) / 2 - cz];
    const top = li === rings.length - 2 ? C('#9a8a6a') : cols[li + 1];
    W.solid.quadF(a, b, c, d, top, cols[li], dir);
  }
  const top = rings[rings.length - 1];
  const shape = new THREE.Shape(top.map(p => new THREE.Vector2(p[0], -p[2])));
  const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, yTop, 0);
  W.solid.add(proto(g), M(0, 0, 0), C('#96c266'));
  return { ring: top, cx, cz };
}
/** Radial height-field mound (used for Glory Hill and the backdrop hills). */
function mound(W, cx, cz, R0, H, opts = {}) {
  const rings = opts.rings || [0, .15, .3, .45, .6, .7, .78, .85, .9, .95, 1, 1.06], NS = opts.seg || 64;
  const hgt = opts.height || ((x, z, r) => LAND_Y + H * Math.pow(1 - sstep(0, 1, r / R0), 1.4) + (fbm(x * .12, z * .12) - .5) * H * .35 * (1 - sstep(.8, 1, r / R0)));
  const col = opts.color || ((x, z, y, r) => C(PAL.grass).lerp(C('#5f9a4c'), clamp((y - LAND_Y) / H, 0, 1) * .8));
  const V = rings.map(rr => { const out = []; for (let j = 0; j <= NS; j++) { const a = j / NS * TAU, r = rr * R0 * (rr >= 1 ? 1 : 1 + (hash2(j, 9) - .5) * .06), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; let y = rr >= 1 ? LAND_Y - .05 - (rr - 1) * 4 : hgt(x, z, r); out.push([x, y, z]); } return out; });
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < NS; j++) {
    const a = V[i][j], b = V[i][j + 1], c = V[i + 1][j + 1], d = V[i + 1][j];
    const ca = col(a[0], a[2], a[1], rings[i] * R0), cd = col(d[0], d[2], d[1], rings[i + 1] * R0);
    W.solid.quadF(d, c, b, a, ca, cd, [0, 1, 0]);
  }
  return V;
}

/* ------------------------------------------------------------------ landmarks */
function buildLandmarks(W) {
  waterfront(W); homeGym(W); townSquare(W); marketRow(W); docks(W); downtownLandmarks(W);
  harborDome(W); gloryHill(W); oldFort(W); pirateCove(W); techPier(W); fairground(W); hotelNeon(W); backdrop(W); roads(W);
  places(W);
}

/* ---- waterfront: downtown promenade, beach boulevard, promenade and beach life */
function coastZ(x) { // beach polyline (south coast) z at x, and the seaward normal
  const B = COAST.filter((p, i) => i >= 13 && i <= 18);
  for (let i = 0; i < B.length - 1; i++) if (x >= B[i][0] && x <= B[i + 1][0]) { const f = (x - B[i][0]) / (B[i + 1][0] - B[i][0]), dx = B[i + 1][0] - B[i][0], dz = B[i + 1][1] - B[i][1], l = Math.hypot(dx, dz); return { z: lerp(B[i][1], B[i + 1][1], f), nx: -dz / l, nz: dx / l }; }
  return { z: 37, nx: 0, nz: 1 };
}
function beachY(o) { const prof = [[0, LAND_Y], [3.2, .33], [6.2, .16], [7.6, 0]]; for (let i = 0; i < prof.length - 1; i++) if (o <= prof[i + 1][0]) return lerp(prof[i][1], prof[i + 1][1], (o - prof[i][0]) / (prof[i + 1][0] - prof[i][0])); return 0; }
function waterfront(W) {
  // downtown quay promenade
  const prom = [qpt(.6, .35), qpt(QL - .6, .35), qpt(QL - .6, 3.9), qpt(.6, 3.9)];
  plate(W, prom); occupy(W, 'poly', prom);
  W.paint.push((c, X, Y, S, path) => { path(prom); c.fillStyle = '#e9dcc4'; c.fill(); });
  for (let u = 3; u < QL - 2; u += 5.2) { if (Math.abs(u - 27) < 3) continue; const [x, z] = qpt(u, 2.2); addInst(W, 'palms', { x, y: BLOCK_Y, z, s: rnd(.9, 1.1) }); }
  for (let u = 5.8; u < QL - 2; u += 10.4) { const [x, z] = qpt(u, .9); lamp(W, x, BLOCK_Y, z); }
  // beach boulevard: asphalt, palm median, promenade
  W.roads.push({ pts: [[26, 26], [130, 26]], w: 9.6, lanes: [-2.4, 2.4] });
  const med = []; for (let x = 24; x <= 118; x += 4) med.push([x, 25.15]); for (let x = 118; x >= 24; x -= 4) med.push([x, 26.85]);
  plate(W, med, LAND_Y, LAND_Y + .18); W.paint.push((c, X, Y, S, path) => { path(med); c.fillStyle = PAL.park; c.fill(); });
  for (let x = 26; x < 118; x += 4.6) addInst(W, 'palms', { x, y: LAND_Y + .18, z: 26, s: rnd(1.05, 1.25) });
  const promo = []; for (let x = 31; x <= 116; x += 3) promo.push([x, 31.1]); for (let x = 116; x >= 31; x -= 3) promo.push([x, coastZ(x).z - .35]);
  plate(W, promo); occupy(W, 'poly', promo);
  W.paint.push((c, X, Y, S, path) => {
    path(promo); c.fillStyle = '#efe2c8'; c.fill();
    c.save(); path(promo); c.clip(); c.strokeStyle = 'rgba(214,120,96,.55)'; c.lineWidth = .5 * S;
    for (let x = 31; x < 117; x += 1.6) { c.beginPath(); c.moveTo(X(x), Y(31)); c.lineTo(X(x + 2.5), Y(38)); c.stroke(); }
    c.restore();
  });
  for (let x = 33; x < 115; x += 6.2) addInst(W, 'palms', { x, y: BLOCK_Y, z: lerp(31.1, coastZ(x).z, .62), s: rnd(.95, 1.2) });
  for (let x = 36; x < 115; x += 8.4) lamp(W, x, BLOCK_Y, 31.7, Math.PI);
  // beach life
  const ucol = ['#e8473b', '#f2c14e', '#2fa59a', '#ffffff', '#3c7fc0', '#f07f3c', '#d63d6d'];
  for (let x = 33; x < 114; x += rnd(1.6, 3.2)) {
    if (Math.abs(x - 99) < 3.5) continue;
    const cz = coastZ(x), o = rnd(1.8, 5.2), y = beachY(o), px = x + cz.nx * o, pz = cz.z + cz.nz * o;
    addInst(W, 'umbrellas', { x: px, y, z: pz, s: rnd(.85, 1.1), color: pick(ucol) });
    if (chance(.8)) W.solid.add(P.box, M(px + rnd(-.6, .6), y + .01, pz + .7, .5, .03, .95, rnd(-.3, .3)), C(pick(['#ffffff', '#f2c14e', '#3c7fc0', '#e8473b', '#7fd0c8'])));
    if (chance(.5)) addInst(W, 'people', { x: px + rnd(-1, 1), y, z: pz + rnd(-.5, 1.2), s: 1, color: pick(PAL.car) });
  }
  for (const x of [46, 71, 92]) lifeguard(W, x);
  // volleyball
  { const cz = coastZ(60).z, y = beachY(4); for (const dx of [-1.6, 1.6]) rod(W.solid, [60 + dx, y, cz + 4], [60 + dx, y + 1.2, cz + 4], .04, C('#ffffff')); beam(W.solid, [58.4, y + 1.05, cz + 4], [61.6, y + 1.05, cz + 4], .22, C('#f4f4f4'), .02); }
  // marina boats along the docks' east quay and offshore
  for (let z = 41.5; z < 52; z += 1.6) addInst(W, 'boats', { x: 24.6 + rnd(-.1, .2), y: 0, z, s: rnd(.8, 1), ry: Math.PI / 2 + rnd(-.05, .05), color: pick(['#ffffff', '#f2efe6', '#e4eef5', '#ffffff']) });
  for (let z = 42; z < 51; z += 2.1) addInst(W, 'sailboats', { x: 27.5, y: 0, z, s: rnd(.85, 1), ry: Math.PI / 2 + rnd(-.1, .1), color: pick(['#ffffff', '#f1ece2']) });
  beam(W.solid, [26.1, .45, 41], [26.1, .45, 52.5], .5, C('#a7835c'), .12);
  for (const [x, z, ry, s] of [[46, 52, .4, 1], [64, 58, -.3, 1.1], [-40, 40, .9, 1], [-56, 56, 2.3, .9], [10, 66, 1.4, 1.1], [80, 52, 2.8, 1], [-30, 58, 1.9, 1]]) addInst(W, 'sailboats', { x, y: 0, z, s, ry, color: '#ffffff' });
  for (const [x, z, ry, s] of [[-58, 70, 2.6, 1], [-46, 76, 2.4, .9], [-66, 78, 2.7, 1], [-30, 82, 2.5, 1], [40, 70, .5, 1], [-120, 30, 1.2, 1], [-112, 64, .4, 1]]) addInst(W, 'sailboats', { x, y: 0, z, s, ry, color: '#ffffff' });
  { const fx = -44, fz = 30, fry = -2.3; addInst(W, 'ferries', { x: fx, y: 0, z: fz, s: 1, ry: fry }); wake(W, fx, fz, fry, 1.8); }
  for (let k = 0; k < 7; k++) { const z = 58 + k * 4; for (const x of [-26, -8]) { W.solid.add(P.cone6, M(x + k * .6, -.1, z, .28, .7, .28), C(x < -10 ? '#e8473b' : '#3fa66b')); glow(W, x + k * .6, .7, z, x < -10 ? '#ff3b30' : '#3bff6a', .8, .9); } }
  for (const [x, z, ry] of [[36, 48, .2], [-48, 32, -2.2], [58, 46, 2.8], [-8, 64, .9], [-66, 40, 1.2], [-90, 78, .3], [20, 80, 1.8]]) { addInst(W, 'boats', { x, y: 0, z, s: 1.1, ry, color: pick(['#ffffff', '#f2c14e', '#e8473b']) }); wake(W, x, z, ry); }
}
function wake(W, x, z, ry, sc = 1) {
  const fr = frame(x, z, ry), c = C(W.NIGHT ? '#3d5a7a' : '#ffffff'), cf = C(W.NIGHT ? '#173455' : '#2a9fc4');
  const p = (lx, lz) => { const q = fr.p(lx * sc, lz * sc); return [q[0], .03, q[1]]; };
  for (const s of [-1, 1]) W.solid.quadF(p(s * .2, -.75), p(s * .5, -.75), p(s * 1.7, -4.2), p(s * 1.62, -4.2), cf, c, [0, 1, 0]);
  W.solid.quadF(p(-.3, -.85), p(.3, -.85), p(.05, -3), p(-.05, -3), cf, c, [0, 1, 0]);
}
function lamp(W, x, y, z, ry = 0) {
  addInst(W, 'lamps', { x, y, z, s: 1, ry });
  const fr = frame(x, z, ry), [hx, hz] = fr.p(0, .42);
  glow(W, hx, y + 1.62, hz, '#ffd38a', 1.6, .9); pool(W, hx, hz, 2.2, '#ffcf8a', .55, y + .01);
}
function lifeguard(W, x) {
  const cz = coastZ(x), o = 4.2, y = beachY(o), px = x + cz.nx * o, pz = cz.z + cz.nz * o, fr = frame(px, pz, 0);
  for (const [a, b] of [[-.45, -.45], [.45, -.45], [-.45, .45], [.45, .45]]) beam(W.solid, [px + a, y, pz + b], [px + a * .8, y + 1.3, pz + b * .8], .08, C('#f4f1e8'));
  W.solid.add(P.box, M(px, y + 1.3, pz, 1.2, .75, 1.1), C('#e8473b'));
  W.solid.add(P.box, M(px, y + 2.05, pz, 1.45, .1, 1.35), C('#fdfaf2'));
  W.solid.add(P.box, M(px, y + 1.45, pz + .56, .8, .35, .02), C('#33445a'));
  beam(W.solid, [px + .2, y + .6, pz + .9], [px + .2, y + 1.3, pz + .45], .12, C('#e9e2d0'));
  rod(W.solid, [px + .7, y + 1.3, pz - .5], [px + .7, y + 2.8, pz - .5], .03, C('#ffffff'));
  W.solid.quadF([px + .7, y + 2.8, pz - .5], [px + 1.4, y + 2.6, pz - .5], [px + 1.4, y + 2.4, pz - .5], [px + .7, y + 2.3, pz - .5], C('#f2c14e'), C('#f2c14e'), [0, 0, 1]);
  void fr;
}

/* ---- Old Town: Home Gym and the town square */
function homeGym(W) {
  const b = W.oldtown.find(k => k.kind === 'homegym'); if (!b) return;
  const fr = frame(b.x, b.z, b.ang), gw = 6.6, gd = 5.2, lx = -b.w / 2 + .5 + gw / 2, lz = b.d / 2 - .5 - gd / 2;
  // the rest of the block keeps its row houses
  rowHouses(W, b, fr, PAL.oldTown, 2, 3, (x, z) => x < lx + gw / 2 + .2 && z > lz - gd / 2 - .2);
  const [x, z] = fr.p(lx, lz), g = frame(x, z, fr.ry);
  const brick = C('#b4503d');
  const top = building(W, { x, z, ry: fr.ry, w: gw, d: gd, floors: 2, style: 'brick', tint: brick, shop: true, shopTint: C('#8f3a2f'), roofColor: C('#a9a397'), parapetColor: C('#8f3a2f'), rooftop: false });
  W.homeGym = { x, z, top };
  // rooftop billboard: GYM
  const p = (a, b2) => g.p(a, b2);
  for (const sx of [-1.6, 1.6]) { const [px, pz] = p(sx, gd / 2 - .6); beam(W.solid, [px, top, pz], [px, top + 1.2, pz], .14, C('#3a3f48')); }
  { const [sx, sz] = p(0, gd / 2 - .45); sign(W, { text: 'GYM', x: sx, y: top + 2.95, z: sz, ry: fr.ry, h: 1.9, style: 'board', bg: '#e11d2e', fg: '#ffffff', glow: '#ff3344', board: .18, boardColor: '#f2efe8' }); }
  // fascia sign over the shop windows
  { const [sx, sz] = p(-.6, gd / 2 + .05); sign(W, { text: 'HOME GYM', x: sx, y: BLOCK_Y + 1.3, z: sz, ry: fr.ry, h: .5, style: 'letters', fg: '#f4c152', glow: '#ffcf5a' }); }
  { const [cx2, cz2] = p(1.6, gd / 2 + .55); W.solid.add(P.box, M(cx2, BLOCK_Y + 1.02, cz2, 1.9, .1, 1.1, fr.ry, -.12), C('#e11d2e')); for (const s2 of [-.85, .85]) { const [qx, qz] = p(1.6 + s2, gd / 2 + 1.05); beam(W.solid, [qx, BLOCK_Y, qz], [qx, BLOCK_Y + .96, qz], .05, C('#2a2d33')); } glow(W, cx2, BLOCK_Y + .9, cz2, '#ffd9a0', 1.8, .7); }
  for (let k = 0; k < 6; k++) { const [qx, qz] = p(rnd(-2.5, 3), gd / 2 + rnd(1.3, 2.3)); addInst(W, 'people', { x: qx, y: BLOCK_Y, z: qz, s: 1, color: pick(['#e11d2e', '#1f2633', '#f4c152', '#ffffff', '#2b62d9']) }); }
  // giant boxing glove hanging from a bracket at the front-right corner
  const [bx0, bz0] = p(gw / 2, gd / 2 - .25), [bx1, bz1] = p(gw / 2 + 1.45, gd / 2 - .25);
  const yb = BLOCK_Y + FACADE.shop.floor + FACADE.brick.floor * 1.75;
  beam(W.solid, [bx0, yb, bz0], [bx1, yb, bz1], .12, C('#2e3238'));
  beam(W.solid, [bx0, yb - .9, bz0], [bx1 - .5, yb, bz1 - (bz1 - bz0) * .35], .08, C('#2e3238'));
  rod(W.solid, [bx1, yb, bz1], [bx1, yb - .35, bz1], .03, C('#9aa0a8'));
  glove(W, bx1, yb - .35, bz1, fr.ry + .5, 1.3);
  W.homeGym.glove = [bx1, yb - 1.4, bz1];
  glow(W, bx1, yb - 1.2, bz1, '#ff4050', 3.2, .55); pool(W, bx1, bz1, 2.6, '#ff6070', .45);
  // workout yard on the open side: heavy bag frame, tyres, bench
  const [yx, yz] = p(gw / 2 + 1.5, -.4);
  const yf = frame(yx, yz, fr.ry);
  for (const sx of [-.7, .7]) { const [ax, az] = yf.p(sx, 0); beam(W.solid, [ax, BLOCK_Y, az], [ax, BLOCK_Y + 1.8, az], .1, C('#30353d')); }
  { const [ax, az] = yf.p(-.8, 0), [cx2, cz2] = yf.p(.8, 0); beam(W.solid, [ax, BLOCK_Y + 1.8, az], [cx2, BLOCK_Y + 1.8, cz2], .1, C('#30353d')); }
  { const [ax, az] = yf.p(0, 0); W.solid.add(P.cyl8, M(ax, BLOCK_Y + .45, az, .22, 1.05, .22), C('#c42532')); W.solid.add(P.cyl8, M(ax, BLOCK_Y + 1.5, az, .16, .12, .16), C('#22262c')); }
  for (const [tx, tz] of [[-.4, 1.3], [.5, 1.5], [.1, 1.1]]) { const [ax, az] = yf.p(tx, tz); W.solid.add(P.cyl8, M(ax, BLOCK_Y, az, .32, .14, .32), C('#2a2d33')); }
  occupy(W, 'disc', [x, z, 6]);
}
function glove(W, x, y, z, ry, s) {
  const red = C('#d8232f'), redD = C('#a91822'), white = C('#f6f2ea'), f = frame(x, z, ry);
  const at = (lx, ly, lz) => { const q = f.p(lx * s, lz * s); return [q[0], y + ly * s, q[1]]; };
  W.solid.add(P.cyl12, M(...at(0, -.55, 0), .34 * s, .55 * s, .34 * s, ry), white);
  W.solid.add(P.box, M(...at(0, -.45, .3), .08 * s, .4 * s, .06 * s, ry), C('#e9e1d2'));
  W.solid.add(P.sph, M(...at(0, -1.05, .02), .5 * s, .62 * s, .44 * s, ry), red);
  W.solid.add(P.sph, M(...at(.04, -1.32, .12), .44 * s, .36 * s, .4 * s, ry), red);
  W.solid.add(P.sph, M(...at(-.38, -.98, .2), .16 * s, .3 * s, .16 * s, ry, 0, .35), redD);
  W.solid.add(P.box, M(...at(0, -.66, 0), .7 * s, .06 * s, .66 * s, ry), C('#f4c152'));
}
function townSquare(W) {
  const b = W.oldtown.find(k => k.kind === 'square'); if (!b) return;
  const fr = frame(b.x, b.z, b.ang), y = BLOCK_Y;
  W.paint.push((c, X, Y, S, path) => {
    path(b.pts); c.fillStyle = '#eadfca'; c.fill(); c.save(); path(b.pts); c.clip();
    c.strokeStyle = 'rgba(176,150,120,.35)'; c.lineWidth = .08 * S;
    for (let k = -8; k <= 8; k++) { c.beginPath(); const a = fr.p(k, -6), bb = fr.p(k, 6); c.moveTo(X(a[0]), Y(a[1])); c.lineTo(X(bb[0]), Y(bb[1])); c.stroke(); }
    c.fillStyle = PAL.park; for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const q = fr.p(sx * (b.w / 2 - 1.6), sz * (b.d / 2 - 1.6)); c.beginPath(); c.arc(X(q[0]), Y(q[1]), 1.1 * S, 0, TAU); c.fill(); }
    c.restore();
  });
  // fountain
  W.solid.add(P.cyl20, M(b.x, y, b.z, 1.7, .32, 1.7), C('#e4d9c4'));
  W.solid.add(P.cyl20, M(b.x, y + .32, b.z, 1.45, .02, 1.45), C('#6fd0e0'));
  W.solid.add(P.cyl12, M(b.x, y, b.z, .35, .9, .35), C('#e4d9c4'));
  W.solid.add(P.cyl12, M(b.x, y + .9, b.z, .7, .12, .7), C('#e4d9c4'));
  W.solid.add(P.cone8, M(b.x, y + 1.02, b.z, .3, .6, .3), C('#cdeff5'));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [tx, tz] = fr.p(sx * (b.w / 2 - 1.6), sz * (b.d / 2 - 1.6)); addInst(W, 'trees', { x: tx, y, z: tz, s: rnd(.8, .95) }); }
  // clock tower on the back corner
  const [cx, cz] = fr.p(-b.w / 2 + 1.4, -b.d / 2 + 1.4), ct = frame(cx, cz, fr.ry);
  W.solid.add(P.box, M(cx, y, cz, 1.7, 7.2, 1.7, fr.ry), C('#efe2c6'), { ao: .25 });
  W.solid.add(P.box, M(cx, y + 5.3, cz, 1.9, .2, 1.9, fr.ry), C('#d9c9a8'));
  W.solid.add(P.box, M(cx, y + 7.2, cz, 1.95, .22, 1.95, fr.ry), C('#d9c9a8'));
  W.solid.add(P.cone4, M(cx, y + 7.42, cz, 1.45, 2.1, 1.45, fr.ry + Math.PI / 4), roofCol());
  for (const [lx, lz, a] of [[0, .86, 0], [.86, 0, Math.PI / 2]]) {
    const [qx, qz] = ct.p(lx, lz);
    W.solid.add(P.cyl20, M(qx, y + 6.2, qz, .52, .04, .52, fr.ry + a, Math.PI / 2), C('#fbf8f0'));
    const fx = Math.sin(fr.ry + a) * .03, fz = Math.cos(fr.ry + a) * .03;
    beam(W.solid, [qx + fx, y + 6.2, qz + fz], [qx + fx, y + 6.55, qz + fz], .05, C('#2a2a2a'));
    beam(W.solid, [qx + fx, y + 6.2, qz + fz], [qx + fx + Math.cos(fr.ry + a) * .25, y + 6.2, qz + fz - Math.sin(fr.ry + a) * .25], .05, C('#2a2a2a'));
    glow(W, qx + fx * 4, y + 6.2, qz + fz * 4, '#fff1c4', 1.6, .5);
  }
  for (let k = 0; k < 7; k++) { const [px, pz] = fr.p(rnd(-b.w / 2 + 1, b.w / 2 - 1), rnd(-b.d / 2 + 1, b.d / 2 - 1)); if (Math.hypot(px - b.x, pz - b.z) > 2.1) addInst(W, 'people', { x: px, y, z: pz, s: 1, color: pick(PAL.car) }); }
  pool(W, b.x, b.z, 3, '#ffd9a0', .4);
}

/* ---- Market Row: stalls, string lights, the market hall */
function marketRow(W) {
  const mf = W.marketFrame, at = (u, w) => [mf.o[0] + mf.U[0] * u + mf.Wv[0] * w, mf.o[1] + mf.U[1] * u + mf.Wv[1] * w], ry = -Math.atan2(mf.U[1], mf.U[0]);
  plate(W, W.marketStreet); occupy(W, 'poly', W.marketStreet);
  W.paint.push((c, X, Y, S, path) => {
    path(W.marketStreet); c.fillStyle = '#ead9bb'; c.fill(); c.save(); path(W.marketStreet); c.clip();
    c.strokeStyle = 'rgba(180,140,100,.3)'; c.lineWidth = .07 * S;
    for (let u = -2; u < 52; u += .9) { const a = at(u, -4), b = at(u, 4); c.beginPath(); c.moveTo(X(a[0]), Y(a[1])); c.lineTo(X(b[0]), Y(b[1])); c.stroke(); }
    c.restore();
  });
  const fruit = ['#e2574c', '#f2c14e', '#7bc06b', '#f08a3c', '#9b5fc0', '#ffffff', '#e8a0b4'];
  for (const w of [-1.55, 1.55]) for (let u = .5; u < 49.5; u += 2.45) {
    if (chance(.12)) continue;
    const [x, z] = at(u, w), f = frame(x, z, ry + (w > 0 ? Math.PI : 0)), [ac, bc] = pick(PAL.awning).map(C);
    const p = (lx, ly, lz) => { const q = f.p(lx, lz); return [q[0], BLOCK_Y + ly, q[1]]; };
    W.solid.add(P.box, M(...p(0, 0, 0), 1.7, .62, .8, f.ry), C('#9c7350'));
    W.solid.add(P.box, M(...p(0, .62, 0), 1.76, .05, .86, f.ry), C('#c79c6c'));
    for (let k = 0; k < 4; k++) W.solid.add(P.ico, M(...p(-.6 + k * .4, .7, rnd(-.15, .15)), .17, .12, .17, rnd(0, 3)), C(pick(fruit)));
    for (const [sx, sz] of [[-.82, -.4], [.82, -.4], [-.82, .55], [.82, .55]]) beam(W.solid, p(sx, 0, sz), p(sx, sz > 0 ? 1.45 : 1.65, sz), .05, C('#6b5a48'));
    const n = 6;
    for (let k = 0; k < n; k++) { const a = -.9 + k * 1.8 / n, bb = a + 1.8 / n; W.solid.quadF(p(a, 1.68, -.5), p(bb, 1.68, -.5), p(bb, 1.4, .72), p(a, 1.4, .72), k % 2 ? bc : ac, k % 2 ? bc : ac, sub3(p(0, 2, .6), p(0, 1, -.2))); }
    if (chance(.8)) addInst(W, 'people', { x: x + rnd(-1, 1), y: BLOCK_Y, z: z + rnd(-.6, .6) * (w > 0 ? -1 : 1) + (w > 0 ? -1.3 : 1.3) * Math.cos(ry), s: 1, color: pick(PAL.car) });
  }
  for (let k = 0; k < 150; k++) { const [x, z] = at(rnd(-.5, 49.5), chance(.6) ? rnd(-.7, .7) : pick([-1, 1]) * rnd(2.5, 3.2)); addInst(W, 'people', { x, y: BLOCK_Y, z, s: rnd(.95, 1.05), color: pick(PAL.car) }); }
  for (let u = 3.7; u < 48; u += rnd(4, 7)) { const [x, z] = at(u, 0); addInst(W, 'umbrellas', { x, y: BLOCK_Y, z, s: rnd(1.1, 1.3), color: pick(['#e8473b', '#f2c14e', '#2fa59a', '#ffffff', '#f07f3c']) }); }
  for (let u = 1; u < 49; u += 2.2) for (const w of [-3.15, 3.15]) if (chance(.45)) { const [x, z] = at(u, w); W.solid.add(P.box, M(x, BLOCK_Y, z, .45, .3, .35, rnd(0, 1)), C(pick(['#b98a5a', '#9c7350', '#c9a06a']))); W.solid.add(P.ico, M(x, BLOCK_Y + .33, z, .16, .1, .14), C(pick(['#e2574c', '#f2c14e', '#7bc06b', '#f08a3c']))); }
  // string lights zig-zag over the street
  for (let u = 1.5; u < 49; u += 4.2) {
    const a = at(u, -3.7), b = at(u + 2.1, 3.7), ya = BLOCK_Y + 2.9, n = 9;
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const f = k / n, pt = [lerp(a[0], b[0], f), ya - Math.sin(Math.PI * f) * .55, lerp(a[1], b[1], f)];
      if (prev) beam(W.solid, prev, pt, .018, C(W.NIGHT ? '#3b3b3b' : '#e9e4da'));
      if (k > 0 && k < n) {
        if (W.NIGHT) { W.solid.add(P.ico, M(pt[0], pt[1] - .08, pt[2], .07, .07, .07), C('#fff3c4')); glow(W, pt[0], pt[1] - .08, pt[2], k % 3 ? '#ffd27a' : '#ff8fb0', 1.1, .8); }
        else { // bunting: a small double-sided pennant
          const fc = C(pick(['#e8473b', '#f2c14e', '#2fa59a', '#3c7fc0', '#f07f3c', '#ffffff'])), dx = (b[0] - a[0]) / 7.9 * .16, dz = (b[1] - a[1]) / 7.9 * .16;
          const l = [pt[0] - dx, pt[1], pt[2] - dz], r = [pt[0] + dx, pt[1], pt[2] + dz], tip = [pt[0], pt[1] - .32, pt[2]];
          W.solid.tri(l, r, tip, fc); W.solid.tri(r, l, tip, fc);
        }
      }
      prev = pt;
    }
  }
  for (let u = 3; u < 49; u += 6) { const [x, z] = at(u, 0); pool(W, x, z, 3, '#ffcc88', .4); }
  // market hall on the north-east block
  const b = W.market.find(k => k.kind === 'markethall');
  if (b) {
    const fr = frame(b.x, b.z, b.ang), w = b.w - 1.1, d = b.d - 1.5;
    const top = building(W, { x: b.x, z: b.z, ry: fr.ry, w, d, floors: 1, style: 'brick', tint: C('#e3c79a'), shop: true, shopTint: C('#d9b886'), roof: 'none', awning: ['#2fa59a', '#ffffff'], awningSides: [0] });
    vault(W.solid, fr, 0, 0, w + .3, d / 2 + .2, .7, top, C('#6fa596'), C('#5f9486'), C('#e3c79a'), 14);
    vault(W.solid, fr, 0, 0, w * .7, d / 6, .9, top + (d / 2) * .7 - .1, C('#9fd0c4'), C('#8cc2b4'), C('#e3c79a'), 8);
    const [sx, sz] = fr.p(0, d / 2 + .06);
    sign(W, { text: 'MARKET', x: sx, y: top - .08, z: sz, ry: fr.ry, h: .62, style: 'board', bg: '#2fa59a', fg: '#ffffff', glow: '#6ff5e6' });
    W.marketHall = { x: b.x, z: b.z, top: top + d / 2 * .7 };
  }
}

/* ---- The Docks */
function docks(W) {
  const area = [[-21, 53], [23, 53], [23, 23.2], [-7, 23.2], [-21, 37.5]];
  occupy(W, 'poly', area);
  W.paint.push((c, X, Y, S, path, line) => {
    path(area); c.fillStyle = '#cdc6b8'; c.fill(); c.save(); path(area); c.clip();
    c.strokeStyle = 'rgba(120,112,100,.25)'; c.lineWidth = .06 * S;
    for (let x = -22; x < 24; x += 3) { c.beginPath(); c.moveTo(X(x), Y(22)); c.lineTo(X(x), Y(54)); c.stroke(); }
    for (let z = 23; z < 54; z += 3) { c.beginPath(); c.moveTo(X(-22), Y(z)); c.lineTo(X(24), Y(z)); c.stroke(); }
    line([[-21, 48.6], [23, 48.6]], .12, '#6a6258'); line([[-21, 52.2], [23, 52.2]], .12, '#6a6258');
    for (const z of [39.4, 47.6]) line([[-4.5, z], [21, z]], .16, '#f2c14e');
    c.fillStyle = 'rgba(242,193,78,.85)'; for (let x = -4; x < 21; x += 1.9) { c.fillRect(X(x), Y(39.6), .12 * S, 7.8 * S); }
    line([[-6, 36.5], [21, 36.5]], .16, '#f2c14e', [1, .8]);
    c.restore();
  });
  // containers
  const ccol = ['#c8452f', '#2f6fa3', '#e2a33a', '#3d8c6c', '#8c3b2f', '#e1ddd3', '#4a5a78', '#b85c2a', '#2b7f8f', '#d9603b'];
  for (let x = -3.6; x < 20.6; x += .8) {
    if (Math.abs(x - 6.4) < .5 || Math.abs(x - 14.4) < .5) continue;
    for (const z0 of [41, 44.1]) for (const dz of [0, 1.55]) {
      const h = rint(0, 3); for (let k = 0; k < h; k++) addInst(W, 'containers', { x, y: LAND_Y + k * .66, z: z0 + dz, s: 1, ry: Math.PI / 2, color: pick(ccol) });
    }
  }
  // ship-to-shore cranes
  for (const cx of [-1, 11]) crane(W, cx);
  // cargo ship moored at the south quay
  cargoShip(W, 5, 56.4);
  addInst(W, 'tugs', { x: 24, y: 0, z: 59, s: 1, ry: -2.6 }); addInst(W, 'tugs', { x: -16, y: 0, z: 57, s: 1, ry: .4 });
  // bollards and quay lamps
  for (let x = -19; x < 22; x += 2.6) W.solid.add(P.cyl8, M(x, LAND_Y, 52.6, .14, .32, .14), C('#2f3339'));
  for (let x = -18; x < 22; x += 10) { lamp(W, x, LAND_Y, 52.2, Math.PI); pool(W, x, 56.5, .5, '#ffb455', .32, .02, 5); }
  for (const [mx, mz] of [[-2.4, 42.6], [7.2, 42.6], [17.2, 42.6], [4, 33.6]]) {
    rod(W.solid, [mx, LAND_Y, mz], [mx, LAND_Y + 7.2, mz], .09, C('#7d848e'));
    W.solid.add(P.box, M(mx, LAND_Y + 7.2, mz, 1.3, .16, .5), C('#5b626c'));
    for (const dx of [-.45, 0, .45]) glow(W, mx + dx, LAND_Y + 7.05, mz, '#ffb45a', 1.5, .95);
    pool(W, mx, mz, 7, '#ff8a1e', .3, LAND_Y + .01);
  }
  for (const cx of [-1, 11]) { pool(W, cx, 50.4, 3, '#cfe0ff', .28, LAND_Y + .01); pool(W, cx, 56.5, 3.2, '#cfe0ff', .2, 1.75); }
  pool(W, -13.6, 57.5, 2.2, '#ffa040', .3, .02, 3);
  // Dockside Hangar (barrel vault, doors open to the south)
  const hx = -13.6, hz = 45.4, hl = 11.2, hw = 9.6, hfr = frame(hx, hz, Math.PI / 2);
  for (const sx of [-1, 1]) W.solid.add(P.box, M(hx + sx * (hw / 2 - .1), LAND_Y, hz, .2, 1.4, hl), C('#7b8b96'), { ao: .3 });
  vault(W.solid, hfr, 0, 0, hl, hw / 2, .82, LAND_Y + 1.4, C('#9fb1bd'), C('#8b9eab'), C('#8296a4'), 14);
  for (let k = -2; k <= 2; k++) { const zz = hz + k * hl / 5; W.solid.add(P.box, M(hx, LAND_Y + 1.4 + hw / 2 * .82 - .05, zz, .5, .18, .25), C('#6f7f8b')); }
  // front gable: doors and sign
  const fz = hz + hl / 2 + .02;
  litQuad(W, [hx - 2.6, LAND_Y, fz], [hx + 2.6, LAND_Y, fz], [hx + 2.6, LAND_Y + 3.2, fz], [hx - 2.6, LAND_Y + 3.2, fz], [0, 0, 1], '#ffb35c', '#1c2028');
  for (const sx of [-1, 1]) W.solid.add(P.box, M(hx + sx * 3.6, LAND_Y, fz + .12, 2.2, 3.4, .14), C('#c8452f'));
  sign(W, { text: 'DOCKSIDE HANGAR', x: hx, y: LAND_Y + 4.75, z: fz + .05, ry: 0, h: .75, style: 'board', bg: '#1d2430', fg: '#f4c152', glow: '#ff4fa0', board: .1 });
  pool(W, hx, fz + 2.8, 5.2, '#ffb066', .75, LAND_Y + .01, 1.2); glow(W, hx, LAND_Y + 1.8, fz + .3, '#ffb35c', 7, .5);
  for (let k = 0; k < 14; k++) addInst(W, 'people', { x: hx + rnd(-3, 3), y: LAND_Y, z: fz + rnd(.6, 3.2), s: 1, color: pick(PAL.car) });
  W.hangar = { x: hx, z: hz, top: LAND_Y + 1.4 + hw / 2 * .82 };
  // warehouses
  const wh = [[-.5, 29.2, 11.5, 7.6, '#3f7f8d', '#b4523a'], [11.2, 29.4, 7.4, 8, '#c9a15c', '#8a929b']];
  for (const [x, z, w, d, wall, roof] of wh) {
    building(W, { x, z, ry: 0, w, d, floors: 2, style: 'industrial', tint: C(wall), roof: 'gable', roofColor: C(roof), roofH: 1.6, y0: LAND_Y });
    for (let k = -1; k <= 1; k++) W.solid.add(P.box, M(x + k * w / 3.2, LAND_Y, z + d / 2 + .02, 1.6, 2, .1), C('#5d6670'));
  }
  // The Basement: brick shed with a lit stairwell down
  const bx = 19.6, bz = 28.4;
  building(W, { x: bx, z: bz, ry: 0, w: 4.6, d: 5.2, floors: 2, style: 'brick', tint: C('#7e3a31'), roofColor: C('#5c5751'), y0: LAND_Y, parapetColor: C('#5c2c26') });
  const sz0 = bz + 2.65;
  W.solid.add(P.box, M(bx, LAND_Y - .02, sz0 + 1.2, 2.4, .05, 2.4), C('#15171b'));
  for (let k = 0; k < 5; k++) W.solid.add(P.box, M(bx, LAND_Y - .02 - k * .02, sz0 + .3 + k * .42, 2.0, .06, .3), C(k % 2 ? '#3a3d44' : '#4a4e56'));
  for (const sx of [-1.2, 1.2]) { beam(W.solid, [bx + sx, LAND_Y + .5, sz0], [bx + sx, LAND_Y + .5, sz0 + 2.4], .05, C('#2a2d33')); for (let k = 0; k < 4; k++) beam(W.solid, [bx + sx, LAND_Y, sz0 + k * .8], [bx + sx, LAND_Y + .5, sz0 + k * .8], .04, C('#2a2d33')); }
  W.solid.add(P.box, M(bx, LAND_Y, sz0 + 2.42, 2.4, .08, .08), C('#2a2d33'));
  litQuad(W, [bx - .55, LAND_Y, sz0 + .01], [bx + .55, LAND_Y, sz0 + .01], [bx + .55, LAND_Y + 1.4, sz0 + .01], [bx - .55, LAND_Y + 1.4, sz0 + .01], [0, 0, 1], '#ff2d40', '#8e1d27');
  sign(W, { text: 'THE BASEMENT', x: bx, y: LAND_Y + 3.3, z: sz0 + .04, ry: 0, h: .7, style: 'letters', fg: '#ff3b4e', glow: '#ff2d55', outline: 'rgba(40,10,14,.95)' });
  neon(W, [[bx - 1.9, LAND_Y + 1.75, sz0 + .1], [bx + 1.9, LAND_Y + 1.75, sz0 + .1]], '#ff2d55', .07, .7);
  pool(W, bx, sz0 + 1.4, 3.2, '#ff3050', .8, LAND_Y + .01); glow(W, bx, LAND_Y + .9, sz0 + .5, '#ff2d40', 3.5, .6);
  for (let k = 0; k < 7; k++) addInst(W, 'people', { x: bx + 1.8 + k * .5, y: LAND_Y, z: sz0 + 3 + rnd(-.2, .2), s: 1, color: pick(PAL.car) });
  W.basement = { x: bx, z: bz, top: LAND_Y + 2 * FLOOR + .3 };
}
function crane(W, cx) {
  const y0 = LAND_Y, red = C('#e8573a'), white = C('#f3f1ea'), dark = C('#3a3f48'), H = 8.2, zA = 48.6, zB = 52.2;
  for (const sx of [-1.3, 1.3]) for (const z of [zA, zB]) beam(W.solid, [cx + sx, y0, z], [cx + sx * .9, y0 + H, z], .32, red);
  for (const z of [zA, zB]) beam(W.solid, [cx - 1.3, y0 + H * .45, z], [cx + 1.3, y0 + H * .45, z], .26, red);
  for (const sx of [-1.2, 1.2]) beam(W.solid, [cx + sx, y0 + H * .45, zA], [cx + sx, y0 + H * .45, zB], .22, red);
  W.solid.add(P.box, M(cx, y0 + H, (zA + zB) / 2, 2.6, .5, 4.2), white);
  W.solid.add(P.box, M(cx, y0 + H + .5, zA + .6, 1.8, 1.1, 1.8), white);
  W.solid.add(P.box, M(cx, y0 + H + .5, zA + 1.52, 1.4, .3, .04), C('#33445a'));
  beam(W.solid, [cx, y0 + H + .25, zA - 3.5], [cx, y0 + H + .25, zB + 12], .55, red, .4);
  beam(W.solid, [cx, y0 + H + 2.6, zB - .6], [cx, y0 + H + .4, zB + 11], .1, dark);
  beam(W.solid, [cx, y0 + H + 2.6, zB - .6], [cx, y0 + H + .4, zA - 3.2], .1, dark);
  beam(W.solid, [cx, y0 + H + .4, zB - .6], [cx, y0 + H + 2.7, zB - .6], .22, red);
  W.solid.add(P.box, M(cx, y0 + H - .1, zB + 6, .8, .4, 1), dark);
  beam(W.solid, [cx, y0 + H - .1, zB + 6], [cx, y0 + 3.2, zB + 6], .03, dark);
  glow(W, cx, y0 + H + 2.75, zB - .6, '#ff3b30', 1.2, 1);
}
function cargoShip(W, x, z) {
  const L = 25, Bm = 4.4, B = W.solid, hull = C('#2d4466'), red = C('#b8402f');
  const st = [[-L / 2, .92], [-L / 2 + 2, 1], [L / 2 - 4, 1], [L / 2 - 1.2, .55], [L / 2, .08]];
  const sec = (sx, k, y) => [x + sx, y, z + k * Bm / 2];
  for (let i = 0; i < st.length - 1; i++) {
    const [x0, w0] = st[i], [x1, w1] = st[i + 1];
    for (const side of [-1, 1]) {
      B.quadF(sec(x0, side * w0 * .8, -.8), sec(x1, side * w1 * .8, -.8), sec(x1, side * w1, .35), sec(x0, side * w0, .35), red, red, [0, 0, side]);
      B.quadF(sec(x0, side * w0, .35), sec(x1, side * w1, .35), sec(x1, side * w1, 1.7), sec(x0, side * w0, 1.7), hull, hull, [0, 0, side]);
      B.quadF(sec(x0, side * w0, 1.55), sec(x1, side * w1, 1.55), sec(x1, side * w1, 1.72), sec(x0, side * w0, 1.72), C('#f2efe6'), C('#f2efe6'), [0, 0, side]);
    }
    B.quadF(sec(x0, -w0, 1.7), sec(x1, -w1, 1.7), sec(x1, w1, 1.7), sec(x0, w0, 1.7), C('#7a3a30'), C('#7a3a30'), [0, 1, 0]);
  }
  B.quadF(sec(-L / 2, -.92, -.8), sec(-L / 2, .92, -.8), sec(-L / 2, .92, 1.7), sec(-L / 2, -.92, 1.7), hull, hull, [-1, 0, 0]);
  // superstructure aft
  const ax = x - L / 2 + 2.4;
  B.add(P.box, M(ax, 1.7, z, 2.8, 3.2, 3.6), C('#f4f2ec'), { ao: .15 });
  B.add(P.box, M(ax, 4.9, z, 3.2, .3, 4.4), C('#f4f2ec'));
  for (let f = 0; f < 3; f++) litQuad(W, [ax + 1.41, 2.2 + f, z - 1.6], [ax + 1.41, 2.2 + f, z + 1.6], [ax + 1.41, 2.6 + f, z + 1.6], [ax + 1.41, 2.6 + f, z - 1.6], [1, 0, 0], '#ffe1a8');
  B.add(P.cyl12, M(ax - .8, 4.9, z, .55, 1.6, .55), C('#e8473b'));
  B.add(P.cyl12, M(ax - .8, 6.1, z, .58, .25, .58), C('#1d2430'));
  // deck containers
  const ccol = ['#c8452f', '#2f6fa3', '#e2a33a', '#3d8c6c', '#e1ddd3', '#4a5a78', '#2b7f8f'];
  for (let cx = ax + 2.4; cx < x + L / 2 - 4.5; cx += 1.6) { const h0 = rint(1, 3); for (let k = -2; k <= 2; k++) { const h = Math.max(1, h0 - (Math.abs(k) === 2 ? 1 : 0)); for (let j = 0; j < h; j++) addInst(W, 'containers', { x: cx, y: 1.7 + j * .66, z: z + k * .68, s: 1, ry: 0, color: pick(ccol) }); } }
  glow(W, x + L / 2 - .5, 3, z, '#ff3b30', 1, 1); glow(W, ax, 6.8, z, '#ffffff', 1, 1);
}

/* ---- Downtown landmarks: Boxing Club, City Sports Hall and field, plaza */
function downtownLandmarks(W) {
  const fr0 = frame(0, 0, -Math.atan2(QU[1], QU[0])), ryD = fr0.ry, side = ryD + Math.PI / 2; // local +x faces the camera
  const bc = W.downtown.find(b => b.kind === 'boxingclub');
  if (bc) {
    const fr = frame(bc.x, bc.z, bc.ang), w = 7.4, d = 8, [x, z] = fr.p(bc.w / 2 - .6 - w / 2, 0);
    const top = building(W, { x, z, ry: fr.ry, w, d, floors: 4, style: 'brick', tint: C('#d6b99a'), shop: true, shopTint: C('#7d2730'), roofColor: C('#a9a397'), parapetColor: C('#7d2730') });
    const g = frame(x, z, fr.ry);
    // marquee canopy on the camera side (+x)
    const p = (lx, ly, lz) => { const q = g.p(lx, lz); return [q[0], ly, q[1]]; };
    W.solid.add(P.box, M(...p(w / 2 + .7, BLOCK_Y + 1.25, 0), 1.4, .32, 3.6, fr.ry), C('#b5202d'));
    W.solid.add(P.box, M(...p(w / 2 + 1.38, BLOCK_Y + 1.2, 0), .06, .42, 3.7, fr.ry), C('#f4c152'));
    for (let k = -4; k <= 4; k++) glow(W, ...p(w / 2 + 1.45, BLOCK_Y + 1.35, k * .42), '#ffe08a', .9, .9);
    for (const sz of [-1.6, 1.6]) beam(W.solid, p(w / 2 + 1.3, BLOCK_Y, sz), p(w / 2 + 1.3, BLOCK_Y + 1.25, sz), .07, C('#2a2d33'));
    { const q = p(w / 2 + .05, 0, 0); sign(W, { text: 'BOXING CLUB', x: q[0], y: top + 1.15, z: q[2], ry: side, h: .95, style: 'letters', fg: '#f4c152', glow: '#ff3344' }); }
    for (const sz of [-1.6, 1.6]) { const q = p(w / 2 + .02, 0, sz); beam(W.solid, [q[0], top, q[2]], [q[0], top + .25, q[2]], .08, C('#30353d')); }
    { const q = p(w / 2 - .5, 0, d / 2 + .05); sign(W, { text: 'BOXING', x: q[0], y: top - .2, z: q[2], ry: fr.ry, h: 3.4, style: 'blade', bg: '#c41f2e', fg: '#ffffff', glow: '#ff4455', board: .2 }); }
    // banners
    for (const sz of [-2.6, 2.6]) { const q = p(w / 2 + .03, 0, sz); W.solid.quadF([q[0], top - .4, q[2] - .35], [q[0], top - .4, q[2] + .35], [q[0], top - 2.4, q[2] + .35], [q[0], top - 2.4, q[2] - .35], C('#c41f2e'), C('#c41f2e'), [Math.sin(side), 0, Math.cos(side)]); }
    W.boxingClub = { x, z, top };
    // smaller neighbour on the rest of the block
    const [nx, nz] = fr.p(-bc.w / 2 + .6 + 1.6, 0);
    building(W, { x: nx, z: nz, ry: fr.ry, w: 3, d: 8, floors: 3, style: 'apartment', tint: C('#efe6d6'), shop: true, shopTint: C('#e9e2d6'), roofColor: C(PAL.roofFlat) });
    for (let k = 0; k < 10; k++) { const q = p(w / 2 + rnd(1.6, 2.6), BLOCK_Y, rnd(-2, 2)); addInst(W, 'people', { x: q[0], y: BLOCK_Y, z: q[2], s: 1, color: pick(PAL.car) }); }
  }
  const sh = W.downtown.find(b => b.kind === 'sportshall');
  if (sh) {
    const fr = frame(sh.x, sh.z, sh.ang), w = sh.w - 1.4, d = sh.d - 2;
    const top = building(W, { x: sh.x, z: sh.z, ry: fr.ry, w, d, floors: 2, style: 'office', tint: C('#f2f4f6'), roof: 'none' });
    vault(W.solid, fr, 0, 0, w + .4, d / 2 + .3, .45, top, C('#e7eaee'), C('#d9dee4'), C('#f2f4f6'), 14);
    vault(W.solid, fr, 0, 0, w + .45, .8, .3, top + (d / 2) * .45 - .06, C('#e11d2e'), C('#c81a29'), C('#e11d2e'), 6);
    const g = frame(sh.x, sh.z, fr.ry), q = g.p(w / 2 + .32, 0);
    sign(W, { text: 'CITY SPORTS HALL', x: q[0], y: top - .1, z: q[1], ry: side, h: .6, style: 'board', bg: '#1d4f91', fg: '#ffffff', glow: '#7cc4ff' });
    W.sportsHall = { x: sh.x, z: sh.z, top: top + d / 2 * .45 };
  }
  const fl = W.downtown.find(b => b.kind === 'field');
  if (fl) {
    const fr = frame(fl.x, fl.z, fl.ang);
    W.paint.push((c, X, Y, S) => {
      c.save(); c.translate(X(fl.x), Y(fl.z)); c.rotate(-fl.ang);
      const rr = (w, h, r, col) => { roundRectPath(c, -w / 2 * S, -h / 2 * S, w * S, h * S, r * S); c.fillStyle = col; c.fill(); };
      rr(fl.w - .6, fl.d - .6, 1, '#c95a43'); rr(fl.w - 2.4, fl.d - 2.4, 2.4, '#6fbf58');
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = .08 * S; for (const k of [.45, .9, 1.35]) { roundRectPath(c, (-(fl.w - .6) / 2 + k) * S, (-(fl.d - .6) / 2 + k) * S, (fl.w - .6 - 2 * k) * S, (fl.d - .6 - 2 * k) * S, (1 + k) * S); c.stroke(); }
      c.strokeRect(-(fl.w - 3.4) / 2 * S, -(fl.d - 3.4) / 2 * S, (fl.w - 3.4) * S, (fl.d - 3.4) * S); c.beginPath(); c.moveTo(0, -(fl.d - 3.4) / 2 * S); c.lineTo(0, (fl.d - 3.4) / 2 * S); c.stroke();
      c.beginPath(); c.arc(0, 0, .9 * S, 0, TAU); c.stroke();
      for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#6fbf58' : '#64b04f'; c.fillRect((-(fl.w - 3.4) / 2 + k * (fl.w - 3.4) / 8) * S, -(fl.d - 3.4) / 2 * S + 1, (fl.w - 3.4) / 8 * S, (fl.d - 3.4) * S - 2); }
      c.restore();
    });
    for (let k = 0; k < 3; k++) { const q = fr.p(-fl.w / 2 + .2, 0); W.solid.add(P.box, M(q[0], BLOCK_Y + k * .25, q[1], 1.4 - k * .4, .25, fl.d - 3, fr.ry, 0, 0), C(k % 2 ? '#e11d2e' : '#f4f4f4')); }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const q = fr.p(sx * (fl.w / 2 - .5), sz * (fl.d / 2 - .5)); rod(W.solid, [q[0], BLOCK_Y, q[1]], [q[0], BLOCK_Y + 4.5, q[1]], .06, C('#9aa3ad')); W.solid.add(P.box, M(q[0], BLOCK_Y + 4.5, q[1], .7, .4, .2, fr.ry), C('#e9edf1')); glow(W, q[0], BLOCK_Y + 4.7, q[1], '#eaf4ff', 2.2, .8); }
    pool(W, fl.x, fl.z, 5.5, '#dfeeff', .45);
  }
  const pz = W.downtown.find(b => b.kind === 'plaza');
  if (pz) {
    const fr = frame(pz.x, pz.z, pz.ang);
    W.paint.push((c, X, Y, S, path) => { path(pz.pts); c.fillStyle = '#eee5d5'; c.fill(); c.save(); c.translate(X(pz.x), Y(pz.z)); for (let r = 1.4; r < 6; r += 1.2) { c.beginPath(); c.arc(0, 0, r * S, 0, TAU); c.strokeStyle = 'rgba(180,150,120,.35)'; c.lineWidth = .1 * S; c.stroke(); } c.restore(); });
    W.solid.add(P.cyl20, M(pz.x, BLOCK_Y, pz.z, 2.2, .3, 2.2), C('#e4d9c4')); W.solid.add(P.cyl20, M(pz.x, BLOCK_Y + .3, pz.z, 1.95, .02, 1.95), C('#6fd0e0'));
    // golden glove sculpture on a plinth
    W.solid.add(P.box, M(pz.x, BLOCK_Y, pz.z, .9, 1.1, .9, fr.ry), C('#2f3540'));
    gloveGold(W, pz.x, BLOCK_Y + 2.45, pz.z, fr.ry);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; addInst(W, 'palms', { x: pz.x + Math.cos(a) * 4.2, y: BLOCK_Y, z: pz.z + Math.sin(a) * 4.2, s: rnd(.85, 1) }); }
    for (let k = 0; k < 16; k++) { const a = rnd(0, TAU), r = rnd(2.8, 5); addInst(W, 'people', { x: pz.x + Math.cos(a) * r, y: BLOCK_Y, z: pz.z + Math.sin(a) * r, s: 1, color: pick(PAL.car) }); }
    pool(W, pz.x, pz.z, 4, '#ffe2a8', .5); glow(W, pz.x, BLOCK_Y + 1.8, pz.z, '#ffd36a', 3, .5);
  }
}
function gloveGold(W, x, y, z, ry) {
  const gold = C('#f4c152'), goldD = C('#c9952f'), f = frame(x, z, ry);
  W.solid.add(P.cyl12, M(x, y - 1.35, z, .36, .5, .36), C('#f6f2ea'));
  W.solid.add(P.sph, M(x, y - .3, z, .55, .72, .48, ry), gold);
  W.solid.add(P.sph, M(...(() => { const q = f.p(-.42, .2); return [q[0], y - .25, q[1]]; })(), .18, .34, .18, ry, 0, -.3), goldD);
}

/* ---- Harbor Dome on its island platform, with a bridge */
function harborDome(W) {
  const { x, z, r, bx, bz } = DOME, top = LAND_Y + .45;
  W.waterDiscs = W.waterDiscs || []; W.waterDiscs.push([x, z, r + .1]);
  W.solid.add(P.cyl20, M(x, -1.6, z, r, top + 1.6, r), C('#b8b0a2'), { ao: .2 });
  W.solid.add(P.cyl20, M(x, top, z, r - .2, .06, r - .2), C('#e8e0d0'));
  W.solid.add(P.cyl20, M(x, top, z, r * .99, .22, r * .99), C('#f2ece0'));
  // dome: white ribbed shell, glass drum, gold crown
  const R2 = 6.6, yb = top + .3;
  W.solid.add(P.cyl20, M(x, yb, z, R2 + .15, 1.25, R2 + .15), C('#dfe5ea'));
  for (let k = 0; k < 20; k++) { const a = (k + .5) / 20 * TAU; litQuad(W, [x + Math.cos(a - .12) * (R2 + .17), yb + .25, z + Math.sin(a - .12) * (R2 + .17)], [x + Math.cos(a + .12) * (R2 + .17), yb + .25, z + Math.sin(a + .12) * (R2 + .17)], [x + Math.cos(a + .12) * (R2 + .17), yb + 1.05, z + Math.sin(a + .12) * (R2 + .17)], [x + Math.cos(a - .12) * (R2 + .17), yb + 1.05, z + Math.sin(a - .12) * (R2 + .17)], [Math.cos(a), 0, Math.sin(a)], '#9fe6ff', '#3d6f8f'); }
  W.solid.add(P.hemi, M(x, yb + 1.25, z, R2, R2 * .62, R2), C('#f7f8f8'));
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; const pts = []; for (let j = 0; j <= 8; j++) { const t = j / 8 * Math.PI / 2; pts.push([x + Math.cos(a) * Math.cos(t) * (R2 + .04), yb + 1.25 + Math.sin(t) * R2 * .62 + .03, z + Math.sin(a) * Math.cos(t) * (R2 + .04)]); } for (let j = 0; j < 8; j++) beam(W.solid, pts[j], pts[j + 1], .16, C('#cfd6dd')); }
  W.solid.add(P.cyl12, M(x, yb + 1.25 + R2 * .62 - .15, z, 1, .45, 1), C('#f4c152'));
  W.solid.add(P.cone12, M(x, yb + 1.25 + R2 * .62 + .3, z, .5, .9, .5), C('#f4c152'));
  glow(W, x, yb + 1.25 + R2 * .62 + 1.1, z, '#ffe08a', 2.4, 1);
  // sign band facing the camera
  const ang = .24, sx = x + Math.sin(ang) * (R2 + .5), sz = z + Math.cos(ang) * (R2 + .5);
  sign(W, { text: 'HARBOR DOME', x: sx, y: yb + 2.75, z: sz, ry: ang, h: 1.25, style: 'board', bg: '#1d4f91', fg: '#ffffff', glow: '#5fd0ff', board: .14 });
  for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; lamp(W, x + Math.cos(a) * (r - .7), top + .22, z + Math.sin(a) * (r - .7), -a + Math.PI / 2); }
  for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + .3; if (Math.abs(Math.atan2(Math.sin(a - (Math.PI / 2 - ang)), Math.cos(a - (Math.PI / 2 - ang)))) < .7) continue; addInst(W, 'palms', { x: x + Math.cos(a) * (r - 1.4), y: top + .22, z: z + Math.sin(a) * (r - 1.4), s: .9 }); }
  if (W.NIGHT) for (let k = 0; k < 28; k++) { const a = k / 28 * TAU; glow(W, x + Math.cos(a) * (R2 + .3), yb + 1.3, z + Math.sin(a) * (R2 + .3), '#7fe3ff', 1.2, .8); }
  // bridge from the quay
  const dx = x - bx, dz = z - bz, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, len = L - r + .4, ry = Math.atan2(ux, uz);
  const deckY = 1.15, mid = [bx + ux * len / 2, bz + uz * len / 2];
  W.solid.add(P.box, M(mid[0], deckY, mid[1], 3.2, .35, len + .6, ry), C('#e9e3d6'));
  W.solid.add(P.box, M(mid[0], deckY + .35, mid[1], 2.4, .02, len + .6, ry), C(PAL.asphalt));
  for (const s of [-1.5, 1.5]) W.solid.add(P.box, M(mid[0] + Math.cos(ry) * s, deckY + .35, mid[1] - Math.sin(ry) * s, .14, .4, len + .6, ry), C('#f4f1ea'));
  for (let k = 1; k < 4; k++) { const f = k / 4, px = bx + ux * len * f, pz = bz + uz * len * f; W.solid.add(P.box, M(px, -1, pz, 2.6, deckY + 1, .8, ry), C('#d6cfc1')); }
  for (let k = 0; k <= 4; k++) { const f = k / 4, px = bx + ux * len * f, pz = bz + uz * len * f; lamp(W, px + Math.cos(ry) * 1.35, deckY + .35, pz - Math.sin(ry) * 1.35, ry + Math.PI / 2); }
  W.dome = { x, z, top: yb + 1.25 + R2 * .62 + 1.2 };
}

/* ---- Glory Hill with the Championship Arena */
let HILL_ROAD = null;
function hillProfile(r) { return LAND_Y + HILL.h * Math.pow(1 - sstep(HILL.top, HILL.r, r), 1.15); }
function hillRoad() {
  if (HILL_ROAD) return HILL_ROAD;
  const pts = [], th0 = .3 * Math.PI, dth = -1.62 * Math.PI, n = 150;
  for (let i = 0; i <= n; i++) { const s = i / n, r = lerp(HILL.r + 1.2, HILL.top + .4, Math.pow(s, .92)), a = th0 + dth * s; pts.push([HILL.x + Math.cos(a) * r, hillProfile(r) + .04, HILL.z + Math.sin(a) * r]); }
  return (HILL_ROAD = pts);
}
function hillY(x, z) {
  const r = Math.hypot(x - HILL.x, z - HILL.z);
  let y = hillProfile(r) + (fbm(x * .15 + 3, z * .15) - .5) * 2.4 * sstep(HILL.top + .6, HILL.top + 3.2, r) * (1 - sstep(HILL.r - 4, HILL.r, r));
  const rd = hillRoad(); let best = 1e9, by = 0;
  for (let i = 0; i < rd.length - 1; i++) { const d = segDist(x, z, rd[i][0], rd[i][2], rd[i + 1][0], rd[i + 1][2]); if (d < best) { best = d; by = (rd[i][1] + rd[i + 1][1]) / 2; } }
  if (best < 3) y = lerp(by - .06, y, sstep(1.5, 3, best));
  return y;
}
function gloryHill(W) {
  const rings = [0, .1, .2, .3, .4, .45, .5]; for (let r = .52; r <= 1.0001; r += .025) rings.push(r); rings.push(1.04, 1.08);
  mound(W, HILL.x, HILL.z, HILL.r, HILL.h, {
    rings, seg: 120, height: (x, z) => hillY(x, z),
    color: (x, z, y, r) => { const t = clamp((y - LAND_Y) / HILL.h, 0, 1), n = fbm(x * .3, z * .3); const c = C('#74ad4c').lerp(C('#8cc35b'), t); if (r > HILL.top + 1 && r < HILL.r - 2 && n > .64) c.lerp(C('#a88f6e'), .55); return r >= HILL.r ? C(PAL.grass) : c; }
  });
  // road ribbon with dashes and lamps
  const rd = hillRoad(), asp = C(PAL.asphalt), edge = C('#eae6dc');
  for (let i = 0; i < rd.length - 1; i++) {
    const a = rd[i], b = rd[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz), nx = -dz / l * 1.2, nz = dx / l * 1.2;
    const A1 = [a[0] - nx, a[1] + .02, a[2] - nz], A2 = [a[0] + nx, a[1] + .02, a[2] + nz], B1 = [b[0] - nx, b[1] + .02, b[2] - nz], B2 = [b[0] + nx, b[1] + .02, b[2] + nz];
    W.solid.quadF(A1, B1, B2, A2, asp, asp, [0, 1, 0]);
    for (const s of [-1, 1]) W.solid.quadF([a[0] + nx * s, a[1] + .02, a[2] + nz * s], [b[0] + nx * s, b[1] + .02, b[2] + nz * s], [b[0] + nx * s * 1.12, b[1] + .1, b[2] + nz * s * 1.12], [a[0] + nx * s * 1.12, a[1] + .1, a[2] + nz * s * 1.12], edge, edge, [0, 1, 0]);
    if (i % 2 === 0) W.marks.quadF([a[0] - nx * .05, a[1] + .04, a[2] - nz * .05], [lerp(a[0], b[0], .6) - nx * .05, lerp(a[1], b[1], .6) + .04, lerp(a[2], b[2], .6) - nz * .05], [lerp(a[0], b[0], .6) + nx * .05, lerp(a[1], b[1], .6) + .04, lerp(a[2], b[2], .6) + nz * .05], [a[0] + nx * .05, a[1] + .04, a[2] + nz * .05], C(PAL.line), C(PAL.line), [0, 1, 0]);
    if (i % 12 === 6) { const r0 = Math.hypot(a[0] - HILL.x, a[2] - HILL.z), ox = (a[0] - HILL.x) / r0, oz = (a[2] - HILL.z) / r0; lamp(W, a[0] + ox * 1.6, a[1], a[2] + oz * 1.6, Math.atan2(-ox, -oz)); }
  }
  occupy(W, 'disc', [HILL.x, HILL.z, HILL.r + .5]);
  // trees on the slopes
  for (let k = 0; k < 230; k++) {
    const a = rnd(0, TAU), r = rnd(HILL.top + 1.8, HILL.r - .6), x = HILL.x + Math.cos(a) * r, z = HILL.z + Math.sin(a) * r;
    let near = 1e9; for (let i = 0; i < rd.length; i += 3) near = Math.min(near, Math.hypot(rd[i][0] - x, rd[i][2] - z)); if (near < 2.6) continue;
    if (fbm(x * .2, z * .2) < .4 && chance(.6)) continue;
    addInst(W, chance(.55) ? 'pines' : 'trees', { x, y: hillY(x, z) - .05, z, s: rnd(.75, 1.15) });
  }
  stadium(W, HILL.x, HILL.z - .4, LAND_Y + HILL.h + .02);
}
function stadium(W, cx, cz, y0) {
  const A = 8.6, Bz = 7.0, N = 72, B = W.solid;
  // plaza on the hill top
  ellipseRing(B, cx, cz + .4, HILL.top + .15, HILL.top + .15, 1, 0, y0, y0, 48, (k) => C(k % 2 ? '#e6d9c2' : '#dfd1b8'));
  for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, r0 = A * 1.34, r1 = HILL.top - .3; W.marks.quadF([cx + Math.cos(a - .006) * r0, y0 + .015, cz + .4 + Math.sin(a - .006) * r0], [cx + Math.cos(a + .006) * r0, y0 + .015, cz + .4 + Math.sin(a + .006) * r0], [cx + Math.cos(a + .004) * r1, y0 + .015, cz + .4 + Math.sin(a + .004) * r1], [cx + Math.cos(a - .004) * r1, y0 + .015, cz + .4 + Math.sin(a - .004) * r1], C('#cbbb9f'), C('#cbbb9f'), [0, 1, 0]); }
  for (const a of [.35, 1.2, 1.95, 2.8, 3.6, 4.5, 5.4]) { const px = cx + Math.cos(a) * (HILL.top - 1.6), pz = cz + .4 + Math.sin(a) * (HILL.top - 1.6); if (Math.abs(a - Math.PI / 2) < .5) continue; B.add(P.cyl12, M(px, y0, pz, .95, .32, .95), C('#cfc2a8')); B.add(P.cyl12, M(px, y0 + .32, pz, .82, .02, .82), C('#6fae4c')); addInst(W, 'trees', { x: px, y: y0 + .3, z: pz, s: .7 }); }
  for (let k = 0; k < 12; k++) { const a = (k + .5) / 12 * TAU; lamp(W, cx + Math.cos(a) * (HILL.top - .4), y0, cz + .4 + Math.sin(a) * (HILL.top - .4), Math.atan2(-Math.cos(a), -Math.sin(a))); }
  ellipseRing(B, cx, cz, A, Bz, 1.32, 1.08, y0 + .01, y0 + .01, N, k => C(k % 6 < 3 ? '#d9cdb6' : '#e5dbc7'));
  // podium, facade and red band
  ellipseWall(B, cx, cz, A * 1.05, Bz * 1.05, y0, y0 + .5, N, () => C('#cfc6b6'));
  ellipseRing(B, cx, cz, A, Bz, 1.05, 1.0, y0 + .5, y0 + .5, N, () => C('#e8e2d6'));
  const gate = k => { const a = (k + .5) / N * TAU; return Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < .22; };
  ellipseWall(B, cx, cz, A, Bz, y0 + .5, y0 + 2.5, N, k => gate(k) ? C('#20252e') : C(k % 2 ? '#f6f4ef' : '#e3dfd7'));
  ellipseWall(B, cx, cz, A * 1.006, Bz * 1.006, y0 + 2.5, y0 + 2.95, N, () => C('#e11d2e'));
  ellipseWall(B, cx, cz, A * 1.006, Bz * 1.006, y0 + 2.95, y0 + 3.08, N, () => C('#f4c152'));
  ellipseWall(B, cx, cz, A, Bz, y0 + 3.08, y0 + 3.5, N, () => C('#f6f4ef'));
  ellipseRing(B, cx, cz, A, Bz, 1.0, .96, y0 + 3.5, y0 + 3.5, N, () => C('#ffffff'));
  // stands: two tiers with sector colours
  const seat = (k, a) => { const s = Math.floor(((a / TAU) * 16 + .5)) % 16; return C(s === 4 ? '#f4c152' : s % 2 ? '#c92a35' : '#a8202b'); };
  ellipseRing(B, cx, cz, A, Bz, .96, .8, y0 + 3.45, y0 + 2.05, N, seat);
  ellipseWall(B, cx, cz, A * .8, Bz * .8, y0 + 1.7, y0 + 2.05, N, () => C('#e9e5dd'), true);
  ellipseRing(B, cx, cz, A, Bz, .79, .64, y0 + 1.7, y0 + .95, N, (k, a) => seat(k, a).lerp(C('#2a2f3a'), .35));
  ellipseWall(B, cx, cz, A * .64, Bz * .64, y0 + .8, y0 + .95, N, () => C('#f4f4f4'), true);
  // arena floor with the ring
  ellipseRing(B, cx, cz, A, Bz, .64, 0, y0 + .82, y0 + .82, N, () => C('#28324a'));
  const ry = 0;
  B.add(P.box, M(cx, y0 + .82, cz, 2.6, .42, 2.6, ry), C('#1f4fa0'), { top: C('#4f8ee0') });
  for (const [sx, sz, col] of [[-1, -1, '#e11d2e'], [1, 1, '#2b62d9'], [-1, 1, '#f4f4f4'], [1, -1, '#f4f4f4']]) B.add(P.cyl6, M(cx + sx * 1.2, y0 + 1.24, cz + sz * 1.2, .07, .7, .07), C(col));
  for (const h of [.3, .48, .64]) for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) beam(B, [cx + a[0] * 1.2, y0 + 1.24 + h, cz + a[1] * 1.2], [cx + b[0] * 1.2, y0 + 1.24 + h, cz + b[1] * 1.2], .03, C('#ffffff'));
  // roof canopy over the outer stands, with trusses
  ellipseRing(B, cx, cz, A, Bz, 1.04, .84, y0 + 3.95, y0 + 4.3, N, k => C(k % 2 ? '#fbfbf9' : '#f1f1ee'));
  ellipseRing(B, cx, cz, A, Bz, .84, 1.04, y0 + 4.26, y0 + 3.91, N, () => C('#9aa1aa'), -1);
  ellipseWall(B, cx, cz, A * .84, Bz * .84, y0 + 4.18, y0 + 4.32, N, () => C('#e11d2e'), true);
  for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; beam(B, [cx + Math.cos(a) * A * 1.0, y0 + 3.5, cz + Math.sin(a) * Bz * 1.0], [cx + Math.cos(a) * A * 1.03, y0 + 3.95, cz + Math.sin(a) * Bz * 1.03], .12, C('#c8ccd2')); }
  // giant screens on the north roof facing south
  for (const sx of [-3.2, 3.2]) { const zz = cz - Bz * .9; B.add(P.box, M(cx + sx, y0 + 4.2, zz, 3.2, 1.9, .28), C('#1c212b')); litQuad(W, [cx + sx - 1.45, y0 + 4.35, zz + .15], [cx + sx + 1.45, y0 + 4.35, zz + .15], [cx + sx + 1.45, y0 + 5.95, zz + .15], [cx + sx - 1.45, y0 + 5.95, zz + .15], [0, 0, 1], '#7fb8ff', '#2d4f86'); }
  sign(W, { text: 'CHAMPIONSHIP ARENA', x: cx, y: y0 + 2.42, z: cz + Bz + .12, ry: 0, h: .62, style: 'board', bg: '#14181f', fg: '#f4c152', glow: '#ffd36a', edge: '#f4c152', board: .1 });
  // entrance canopy
  B.add(P.box, M(cx, y0 + 1.75, cz + Bz + .6, 3.6, .16, 1.4), C('#e11d2e'));
  for (const sx of [-1.6, 1.6]) beam(B, [cx + sx, y0, cz + Bz + 1.2], [cx + sx, y0 + 1.75, cz + Bz + 1.2], .1, C('#f4c152'));
  // floodlight masts
  for (const a of [.62, 2.52, 3.76, 5.66]) {
    const px = cx + Math.cos(a) * A * 1.2, pz = cz + Math.sin(a) * Bz * 1.22, H = 8.6, face = Math.atan2(cx - px, cz - pz);
    beam(B, [px, y0, pz], [px, y0 + H, pz], .22, C('#c9ced5'));
    const f = frame(px, pz, face);
    B.add(P.box, M(px, y0 + H - .2, pz, 1.9, 1.1, .28, face, -.35), C('#e5e8ec'));
    if (W.NIGHT) {
      for (let i = -1; i <= 1; i++) for (let j = 0; j < 2; j++) { const q = f.p(i * .55, .2); glow(W, q[0], y0 + H + .1 + j * .4, q[1], '#f4f8ff', 2.4, 1); }
      const q = f.p(0, .3); W.beamList.push({ a: [q[0], y0 + H + .2, q[1]], b: [cx + (px - cx) * .1, y0 + .9, cz + (pz - cz) * .1], r0: .45, r1: 3.2, hex: '#e8f1ff', k: .075 });
    }
  }
  pool(W, cx, cz, 6.5, '#f0f6ff', .9, y0 + .85);
  if (W.NIGHT) for (let k = 0; k < 36; k++) { const a = k / 36 * TAU; glow(W, cx + Math.cos(a) * A * .85, y0 + 4.2, cz + Math.sin(a) * Bz * .85, '#fff4d6', 1.2, .9); }
  // flags around the plaza
  for (let k = 0; k < 10; k++) {
    const a = (k + .5) / 10 * TAU, px = cx + Math.cos(a) * (HILL.top - .6), pz = cz + .4 + Math.sin(a) * (HILL.top - .6);
    rod(B, [px, y0, pz], [px, y0 + 3.4, pz], .05, C('#d7dbe0'));
    const col = C(k % 2 ? '#e11d2e' : '#f4c152');
    B.quadF([px, y0 + 3.35, pz], [px + 1, y0 + 3.2, pz], [px + 1, y0 + 2.6, pz], [px, y0 + 2.7, pz], col, col, [0, 0, 1]);
    B.quadF([px, y0 + 3.35, pz], [px + 1, y0 + 3.2, pz], [px + 1, y0 + 2.6, pz], [px, y0 + 2.7, pz], col, col, [0, 0, -1]);
  }
  for (let k = 0; k < 40; k++) { const a = rnd(.2, Math.PI - .2), r = rnd(1.15, 1.3); addInst(W, 'people', { x: cx + Math.cos(a) * A * r, y: y0, z: cz + Math.sin(a) * Bz * r + .5, s: 1, color: pick(PAL.car) }); }
  W.arena = { x: cx, z: cz, top: y0 + 6 };
}

/* ---- Old Fort on the headland, with a lighthouse */
function oldFort(W) {
  const top = LAND_Y + FORT.h, { ring } = plateau(W, FORT.poly, top, 1.5);
  W.waterLand = W.waterLand || []; W.waterLand.push(FORT.poly);
  occupy(W, 'poly', FORT.poly);
  const fr = frame(FORT.x + 1.5, FORT.z, .22), stone = C('#ddd0b6'), stoneD = C('#bcae93'), B = W.solid, y = top;
  const p = (lx, lz) => fr.p(lx, lz);
  const hw = 6.4, hd = 5.4, wallH = 2.1, t = .8;
  // courtyard
  { const q = p(0, 0); B.add(P.box, M(q[0], y, q[1], hw * 2 - .2, .03, hd * 2 - .2, fr.ry), C('#d9cfb9')); }
  const walls = [[[-hw, hd], [hw, hd]], [[hw, hd], [hw, -hd]], [[hw, -hd], [-hw, -hd]], [[-hw, -hd], [-hw, hd]]];
  for (const [a, b] of walls) {
    const A = p(...a), Bp = p(...b), len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]), mx = (A[0] + Bp[0]) / 2, mz = (A[1] + Bp[1]) / 2, ang = Math.atan2(Bp[0] - A[0], Bp[1] - A[1]);
    B.add(P.box, M(mx, y, mz, t, wallH, len, ang), stone, { ao: .3 });
    const n = Math.floor(len / .75);
    for (let k = 0; k < n; k++) { if (k % 2) continue; const f = (k + .5) / n; B.add(P.box, M(lerp(A[0], Bp[0], f), y + wallH, lerp(A[1], Bp[1], f), t + .04, .38, .42, ang), stoneD); }
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const q = p(sx * hw, sz * hd);
    B.add(P.cyl12, M(q[0], y - .2, q[1], 1.45, wallH + .9, 1.45), stone, { ao: .3 });
    if (sz < 0) B.add(P.cone12, M(q[0], y + wallH + .7, q[1], 1.7, 2.1, 1.7), C(PAL.slateRoof));
    else for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; B.add(P.box, M(q[0] + Math.cos(a) * 1.25, y + wallH + .7, q[1] + Math.sin(a) * 1.25, .42, .36, .42, -a), stoneD); }
  }
  // keep with flag
  const kq = p(-2, -1.5);
  B.add(P.box, M(kq[0], y, kq[1], 4, 4.6, 3.6, fr.ry), C('#e3d7bf'), { ao: .3 });
  for (let k = 0; k < 6; k++) for (const s of [-1, 1]) { const q = frame(kq[0], kq[1], fr.ry).p(-1.75 + k * .7, s * 1.65); B.add(P.box, M(q[0], y + 4.6, q[1], .36, .38, .36, fr.ry), stoneD); }
  rod(B, [kq[0], y + 4.6, kq[1]], [kq[0], y + 7.4, kq[1]], .05, C('#5b4a3a'));
  B.quadF([kq[0], y + 7.35, kq[1]], [kq[0] + 1.3, y + 7.1, kq[1]], [kq[0] + 1.3, y + 6.45, kq[1]], [kq[0], y + 6.6, kq[1]], C('#e11d2e'), C('#e11d2e'), [0, 0, 1]);
  B.quadF([kq[0], y + 7.35, kq[1]], [kq[0] + 1.3, y + 7.1, kq[1]], [kq[0] + 1.3, y + 6.45, kq[1]], [kq[0], y + 6.6, kq[1]], C('#e11d2e'), C('#e11d2e'), [0, 0, -1]);
  for (const [lx, lz] of [[-1.6, -1.81], [0, -1.81], [1.6, -1.81]]) { const kf = frame(kq[0], kq[1], fr.ry), q = kf.p(lx * .7, lz); litQuad(W, ...[[-.18, 2.2], [.18, 2.2], [.18, 3], [-.18, 3]].map(([a, h]) => { const r = kf.p(lx * .7 + a, -1.81); return [r[0], y + h, r[1]]; }), [Math.sin(fr.ry + Math.PI), 0, Math.cos(fr.ry + Math.PI)], '#ffcf7a', '#3a3530'); void q; }
  // cannons on the seaward wall
  for (let k = -2; k <= 2; k++) { const q = p(-hw - .2, k * 1.7), r = p(-hw - 1.4, k * 1.7); rod(B, [q[0], y + 1.6, q[1]], [r[0], y + 1.75, r[1]], .16, C('#2a2d33')); }
  // gatehouse to the east and the ramp down to the town
  const g = p(hw, 0);
  B.add(P.box, M(g[0], y, g[1], 1.6, 3.1, 3.2, fr.ry), stone, { ao: .3 });
  for (let k = 0; k < 3; k++) { const q = frame(g[0], g[1], fr.ry).p(0, -1.2 + k * 1.2); B.add(P.box, M(q[0], y + 3.1, q[1], 1.7, .38, .42, fr.ry), stoneD); }
  const gd = frame(g[0], g[1], fr.ry).p(.81, 0);
  W.solid.add(P.box, M(gd[0], y, gd[1], .04, 1.8, 1.3, fr.ry), C('#3a2f26'));
  const r0 = p(hw + 1.2, 0), r1 = [r0[0] + 13.5 * Math.cos(fr.ry) + 1, r0[1] - 13.5 * Math.sin(fr.ry) + 3.5];
  const dx = r1[0] - r0[0], dz = r1[1] - r0[1], L = Math.hypot(dx, dz), nx = -dz / L * 1.2, nz = dx / L * 1.2;
  const ry0 = top + .02, ry1 = LAND_Y + .02;
  B.quadF([r0[0] - nx, ry0, r0[1] - nz], [r1[0] - nx, ry1, r1[1] - nz], [r1[0] + nx, ry1, r1[1] + nz], [r0[0] + nx, ry0, r0[1] + nz], C('#cbbfa6'), C('#cbbfa6'), [0, 1, 0]);
  for (const s of [-1, 1]) {
    B.quadF([r0[0] + nx * s * 1.1, ry0 + .45, r0[1] + nz * s * 1.1], [r1[0] + nx * s * 1.1, ry1 + .45, r1[1] + nz * s * 1.1], [r1[0] + nx * s * 1.1, -1, r1[1] + nz * s * 1.1], [r0[0] + nx * s * 1.1, -1, r0[1] + nz * s * 1.1], stone, stoneD, [nx * s, 0, nz * s]);
    B.quadF([r0[0] + nx * s * .95, ry0 + .45, r0[1] + nz * s * .95], [r1[0] + nx * s * .95, ry1 + .45, r1[1] + nz * s * .95], [r1[0] + nx * s * 1.1, ry1 + .45, r1[1] + nz * s * 1.1], [r0[0] + nx * s * 1.1, ry0 + .45, r0[1] + nz * s * 1.1], stoneD, stoneD, [0, 1, 0]);
  }
  W.fortRampEnd = r1;
  for (let k = 0; k < 9; k++) { const a = rnd(0, TAU), rr = rnd(2, 9); const q = [FORT.x + Math.cos(a) * rr - 3, FORT.z + Math.sin(a) * rr]; if (inPoly(q[0], q[1], ring.map(v => [v[0], v[2]])) && Math.abs(fr.p(0, 0)[0] - q[0]) + Math.abs(fr.p(0, 0)[1] - q[1]) > 9) addInst(W, 'pines', { x: q[0], y: top, z: q[1], s: rnd(.7, 1) }); }
  // lighthouse on the seaward tip
  const lx = -105.2, lz = -45.5, ly = top - .05;
  B.add(P.cyl12, M(lx, ly, lz, 1.35, .6, 1.35), C('#d8ccb3'));
  const taper = P.taper || (P.taper = proto(new THREE.CylinderGeometry(.78, 1.0, 1, 14, 1).translate(0, .5, 0)));
  const segs = [['#fbfaf6', 1.8], ['#e11d2e', 1.5], ['#fbfaf6', 1.5], ['#e11d2e', 1.3]]; let yy = ly + .6, rr = 1.05;
  for (const [col, h] of segs) { B.add(taper, M(lx, yy, lz, rr, h, rr), C(col)); yy += h; rr *= .86; }
  B.add(P.cyl12, M(lx, yy, lz, 1.0, .12, 1.0), C('#2a2d33'));
  for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; beam(B, [lx + Math.cos(a) * .95, yy + .12, lz + Math.sin(a) * .95], [lx + Math.cos(a) * .95, yy + .55, lz + Math.sin(a) * .95], .04, C('#2a2d33')); }
  if (W.NIGHT) W.glowSolid.add(P.cyl12, M(lx, yy + .12, lz, .52, .8, .52), C('#fff1b0')); else B.add(P.cyl12, M(lx, yy + .12, lz, .52, .8, .52), C('#9fd3df'));
  B.add(P.hemiLow, M(lx, yy + .92, lz, .62, .55, .62), C('#e11d2e'));
  glow(W, lx, yy + .5, lz, '#fff2b8', 5, 1);
  W.lighthouse = [lx, yy + .5, lz];
  W.fort = { x: FORT.x, z: FORT.z, top: y + 7.5 };
}

/* ---- Pirate Cove: island, cove beach, ship */
function pirateCove(W) {
  const cx = ISLAND.x, cz = ISLAND.z, pts = [];
  for (let k = 0; k < 28; k++) { const a = k / 28 * TAU, r = 10.2 * (1 + Math.sin(a * 3 + 1) * .07 + Math.sin(a * 5 + 2) * .04); pts.push([cx + Math.cos(a) * r * 1.12, cz + Math.sin(a) * r]); }
  let area = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
  if (area > 0) pts.reverse();
  const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
  const sg = new THREE.ShapeGeometry(shape); sg.rotateX(-Math.PI / 2); sg.translate(0, LAND_Y, 0);
  W.ground.add(proto(sg), M(0, 0, 0), C('#ffffff'));
  beachRibbon(W, pts, true, .42);
  W.waterLand = W.waterLand || []; W.waterLand.push(pts); W.waterBeaches = W.waterBeaches || []; W.waterBeaches.push([pts, 7.6 * .42]);
  W.paint.push((c, X, Y, S, path) => { path(pts); c.fillStyle = PAL.sandDry; c.fill(); const inner = pts.map(p => [cx + (p[0] - cx) * .62 - 1.5, cz + (p[1] - cz) * .62 - 1]); path(inner); c.fillStyle = '#9fcf6e'; c.fill(); });
  occupy(W, 'poly', pts);
  // rocky arc on the west and north
  for (let k = 0; k < 16; k++) {
    const a = Math.PI * .55 + k / 15 * Math.PI * 1.15, r = rnd(7.4, 9.8), x = cx + Math.cos(a) * r * 1.1, z = cz + Math.sin(a) * r;
    W.solid.add(P.ico, M(x, LAND_Y - .6, z, rnd(1.5, 2.6), rnd(1.8, 4.2) * (1 - Math.abs(k - 7.5) / 12), rnd(1.4, 2.2), rnd(0, TAU), rnd(-.2, .2)), C(pick(['#a99070', '#b9a07e', '#937b62', '#c4ad8a'])));
  }
  for (let k = 0; k < 9; k++) { const a = rnd(-.4, 1.8), r = rnd(2, 5.5); addInst(W, 'palms', { x: cx + Math.cos(a) * r, y: LAND_Y, z: cz + Math.sin(a) * r, s: rnd(.85, 1.15) }); }
  // hut and campfire
  const hx = cx - 1, hz = cz - 1.6;
  W.solid.add(P.box, M(hx, LAND_Y, hz, 2.2, 1.1, 1.8, .3), C('#a87e52'), { ao: .3 });
  W.solid.add(P.cone4, M(hx, LAND_Y + 1.05, hz, 1.9, 1.3, 1.6, .3 + Math.PI / 4), C('#d2b071'));
  W.solid.add(P.cyl8, M(cx + 1.5, LAND_Y, cz + 1.4, .45, .12, .45), C('#5a4636'));
  glow(W, cx + 1.5, LAND_Y + .4, cz + 1.4, '#ff9a3c', 2.6, 1); pool(W, cx + 1.5, cz + 1.4, 2.6, '#ff9a3c', .8, LAND_Y + .02);
  W.solid.add(P.box, M(cx + .2, LAND_Y, cz + 2.6, .7, .45, .45, .4), C('#7a4f2a'), { top: C('#f4c152') });
  // jetty to the east and the ship
  const jy = .55;
  W.solid.add(P.box, M(cx + 13.4, jy, cz + 1.4, 7.2, .14, 1.3), C('#a7835c'));
  for (let k = 0; k < 6; k++) for (const s of [-.55, .55]) W.solid.add(P.cyl6, M(cx + 10.2 + k * 1.3, -1, cz + 1.4 + s, .1, jy + 1.05, .1), C('#6e5139'));
  pirateShip(W, cx + 16, cz + 7, -1.05, 1.3);
  sign(W, { text: 'PIRATE COVE', x: cx + 10.4, y: 2.0, z: cz + 2.2, ry: .2, h: .45, style: 'board', bg: '#5a3a26', fg: '#f4c152', glow: '#ffb84a', edge: '#3a2416', board: .06 });
  rod(W.solid, [cx + 10.4, jy, cz + 2.2], [cx + 10.4, 1.55, cz + 2.2], .05, C('#5a3a26'));
  W.cove = { x: cx, z: cz, top: 6 };
}
function pirateShip(W, x, z, ry, sc = 1) {
  const f = frame(x, z, ry), B = W.solid, p = (lx, y, lz) => { const q = f.p(lx * sc, lz * sc); return [q[0], y * sc, q[1]]; };
  const st = [[-4.8, 1.0, 2.6], [-3.6, 1.15, 2.2], [-1, 1.25, 1.7], [2, 1.12, 1.7], [3.6, .8, 1.95], [5.0, .05, 2.3]];
  const dark = C('#3b2416'), wood = C('#6b3f23'), gold = C('#d9a441'), deck = C('#b88a5a');
  for (let i = 0; i < st.length - 1; i++) {
    const [x0, w0, d0] = st[i], [x1, w1, d1] = st[i + 1];
    for (const s of [-1, 1]) {
      B.quadF(p(x0, -.6, s * w0 * .55), p(x1, -.6, s * w1 * .55), p(x1, .55, s * w1), p(x0, .55, s * w0), dark, dark, [0, 0, s]);
      B.quadF(p(x0, .55, s * w0), p(x1, .55, s * w1), p(x1, d1, s * w1), p(x0, d0, s * w0), wood, wood, [0, 0, s]);
      B.quadF(p(x0, d0 - .3, s * w0 * 1.01), p(x1, d1 - .3, s * w1 * 1.01), p(x1, d1 - .2, s * w1 * 1.01), p(x0, d0 - .2, s * w0 * 1.01), gold, gold, [0, 0, s]);
    }
    B.quadF(p(x0, d0 - .25, -w0 * .95), p(x1, d1 - .25, -w1 * .95), p(x1, d1 - .25, w1 * .95), p(x0, d0 - .25, w0 * .95), deck, deck, [0, 1, 0]);
  }
  B.quadF(p(-4.8, -.6, -.6), p(-4.8, -.6, .6), p(-4.8, 2.4, 1.05), p(-4.8, 2.4, -1.05), C('#5a351e'), C('#5a351e'), [-1, 0, 0]);
  for (let k = -1; k <= 1; k++) litQuad(W, p(-4.82, 1.5, k * .5 - .15), p(-4.82, 1.5, k * .5 + .15), p(-4.82, 1.9, k * .5 + .15), p(-4.82, 1.9, k * .5 - .15), [-Math.cos(ry), 0, Math.sin(ry)], '#ffc46b', '#d9a441');
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const lx = -2.6 + k * 1.3; B.quadF(p(lx, .85, s * 1.36), p(lx + .3, .85, s * 1.36), p(lx + .3, 1.1, s * 1.36), p(lx, 1.1, s * 1.36), C('#1a120c'), C('#1a120c'), [0, 0, s]); }
  const masts = [[-2.4, 6.4], [.6, 7.4], [3.2, 6.0]], sail = C('#efe3c6'), sailD = C('#d9cba9');
  for (const [mx, h] of masts) {
    rod(B, p(mx, 1, 0), p(mx, h, 0), .1 * sc, C('#5a3a26'));
    for (const [yy, wd] of [[h * .45, 1.6], [h * .72, 1.25]]) {
      beam(B, p(mx, yy + 1.15, -wd), p(mx, yy + 1.15, wd), .07, C('#5a3a26'));
      B.quadF(p(mx + .15, yy + 1.1, -wd * .95), p(mx + .15, yy + 1.1, wd * .95), p(mx + .45, yy - .2, wd * .85), p(mx + .45, yy - .2, -wd * .85), sail, sailD, [Math.cos(ry), 0, -Math.sin(ry)]);
      B.quadF(p(mx + .15, yy + 1.1, -wd * .95), p(mx + .15, yy + 1.1, wd * .95), p(mx + .45, yy - .2, wd * .85), p(mx + .45, yy - .2, -wd * .85), sailD, sailD, [-Math.cos(ry), 0, Math.sin(ry)]);
    }
  }
  rod(B, p(4.6, 1.6, 0), p(7.2, 2.6, 0), .07 * sc, C('#5a3a26'));
  beam(B, p(.6, 7.4, 0), p(7.1, 2.6, 0), .025, C('#3a2a1e')); beam(B, p(.6, 7.4, 0), p(-4.6, 2.5, 0), .025, C('#3a2a1e'));
  const fl = p(.6, 7.4, 0);
  B.quadF(fl, [fl[0] - .9, fl[1] - .1, fl[2]], [fl[0] - .9, fl[1] - .65, fl[2]], [fl[0], fl[1] - .55, fl[2]], C('#15151a'), C('#15151a'), [0, 0, 1]);
  B.quadF(fl, [fl[0] - .9, fl[1] - .1, fl[2]], [fl[0] - .9, fl[1] - .65, fl[2]], [fl[0], fl[1] - .55, fl[2]], C('#15151a'), C('#15151a'), [0, 0, -1]);
  glow(W, ...p(-4.6, 2.6, 0), '#ffb84a', 1.6, 1);
}

const y0Deck = () => 1.21;
/* ---- Tech Pier */
function techPier(W) {
  const B = W.solid, white = C('#f4f6f8'), deck = C('#8e9eae'), cyan = '#2de0ff', x0 = TECH.x;
  // walkway from the promenade
  const wz0 = coastZ(x0).z - .4, wz1 = 49.6;
  B.add(P.box, M(x0, .85, (wz0 + wz1) / 2, 3.2, .3, wz1 - wz0, 0), deck, { top: C('#8d9cab') });
  for (let z = wz0 + 2; z < wz1; z += 2.4) for (const s of [-1.3, 1.3]) B.add(P.cyl6, M(x0 + s, -1, z, .12, 1.9, .12), C('#9aa3ad'));
  for (const s of [-1.55, 1.55]) neon(W, [[x0 + s, 1.3, wz0 + .6], [x0 + s, 1.3, wz1]], cyan, .05, .25);
  // platform
  const px = TECH.x - 1, pz = 57.2, pw = 22, pd = 14;
  W.waterDiscs = W.waterDiscs || []; W.waterDiscs.push([px, pz, 3]);
  B.add(P.box, M(px, .7, pz, pw, .5, pd), deck, { top: C('#97a6b5') });
  for (const dz of [-pd / 2 + .5, pd / 2 - .5]) B.add(P.box, M(px, y0Deck(), pz + dz, pw - .6, .02, .35), C('#2fb6c9'));
  for (let k = 0; k < 6; k++) B.add(P.box, M(px - 8 + k * 3.2, y0Deck(), pz + .2, 2.4, .02, .9), C('#7a8a9a'));
  for (let i = -3; i <= 3; i++) for (const j of [-1, 0, 1]) B.add(P.cyl8, M(px + i * 3.3, -1.2, pz + j * 5.5, .28, 1.95, .28), C('#9aa3ad'));
  const y = 1.2;
  // capsule pod
  rod(B, [px - 8, y + 1.5, pz - 2.5], [px - 1, y + 1.5, pz - 2.5], 1.45, white, P.cyl12);
  for (const ex of [-7.2, -1.8]) rod(B, [px + ex - .2, y + 1.5, pz - 2.5], [px + ex + .2, y + 1.5, pz - 2.5], 1.48, C('#2fb6c9'), P.cyl12);
  B.add(P.sph, M(px - 8, y + 1.5, pz - 2.5, 1.45, 1.45, 1.45), white); B.add(P.sph, M(px - 1, y + 1.5, pz - 2.5, 1.45, 1.45, 1.45), white);
  for (let k = 0; k < 6; k++) litQuad(W, [px - 7.4 + k * 1.1, y + 1.4, pz - 1.08], [px - 6.7 + k * 1.1, y + 1.4, pz - 1.08], [px - 6.7 + k * 1.1, y + 2.1, pz - 1.08], [px - 7.4 + k * 1.1, y + 2.1, pz - 1.08], [0, 0, 1], '#bdf5ff', '#3b6f8a');
  neon(W, [[px - 8.2, y + .55, pz - 1.15], [px - .8, y + .55, pz - 1.15]], cyan, .06, .35);
  B.add(P.box, M(px - 4.5, y, pz - 2.5, 6, .3, 2), C('#d9dee4'));
  // glass dome lab
  B.add(P.cyl20, M(px + 5.5, y, pz - 1, 3.4, .4, 3.4), white);
  B.add(P.hemi, M(px + 5.5, y + .4, pz - 1, 3.1, 2.6, 3.1), C(W.NIGHT ? '#1b5a73' : '#7fd6e6'));
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, pts = []; for (let j = 0; j <= 6; j++) { const t = j / 6 * Math.PI / 2; pts.push([px + 5.5 + Math.cos(a) * Math.cos(t) * 3.13, y + .4 + Math.sin(t) * 2.62, pz - 1 + Math.sin(a) * Math.cos(t) * 3.13]); } for (let j = 0; j < 6; j++) beam(B, pts[j], pts[j + 1], .07, white); }
  glow(W, px + 5.5, y + 1.6, pz - 1, '#5ff0ff', 6, .35);
  // spire
  const sx = px + 1, sz = pz + 3.2;
  B.add(P.taper || (P.taper = proto(new THREE.CylinderGeometry(.78, 1.0, 1, 14, 1).translate(0, .5, 0))), M(sx, y, sz, 1.1, 14.5, 1.1), white);
  for (const [h, r] of [[4.5, 2.2], [8.5, 1.8], [12, 1.4]]) { B.add(P.cyl20, M(sx, y + h, sz, r, .14, r), C('#3fc4d6')); if (W.NIGHT) { W.glowSolid.add(P.cyl20, M(sx, y + h - .05, sz, r * 1.02, .06, r * 1.02), C(cyan).multiplyScalar(1.4)); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; glow(W, sx + Math.cos(a) * r, y + h, sz + Math.sin(a) * r, cyan, 1.2, .6); } } else B.add(P.cyl20, M(sx, y + h - .05, sz, r * 1.02, .06, r * 1.02), C('#7fe3f0')); }
  rod(B, [sx, y + 14.5, sz], [sx, y + 17, sz], .07, C('#c9d0d8'));
  glow(W, sx, y + 17, sz, '#ff3b30', 1.2, 1);
  // teal walkways, a glass plaza disc and a holo arch at the platform front
  B.add(P.box, M(px, y + .01, pz + 1.4, pw - 1.5, .02, 1.2), C('#2fb6c9'));
  B.add(P.cyl20, M(px - 4.5, y + .01, pz + 2.6, 2.1, .03, 2.1), C(W.NIGHT ? '#1f8fa8' : '#8fe6ef'));
  const ax = px + 3.6, az2 = pz + 5.9;
  for (let k = 0; k < 16; k++) { const a0 = k / 16 * Math.PI, a1 = (k + 1) / 16 * Math.PI; neon(W, [[ax + Math.cos(a0) * 2.4, y + Math.sin(a0) * 2.6, az2], [ax + Math.cos(a1) * 2.4, y + Math.sin(a1) * 2.6, az2]], cyan, .16, .45); }
  // solar canopy and wind turbines
  for (let k = 0; k < 4; k++) B.add(P.box, M(px - 7 + k * 1.9, y + 1.1, pz + 4.6, 1.7, .08, 2.4, 0, -.35), C('#2b4f86'), { top: C('#365f9e') });
  for (const [tx, tz] of [[px + 9.5, pz + 5], [px + 10, pz - 5.5]]) { rod(B, [tx, y, tz], [tx, y + 6, tz], .12, white); B.add(P.box, M(tx, y + 5.8, tz, .4, .4, .7), white); for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + .3; beam(B, [tx, y + 6, tz + .4], [tx + Math.cos(a) * 2.3, y + 6 + Math.sin(a) * 2.3, tz + .4], .14, white, .04); } }
  // entrance arch with sign
  const az = coastZ(x0).z - 1.6;
  for (const s of [-1.9, 1.9]) beam(B, [x0 + s, BLOCK_Y, az], [x0 + s, BLOCK_Y + 2.9, az], .22, white);
  B.add(P.box, M(x0, BLOCK_Y + 2.9, az, 4.4, .55, .35), white);
  sign(W, { text: 'TECH PIER', x: x0, y: BLOCK_Y + 3.38, z: az + .2, ry: 0, h: .44, style: 'letters', fg: '#1aa3c4', glow: cyan, outline: 'rgba(255,255,255,.95)' });
  for (let k = 0; k < 10; k++) addInst(W, 'people', { x: px + rnd(-9, 9), y: y, z: pz + rnd(-5, 5), s: 1, color: pick(PAL.car) });
  pool(W, px, pz, 7, '#6fe8ff', .16, y + .02);
  W.tech = { x: px, z: pz, top: y + 9 };
}

/* ---- Midnight Fairground */
function fairground(W) {
  const area = [[73, -33], [103, -33], [103, 3.2], [73, 3.2]];
  occupy(W, 'poly', area);
  W.paint.push((c, X, Y, S, path, line) => {
    path(area); c.fillStyle = '#d6bf96'; c.fill(); c.save(); path(area); c.clip();
    for (let k = 0; k < 300; k++) { c.globalAlpha = .18; c.fillStyle = k % 2 ? '#c9ae84' : '#e2cfaa'; c.beginPath(); c.arc(X(rnd(73, 103)), Y(rnd(-33, 3)), rnd(.4, 1.4) * S, 0, TAU); c.fill(); }
    c.globalAlpha = 1; c.restore();
    line([[86, 3], [86, -8], [80, -16], [80, -28]], 1.6, '#eadbc0'); line([[86, -8], [96, -18], [98, -22]], 1.6, '#eadbc0');
  });
  const y = LAND_Y;
  // Ferris wheel facing the camera, rotating
  ferrisWheel(W, 94, -13, y);
  tent(W, 79.5, -7, 5.4, 1.5, 4.6, y, '#6b3fa0', '#f28c28', 18);
  tent(W, 76.5, -22.5, 3.2, 1.1, 2.9, y, '#e8473b', '#ffffff', 14);
  tent(W, 89.5, -26, 2.6, 1, 2.4, y, '#2fa59a', '#f4f0e6', 12);
  // carousel
  const kx = 84, kz = -20;
  W.solid.add(P.cyl20, M(kx, y, kz, 2.6, .3, 2.6), C('#f4c152'));
  for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; rod(W.solid, [kx + Math.cos(a) * 2.2, y + .3, kz + Math.sin(a) * 2.2], [kx + Math.cos(a) * 2.2, y + 2.1, kz + Math.sin(a) * 2.2], .04, C('#f6efe0')); W.solid.add(P.box, M(kx + Math.cos(a) * 2.2, y + .7, kz + Math.sin(a) * 2.2, .2, .35, .55, -a), C(k % 2 ? '#ffffff' : '#f2c14e')); }
  tent(W, kx, kz, 2.7, .25, 1.5, y + 2.05, '#e11d2e', '#fff4e0', 20);
  // haunted house
  const hx = 98.5, hz = -26.5, hf = frame(hx, hz, -.12);
  building(W, { x: hx, z: hz, ry: -.12, w: 6, d: 4.6, floors: 2, style: 'plaster', tint: C('#6d5a86'), roof: 'gable', roofColor: C('#3a2f4a'), roofH: 2.2, y0: y });
  const tq = hf.p(-2.6, 1.6);
  W.solid.add(P.box, M(tq[0], y, tq[1], 1.6, 5.2, 1.6, -.2, 0, .04), C('#5c4a74'), { ao: .3 });
  W.solid.add(P.cone4, M(tq[0] + .2, y + 5.2, tq[1], 1.35, 2.6, 1.35, -.2 + Math.PI / 4, 0, .08), C('#2e2540'));
  for (let k = -2; k <= 2; k++) { const q = hf.p(k * 1.05, 2.31); litQuad(W, [q[0] - .22, y + 1.2, q[1]], [q[0] + .22, y + 1.2, q[1]], [q[0] + .22, y + 1.75, q[1]], [q[0] - .22, y + 1.75, q[1]], [Math.sin(-.12), 0, Math.cos(-.12)], '#7dff8a', '#2d2a35'); glow(W, q[0], y + 1.5, q[1] + .2, '#5cff8a', 1.6, .6); }
  { const q = hf.p(.3, 2.35); sign(W, { text: 'HAUNTED HOUSE', x: q[0], y: y + 3.45, z: q[1], ry: -.12, h: .5, style: 'letters', fg: '#9dff9a', glow: '#5cff8a', outline: 'rgba(20,10,30,.95)' }); }
  // entrance arch
  const ex = 86, ez = 3;
  for (const s of [-2.6, 2.6]) { W.solid.add(P.box, M(ex + s, y, ez, .7, 3.6, .7), C('#3b2a52')); W.solid.add(P.cone4, M(ex + s, y + 3.6, ez, .6, 1, .6, Math.PI / 4), C('#f28c28')); }
  W.solid.add(P.box, M(ex, y + 2.75, ez, 5.6, .7, .3), C('#3b2a52'));
  sign(W, { text: 'MIDNIGHT FAIR', x: ex, y: y + 3.42, z: ez + .17, ry: 0, h: .62, style: 'letters', fg: '#ffb347', glow: '#ff8a2a', outline: 'rgba(30,14,40,.95)' });
  // stalls, string lights and the crowd
  for (let k = 0; k < 9; k++) { const sx = 74.5 + (k % 3) * 2.2 + (k > 5 ? 0 : 0), sz = -14 + Math.floor(k / 3) * 2.4 + 2; const [a, b] = pick(PAL.awning).map(C); W.solid.add(P.box, M(sx + 14, y, sz - 1, 1.5, .9, 1.1), C('#f4efe4')); W.solid.add(P.box, M(sx + 14, y + .9, sz - 1, 1.7, .1, 1.3), k % 2 ? a : b); }
  for (const [a, b] of [[[74, 2.4], [83, -4]], [[89, 2.4], [96, -6]], [[80, -14], [92, -21]], [[76, -29], [94, -31]]]) {
    let prev = null; const n = 12;
    for (let k = 0; k <= n; k++) { const f = k / n, pt = [lerp(a[0], b[0], f), y + 3.1 - Math.sin(Math.PI * f) * .7, lerp(a[1], b[1], f)]; if (prev) beam(W.solid, prev, pt, .025, C('#3b3b3b')); if (k && k < n) { W.solid.add(P.ico, M(pt[0], pt[1] - .08, pt[2], .08, .08, .08), C(W.NIGHT ? '#fff3c4' : pick(['#f2c14e', '#e8473b', '#8fe3db']))); glow(W, pt[0], pt[1] - .08, pt[2], pick(['#ffcf6a', '#ff6fb5', '#8f7bff', '#7dffdf']), 1.2, .9); } prev = pt; }
  }
  for (let k = 0; k < 60; k++) addInst(W, 'people', { x: rnd(75, 101), y, z: rnd(-31, 1), s: 1, color: pick(PAL.car) });
  for (let k = 0; k < 6; k++) pool(W, rnd(76, 100), rnd(-30, 0), 4, pick(['#b47bff', '#ff8a2a', '#ff5fb0']), .45, y + .01);
  // drop tower
  const tx = 100, tz = -10;
  W.solid.add(P.cyl12, M(tx, y, tz, .9, .5, .9), C('#3b2a52'));
  W.solid.add(P.cyl8, M(tx, y, tz, .32, 13, .32), C('#e9e4f2'));
  W.solid.add(P.cyl12, M(tx, y + 8.2, tz, 1.25, .55, 1.25), C('#f28c28'));
  W.solid.add(P.cone12, M(tx, y + 13, tz, .6, 1, .6), C('#6b3fa0'));
  glow(W, tx, y + 14, tz, '#ff5fb0', 1.6, 1);
  if (W.NIGHT) for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; glow(W, tx + Math.cos(a) * 1.3, y + 8.5, tz + Math.sin(a) * 1.3, k % 2 ? '#ffd34a' : '#ff5fb0', 1.1, .9); }
  for (let k = 0; k < 7; k++) glow(W, tx, y + 1.5 + k * 1.6, tz + .35, '#b47bff', .9, .8);
  // bumper cars pavilion
  const bx = 78.5, bz = -1.2;
  W.solid.add(P.box, M(bx, y, bz, 6.4, .08, 4.2), C('#2b2f3a'));
  for (const [sx, sz] of [[-3, -1.9], [3, -1.9], [-3, 1.9], [3, 1.9], [0, -1.9], [0, 1.9]]) rod(W.solid, [bx + sx, y, bz + sz], [bx + sx, y + 2.2, bz + sz], .07, C('#e9e4f2'));
  W.solid.add(P.box, M(bx, y + 2.2, bz, 6.8, .35, 4.6), C('#6b3fa0'));
  for (let k = 0; k < 9; k++) W.solid.add(P.box, M(bx - 3.1 + k * .78, y + 2.2, bz + 2.31, .39, .35, .02), C(k % 2 ? '#f28c28' : '#ffd34a'));
  for (let k = 0; k < 7; k++) W.solid.add(P.box, M(bx + rnd(-2.4, 2.4), y + .08, bz + rnd(-1.5, 1.5), .55, .3, .4, rnd(0, TAU)), C(pick(['#e8473b', '#f2c14e', '#2fa59a', '#3c7fc0', '#d63d6d'])));
  if (W.NIGHT) { for (let k = 0; k < 10; k++) glow(W, bx - 3.2 + k * .71, y + 2.5, bz + 2.4, k % 2 ? '#ffd34a' : '#ff8a2a', .9, .9); pool(W, bx, bz, 4, '#b47bff', .5, y + .1); }
  W.fair = { x: 88, z: -14, top: 20 };
}
function ferrisWheel(W, x, z, y0) {
  const ry = .36, f = frame(x, z, ry), Rw = 7.6, H = 9.4, N = 16, B = W.solid;
  const at = (lx, ly, lz) => { const q = f.p(lx, lz); return [q[0], y0 + ly, q[1]]; };
  for (const s of [-1, 1]) { beam(B, at(-3.4, 0, s * 1.4), at(0, H, s * .55), .3, C('#d9dde4')); beam(B, at(3.4, 0, s * 1.4), at(0, H, s * .55), .3, C('#d9dde4')); beam(B, at(-1.7, H / 2, s * .95), at(1.7, H / 2, s * .95), .16, C('#d9dde4')); }
  rod(B, at(0, H, -.8), at(0, H, .8), .32, C('#b9bfc8'));
  B.add(P.box, M(...at(0, 0, 0), 3.4, .5, 4.4, ry), C('#5b4a78'));
  // rotating rim: its own small mesh
  const wb = new Batch(), rimA = C('#f0f2f5'), lightCol = ['#ff5fb0', '#ffd34a', '#5ff0ff', '#a98bff'];
  for (const s of [-.45, .45]) for (let k = 0; k < N * 2; k++) {
    const a0 = k / (N * 2) * TAU, a1 = (k + 1) / (N * 2) * TAU;
    beam(wb, [Math.cos(a0) * Rw, Math.sin(a0) * Rw, s], [Math.cos(a1) * Rw, Math.sin(a1) * Rw, s], .16, rimA);
  }
  for (let k = 0; k < N; k++) { const a = k / N * TAU; for (const s of [-.45, .45]) beam(wb, [0, 0, s * .4], [Math.cos(a) * Rw, Math.sin(a) * Rw, s], .06, C('#c9ced6')); beam(wb, [Math.cos(a) * Rw, Math.sin(a) * Rw, -.45], [Math.cos(a) * Rw, Math.sin(a) * Rw, .45], .1, rimA); }
  W.wheel = { geo: wb, x, z, y: y0 + H, ry, R: Rw, N, lightCol };
}

/* ---- Neon Strip: hotel signs and neon outlines */
function hotelNeon(W) {
  const names = [['HOTEL', 'GLORY INN', '#ff3fa4'], ['DINER', 'OPEN 24H', '#3ff0ff'], ['ARCADE', 'PLAY', '#b56bff'], ['DANCE', 'KO BAR', '#ff5ad1'], ['SURF', 'TACOS', '#ffe14a'], ['MOTEL', 'VACANCY', '#ff5a3c'], ['CINEMA', 'TONIGHT', '#5cff8a']];
  const hotels = W.hotels.filter(b => b.hotelTop).sort((a, b) => a.x - b.x);
  hotels.forEach((b, i) => {
    const [blade, front, hex] = names[i % names.length], x = b.hotelX, z = b.hotelZ, w = b.hotelW, d = b.hotelD, top = b.hotelTop, fz = z + d / 2, side = b.hotelSide || 1, [cx, ch, cz] = b.hotelCorner;
    const bx = x - side * (w / 2 - .55), bh = Math.min(top - BLOCK_Y - 2, blade.length * .66);
    sign(W, { text: blade, x: bx, y: top - .25, z: fz + .45, ry: 0, h: bh, style: 'blade', bg: '#1b1f2a', fg: hex, glow: hex, board: .2, boardColor: '#f4f1ea' });
    sign(W, { text: front, x: x + side * w * .1, y: BLOCK_Y + 1.8, z: fz + .36, ry: 0, h: .64, style: 'letters', fg: hex, glow: hex, outline: 'rgba(20,22,30,.9)' });
    neon(W, [[x - w / 2, top + .32, fz + .04], [x + w / 2, top + .32, fz + .04]], hex, .07, .45);
    const alt = names[(i + 2) % names.length][2];
    neon(W, [[cx, BLOCK_Y + 1.4, cz + 1.39], [cx, ch, cz + 1.39]], alt, .07, .4);
    if (W.NIGHT) { const ring = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * TAU; ring.push([cx + Math.cos(a) * 1.5, ch + .11, cz + Math.sin(a) * 1.5]); } neon(W, ring, alt, .06, .3); }
    if (W.NIGHT) { pool(W, x, fz + 2.6, 4.2, hex, .5); glow(W, x, BLOCK_Y + 1, fz + .6, '#ffd9a8', 3, .4); }
    for (let k = 0; k < 5; k++) addInst(W, 'people', { x: x + rnd(-w / 2, w / 2), y: BLOCK_Y, z: fz + rnd(.6, 1.8), s: 1, color: pick(PAL.car) });
  });
  const mid = hotels[Math.floor(hotels.length / 2)];
  if (mid) { const x = mid.hotelX, z = mid.hotelZ, top = mid.hotelTop; for (const s of [-2.4, 2.4]) beam(W.solid, [x + s, top, z], [x + s, top + 1.4, z], .14, C('#3a3f48')); sign(W, { text: 'NEON STRIP', x, y: top + 3.1, z: z + .1, ry: 0, h: 1.7, style: 'board', bg: '#ff3fa4', fg: '#ffffff', glow: '#ff3fa4', board: .2, boardColor: '#1b1f2a' }); W.neonSign = { x, z, top: top + 3.1 }; }
  // searchlights over the strip at night
}

/* ---- backdrop hills and forests beyond the city */
function clouds(W) {
  if (W.NIGHT) return;
  const B = W.clouds = new Batch();
  for (const [x, z, y, s] of [[-122, -58, 30, 1.3], [-104, 14, 27, 1.15], [116, -76, 31, 1.4], [138, 4, 27, 1.1], [-40, -98, 33, 1.2], [-70, 84, 24, 1.2]]) {
    const n = rint(4, 6);
    for (let k = 0; k < n; k++) B.add(P.sph, M(x + (k - n / 2) * 2.5 * s + rnd(-.6, .6), y + rnd(0, 1) - Math.abs(k - n / 2) * .5, z + rnd(-1.4, 1.4), rnd(2.6, 3.6) * s, rnd(1.5, 2.1) * s, rnd(2.2, 3) * s, rnd(0, TAU)), C('#ffffff'));
    B.add(P.sph, M(x, y - .6, z, n * 1.5 * s, .7 * s, 2.6 * s), C('#eef3f7'));
  }
}
function backdrop(W) {
  clouds(W);
  const hills = [[152, 14, 34, 12], [130, -52, 30, 11], [-78, -104, 34, 12], [-30, -112, 40, 17], [22, -106, 34, 12], [72, -104, 38, 15], [124, -84, 38, 14], [142, -32, 34, 11], [-58, -88, 22, 7], [100, -76, 24, 8]];
  for (const [x, z, r, h] of hills) {
    mound(W, x, z, r, h, { seg: 40, color: (px, pz, py) => C('#86b95a').lerp(C('#4f8f4a'), clamp((py - LAND_Y) / 14, 0, 1)) });
    const n = Math.round(r * r / 9);
    for (let k = 0; k < n; k++) {
      const a = rnd(0, TAU), rr = Math.sqrt(R()) * r * .92, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
      if (pz > -74 && px < 108 && px > -100) continue;
      const py = LAND_Y + h * Math.pow(1 - sstep(0, 1, rr / r), 1.4) + (fbm(px * .12, pz * .12) - .5) * h * .35 * (1 - sstep(.8, 1, rr / r));
      addInst(W, chance(.65) ? 'pines' : 'trees', { x: px, y: py - .1, z: pz, s: rnd(.9, 1.4) });
    }
  }
}

/* ---- roads between districts */
function roads(W) {
  W.roads.push({ pts: [qpt(64, 20), [-2, 21.4], [24, 21.4], [31, 26]], w: 4, lanes: [0] });
  W.roads.push({ pts: [qpt(46, 52), [2, -22], [hillRoad()[0][0], hillRoad()[0][2]]], w: 3.4, lanes: [0] });
  W.roads.push({ pts: [[12, 1], [19, 1]], w: 3 });
  W.roads.push({ pts: [[13, -2], [15.5, -10]], w: 3 });
  W.roads.push({ pts: [[104.5, 4], [104.5, -42]], w: 3.4, lanes: [0] });
  W.roads.push({ pts: [[86, 5.5], [86, 2]], w: 2.6 });
  if (W.fortRampEnd) W.roads.push({ pts: [qpt(0, 6), qpt(-6, 9), [W.fortRampEnd[0] + 3, W.fortRampEnd[1] + 4], W.fortRampEnd], w: 3, lanes: [0] });
  for (const r of W.roads) occupy(W, 'line', [r.pts, r.w + 1]);
}

/* ---- pins */
function places(W) {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const pl = [];
  const hg = W.homeGym || { x: 52, z: -46, top: 4 };
  pl.push({ id: 'oldtown', kind: 'chapter', chapter: 1, name: 'Old Town', sub: 'Home Gym · morning', state: 'current', anchor: v(hg.x, hg.top + 4.3, hg.z), focus: { x: hg.x + 4, z: hg.z + 4, dist: 64 } });
  const mh = W.marketHall || { x: 40, z: -20, top: 4 }, mf = W.marketFrame, mc = [mf.o[0] + mf.U[0] * 22, mf.o[1] + mf.U[1] * 22];
  pl.push({ id: 'market', kind: 'chapter', chapter: 2, name: 'Market Row', sub: 'Street fights · evening', anchor: v(mc[0], 6, mc[1]), focus: { x: mc[0] + 2, z: mc[1] + 2, dist: 60 } });
  const hgr = W.hangar || { x: -10, z: 45, top: 5 };
  pl.push({ id: 'docks', kind: 'chapter', chapter: 3, name: 'The Docks', sub: 'The Basement · Dockside Hangar', anchor: v(hgr.x, hgr.top + 2.6, hgr.z), focus: { x: 2, z: 40, dist: 70 } });
  const bc = W.boxingClub || { x: -20, z: 15, top: 6 }, dc = qpt(38, 30);
  pl.push({ id: 'downtown', kind: 'chapter', chapter: 4, name: 'Downtown', sub: 'Boxing Club · City Sports Hall', anchor: v(dc[0], 30, dc[1]), focus: { x: dc[0], z: dc[1], dist: 100 } });
  const ns = W.neonSign || { x: 60, z: 15, top: 10 };
  pl.push({ id: 'neon', kind: 'place', chapter: 4, name: 'Neon Strip', anchor: v(ns.x, ns.top + .8, ns.z), focus: { x: ns.x, z: ns.z + 8, dist: 72 } });
  const dm = W.dome || DOME;
  pl.push({ id: 'dome', kind: 'place', chapter: 4, name: 'Harbor Dome', anchor: v(dm.x, (dm.top || 8) + .6, dm.z), focus: { x: dm.x, z: dm.z, dist: 60 } });
  const ar = W.arena || { x: HILL.x, z: HILL.z, top: 15 };
  pl.push({ id: 'hill', kind: 'chapter', chapter: 5, name: 'Glory Hill', sub: 'Championship Arena · stadium lights', anchor: v(ar.x, ar.top + 1.5, ar.z), focus: { x: ar.x, z: ar.z + 4, dist: 70 } });
  const t = W.tech || TECH; pl.push({ id: 'tech', kind: 'side', name: 'Tech Pier', anchor: v(t.x + 2, t.top + 5, t.z + 3), focus: { x: t.x, z: t.z - 4, dist: 60 } });
  const f = W.fair || { x: 88, z: -14 }; pl.push({ id: 'fair', kind: 'side', name: 'Midnight Fairground', anchor: v(f.x + 6, 19, f.z), focus: { x: f.x, z: f.z, dist: 64 } });
  const cv = W.cove || ISLAND; pl.push({ id: 'cove', kind: 'side', name: 'Pirate Cove', anchor: v(cv.x + 12, 9.5, cv.z + 3), focus: { x: cv.x + 6, z: cv.z, dist: 60 } });
  const ft = W.fort || FORT; pl.push({ id: 'fort', kind: 'side', name: 'Old Fort', anchor: v(ft.x + 2, ft.top + 1, ft.z), focus: { x: ft.x + 6, z: ft.z + 4, dist: 64 } });
  W.places.push(...pl);
}


/* ------------------------------------------------------------------ vegetation and props (instanced) */
function addInst(W, type, o) { (W.inst[type] = W.inst[type] || []).push(o); }
/** Occupancy raster (0.5 unit cells) so countryside trees never land on streets, blocks or landmarks. */
function occupancy(W) {
  const RES = .5, w = Math.round(GROUND.w / RES), h = Math.round(GROUND.h / RES), cv = canvas(w, h), c = cv.getContext('2d');
  const X = x => (x - GROUND.x0) / RES, Y = z => (z - GROUND.z0) / RES;
  const path = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.closePath(); };
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
  path(LAND); c.fillStyle = '#000'; c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 6 / RES; c.lineJoin = 'round'; c.beginPath(); LAND.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.stroke();
  c.fillStyle = '#fff';
  for (const b of W.blocks) { path(roundRect(b.x, b.z, b.w + b.street * 2 + 1, b.d + b.street * 2 + 1, b.ang, 1)); c.fill(); }
  for (const [kind, d] of W.occ) {
    if (kind === 'poly') { path(d); c.fill(); }
    else if (kind === 'disc') { c.beginPath(); c.arc(X(d[0]), Y(d[1]), d[2] / RES, 0, TAU); c.fill(); }
    else if (kind === 'line') { c.lineWidth = d[1] / RES; c.lineCap = 'round'; c.beginPath(); d[0].forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.stroke(); }
  }
  const data = c.getImageData(0, 0, w, h).data;
  return (x, z) => { const i = Math.round(X(x)), j = Math.round(Y(z)); if (i < 0 || j < 0 || i >= w || j >= h) return !inPoly(x, z, LAND) || polyDist(x, z, LAND) < 4; return data[(j * w + i) * 4] > 127; };
}
function buildVegetation(W) {
  for (const b of W.blocks) if (b.kind === 'park') {
    const fr = frame(b.x, b.z, b.ang), n = Math.round(b.w * b.d / 7);
    for (let k = 0; k < n; k++) { const lx = rnd(-b.w / 2 + 1, b.w / 2 - 1), lz = rnd(-b.d / 2 + 1, b.d / 2 - 1); if (Math.abs(Math.abs(lx / b.w) - Math.abs(lz / b.d)) < .06) continue; const [x, z] = fr.p(lx, lz); if (fbm(x * .3, z * .3) > .38) addInst(W, 'trees', { x, y: BLOCK_Y, z, s: rnd(.75, 1.15) }); }
    const [px, pz] = fr.p(0, 0); W.solid.add(P.cyl12, M(px, BLOCK_Y, pz, .9, .12, .9), C('#e4d9c4')); W.solid.add(P.cyl12, M(px, BLOCK_Y + .12, pz, .75, .02, .75), C('#6fd0e0'));
    for (let k = 0; k < 5; k++) { const [qx, qz] = fr.p(rnd(-b.w / 2 + 1, b.w / 2 - 1), rnd(-b.d / 2 + 1, b.d / 2 - 1)); addInst(W, 'people', { x: qx, y: BLOCK_Y, z: qz, s: 1, color: pick(PAL.car) }); }
  }
  const busy = occupancy(W);
  for (let x = -126; x < 146; x += 2.1) for (let z = -84; z < 66; z += 2.1) {
    if ((x > 116 || x < -114) && (x + z) % 4.2 > 2.1) continue;
    const px = x + rnd(-.9, .9), pz = z + rnd(-.9, .9);
    if (busy(px, pz)) continue;
    const d = fbm(px * .06 + 11, pz * .06 - 4), p = d > .54 ? .9 : d > .45 ? .45 : .08;
    if (!chance(p)) continue;
    addInst(W, chance(d > .56 ? .45 : .2) ? 'pines' : 'trees', { x: px, y: LAND_Y, z: pz, s: rnd(.8, 1.25) });
    if (chance(.06)) addInst(W, 'bushes', { x: px + 1, y: LAND_Y, z: pz + .6, s: rnd(.6, 1) });
  }
}

/* ------------------------------------------------------------------ road markings, crossings and cars */
function buildTraffic(W) {
  const lc = C(PAL.line), y0 = LAND_Y + .012;
  const stripe = (cx, cz, dx, dz, len, wd, col = lc, y = y0) => {
    const nx = -dz * wd / 2, nz = dx * wd / 2, hx = dx * len / 2, hz = dz * len / 2;
    W.marks.quadF([cx - hx - nx, y, cz - hz - nz], [cx + hx - nx, y, cz + hz - nz], [cx + hx + nx, y, cz + hz + nz], [cx - hx + nx, y, cz - hz + nz], col, col, [0, 1, 0]);
  };
  const dashes = (a, b, off = 0, col = lc) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < .5) return; const ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
    for (let t = .5; t < L - .4; t += 1.6) stripe(a[0] + ux * (t + .4) + nx * off, a[1] + uz * (t + .4) + nz * off, ux, uz, .8, .11, col);
  };
  const car = (x, z, ry) => { addInst(W, 'cars', { x, y: LAND_Y, z, s: 1, ry, color: pick(PAL.car) }); if (W.NIGHT) { const f = frame(x, z, ry), h = f.p(0, .62), t = f.p(0, -.6); glow(W, h[0], LAND_Y + .3, h[1], '#fff2c8', .9, .8); glow(W, t[0], LAND_Y + .3, t[1], '#ff3a2a', .6, .8); } };
  // grid districts: every street segment between or around blocks
  for (const g of W.grids || []) {
    const { def, blocks, at } = g, st = def.street, has = (i, j) => blocks.some(b => b.i === i && b.j === j);
    const seg = (u0, w0, u1, w1) => {
      const a = at(u0, w0), b = at(u1, w1), dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
      if (st >= 3.6) dashes([a[0] + ux * 1.2, a[1] + uz * 1.2], [b[0] - ux * 1.2, b[1] - uz * 1.2]);
      if (st >= 2.9) for (const [e, s] of [[a, 1], [b, -1]]) { const cx = e[0] + ux * s * .55, cz = e[1] + uz * s * .55, n = Math.floor((st - .5) / .45); for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * .45; stripe(cx + nx * o, cz + nz * o, ux, uz, .75, .22); } }
      if (st >= 2.9) { const n = def.name === 'downtown' ? rint(1, 3) : rint(0, 2); for (let k = 0; k < n; k++) { const t = rnd(.2, .8), dir = chance(.5) ? 1 : -1, off = dir * st / 4, x = lerp(a[0], b[0], t) + nx * off, z = lerp(a[1], b[1], t) + nz * off; car(x, z, Math.atan2(ux * dir, uz * dir)); } }
    };
    for (const b of blocks) {
      const right = blocks.find(k => k.i === b.i + 1 && k.j === b.j), down = blocks.find(k => k.i === b.i && k.j === b.j + 1);
      seg(right ? (b.u1 + right.u0) / 2 : b.u1 + st / 2, b.w0, right ? (b.u1 + right.u0) / 2 : b.u1 + st / 2, b.w1);
      if (!has(b.i - 1, b.j)) seg(b.u0 - st / 2, b.w0, b.u0 - st / 2, b.w1);
      seg(b.u0, down ? (b.w1 + down.w0) / 2 : b.w1 + st / 2, b.u1, down ? (b.w1 + down.w0) / 2 : b.w1 + st / 2);
      if (!has(b.i, b.j - 1)) seg(b.u0, b.w0 - st / 2, b.u1, b.w0 - st / 2);
    }
  }
  // main roads
  for (const r of W.roads) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
      if (r.lanes) for (const o of r.lanes) dashes(a, b, o, o === 0 && r.w > 3.6 ? C(PAL.lineY) : lc);
      if (r.w >= 3) { const lanes = r.w > 8 ? [-3.6, -1.2, 1.2, 3.6] : [-r.w / 4, r.w / 4]; for (let t = rnd(2, 6); t < L - 2; t += rnd(5, 10)) { const o = pick(lanes), dir = o > 0 ? 1 : -1; car(a[0] + ux * t + nx * o, a[1] + uz * t + nz * o, Math.atan2(ux * dir, uz * dir)); } }
    }
  }
}

/* ------------------------------------------------------------------ instanced meshes */
function treeGeo() {
  const b = new Batch();
  b.add(P.cyl5o, M(0, 0, 0, .14, 1.1, .14), C(PAL.trunk));
  b.add(P.ico, M(0, 1.7, 0, 1.0, .9, 1.0, .3), C('#ffffff'));
  b.add(P.ico, M(.3, 2.3, .1, .64, .56, .64, .9), C('#f2f2f2'));
  return b.geometry();
}
function bushGeo() { const b = new Batch(); b.add(P.ico, M(0, .25, 0, .7, .5, .7), C('#ffffff')); b.add(P.ico, M(.45, .2, .2, .45, .38, .45, .7), C('#eeeeee')); return b.geometry(); }
function pineGeo() {
  const b = new Batch();
  b.add(P.cyl5o, M(0, 0, 0, .12, .7, .12), C(PAL.trunk));
  b.add(P.cone6o, M(0, .5, 0, .9, 1.6, .9, .3), C('#ffffff'));
  b.add(P.cone6o, M(0, 1.35, 0, .68, 1.3, .68, .9), C('#f0f0f0'));
  return b.geometry();
}
function umbrellaGeo() { const b = new Batch(); b.add(P.cyl5, M(0, 0, 0, .03, 1.15, .03), C('#d8d2c6')); b.add(P.cone8, M(0, .92, 0, .66, .32, .66), C('#ffffff')); return b.geometry(); }
function personGeo() { const b = new Batch(); b.add(P.box, M(0, 0, 0, .17, .4, .12), C('#ffffff'), { ao: .5 }); b.add(P.box, M(0, .4, 0, .12, .13, .12), C('#f3dcc2')); return b.geometry(); }
function lampGeo() { const b = new Batch(), c = C('#3d434e'); b.add(P.cyl5, M(0, 0, 0, .05, 1.66, .05), c); b.add(P.box, M(0, 1.6, .2, .05, .05, .44), c); b.add(P.box, M(0, 1.53, .42, .16, .08, .26), c); return b.geometry(); }
function carGeo() {
  const b = new Batch(), glass = C('#2c3644');
  b.add(P.box, M(0, .09, 0, .5, .25, 1.12), C('#ffffff'));
  b.add(P.box, M(0, .34, -.08, .44, .2, .6), glass);
  b.add(P.box, M(0, .54, -.08, .42, .03, .5), C('#ffffff'));
  b.add(P.box, M(0, 0, 0, .46, .1, 1.0), C('#1d1f24'));
  return b.geometry();
}
function hull(b, L, Bm, top, col, deckCol) {
  const st = [[-L / 2, .82], [-L / 6, 1], [L / 4, .85], [L / 2, 0]], P0 = (z, k, y) => [k * Bm / 2, y, z];
  for (let i = 0; i < st.length - 1; i++) {
    const [z0, w0] = st[i], [z1, w1] = st[i + 1];
    for (const s of [-1, 1]) b.quadF(P0(z0, s * w0 * .6, -.15), P0(z1, s * w1 * .6, -.15), P0(z1, s * w1, top), P0(z0, s * w0, top), col, shade(col, .85), [s, 0, 0]);
    b.quadF(P0(z0, -w0, top), P0(z1, -w1, top), P0(z1, w1, top), P0(z0, w0, top), deckCol, deckCol, [0, 1, 0]);
  }
  b.quadF(P0(-L / 2, -.82 * .6, -.15), P0(-L / 2, .82 * .6, -.15), P0(-L / 2, .82, top), P0(-L / 2, -.82, top), shade(col, .8), shade(col, .8), [0, 0, -1]);
}
function boatGeo() { const b = new Batch(); hull(b, 2.3, .85, .32, C('#ffffff'), C('#d9c6a5')); b.add(P.box, M(0, .32, -.15, .6, .32, .75), C('#f6f6f2')); b.add(P.box, M(0, .48, .2, .58, .14, .04), C('#2c3644')); return b.geometry(); }
function sailGeo() {
  const b = new Batch(), sail = C('#fbfbf7'); hull(b, 2.4, .8, .3, C('#ffffff'), C('#cfb38a'));
  b.add(P.cyl5, M(0, .3, .15, .035, 2.6, .035), C('#c9ced6'));
  for (const d of [1, -1]) { b.quadF([0, .62, -.8], [0, .62, .1], [0, 2.75, .12], [0, 2.75, .1], sail, sail, [d, 0, 0]); b.quadF([0, .66, .22], [0, .66, .95], [0, 2.5, .2], [0, 2.5, .2], C('#f0eee6'), C('#f0eee6'), [d, 0, 0]); }
  return b.geometry();
}
function ferryGeo() {
  const b = new Batch(); hull(b, 5.4, 1.9, .55, C('#ffffff'), C('#9fb4c4'));
  b.add(P.box, M(0, .55, -.3, 1.6, .7, 3.4), C('#f6f6f2')); b.add(P.box, M(0, 1.25, -.6, 1.3, .55, 2), C('#f6f6f2'));
  for (const s of [-1, 1]) { b.add(P.box, M(s * .81, .8, -.3, .02, .25, 3.1), C('#2c3644')); b.add(P.box, M(s * .66, 1.45, -.6, .02, .2, 1.8), C('#2c3644')); }
  b.add(P.box, M(0, .53, 0, 1.75, .06, 4.8), C('#1d4f91')); b.add(P.cyl8, M(0, 1.8, -1.2, .2, .55, .2), C('#e11d2e'));
  return b.geometry();
}
function tugGeo() { const b = new Batch(); hull(b, 2.8, 1.1, .45, C('#c8452f'), C('#3a3f48')); b.add(P.box, M(0, .45, -.2, .8, .55, 1), C('#f4f2ec')); b.add(P.box, M(0, .85, -.05, .78, .12, .04), C('#2c3644')); b.add(P.cyl8, M(0, 1, -.5, .14, .5, .14), C('#1d2430')); return b.geometry(); }
function containerGeo() { return proto(new THREE.BoxGeometry(1.5, .64, .62).translate(0, .32, 0)); }
function gondolaGeo() { const b = new Batch(); b.add(P.box, M(0, -.75, 0, .7, .55, .55), C('#ffffff')); b.add(P.box, M(0, -.2, 0, .78, .08, .62), C('#f4f4f4')); b.add(P.box, M(0, -.15, 0, .05, .2, .05), C('#555b66')); b.add(P.box, M(0, -.62, .28, .55, .22, .01), C('#2c3644')); return b.geometry(); }
function ribTexture() {
  const cv = canvas(64, 32), c = cv.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 32);
  for (let x = 0; x < 64; x += 4) { c.fillStyle = '#c9c9c9'; c.fillRect(x, 0, 1.4, 32); }
  c.fillStyle = '#bdbdbd'; c.fillRect(0, 0, 64, 2); c.fillRect(0, 30, 64, 2);
  const t = texture(cv); t.repeat.set(2, 1); return t;
}
function palmGeo() {
  const b = new Batch(), trunk = C(PAL.palmTrunk), leaf = C(PAL.palmLeaf), leaf2 = C('#78bf4c');
  let x = 0, y = 0, z = 0;
  for (let k = 0; k < 4; k++) { const nx = x + .08 * k, ny = y + .78; b.add(P.cyl5o, M(x, y, z, .13 - k * .014, .8, .13 - k * .014, 0, 0, -.12 * k), shade(trunk, k % 2 ? .9 : 1)); x = nx; y = ny; }
  const top = [x, y, z];
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * TAU + .2, c = Math.cos(a), s = Math.sin(a), droop = k % 2 ? 1 : .8;
    const pts = [[0, 0], [.5, .24], [1.05, .05 * droop], [1.5, -.48 * droop]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [d0, h0] = pts[i], [d1, h1] = pts[i + 1], wd0 = .28 * Math.sin(Math.PI * (i / 3) + .3), wd1 = .28 * Math.sin(Math.PI * ((i + 1) / 3) + .3);
      const P0 = [top[0] + c * d0, top[1] + h0, top[2] + s * d0], P1 = [top[0] + c * d1, top[1] + h1, top[2] + s * d1];
      const px = -s, pz = c, col = k % 2 ? leaf : leaf2;
      const L0 = [P0[0] + px * wd0, P0[1] - .07, P0[2] + pz * wd0], L1 = [P1[0] + px * wd1, P1[1] - .07, P1[2] + pz * wd1], R0 = [P0[0] - px * wd0, P0[1] - .07, P0[2] - pz * wd0], R1 = [P1[0] - px * wd1, P1[1] - .07, P1[2] - pz * wd1];
      b.quadF(L0, L1, P1, P0, col, col, [0, 1, 0]); b.quadF(P0, P1, R1, R0, col, col, [0, 1, 0]);
      b.quadF(L0, L1, P1, P0, shade(col, .65), shade(col, .65), [0, -1, 0]); b.quadF(P0, P1, R1, R0, shade(col, .65), shade(col, .65), [0, -1, 0]);
    }
  }
  b.add(P.box, M(top[0], top[1] - .3, top[2], .3, .3, .3, .5), C('#7a5a3a'));
  return b.geometry();
}
function buildInstances(W, add) {
  const kinds = {
    trees: { geo: treeGeo, colors: PAL.leaf }, bushes: { geo: bushGeo, colors: PAL.leaf }, pines: { geo: pineGeo, colors: PAL.pine },
    palms: { geo: palmGeo, colors: ['#ffffff', '#f0f4e8', '#e8f0e0'] }, umbrellas: { geo: umbrellaGeo, shadow: false }, people: { geo: personGeo, shadow: false },
    lamps: { geo: lampGeo }, cars: { geo: carGeo }, boats: { geo: boatGeo }, sailboats: { geo: sailGeo }, tugs: { geo: tugGeo }, ferries: { geo: ferryGeo },
    containers: { geo: containerGeo, map: true }
  };
  for (const [k, def] of Object.entries(kinds)) {
    const list = W.inst[k]; if (!list || !list.length) continue;
    const geo = def.geo(), mat = new THREE.MeshStandardMaterial({ vertexColors: !def.map, roughness: k === 'cars' ? .45 : .85, map: def.map ? ribTexture() : null });
    if (def.map) W.disposables.push(mat.map);
    const mesh = new THREE.InstancedMesh(geo, mat, list.length), col = new THREE.Color();
    list.forEach((o, i) => {
      mesh.setMatrixAt(i, M(o.x, o.y, o.z, o.s, o.s * (o.sy || 1), o.s, o.ry ?? rnd(0, TAU)));
      col.copy(C(o.color || (def.colors ? pick(def.colors) : '#ffffff'))); mesh.setColorAt(i, col);
    });
    mesh.name = k; add(mesh, def.shadow !== false, true);
  }
}

/* ------------------------------------------------------------------ painted ground */
function paintGround(W) {
  const PX = 2048, cv = canvas(PX, Math.round(PX * GROUND.h / GROUND.w)), c = cv.getContext('2d'), S = PX / GROUND.w;
  const X = x => (x - GROUND.x0) * S, Y = z => (z - GROUND.z0) * S;
  const path = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.closePath(); };
  const line = (pts, w, col, dash) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.lineWidth = w * S; c.strokeStyle = col; c.lineJoin = 'round'; c.lineCap = 'round'; c.setLineDash(dash ? dash.map(v => v * S) : []); c.stroke(); c.setLineDash([]); };
  const r = mulberry(99);
  c.fillStyle = PAL.grass; c.fillRect(0, 0, cv.width, cv.height);
  for (let k = 0; k < 2600; k++) { c.globalAlpha = .22; c.fillStyle = r() < .5 ? PAL.grass2 : PAL.grass3; c.beginPath(); c.arc(r() * cv.width, r() * cv.height, 4 + r() * 22, 0, TAU); c.fill(); }
  c.globalAlpha = 1;
  // district asphalt: every block expanded by its street width
  for (const b of W.blocks) {
    const pts = roundRect(b.x, b.z, b.w + b.street * 2, b.d + b.street * 2, b.ang, 1.6);
    path(pts); c.fillStyle = PAL.asphalt; c.fill();
  }
  for (const rd of W.roads) line(rd.pts, rd.w, PAL.asphalt);
  // block tops
  for (const b of W.blocks) {
    path(b.pts);
    if (b.kind === 'park' || b.kind === 'square') { c.fillStyle = PAL.park; c.fill(); }
    else if (b.district === 'suburb') { c.fillStyle = PAL.lawn; c.fill(); c.save(); path(b.pts); c.clip(); c.strokeStyle = PAL.pave; c.lineWidth = .9 * S; c.stroke(); c.restore(); }
    else { c.fillStyle = b.kind === 'plaza' ? PAL.plaza : PAL.pave; c.fill(); }
    if (b.pools) for (const [px, pz, ang] of b.pools) { c.save(); c.translate(X(px), Y(pz)); c.rotate(-ang); c.fillStyle = '#e9e4da'; c.fillRect(-.8 * S, -.5 * S, 1.6 * S, 1 * S); c.fillStyle = '#4fc6e0'; c.fillRect(-.65 * S, -.36 * S, 1.3 * S, .72 * S); c.restore(); }
    if (b.kind === 'park') {
      c.save(); path(b.pts); c.clip();
      const fr = frame(b.x, b.z, b.ang);
      line([fr.p(-b.w / 2, -b.d / 2), fr.p(b.w / 2, b.d / 2)], .9, PAL.sandDry); line([fr.p(-b.w / 2, b.d / 2), fr.p(b.w / 2, -b.d / 2)], .9, PAL.sandDry);
      c.restore();
    }
  }
  if (W.marketStreet) { path(W.marketStreet); c.fillStyle = '#e7d7bd'; c.fill(); }
  if (W.paint) for (const f of W.paint) f(c, X, Y, S, path, line);
  if (W.debugGrid) {
    c.font = `${3 * S}px sans-serif`; c.fillStyle = '#000';
    for (let x = -110; x <= 110; x += 10) { line([[x, -90], [x, 70]], x % 50 ? .12 : .35, 'rgba(0,0,0,.45)'); c.fillText(String(x), X(x) + 2, Y(-80)); }
    for (let z = -90; z <= 70; z += 10) { line([[-116, z], [116, z]], z % 50 ? .12 : .35, 'rgba(0,0,0,.45)'); c.fillText(String(z), X(-110), Y(z) - 2); }
  }
  return texture(cv, { clamp: true, aniso: 8 });
}

/* ------------------------------------------------------------------ signs atlas */
function buildSigns(W, add, disposables) {
  if (!W.signs.length) return;
  const AW = 2048; let x = 0, y = 0, rowH = 0;
  for (const s of [...W.signs].sort((a, b) => b.ch - a.ch)) { if (x + s.cw > AW) { x = 0; y += rowH + 4; rowH = 0; } s.ax = x; s.ay = y; x += s.cw + 4; rowH = Math.max(rowH, s.ch); }
  const AH = Math.pow(2, Math.ceil(Math.log2(y + rowH + 6)));
  const cv = canvas(AW, AH), c = cv.getContext('2d');
  for (const s of W.signs) drawSign(c, s, W.NIGHT);
  const tex = texture(cv, { clamp: true, aniso: 8 }); disposables.push(tex);
  const pos = [], uv = [], nor = [];
  for (const s of W.signs) {
    const fr = frame(s.x, s.z, s.ry), hw = s.w / 2, off = s.board ? .025 : .015;
    const u0 = s.ax / AW, u1 = (s.ax + s.cw) / AW, v1 = 1 - s.ay / AH, v0 = 1 - (s.ay + s.ch) / AH;
    const a = fr.p(-hw, off), b = fr.p(hw, off);
    const q = [[a[0], s.y - s.h, a[1]], [b[0], s.y - s.h, b[1]], [b[0], s.y, b[1]], [a[0], s.y, a[1]]];
    pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
    uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
    for (let k = 0; k < 6; k++) nor.push(Math.sin(s.ry), 0, Math.cos(s.ry));
    if (W.NIGHT) { const n = Math.max(1, Math.round(s.w / Math.max(.6, s.h * 1.2))); for (let k = 0; k < n; k++) { const f = (k + .5) / n, p = fr.p(-hw + s.w * f, .3); glow(W, p[0], s.y - s.h / 2, p[1], s.glow || s.fg || '#ffffff', Math.max(s.h, s.w / n) * 2.1, .32); } }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const mat = W.NIGHT
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    : new THREE.MeshStandardMaterial({ map: tex, alphaTest: .5, roughness: .6 });
  const mesh = add(new THREE.Mesh(geo, mat), false, !W.NIGHT); mesh.name = 'signs'; mesh.renderOrder = 4;
}

/* ------------------------------------------------------------------ night effects: glows, light pools, beams */
function buildNightFx(W, add, disposables) {
  // light pools on the ground
  if (W.pools.length) {
    const pos = [], uv = [], col = [];
    for (const p of W.pools) {
      const y = p.y + .03, r = p.r, rz = p.rz || p.r;
      const q = [[p.x - r, y, p.z - rz], [p.x + r, y, p.z - rz], [p.x + r, y, p.z + rz], [p.x - r, y, p.z + rz]];
      pos.push(...q[0], ...q[3], ...q[2], ...q[0], ...q[2], ...q[1]);
      uv.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
      for (let k = 0; k < 6; k++) col.push(p.c.r, p.c.g, p.c.b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const tex = radialTexture([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.55)'], [.7, 'rgba(255,255,255,.15)'], [1, 'rgba(255,255,255,0)']]); disposables.push(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, toneMapped: false });
    const m = add(new THREE.Mesh(geo, mat), false, false); m.name = 'light pools'; m.renderOrder = 3;
  }
  // light beams (stadium floodlights, searchlights): additive cones fading out
  if (W.beamList.length) {
    const B = new Batch(), seg = 10;
    for (const bm of W.beamList) {
      const a = bm.a, b = bm.b, d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(); d.normalize();
      const u = new THREE.Vector3().crossVectors(d, Math.abs(d.y) > .9 ? new THREE.Vector3(1, 0, 0) : UP).normalize(), v = new THREE.Vector3().crossVectors(d, u);
      const c0 = CS(bm.hex).multiplyScalar(bm.k), c1 = new THREE.Color(0, 0, 0);
      for (let k = 0; k < seg; k++) {
        const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU, ring = (r, ang, base) => [base[0] + (u.x * Math.cos(ang) + v.x * Math.sin(ang)) * r, base[1] + (u.y * Math.cos(ang) + v.y * Math.sin(ang)) * r, base[2] + (u.z * Math.cos(ang) + v.z * Math.sin(ang)) * r];
        B.quad(ring(bm.r0, a0, a), ring(bm.r0, a1, a), ring(bm.r1, a1, b), ring(bm.r1, a0, b), c1, c0);
      }
      void L;
    }
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    const m = add(new THREE.Mesh(B.geometry(), mat), false, false); m.name = 'light beams'; m.renderOrder = 6;
  }
  // lighthouse sweep
  if (W.lighthouse) {
    const [lx, ly, lz] = W.lighthouse, B = new Batch(), c0 = new THREE.Color(.13, .12, .075), c1 = new THREE.Color(0, 0, 0);
    for (const s of [1, -1]) for (let k = 0; k < 8; k++) { const a0 = k / 8 * TAU, a1 = (k + 1) / 8 * TAU; B.quad([s * .3, Math.cos(a0) * .25, Math.sin(a0) * .25], [s * .3, Math.cos(a1) * .25, Math.sin(a1) * .25], [s * 26, Math.cos(a1) * 2.2 - 1.2, Math.sin(a1) * 2.2], [s * 26, Math.cos(a0) * 2.2 - 1.2, Math.sin(a0) * 2.2], c1, c0); }
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.Mesh(B.geometry(), mat); m.position.set(lx, ly, lz); m.rotation.y = .9; m.name = 'lighthouse beam'; m.renderOrder = 6;
    W.group.add(m); disposables.push(m.geometry, mat);
    W.animated.push(t => { m.rotation.y = .9 + t * .5; });
  }
  // glow sprites (one draw call)
  const g = W.glow; if (!g.p.length) return;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
  geo.setAttribute('gcolor', new THREE.Float32BufferAttribute(g.c, 3));
  geo.setAttribute('size', new THREE.Float32BufferAttribute(g.s, 1));
  geo.setAttribute('phase', new THREE.Float32BufferAttribute(g.ph, 1));
  const mat = glowMaterial(); W.glowMat = mat;
  const pts = new THREE.Points(geo, mat); pts.name = 'glows'; pts.frustumCulled = false; pts.renderOrder = 7;
  pts.matrixAutoUpdate = false; W.group.add(pts); disposables.push(geo, mat);
}

/* ------------------------------------------------------------------ the Ferris wheel (rotating) */
function buildWheel(W, solidMat, disposables) {
  const wh = W.wheel; if (!wh) return;
  const pivot = new THREE.Group(); pivot.position.set(wh.x, wh.y, wh.z); pivot.rotation.y = wh.ry; W.group.add(pivot);
  const rim = new THREE.Mesh(wh.geo.geometry(), solidMat); rim.castShadow = true; rim.receiveShadow = true; rim.name = 'ferris wheel'; pivot.add(rim); disposables.push(rim.geometry);
  const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 }), gg = gondolaGeo();
  const gond = new THREE.InstancedMesh(gg, gm, wh.N); gond.castShadow = true; gond.name = 'gondolas'; pivot.add(gond); disposables.push(gg, gm);
  const cols = ['#e8473b', '#f2c14e', '#2fa59a', '#6b3fa0'];
  for (let k = 0; k < wh.N; k++) gond.setColorAt(k, C(cols[k % 4]));
  let rimGlow = null;
  if (W.NIGHT) {
    const p = [], c = [], s = [], ph = [], N2 = wh.N * 2;
    for (let k = 0; k < N2; k++) { const a = k / N2 * TAU, col = CS(wh.lightCol[k % 4]); p.push(Math.cos(a) * wh.R, Math.sin(a) * wh.R, .5); c.push(col.r, col.g, col.b); s.push(1.5); ph.push(k / N2); }
    for (let k = 0; k < wh.N; k++) { const a = k / wh.N * TAU, col = CS('#fff0c0'); for (const f of [.35, .7]) { p.push(Math.cos(a) * wh.R * f, Math.sin(a) * wh.R * f, .5); c.push(col.r * .7, col.g * .7, col.b * .7); s.push(.9); ph.push(f); } }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('gcolor', new THREE.Float32BufferAttribute(c, 3)); geo.setAttribute('size', new THREE.Float32BufferAttribute(s, 1)); geo.setAttribute('phase', new THREE.Float32BufferAttribute(ph, 1));
    const mat = W.glowMat || (W.glowMat = glowMaterial());
    rimGlow = new THREE.Points(geo, mat); rimGlow.name = 'wheel glows'; rimGlow.frustumCulled = false; rimGlow.renderOrder = 7; pivot.add(rimGlow); disposables.push(geo);
    const lb = new THREE.Mesh(spokeLights(wh), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); lb.name = 'wheel lights'; pivot.add(lb); disposables.push(lb.geometry, lb.material); W.wheelLights = lb;
  }
  const m4 = new THREE.Matrix4();
  const set = t => {
    const rot = t * .12; rim.rotation.z = rot; if (rimGlow) rimGlow.rotation.z = rot; if (W.wheelLights) W.wheelLights.rotation.z = rot;
    for (let k = 0; k < wh.N; k++) { const a = k / wh.N * TAU + rot; m4.makeTranslation(Math.cos(a) * wh.R, Math.sin(a) * wh.R, 0); gond.setMatrixAt(k, m4); }
    gond.instanceMatrix.needsUpdate = true;
  };
  set(0); W.animated.push(set);
}
function spokeLights(wh) {
  const b = new Batch();
  for (let k = 0; k < wh.N; k++) { const a = k / wh.N * TAU; for (const s of [-.46, .46]) beam(b, [0, 0, s * .4], [Math.cos(a) * wh.R, Math.sin(a) * wh.R, s], .045, C(wh.lightCol[k % 4]).multiplyScalar(1.4)); }
  for (let k = 0; k < wh.N * 2; k++) { const a0 = k / (wh.N * 2) * TAU, a1 = (k + 1) / (wh.N * 2) * TAU; for (const s of [-.5, .5]) beam(b, [Math.cos(a0) * wh.R, Math.sin(a0) * wh.R, s], [Math.cos(a1) * wh.R, Math.sin(a1) * wh.R, s], .06, C('#fff0c0').multiplyScalar(1.3)); }
  return b.geometry();
}

root.GlorylandMap = { build, LAND_Y, BLOCK_Y, PAL,
  // Building pieces for small street-scale story sets (adventure/story/story-sets.js). W = { solid: Batch, facade: { style: Batch({ uv, tint }) } }.
  kit: { Batch, M, P, initProtos, FACADE, paintFacades, facadeMaterial, building, awnings, frame, C, seed: s => { R = mulberry(s); } } };
})(typeof window !== 'undefined' ? window : globalThis);
