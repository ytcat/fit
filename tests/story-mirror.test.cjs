// GOTR-0080: story scenes borrow the game rigs; a fighter root must keep its mirror (scale.x = -1, GOTR-0074) or the skin tears.
const fs=require('fs'),assert=require('node:assert/strict'),src=fs.readFileSync('adventure/story/story-scenes.js','utf8');
assert.ok(!/root\.scale\.setScalar\(1\)/.test(src),'a borrowed fighter root must not be reset to scale 1');
assert.ok(/c\.root\.scale\.set\(-1, 1, 1\)/.test(src),'borrowed fighter roots keep the mirrored root');
console.log('PASS story scenes keep the mirrored fighter root');
