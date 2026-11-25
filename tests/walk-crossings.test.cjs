// Owner 2026-11-25 (iPhone, free walk, Neon Strip): "Broken cross road". The Neon grid's street (z 21 m) and the park grid's
// street (z 16.5 m) run side by side, both 9 m wide; each drew its own zebra crossing at the same junction, 0.3 m apart and
// interleaved: stepped, doubled stripes. Crossing stripes (0.75 x 0.22 map units) must never partly overlap each other.
'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' || k === 'getImageData' ? ((w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4) })) : k === 'measureText' ? () => ({ width: 10 }) : /^create(Linear|Radial)Gradient$|^createPattern$/.test(k) ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ width: 0, height: 0, getContext: ctx2d }) };
require('../adventure/gloryland-map.js');
for (const opts of [{ time: 'day', walk: true, scale: 3 }, { time: 'night' }]) {
  const scene = new THREE.Scene(); GlorylandMap.build(scene, opts);
  let m = null; scene.traverse(o => { if (o.name === 'road marks') m = o; }); assert.ok(m, 'road marks built');
  const P = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : P.count, at = i => idx ? idx.getX(i) : i, stripes = [];
  for (let t = 0; t + 5 < n; t += 6) {
    const u = []; for (let k = 0; k < 6; k++) { const i = at(t + k), v = [P.getX(i), P.getZ(i)]; if (!u.some(w => Math.hypot(w[0] - v[0], w[1] - v[1]) < 1e-5)) u.push(v); }
    if (u.length !== 4) continue;
    const c = [(u[0][0] + u[1][0] + u[2][0] + u[3][0]) / 4, (u[0][1] + u[1][1] + u[2][1] + u[3][1]) / 4]; u.sort((a, b) => Math.atan2(a[1] - c[1], a[0] - c[0]) - Math.atan2(b[1] - c[1], b[0] - c[0]));
    const e1 = Math.hypot(u[1][0] - u[0][0], u[1][1] - u[0][1]), e2 = Math.hypot(u[2][0] - u[1][0], u[2][1] - u[1][1]);
    if (Math.abs(Math.min(e1, e2) - .22) < .01 && Math.abs(Math.max(e1, e2) - .75) < .01) stripes.push({ c, u });
  }
  const inside = (q, x, z) => { let s = 0; for (let k = 0; k < 4; k++) { const a = q.u[k], b = q.u[(k + 1) % 4], cr = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]); const sg = Math.sign(cr); if (!sg) continue; if (s && sg !== s) return false; s = sg; } return true; };
  const bad = [];
  for (let i = 0; i < stripes.length; i++) for (let j = i + 1; j < stripes.length; j++) {
    const a = stripes[i], b = stripes[j]; if (Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]) > .8) continue;
    let ov = 0; for (let k = 0; k < 64; k++) { const fx = (k % 8 + .5) / 8, fz = (Math.floor(k / 8) + .5) / 8, x = b.u[0][0] + (b.u[1][0] - b.u[0][0]) * fx + (b.u[3][0] - b.u[0][0]) * fz, z = b.u[0][1] + (b.u[1][1] - b.u[0][1]) * fx + (b.u[3][1] - b.u[0][1]) * fz; if (inside(a, x, z)) ov++; }
    if (ov) bad.push(a.c.map(v => +(v * 3).toFixed(1)).join(',') + ' / ' + b.c.map(v => +(v * 3).toFixed(1)).join(','));
  }
  console.log(opts.walk ? 'walk' : 'map', 'crossing stripes', stripes.length, 'overlapping pairs', bad.length);
  assert.ok(stripes.length > 800, 'the crossings are found');
  assert.deepEqual(bad, [], 'crossing stripes overlap (doubled crossings at a junction), metres');
}
console.log('PASS walk crossings: one clean zebra per junction, no doubled stripes');
