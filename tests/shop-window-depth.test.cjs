// GOTR-0101 / GOTR-0102: Otto's Corner. The display windows flickered (glass and frame on one plane), then looked white
// (opaque glass); part of the shop floor flickered (street pavement under the room at the same height). Built scene check.
const assert = require('assert'), fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../adventure/story/market-sets.js'), 'utf8');

// glass: a real transparent mesh, in front of everything displayed behind it
const GZ = +src.match(/const GZ = fz \+ ([\d.]+);/)[1];
assert.ok(GZ - .26 >= .03 && GZ - .37 >= .03, 'glass plane must clear the gloves (to fz+.26) and the bag (to fz+.37) by 3 cm');
assert.match(src, /const glassMat = new THREE\.MeshStandardMaterial\(\{[^}]*transparent: true, opacity: \.(1\d|2\d|0\d)/, 'window glass must be transparent');
assert.ok(!/G\.add\(P\.box, M\(wx, \.62/.test(src), 'the opaque glow-box window glass is gone');
assert.ok(!/G\.add\(P\.box, M\(41\.0, \.55, -1\.12/.test(src), 'the opaque counter-case glass is gone');
assert.match(src, /counter case glass/);

// floor: street ground ends before the shop room (west wall outer face at X0 - .2 = 35.8)
const street = src.slice(src.indexOf("Sets.register('dream_shop'"), src.indexOf('// ---- the interior'));
for (const m of street.matchAll(/\b(road|pave|curb|dashes|joints)\((-?[\d.]+), (-?[\d.]+)/g)) assert.ok(+m[3] < 35.8, `${m[1]} reaches x ${m[3]}, under the shop room`);
const X0 = +src.match(/const X0 = ([\d.]+)/)[1]; assert.strictEqual(X0, 36);
// plank lines stand at least 5 mm above the floor top (y 0)
const plank = src.match(/box\(A, x, ([\d.-]+), \(Z0 \+ Z1\) \/ 2, \.01, ([\d.]+), Z1 - Z0/); assert.ok(plank && +plank[1] + +plank[2] >= .005, 'plank lines too close to the floor');
console.log('shop-window-depth: ok', { GZ, plankTop: +plank[1] + +plank[2] });
