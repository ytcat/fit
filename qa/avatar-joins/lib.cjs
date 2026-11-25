// qa/avatar-joins/lib.cjs — Node harness for the avatar-joins audit: builds every character on the game's rig exactly as the
// page does (same scripts, same surface data incl. the rabbit body and the shoulder correctives), poses it through the
// pose set and skins the vertices on the CPU with the rig's own skinPoint (= the vertex shader).
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const ROOT = process.env.ROOT || path.join(__dirname, '../..');
let loaded = false;
function load() {
  if (loaded) return; loaded = true; process.chdir(ROOT);
  global.THREE = require(path.join(ROOT, 'assets/vendor/three.min.js')); global.window = global;
  global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: (_, key) => key === 'createImageData' ? ((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })) : () => {} }) }) };
  global.EQUIPMENT_SURFACES = JSON.parse(fs.readFileSync('assets/models/equipment-surfaces-r76.json'));
  for (const f of ['boxing-routines.js', 'avatar-anatomy.js', 'avatar-detail.js', 'avatar-shoulder.js', 'boxing-footwear.js', 'padding-deformation.js', 'boxing-coach-v2.js',
    'adventure/story/paws.js', 'adventure/story/story-cast.js', 'adventure/story/cast-market.js', 'adventure/story/cast-docks.js', 'adventure/story/street-wear.js', 'adventure/story/dream-pose.js'])
    if (fs.existsSync(f)) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
}
let DATA = null;
function data() {
  if (DATA) return DATA; load();
  DATA = JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));
  DATA.rabbitBody = JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
  DATA.shoulderCorrectives = JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
  return DATA;
}
module.exports = { load, data, ROOT };
