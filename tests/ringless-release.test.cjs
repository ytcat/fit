// Owner 2026-11-22 (iPhone, two-sided drill after the market street fight): "Where are lion hands?" The street bout's bare-hand
// dressing (ringless-venues.js) stayed installed while the story moved on (after-film, Otto's shop, the drill): the outfit went
// back to the kit but the gloves stayed hidden, so the Fighter had no hands. A finished story bout now gives everything back
// and is never dressed again; every story film/scene releases it first.
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const R = read('ringless-venues.js');
assert.match(R, /view\.gymFight \|\| view\.ringlessDone\) return false/, 'a released bout is never dressed again');
assert.match(R, /function release\(engine, final = false\) \{ const view = engine\?\.arena\?\.fightView; if \(!view\) return; if \(final\) view\.ringlessDone = true; if \(view\.ringless\) uninstall\(view\); \}/);
assert.match(read('adventure/oldtown.js'), /RinglessVenues\?\.release\(window\.app\?\.engine, true\);[^\n]*\n\s*const S = window\.StoryScenes;\n\s*if \(d\.after && res\?\.ok/, 'story fight end releases the bout');
for (const f of ['adventure/story/story-scenes.js', 'adventure/story/dream-scenes.js'])
  assert.match(read(f), /function play\(id, opts = \{\}\) \{\n\s*window\.RinglessVenues\?\.release\(window\.app\?\.engine, true\);/, f + ' releases the bout before a scene');
// a new bout is a new view (fight-arena.js), so the flag never blocks the next street fight
assert.match(read('fight-arena.js'), /this\.fightView=new FightArena\(/);

// behaviour: a fake view dressed by install() gets its gloves back on release(engine, true) and is not dressed again
const worn = [];
global.window = { StoryCast: { outfit: (c, w) => { worn.push(w); return true; }, outfitOf: () => 'kit' } };
const RV = require('../ringless-venues.js');
{
  const glove = { visible: true, userData: {} }, rig = { skin: {}, root: {}, joints: { handL: { children: [glove] }, handR: { children: [] } } };
  const view = { ring: { visible: true }, referee: { root: { visible: true } }, coaches: { lion: rig }, dispose() { } }, engine = { arena: { fightView: view } };
  assert.strictEqual(RV.install(view, 'street'), true); assert.strictEqual(glove.visible, false, 'bare hands in the street bout');
  RV.release(engine, true); assert.strictEqual(glove.visible, true, 'gloves back when the story moves on'); assert.strictEqual(view.ringless, null); assert.deepStrictEqual(worn, ['street', 'kit']);
  assert.strictEqual(RV.install(view, 'street'), false); assert.strictEqual(glove.visible, true, 'not dressed again behind the story');
  const next = { ring: { visible: true }, referee: { root: { visible: true } }, coaches: { lion: rig }, dispose() { } };
  assert.strictEqual(RV.install(next, 'street'), true, 'the next street bout is dressed as usual');
}
console.log('ringless-release: ok');
