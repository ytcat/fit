// node tests/portraits.test.cjs — GOTR-0081: story portraits are renders of the real 3D rigs, framed and lit the same for everyone.
// Every speaker with a 3D rig maps to it (Rourke speaks as 'hook'); the picture is head and shoulders at one scale, from a first
// small render that finds the top of the head; off-stage rigs stand in a neutral pose; the image is sharp on 3x phones; the map card
// shows the coach as a portrait, not an emoji. The browser check is qa/gotr-0081/portraits-sheet.cjs.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
process.chdir(path.join(__dirname, '..'));
const src = fs.readFileSync('adventure/portraits.js', 'utf8'), ui = fs.readFileSync('adventure/adventure-ui.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8');
// a minimal page: StoryCast with every cast id, then the module
global.window = global; window.StoryCast = { ids: ['bruno', 'brick', 'fang', 'hazel', 'otto', 'rourke'], rig: () => null };
new Function(src)();
const P = window.StoryPortraits;
for (const id of ['fighter', 'pip', 'bruno', 'brick', 'fang', 'hazel', 'otto', 'hook']) assert.equal(P.has3d(id), true, id + ' is a 3D portrait');
for (const id of ['slick', 'vix', 'king', 'dash', 'hyena', 'raccoon', 'nephew']) assert.equal(P.has3d(id), false, id + ' (no own model) is a monogram badge');
assert.match(src, /ALIAS = \{ hook: 'rourke' \}/, "Rourke's lines (speaker 'hook') use his rig");
assert.match(src, /function headPoints\(rig, T\)/, 'the frame is fitted to the head itself (skin bound to the head bone + parts on the head)');
assert.match(src, /cw \/ \(cw > 1\.4 \* ch \? \.86 : \.7\)/, 'the face fills ~70 % of the frame width (a long snout up to 86 %)');
assert.match(src, /\(top - mid\) \/ \.4/, 'the whole head with space above');
assert.match(src, /VIEW = \{ rourke: \[1\.05/, 'Rourke seen further round: the snout shows');
assert.match(src, /arms: \{ L: 'hang', R: 'hang' \}/, 'neutral pose: arms down, no hands in front of the face');
assert.match(src, /const PX = 168;/, 'sharp at 56 css px on 3x screens');
assert.match(src, /for \(const g of \[rig\.gloveMeshes\?\.L, rig\.gloveMeshes\?\.R\]\) if \(g\?\.visible\)/, 'gloves hidden for the picture');
assert.match(ui, /window\.StoryPortraits\.el\(cinfo\.coach/, 'the map card shows the coach as a portrait');
assert.ok(html.indexOf('adventure/portraits.js?v=') > 0 && html.indexOf('adventure/portraits.js?v=') < html.indexOf('adventure/story.js?v='), 'portraits.js loads before story.js');
console.log('portraits ok');
