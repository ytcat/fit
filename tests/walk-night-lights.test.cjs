// Owner 2026-11-25 (iPhone, free walk at night on the way to the Docks): "Strange lights while you walk in the night".
// The walk hides the overview map's parked cars (its own cars drive the streets), but their headlight and tail-light glows
// stayed in the town's glow points: white and red discs floating over an empty street. In the walk the parked cars' lights
// are left out with the cars; the overview map (no walk) keeps them.
'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
global.THREE = require('../assets/vendor/three.min.js'); global.window = global;
const ctx2d = () => new Proxy({}, { get: (_, k) => k === 'createImageData' || k === 'getImageData' ? ((w, h) => ({ data: new Uint8ClampedArray((w || 1) * (h || 1) * 4) })) : k === 'measureText' ? () => ({ width: 10 }) : /^create(Linear|Radial)Gradient$|^createPattern$/.test(k) ? () => ({ addColorStop() {} }) : () => {} });
global.document = { createElement: () => ({ width: 0, height: 0, getContext: ctx2d }) };
require('../adventure/gloryland-map.js');
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < .02);
function carLights(opts) {
  const scene = new THREE.Scene(); GlorylandMap.build(scene, opts);
  let pts = null; scene.traverse(o => { if (o.name === 'glows') pts = o; }); assert.ok(pts, 'glow points built');
  const P = pts.geometry.attributes.position, S = pts.geometry.attributes.size, C = pts.geometry.attributes.gcolor;
  let head = 0, tail = 0;
  for (let i = 0; i < P.count; i++) {
    if (Math.abs(P.getY(i) - .7) > .05) continue; // LAND_Y + .3: a car's lamp height
    const c = [C.getX(i), C.getY(i), C.getZ(i)], s = S.getX(i);
    if (Math.abs(s - .9) < 1e-3 && near(c, [.8, .76, .63])) head++;
    if (Math.abs(s - .6) < 1e-3 && near(c, [.8, .18, .13])) tail++;
  }
  return { head, tail, all: P.count };
}
const map = carLights({ time: 'night' }), walk = carLights({ time: 'night', walk: true, scale: 3 });
console.log('parked-car lights: overview map', JSON.stringify(map), '| free walk', JSON.stringify(walk));
assert.ok(map.head > 10 && map.tail === map.head, 'the overview map keeps its parked cars\' lights (the check finds them)');
assert.equal(walk.head + walk.tail, 0, 'the walk hides the parked cars, and with them their lights: no floating lights');
assert.ok(walk.all > 300, 'the other night lights (lamps, windows, neon) stay in the walk');
console.log('PASS walk night lights: no lights of hidden parked cars in the free walk');
