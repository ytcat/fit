// Owner's development tools (GOTR-0078 dev feedback): "Skip step (dev)" finishes a story step with its minimum passing result and
// any step can start out of order, ONLY in the development build (APP_VERSION.channel 'dev'); "Reset game" (all builds) clears this
// device's progress and first-run flags but keeps the language.
const assert = require('node:assert/strict');
global.window = global;
const A = require('../adventure-progress.js'), D = require('../game-domain.js'), G = require('../glossary.js'), C = require('../career-progress.js');
window.AdventureProgress = A; window.GameDomain = D; window.GotrGlossary = G;
window.app = { lang: 'en', engine: { player: { enabled: true } } };
const SF = require('../adventure/story-flow.js'); window.StoryFlow = SF;
require('../adventure/oldtown.js');
const OT = window.AdventureOldTown;
const mem = () => ({ v: new Map(), get length() { return this.v.size; }, key(i) { return [...this.v.keys()][i] ?? null; }, getItem(k) { return this.v.has(k) ? this.v.get(k) : null; }, setItem(k, x) { this.v.set(k, String(x)); }, removeItem(k) { this.v.delete(k); } });

// Not the development build: no skip, no out-of-order story events.
for (const channel of ['live', undefined]) {
  globalThis.APP_VERSION = channel ? { channel } : undefined;
  assert.equal(OT.devMode(), false, String(channel)); assert.equal(OT.devSkipAction('first_brick'), null); assert.equal(OT.devSkipAction('night_shadow'), null);
  const s = new C.CareerStore(mem()); s.create('Live');
  const r = s.gameAction({ type: 'adventure', adventure: 'story', step: 'market_robber', outcome: 'won' }); assert.equal(r.ok, false, 'no story event out of order outside dev');
}
// Development build: the skip action per kind of step, then the whole chapter by skips alone.
{
  globalThis.APP_VERSION = { channel: 'dev' };
  assert.equal(OT.devMode(), true);
  assert.deepEqual(OT.devSkipAction('first_brick'), { type: 'adventure', adventure: 'story', step: 'first_brick', outcome: 'lost' });
  assert.deepEqual(OT.devSkipAction('market_robber'), { type: 'adventure', adventure: 'story', step: 'market_robber', outcome: 'won' });
  assert.deepEqual(OT.devSkipAction('dream_arrival'), { type: 'adventure', adventure: 'story', step: 'dream_arrival' });
  assert.deepEqual(OT.devSkipAction('night_shadow'), { type: 'adventure', adventure: 'mission', missionId: 'night_shadow', measured: { landed: 20 } });
  assert.deepEqual(OT.devSkipAction('brick'), { type: 'adventure', adventure: 'boss', bossId: 'brick', won: true });
  const s = new C.CareerStore(mem()); s.create('Dev'); const coins0 = D.wallet(s.game()).coins;
  // out of order: a later step can be finished first (any step startable)
  assert.equal(s.gameAction(OT.devSkipAction('docks_fight')).ok, true, 'dev: a later story event can be recorded first');
  for (let i = 0; i < 20; i++) { const cur = SF.state(s.game(), 1).current; if (!cur) break; const r = s.gameAction(OT.devSkipAction(cur.id)); assert.equal(r.ok, true, cur.id + ': ' + r.error); }
  const st = SF.state(s.game(), 1); assert.equal(st.complete, true, 'chapter 1 finished by skips'); assert.equal(SF.firstBrick(s.game()), 'lost');
  for (const m of st.main.filter(x => !x.event && !x.boss)) assert.equal(m.stars, 1, m.id + ' minimum pass = 1 star');
  assert.ok(D.ownsGear(s.game(), 'heavy_bag'), 'the bag is granted'); assert.equal(D.wallet(s.game()).coins, coins0 + D.storyRewards.market_robber + D.storyRewards.docks_fight, 'the bag cost nothing; the fight rewards are paid');
  assert.equal(SF.chapterOpen(s.game(), 2), true);
  globalThis.APP_VERSION = undefined;
}
// Reset game: everything this origin stored goes, except display preferences; the welcome and the opening film come back.
{
  const st = mem();
  for (const [k, v] of [['shadowbox-language', 'he'], ['ringfighter-career-v1', '{}'], ['gotr.adv.intro.p1', '1'], ['gotr-scene-dream_opening', '1'], ['gotr.adv.story', '[]'], ['ringfighter-resume-v1', '{}'], ['shadowbox-coach', 'lion'], ['gotr-side-camera', '1'], ['gotr-sound', 'off']]) st.setItem(k, v);
  const s = new C.CareerStore(st); assert.ok(s.data);
  const removed = C.resetDevice(st, { clear() { this.cleared = true; } });
  assert.deepEqual([...st.v.keys()].sort(), ['gotr-side-camera', 'gotr-sound', 'shadowbox-language']);
  assert.ok(removed.includes('ringfighter-career-v1') && removed.includes('gotr.adv.intro.p1') && removed.includes('gotr-scene-dream_opening'));
  const fresh = new C.CareerStore(st); assert.equal(fresh.data.profiles.length, 0, 'no profile: the welcome dialog shows again'); assert.equal(fresh.current(), null);
}
// The new words exist in EN/HE/RU and HE/RU keep only glossary terms in Latin.
for (const lang of ['he', 'ru']) assert.ok(!/[A-Za-z]/.test(G.strip(SF.copy[lang].devSkip)), SF.copy[lang].devSkip);
const ci = require('node:fs').readFileSync(require('node:path').join(__dirname, '../career-interface.js'), 'utf8');
for (const k of ['reset', 'resetAsk', 'resetGo', 'resetCancel']) assert.equal((ci.match(new RegExp(k + ":'", 'g')) || []).length, 3, k + ' in EN/HE/RU');
console.log('story dev tools ok');
