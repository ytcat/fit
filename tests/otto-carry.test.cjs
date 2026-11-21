// GOTR-0103: carrying the new heavy bag out of Otto's Corner. The carrying hand went through the bag (its target was 17 cm
// off the axis of a 23.5 cm bag) and a street tree filled the last shot. Measured in the browser after the fix: hand centre
// 28-33 cm off the bag axis (qa/gotr-0103).
const assert = require('assert'), fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../adventure/story/market-sets.js'), 'utf8');
const core = require('../adventure/story/bag-break-core.js');
const hr = src.match(/const HAND_R = ([\d.]+) \+ ([\d.]+);/); assert.ok(hr, 'HAND_R not found');
assert.strictEqual(+hr[1], core.BAG.r, 'HAND_R must start from the bag radius');
assert.ok(+hr[2] >= .05, 'the hand centre must stay at least 5 cm outside the leather');
assert.match(src, /R: \[c\.x \+ o\.x \* Math\.sin\(a\) \* d, c\.y \+ Math\.cos\(a\) \* d, c\.z \+ o\.z \* Math\.sin\(a\) \* d/, 'hand target must sit d off the bag axis');
// no street tree between the shop door (x 0.9) and the end of the walk (x 7.2) on the near pavement
for (const m of src.slice(src.indexOf("Sets.register('dream_shop'"), src.indexOf('// ---- the interior')).matchAll(/tree\((-?[\d.]+), (-?[\d.]+)/g)) assert.ok(+m[1] < -2 || +m[1] > 12, `tree at x ${m[1]} stands in the walk-out shot`);
const mc = fs.readFileSync(path.join(__dirname, '../adventure/story/market-core.js'), 'utf8');
assert.match(mc, /\{ t: 35\.5, pos: \[5\.0, 1\.6, 2\.0\], look: \[6\.8, 1\.35, -2\.3\]/, 'the last shot pans with him');
console.log('otto-carry: ok');
