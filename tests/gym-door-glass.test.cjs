// Owner 2026-11-22: "Bruno's gym door is not fixed yet". The tinted pane over the solid door leaf read as a pale sticker and the painted
// shopfront showed a flat blue-grey pane beside the door. Now: a dim room behind the glass (doorInterior) and clear glass (strength 0.08)
// on the door and on a new framed sidelight; the frosted 0.29 finish stays for purely decorative panes.
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const sets = read('adventure/story/story-sets.js'), dream = read('adventure/story/dream-sets.js');
assert.match(sets, /const doorInterior = \(x, y, z, w, h\) =>/); assert.match(sets, /const reflectivePane = \(name, x, y, z, w, h, facing = 1, strength = \.29\) =>/);
assert.match(sets, /doorInterior, reflectivePane,/, 'both helpers reach the set builders');
assert.match(dream, /c\.doorInterior\(gx, 1\.25, gz \+ \.156, \.86, \.8\); c\.reflectivePane\('Bruno exterior door glass', gx, 1\.65, gz \+ \.183, \.86, \.8, 1, \.08\)/);
assert.match(dream, /c\.reflectivePane\('Bruno sidelight glass', sx, \.4 \+ \.96, gz \+ \.1, sw - \.06, 1\.92, 1, \.08\)/);
assert.match(sets, /c\.doorInterior\(11, 1\.25, -3\.484, \.86, \.8\); c\.reflectivePane\('Legacy gym exterior door glass', 11, 1\.65, -3\.468, \.86, \.8, 1, \.08\)/);
// layers stay apart in depth (no flicker): leaf front gz+.155 < interior gz+.156..+.160 < glass gz+.183; sidelight frame front gz+.08 < interior < glass gz+.1
console.log('gym-door-glass: ok');
