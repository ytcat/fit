// node tests/bruno-head-uv-seams.test.cjs — Coach Bruno's authored head has no colour step across its UV seams (main review round
// 5c: "a vertical seam line down the middle of the forehead ... fails the joins rule"). The shipped GLB's skin (node brunoHead):
// every seam edge (two triangles share the edge's positions but not its UVs) is sampled on both sides, a texel and a half inside each
// side's triangle, at three points along it, in the base-colour JPEG as the page decodes it (Chromium canvas). The step of an edge is
// the mean |RGB difference| of its points (0-255). Steps must stay small everywhere: the mean over the seams, the 99th percentile,
// and the worst run of 4 neighbouring seam edges (a visible line, like the forehead seam of the round-5b build). Env BRUNO_GLB=<file>
// runs it on another build. The mouth's lip cut (head-frame y 0.005) is an opening, not a seam, and is left out. Prints the stats and the worst places (head frame, metres).
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
let chromium; try { ({ chromium } = require('playwright')); } catch { console.log('SKIP: Playwright is not installed'); process.exit(0); }
const FILE = process.env.BRUNO_GLB || path.join(__dirname, '..', 'assets/characters/bruno/bruno-head.glb');
const LIMIT = { mean: 6, p99: 22, run: 20 }; // round 5b build: 9.6 / 106 / 113
(async () => {
  const b = fs.readFileSync(FILE), jl = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jl)), bin = 20 + jl + 8;
  const acc = k => { const a = j.accessors[k], bv = j.bufferViews[a.bufferView], C = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array }[a.componentType], n = a.count * { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type], o = b.byteOffset + bin + (bv.byteOffset || 0) + (a.byteOffset || 0); return new C(b.buffer.slice(o, o + n * C.BYTES_PER_ELEMENT)); };
  const node = j.nodes.find(n => n.name === 'brunoHead') || j.nodes.find(n => n.mesh !== undefined), prim = j.meshes[node.mesh].primitives[0];
  const P = acc(prim.attributes.POSITION), UV = acc(prim.attributes.TEXCOORD_0), I = acc(prim.indices);
  const mat = j.materials[prim.material], img = j.images[j.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source], ibv = j.bufferViews[img.bufferView];
  const jpg = b.slice(bin + (ibv.byteOffset || 0), bin + (ibv.byteOffset || 0) + ibv.byteLength);
  // seam edges: the same two positions, other UVs on the two triangles
  const key = i => Math.round(P[3 * i] * 1e5) + ',' + Math.round(P[3 * i + 1] * 1e5) + ',' + Math.round(P[3 * i + 2] * 1e5), pid = new Map(), id = i => { const k = key(i); if (!pid.has(k)) pid.set(k, pid.size); return pid.get(k); };
  const edges = new Map();
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = I[t + e], c = I[t + (e + 1) % 3], o = I[t + (e + 2) % 3], [ia, ic] = [id(a), id(c)], k = ia < ic ? ia + '|' + ic : ic + '|' + ia, [p, q] = ia < ic ? [a, c] : [c, a];
    if (!edges.has(k)) edges.set(k, []); edges.get(k).push({ p, q, o });
  }
  const uv = i => [UV[2 * i], UV[2 * i + 1]], seams = [];
  for (const [k, s] of edges) {
    if (s.length !== 2) continue; const [A, B] = s, same = (x, y) => Math.abs(UV[2 * x] - UV[2 * y]) < 1e-6 && Math.abs(UV[2 * x + 1] - UV[2 * y + 1]) < 1e-6;
    if (same(A.p, B.p) && same(A.q, B.q)) continue;
    const lip = i => Math.abs(P[3 * i + 1] - .005) < .0015 && P[3 * i + 2] > .2 && Math.abs(P[3 * i]) < .1; // the mouth's cut: the lips meet there, an opening, not a seam
    if (lip(A.p) && lip(A.q)) continue; seams.push([A, B]);
  }
  // sample points: along each side, nudged 1.5 texels toward that side's third vertex
  const pts = [];
  for (const [A, B] of seams) for (const t of [.25, .5, .75]) for (const S of [A, B]) {
    const [pu, pv] = uv(S.p), [qu, qv] = uv(S.q), [ou, ov] = uv(S.o), u = pu + (qu - pu) * t, v = pv + (qv - pv) * t, du = ou - u, dv = ov - v, L = Math.hypot(du, dv) || 1;
    pts.push(u + du / L * 1.5 / 2048, v + dv / L * 1.5 / 2048);
  }
  const br = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }), page = await br.newPage();
  const vals = await page.evaluate(async ({ data, pts }) => {
    const im = await createImageBitmap(await (await fetch('data:image/jpeg;base64,' + data)).blob()), c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, im.width, im.height).data, out = [];
    for (let i = 0; i < pts.length; i += 2) { const px = Math.min(im.width - 1, Math.max(0, Math.floor(pts[i] * im.width))), py = Math.min(im.height - 1, Math.max(0, Math.floor(pts[i + 1] * im.height))), o = 4 * (py * im.width + px); out.push(d[o], d[o + 1], d[o + 2]); }
    return out;
  }, { data: jpg.toString('base64'), pts });
  await br.close();
  const steps = seams.map((_, e) => { let s = 0; for (let t = 0; t < 3; t++) { const a = (e * 6 + t * 2) * 3, c = a + 3; s += (Math.abs(vals[a] - vals[c]) + Math.abs(vals[a + 1] - vals[c + 1]) + Math.abs(vals[a + 2] - vals[c + 2])) / 3; } return s / 3; });
  // runs: the mean step of each seam edge with its 3 nearest seam neighbours (a line, not a fleck)
  const mid = seams.map(([A]) => [0, 1, 2].map(k => (P[3 * A.p + k] + P[3 * A.q + k]) / 2)), run = steps.map((s, e) => {
    const near = mid.map((m, f) => [Math.hypot(m[0] - mid[e][0], m[1] - mid[e][1], m[2] - mid[e][2]), f]).sort((x, y) => x[0] - y[0]).slice(0, 4); return near.reduce((t, [, f]) => t + steps[f], 0) / 4; });
  const sorted = steps.slice().sort((x, y) => x - y), mean = steps.reduce((t, s) => t + s, 0) / steps.length, p99 = sorted[Math.floor(sorted.length * .99)], worstRun = Math.max(...run);
  const at = run.map((r, e) => [r, e]).sort((x, y) => y[0] - x[0]).slice(0, 3).map(([r, e]) => r.toFixed(1) + ' @ ' + mid[e].map(v => v.toFixed(3)).join(','));
  const stats = { seams: seams.length, mean: +mean.toFixed(2), p99: +p99.toFixed(1), worstRun: +worstRun.toFixed(1), at };
  assert.ok(seams.length > 200, 'seams found: ' + seams.length);
  assert.ok(mean < LIMIT.mean && p99 < LIMIT.p99 && worstRun < LIMIT.run, 'colour steps across the UV seams: ' + JSON.stringify(stats));
  console.log('bruno head uv seams ok', JSON.stringify(stats));
})().catch(e => { console.error(e); process.exit(1); });
