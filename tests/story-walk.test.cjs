// GOTR-0122 story walks (owner 2026-11-25): the Chapter 1 sequence of walks, the one-time start, resume, the device fallback,
// the story-led walk (no selector, no Day/Night) and every word in EN / HE / RU.
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const C = require('../adventure/free-walk/free-walk-core.js'), A = require('../adventure-progress.js');
const src = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

/* ---- 1. the sequence: a walk exactly where the next step happens at another place than where the last one ended */
{
  const steps = A.dreamSteps, end = id => id === 'dream_arrival' ? 'bus_stop' : C.storyTarget(id); // the arrival film ends at the bus stop
  const walks = [];
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1], next = steps[i], w = C.walkFor(next), from = end(prev), to = C.storyTarget(next);
    assert.ok(to, next + ' has a place');
    if (from === to) { assert.equal(w, null, `${prev} -> ${next}: same place, no walk`); continue; }
    assert.ok(w, `${prev} -> ${next}: ${from} -> ${to} must be a walk`);
    assert.deepEqual([w.after, w.from, w.to], [prev, from, to], next);
    walks.push(`${from}->${to}`);
  }
  assert.deepEqual(walks, ['bus_stop->bruno', 'bruno->market_stall', 'market_stall->otto', 'otto->bruno', 'bruno->docks_quay', 'docks_quay->bruno']);
  assert.deepEqual(Object.keys(C.STORY_WALKS).sort(), ['advanced_training', 'bag_drill', 'buy_heavy_bag', 'docks_fight', 'dream_gym_talk', 'market_robber']);
  assert.equal(C.walkFor('dream_gym_talk').carry, 'duffel', 'off the bus with his duffel'); assert.equal(C.walkFor('bag_drill').carry, 'heavybag', 'the new bag on his shoulder');
  assert.equal(C.walkFor('brick'), null, 'the rematch is in the gym: no walk'); assert.equal(C.walkFor('nope'), null);
}

/* ---- 2. one walk per step, resumable; older saves are never sent back */
{
  const rec = (step, phase, more) => C.parseWalk(JSON.stringify({ step, phase, ...more }));
  assert.ok(C.walkDue('market_robber', null, false), 'a new step: walk');
  assert.ok(C.walkDue('market_robber', rec('market_robber', 'walk', { x: 1, z: 2, open: true }), false), 'mid-walk: still the walk');
  assert.equal(C.walkDue('market_robber', rec('market_robber', 'arrived'), false), null, 'walked: never again (a lost street fight is retried at the market)');
  assert.ok(C.walkDue('buy_heavy_bag', rec('market_robber', 'arrived'), false), 'the next walk');
  assert.equal(C.walkDue('bag_drill', null, true), null, 'an older save that already tried the step stays where it is');
  assert.ok(C.walkDue('bag_drill', rec('bag_drill', 'walk'), true), 'unless this walk was started');
  assert.equal(C.walkDue('night_bag', null, false), null, 'no walk for a same-place step');
  // the record: a broken or foreign value is ignored (never a crash, never a wrong walk)
  for (const raw of [null, '', '{', '[]', '{"step":"x","phase":"walk"}', '{"step":"market_robber","phase":"done"}', 42]) assert.equal(C.parseWalk(raw), null, String(raw));
  const r = rec('docks_fight', 'walk', { x: 10.5, z: -3, ry: 1.2, open: true });
  assert.deepEqual([r.step, r.phase, r.x, r.z, r.ry, r.open], ['docks_fight', 'walk', 10.5, -3, 1.2, true]);
  assert.equal(rec('docks_fight', 'walk', { x: 'a', z: 1 }).x, undefined, 'a broken position: start at the place the film ended');
  assert.equal(C.walkKey('p1'), 'gotr.storywalk.v1.p1'); assert.notEqual(C.walkKey('p1'), C.saveKey('p1'), 'its own key, never the game save');
}

/* ---- 3. the light follows the story (no Day/Night buttons) */
{
  assert.equal(C.storyTime('dream_gym_talk', 1), 'morning'); assert.equal(C.storyTime('night_bag', 1), 'night'); assert.equal(C.storyTime('docks_fight', 1), 'night');
  assert.equal(C.storyTime('advanced_training', 1), 'night', 'the walk back from the Docks'); assert.equal(C.storyTime('brick', 1), 'evening', 'fight night');
  assert.equal(C.storyTime(null, 2), 'evening'); assert.equal(C.storyTime('x', 3), 'night'); assert.equal(C.storyTime(null, 9), 'day');
}

/* ---- 4. the bus stop: a street 40-70 m from the gym, on the kerb toward it */
{
  const g = C.roadGraph([{ a: [0, 0], b: [100, 0], w: 8 }, { a: [100, 0], b: [100, 100], w: 8 }, { a: [0, 0], b: [0, 30], w: 8 }]);
  const grid = { allowed: () => true, nearest: (x, z) => ({ x, z }) }, gym = { x: 50, z: 52 };
  const b = C.busStop(g, grid, gym); assert.ok(b, 'found');
  assert.ok(Math.abs(b.x - 50) < .01 && Math.abs(b.z - 5.2) < .01, JSON.stringify(b)); // the middle of the first street, 5.2 m to the gym's side
  assert.ok(Math.abs(b.ry - Math.atan2(0, 46.8)) < 1e-6, 'faces the gym');
  assert.equal(C.busStop(g, grid, { x: 500, z: 500 }), null, 'no street in reach: none (the walk then starts at the gym door)');
}

/* ---- 5. every word in EN / HE / RU (owner 2026-11-23): each walk's objective and the story HUD */
{
  const HE = /[֐-׿]/, RU = /[Ѐ-ӿ]/;
  for (const step of Object.keys(C.STORY_WALKS)) for (const l of C.LANGS) assert.ok(C.COPY['goal_' + step]?.[l]?.trim(), `goal_${step} ${l}`);
  for (const k of [...Object.keys(C.STORY_WALKS).map(s => 'goal_' + s), 'goalPlace', 'goalDone', 'walkHelp', 'keysHint', 'entry', 'entryLabel', 'entryBusy']) {
    assert.ok(HE.test(C.COPY[k].he), k + ' he'); assert.ok(RU.test(C.COPY[k].ru), k + ' ru'); assert.notEqual(C.COPY[k].he, C.COPY[k].en);
  }
  assert.equal(C.text('he', 'goalPlace', { place: 'X' }), 'סיפור: X'); assert.equal(C.text('ru', 'goal_docks_fight'), 'Иди в доки на подпольный бой');
}

/* ---- 6. the wiring: the walk is story-led, opens where the film ended, starts the step once; a device that cannot walk
 * goes on directly; a quit mid-walk resumes; the old ?walkPrototype=1 hand-over is gone */
{
  const fw = src('adventure/free-walk/free-walk.js'), ot = src('adventure/oldtown.js'), ds = src('adventure/story/dream-scenes.js'), css = src('adventure/free-walk/free-walk.css');
  assert.ok(!/createElement\('select'\)|fw-time|TIME_KEY|dayB|nightB/.test(fw), 'no selector, no Day/Night');
  assert.match(fw, /R\.time = plan\.time|time: plan\.time/, 'the light comes from the story');
  assert.match(fw, /destination: walk \? walk\.to : plan\.target/, 'the destination comes from the story');
  assert.match(fw, /if \(R\.walk\?\.step === tk\.step\) \{ R\.walkDone = true; arrive\(tk\.step\); \}/, 'walked in: the walk is done before the step opens');
  assert.match(fw, /tickets\(\)\.consume\(R\.ticket\.nonce\)/, 'one launch per ticket');
  assert.match(fw, /if \(opts\.walk \|\| walk\) \{ close\('quiet'\); return false; \}/, 'a story walk that cannot start leaves nothing open');
  assert.match(fw, /window\.addEventListener\('pagehide', save\)/, 'the position is kept when the page goes away');
  assert.match(ot, /if \(!o\.walked && walkGate\(id\)\) return true;/, 'every way into a step passes the walk gate');
  assert.match(ot, /const direct = \(\) => \{ try \{ F\.arrive\?\.\(id\); \} catch \{[^}]*\} before\(gameCtx\(\), id, \{ walked: true \}\); \};/, 'fallback: the old direct transition');
  assert.match(ot, /Promise\.resolve\(p\)\.then\(ok => \{ if \(!ok\) direct\(\); \}, direct\);/);
  assert.match(ot, /if \(fresh && next && walkGate\(next\)\) return;/, 'films hand over to the walk');
  assert.match(ot, /if \(bought && walkOn\(\)\) return;/, 'the bag bought: carry it to the gym');
  assert.match(ot, /if \(at\.ok && walkOn\(\)\) return;/, 'a won street or Docks fight: walk on');
  assert.match(ot, /return resumeWalk\(\);/, 'a quit mid-walk resumes');
  assert.match(ot, /S\.play\(d\.scene, \{ onDone: finish, until \}\)/); assert.match(ot, /OPENING_CUT = 15\.6/);
  assert.match(ds, /const cut = opts\.until > 0 && opts\.until < scene0\.duration; if \(cut\) scene0 = \{ \.\.\.scene0, duration: opts\.until \};/);
  assert.ok(!/walkAPI|StreetWalkPrototype\?\.enabled/.test(ds), 'the ?walkPrototype=1 hand-over is retired');
  assert.ok(!/dir\s*=\s*['"]rtl/.test(fw + ot) && /direction:ltr/.test(css), 'left-to-right in every language');
}

/* ---- 7. the flow itself (oldtown.js in a stub page): gate -> walk; walk cannot start -> the step goes on directly, once */
{
  const SF = require('../adventure/story-flow.js');
  const plays = [], opens = [], arrived = [];
  let walkOk = false, due = { step: 'dream_gym_talk', ...C.walkFor('dream_gym_talk') };
  const g = { adventure: { ...A.fresh(), story: { done: ['dream_arrival'] } } };
  const node = () => ({ remove() {}, classList: { remove() {}, add() {}, toggle() {} }, append() {}, setAttribute() {}, style: {}, dataset: {} });
  global.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], body: node(), createElement: node, documentElement: { dir: 'ltr' } };
  global.localStorage = { getItem: () => null, setItem() {} };
  global.requestAnimationFrame = f => setTimeout(f, 0);
  global.window = { AdventureProgress: A, StoryFlow: SF, FreeWalkCore: C, app: { lang: 'en' }, dispatchEvent() {},
    ringfighterGame: { store: { game: () => g, current: () => ({ id: 'p1' }), gameAction: a => A.action(g, a, true) }, close() {}, open() {}, apply() {} },
    StoryScenes: { sceneIds: ['dream_gym_talk', 'dream_opening'], play: (id, o) => { plays.push([id, o?.until]); return true; } },
    FreeWalk: { storyWalk: () => due, available: () => true, willWalk: () => true, arrive: id => { arrived.push(id); due = null; }, open: o => { opens.push(o.walk); return Promise.resolve(walkOk); } } };
  require('../adventure/oldtown.js');
  const OT = window.AdventureOldTown, ctx = { store: window.ringfighterGame.store, change: () => true };
  (async () => {
    // a. the walk opens (and nothing else starts) when the step is due
    walkOk = true; assert.equal(OT.before(ctx, 'dream_gym_talk'), true); await new Promise(r => setTimeout(r, 5));
    assert.deepEqual(opens, ['dream_gym_talk']); assert.deepEqual(plays, [], 'no film over the walk'); assert.deepEqual(arrived, []);
    // b. the device cannot show the walk: marked walked, the step's film plays directly, exactly once
    walkOk = false; OT.before(ctx, 'dream_gym_talk'); await new Promise(r => setTimeout(r, 5));
    assert.deepEqual(arrived, ['dream_gym_talk']); assert.deepEqual(plays.map(p => p[0]), ['dream_gym_talk']);
    // c. walked (or fallen back): the gate stays open, the step plays without a second walk
    OT.before(ctx, 'dream_gym_talk'); await new Promise(r => setTimeout(r, 5));
    assert.deepEqual(opens, ['dream_gym_talk', 'dream_gym_talk'], 'no walk once walked'); assert.equal(plays.length, 2);
    // d. the arrival film is cut at the bus stop only when a walk follows it
    g.adventure.story.done = []; OT.launch(ctx, 'dream_arrival'); assert.deepEqual(plays[2], ['dream_opening', 15.6]);
    console.log('story-walk: ok');
  })().catch(e => { console.error(e); process.exit(1); });
}
