// GOTR-0101: Otto's Corner display windows flickered because the glass and its frame shared a front face (z-fighting).
// Every display window's glass must sit clearly in front of its frame's front face.
const assert = require('assert'), fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../adventure/story/market-sets.js'), 'utf8');
const line = src.split('\n').find(l => l.includes('// display windows'));
const body = src.slice(src.indexOf(line), src.indexOf('\n', src.indexOf(line) + line.length + 1));
const frame = body.match(/box\(S, wx, \.55, fz \+ ([\d.]+), ww, 1\.85, ([\d.]+)/), glass = body.match(/G\.add\(P\.box, M\(wx, \.62, fz \+ ([\d.]+), ww - \.14, 1\.7, ([\d.]+)\)/);
assert.ok(frame && glass, 'display window frame/glass lines not found');
const frameFront = +frame[1] + frame[2] / 2, glassFront = +glass[1] + glass[2] / 2, glassBack = +glass[1] - glass[2] / 2;
assert.ok(glassFront - frameFront >= 0.01, `glass front ${glassFront} must be >= 1 cm in front of the frame front ${frameFront}`);
assert.ok(Math.abs(glassBack - frameFront) < 1e-9 || glassBack - frameFront >= 0.003 || frameFront - glassBack >= 0.003, 'glass back face too close to the frame front');
console.log('shop-window-depth: ok', { frameFront, glassFront });
