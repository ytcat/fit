// Owner 2026-11-22 (iPhone, first Brick fight): "The game stuck" — the bout was paused during a Burst; the punches were refused while
// the Burst ran, so no fight button resumed it and only the small play button did. And before the fight Bruno stood inside the fighters.
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const input = read('boxing-input.js'), burst = read('burst-ui.js'), pause = read('fight-pause.js'), gym = read('adventure/story/gym-fight.js'), html = read('index.html');
assert.match(input, /resumeFight\(\)\{const e=this\.engine;if\(e\.isPlaying\|\|window\.ringfighterGame\?\.isModalOpen\|\|!this\.enabled\|\|!e\.arena\?\.fightView\?\.match\|\|e\.arena\.fightView\.match\.result\)return false;e\.isPlaying=true;/);
assert.match(input, /press\(id\)\{\n   if\(this\.resumeFight\(\)\)return true;/, 'every fight button resumes a paused bout before anything else');
assert.match(burst, /if\(!e\.isPlaying&&e\.player\?\.resumeFight\?\.\(\)\)return true;/);
assert.match(pause, /W = \{ en: \['Paused', 'Tap to continue'\], he: \['מושהה', 'הקישו כדי להמשיך'\], ru: \['Пауза', 'Нажмите, чтобы продолжить'\] \}/);
assert.match(pause, /!e\.isPlaying && !window\.ringfighterGame\?\.isModalOpen/, 'not shown while a menu pauses the game on purpose');
assert.match(read('fight-hud.css'), /\.fight-paused\[hidden\]\{display:none!important\}/);
assert.ok(html.indexOf('fight-pause.js') > html.indexOf('burst-ui.js'));
assert.ok(JSON.parse(read('offline-manifest.json')).urls.some(u => u.startsWith('./fight-pause.js')));
// a resumed bout: behave with a stub engine
{ global.window = { ringfighterGame: { isModalOpen: false }, app: { updatePlayBtnText() {} } };
  const src = input.match(/resumeFight\(\)\{[^\n]*\}/)[0], fn = new Function('return {' + src + '}')();
  const e = { isPlaying: false, arena: { fightView: { match: { result: null } } }, onInputState() {} };
  assert.strictEqual(fn.resumeFight.call({ engine: e, enabled: true }), true); assert.strictEqual(e.isPlaying, true);
  assert.strictEqual(fn.resumeFight.call({ engine: e, enabled: true }), false, 'a running bout is left alone');
  e.isPlaying = false; window.ringfighterGame.isModalOpen = true; assert.strictEqual(fn.resumeFight.call({ engine: e, enabled: true }), false); }
// Bruno stands at the referee spot from the first frame
assert.match(gym, /bruno\.root\.position\.set\(1\.13, 0, -\.83\); bruno\.root\.rotation\.set\(0, -\.55, 0\);/);
assert.match(read('fight-arena.js'), /this\.referee\.root\.position\.set\(ceremony\?1\.13\*\(1-ease\):1\.13,0,ceremony\?-\.83\+\.71\*ease:-\.83\)/, 'the same spot as the arena\'s referee');
console.log('fight-pause: ok');
