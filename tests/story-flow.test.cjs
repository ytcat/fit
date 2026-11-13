// Story mode (GOTR-0069, chapter 1 rewritten as "The Dream" for GOTR-0078): ordered steps, one current step, locking, unlock on
// completion, the first Brick fight advances on a loss, old-save migration, the coin reward = the heavy bag's price, boss gate
// advice, and the story text in EN/HE/RU (boxing terms stay English, the Fighter is never "nobody").
const assert = require('node:assert/strict');
global.window = global;
const A = require('../adventure-progress.js'), G = require('../glossary.js'), D = require('../game-domain.js'), S = require('../adventure/story.js');
window.AdventureProgress = A;
const F = require('../adventure/story-flow.js');
const g0 = () => ({ adventure: A.fresh() });
const rec = (g, id, value) => A.recordMission(g, id, value, true);
const ev = (g, step, outcome) => A.recordStory(g, step, outcome);
const DREAM = ['dream_arrival', 'dream_gym_talk', 'first_brick', 'night_shadow', 'night_bag', 'dream_apology', 'market_robber', 'buy_heavy_bag', 'bag_drill', 'fight_prep', 'docks_fight', 'advanced_training', 'brick'];

// Ordering: chapter 1 is the script's 13 beats (0-12) in order + side job A after the first Brick fight; ids match the save list.
{
  const st = F.state(g0(), 1);
  assert.deepEqual(st.main.map(s => s.id), DREAM); assert.deepEqual(A.dreamSteps, DREAM, 'save order = story order');
  assert.deepEqual(st.main.map(s => s.beat), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(F.all(1).filter(s => s.side).map(s => [s.id, s.after]), [['clean_gym', 'first_brick']]);
  assert.equal(st.boss.id, 'brick'); assert.equal(F.chapters[1].coach, 'bruno');
  assert.deepEqual(F.state(g0(), 2).main.map(s => s.id), ['curb_footwork', 'clean_hands', 'kids_skateboard', 'rooftop_balloons', 'whistle_chase', 'grandma_groceries', 'crowd_circle', 'king_hyena']);
  for (const s of F.all(1)) if (!s.event && !s.boss) assert.ok(A.missions.some(m => m.id === s.id && m.chapter === 1), s.id + ' is a chapter-1 mission');
  for (const s of F.all(1).filter(s => s.event)) assert.ok(A.storyEvents.includes(s.id), s.id + ' is a story event');
  const ids = [1, 2].flatMap(n => F.all(n).map(s => s.id)); assert.equal(new Set(ids).size, ids.length, 'no duplicate steps');
  assert.deepEqual(F.titles[1], { en: 'The Dream', he: 'החלום', ru: 'Мечта' }); assert.equal(F.titles[2].en, 'Junior League');
}
// A fresh profile: beat 0 is the only current step; nothing later can start; the events must be played in order.
{
  const g = g0(), st = F.state(g, 1);
  assert.equal(st.current.id, 'dream_arrival'); assert.equal(st.total, 13); assert.ok(st.main.slice(1).every(s => s.status === 'locked'));
  assert.ok(st.side.every(s => s.status === 'hidden'));
  assert.equal(F.playable(g, 'first_brick'), false); assert.equal(F.chapterOpen(g, 2), false);
  assert.throws(() => ev(g, 'dream_gym_talk'), /before this one/, 'the talk needs the arrival first');
  ev(g, 'dream_arrival'); ev(g, 'dream_gym_talk');
  assert.equal(F.state(g, 1).current.id, 'first_brick'); assert.equal(F.nextAfter(g, 'dream_gym_talk'), 'first_brick');
}
// Beat 2: LOSING to Brick advances the story (no retry wall): beat 3 and side job A open, the save remembers the loss.
{
  const g = g0(); ev(g, 'dream_arrival'); ev(g, 'dream_gym_talk');
  assert.throws(() => ev(g, 'first_brick'), /Invalid fight result/);
  const r = ev(g, 'first_brick', 'lost'); assert.equal(r.firstBrick, 'lost');
  const st = F.state(g, 1); assert.equal(st.current.id, 'night_shadow'); assert.equal(st.main[2].status, 'done');
  assert.equal(st.side[0].status, 'open', 'side job A (Clean the gym) unlocked'); assert.equal(F.playable(g, 'clean_gym'), true);
  assert.deepEqual(F.unlocks('first_brick'), { next: 'night_shadow', side: ['clean_gym'], extra: F.find('first_brick').unlock });
  assert.equal(F.firstBrick(g), 'lost'); assert.equal(A.bossWon(g, 'brick'), false, 'the first fight is not the boss win');
  ev(g, 'first_brick', 'won'); assert.equal(F.firstBrick(g), 'lost', 'a replay keeps the first result');
  assert.ok(/Lost to Brick/.test(F.journal(g).find(j => j.id === 'first_brick').text));
  // Bruno's later lines follow the first fight.
  assert.ok(/put me down/.test(S.pick('night_shadow', 'intro', 'lost')[0].text.en)); assert.ok(/lucky win/.test(S.pick('night_shadow', 'intro', 'won')[0].text.en));
  assert.ok(/Brick put you down/.test(S.pick('bag_drill', 'outro', 'lost')[0].text.en)); assert.ok(/You beat Brick/.test(S.pick('bag_drill', 'outro', 'won')[0].text.en));
  const w = g0(); ev(w, 'dream_arrival'); ev(w, 'dream_gym_talk'); ev(w, 'first_brick', 'won');
  assert.equal(F.firstBrick(w), 'won'); assert.ok(/Beat Brick on the first day/.test(F.journal(w).find(j => j.id === 'first_brick').text));
}
// Mission beats finish with a star; story fights must be won; the purchase finishes beat 7.
{
  const g = g0(); for (const id of ['dream_arrival', 'dream_gym_talk']) ev(g, id); ev(g, 'first_brick', 'lost');
  rec(g, 'night_shadow', 19); assert.equal(F.state(g, 1).current.id, 'night_shadow', 'no star: still current');
  rec(g, 'night_shadow', 20); rec(g, 'night_bag', 1); ev(g, 'dream_apology');
  assert.throws(() => ev(g, 'market_robber', 'lost'), /Win the fight/); assert.equal(F.state(g, 1).current.id, 'market_robber');
  ev(g, 'market_robber', 'won'); assert.equal(F.state(g, 1).current.id, 'buy_heavy_bag');
}
// Coins (beat 6 -> beat 7): the market reward is exactly the heavy bag's price; buying it spends exactly that and finishes beat 7.
{
  const prev = globalThis.APP_VERSION; globalThis.APP_VERSION = { channel: 'live' };
  try {
    const bag = D.gear.find(x => x.id === 'heavy_bag'); assert.equal(D.storyRewards.market_robber, bag.price); assert.ok(bag.price > 0);
    const { CareerStore } = require('../career-progress.js');
    const mem = { v: new Map(), getItem(k) { return this.v.get(k) || null; }, setItem(k, x) { this.v.set(k, x); } };
    const s = new CareerStore(mem); s.create('Coins'); const act = a => s.gameAction({ type: 'adventure', adventure: 'story', ...a });
    for (const step of ['dream_arrival', 'dream_gym_talk']) assert.equal(act({ step }).ok, true); assert.equal(act({ step: 'first_brick', outcome: 'lost' }).ok, true);
    for (const [id, v] of [['night_shadow', 20], ['night_bag', 1]]) assert.equal(s.gameAction({ type: 'adventure', adventure: 'mission', missionId: id, measured: v }).ok, true);
    assert.equal(act({ step: 'dream_apology' }).ok, true);
    const c0 = D.wallet(s.game()).coins;
    assert.equal(act({ step: 'buy_heavy_bag' }).ok, false, 'the bag cannot be bought before the market');
    const r = act({ step: 'market_robber', outcome: 'won' }); assert.equal(r.ok, true); assert.equal(r.coins, bag.price);
    assert.equal(D.wallet(s.game()).coins, c0 + bag.price); assert.equal(act({ step: 'market_robber', outcome: 'won' }).coins, 0, 'the reward is paid once');
    const b = act({ step: 'buy_heavy_bag' }); assert.equal(b.ok, true); assert.equal(b.spent, bag.price);
    assert.equal(D.wallet(s.game()).coins, c0, 'the reward bought exactly the bag'); assert.ok(D.ownsGear(s.game(), 'heavy_bag'));
    assert.equal(F.state(s.game(), 1).current.id, 'bag_drill', 'the purchase completes beat 7');
    const re = new CareerStore(mem); assert.equal(D.wallet(re.game()).coins, c0); assert.equal(F.state(re.game(), 1).current.id, 'bag_drill', 'saved and validated');
    // A forged reward amount or a free bag is rejected by the save check.
    const bad = JSON.parse(JSON.stringify(s.game())); bad.ledger.find(t => t.id === 'story:market_robber').coins = 999;
    assert.throws(() => D.validate(bad, s.current()), /Invalid story reward/);
    const bad2 = JSON.parse(JSON.stringify(s.game())); bad2.ledger.find(t => t.id === 'purchase:gear:heavy_bag').coins = -1;
    assert.throws(() => D.validate(bad2, s.current()), /Invalid gear purchase/);
  } finally { globalThis.APP_VERSION = prev; }
}
// Save migration: an old save keeps equivalent progress (old step -> new beat, every beat up to it finished).
{
  const old = (missions, bossWins = 0) => ({ version: 1, missions, bosses: bossWins ? { brick: { wins: bossWins, losses: 0, free: true } } : {} });
  const m = (id, v) => ({ [id]: { stars: A.starsFor(id, v), value: v, plays: 1 } });
  assert.deepEqual(A.legacyBeat, { one_two_mitts: 1, heavy_bag_van: 2, bag_power: 4, snoring_guard: 5, teach_the_kid: 8, roll_under_hook: 9, morning_sparring: 10, brick: 12 });
  const cases = [
    [old({}), 'dream_arrival', null],
    [old(m('one_two_mitts', 8)), 'first_brick', null],
    [old(m('heavy_bag_van', 0)), 'night_shadow', 'lost'],
    [old({ ...m('one_two_mitts', 20), ...m('bag_power', 3) }), 'dream_apology', 'lost'],
    [old(m('teach_the_kid', 1)), 'fight_prep', 'lost'],
    [old(m('morning_sparring', 10)), 'advanced_training', 'lost'],
    [old(m('rope_rhythm', 30)), 'dream_arrival', null]
  ];
  for (const [a, current, fb] of cases) {
    const g = { adventure: A.validate(JSON.parse(JSON.stringify(a))) };
    assert.equal(F.state(g, 1).current?.id, current, JSON.stringify(a.missions)); assert.equal(F.firstBrick(g), fb);
    assert.ok(F.state(g, 1).main.filter(s => s.status === 'done').every((s, i) => s.n === i + 1), 'migrated beats are a prefix');
  }
  const won = { adventure: A.validate(old(m('one_two_mitts', 20), 1)) };
  assert.equal(F.state(won, 1).complete, true); assert.equal(F.firstBrick(won), 'won'); assert.equal(F.chapterOpen(won, 2), true);
  const keep = A.validate(old(m('bag_power', 5))); assert.equal(keep.missions.bag_power.stars, 3, 'old stars are kept (level unchanged)');
  assert.deepEqual(A.validate(A.fresh()), A.fresh()); assert.deepEqual(A.validate({ version: 1, missions: {}, bosses: {} }), A.fresh(), 'an empty old save = a fresh one');
  const twice = A.validate(old(m('bag_power', 5))); twice.story.done = ['dream_arrival']; assert.deepEqual(A.validate(twice).story.done, ['dream_arrival'], 'migration runs only once');
  assert.throws(() => A.validate({ ...A.fresh(), story: { done: ['first_brick'] } }), /Invalid adventure/, 'first_brick needs its result');
  assert.throws(() => A.validate({ ...A.fresh(), story: { done: ['mystery'] } }), /Invalid adventure/);
}
// Boss gate at the rematch: below Brick's entry level the advice names the level, the missing stars and the steps to replay.
{
  const g = g0();
  for (const s of F.state(g, 1).main.filter(s => !s.boss)) s.event ? ev(g, s.id, s.id === 'first_brick' ? 'lost' : 'won') : rec(g, s.id, A.missions.find(m => m.id === s.id).thresholds[0]);
  const st = F.state(g, 1); assert.equal(st.current.id, 'brick'); assert.equal(st.maxStars, 18, 'five measured beats + side job A, 3 stars each');
  const gt = F.gate(g, 1); assert.equal(A.level(g), 1, "5 stars = Level 1"); assert.equal(gt.need, 5); assert.equal(gt.stars, F.starsToLevel(g, 5)); assert.equal(gt.ready, true);
  assert.equal(gt.steps.length, 2); assert.ok(gt.steps.every(id => F.playable(g, id) && !F.find(id).event), 'advice names measured steps');
  A.recordBoss(g, 'brick', true, true);
  assert.equal(F.state(g, 1).complete, true); assert.equal(F.chapterOpen(g, 2), true); assert.equal(F.nextAfter(g, 'brick'), 'clean_gym', 'the open side job first'); rec(g, 'clean_gym', 8); assert.equal(F.nextAfter(g, 'brick'), 'curb_footwork');
  assert.ok(/whole neighbourhood/.test(F.journal(g).pop().text));
}
// Text: every step has a title, ONE short line (why) and a recap in EN/HE/RU; HE/RU keep only the glossary terms in Latin.
const latin = t => /[A-Za-z]/.test(G.strip(String(t).replace(/\{\w+\}/g, '')));
for (const n of [1, 2]) for (const s of F.all(n)) for (const k of ['title', 'why', 'recap', 'recapWon', 'unlock', 'goal', 'stand']) {
  if (!s[k]) { assert.notEqual(k, 'title'); continue; }
  for (const lang of ['en', 'he', 'ru']) { const t = s[k][lang]; assert.ok(t && t.length < 240, s.id + ' ' + k + ' ' + lang); if (lang !== 'en') assert.ok(!latin(t), s.id + ' ' + k + ' ' + lang + ': ' + t); }
  if (k === 'why') assert.ok(s.why.en.split(/[.!?]["”]?\s/).length <= (n === 1 ? 2 : 3), s.id + ' why is short');
  if (n === 1 && k === 'why') assert.ok(s.why.en.length <= 70, s.id + ' one short line: ' + s.why.en.length);
}
for (const s of F.all(1)) assert.ok(S.who[s.who], s.id + ' has a face for the quest panel');
// Dialogue for beats 0-12 + side job A: EN/HE/RU, 1-2 sentences, known speakers; "nobody" never names the Fighter or the chapter.
for (const s of F.all(1)) {
  const l = S.lines[s.id]; assert.ok(l?.intro?.length && l?.outro?.length, s.id + ' has intro and outro lines');
  for (const [kind, list] of Object.entries(l)) for (const line of list) {
    assert.ok(S.who[line.who], s.id + ' speaker ' + line.who); assert.ok(list.length <= 2, s.id + ' ' + kind);
    for (const lang of ['en', 'he', 'ru']) { const t = line.text[lang]; assert.ok(t && t.length <= 90, s.id + ' ' + kind + ' ' + lang + ': ' + t); if (lang !== 'en') assert.ok(!latin(t), s.id + ' ' + lang + ': ' + t); }
    assert.ok(line.text.en.split(/[.!?]\s/).length <= 3, s.id + ' ' + kind + ' is short: ' + line.text.en);
  }
}
const all1 = JSON.stringify([F.all(1), F.titles, F.opener, ...F.all(1).map(s => S.lines[s.id])]);
assert.ok(!/nobody|никто|אף אחד/i.test(all1), 'the Fighter is never called nobody');
for (const lang of ['he', 'ru']) {
  for (const [k, v] of Object.entries(F.copy[lang])) assert.ok(!latin(v), lang + ' ' + k + ': ' + v);
  for (const k of Object.keys(F.copy.en)) assert.ok(k in F.copy[lang], lang + ' is missing ' + k);
  for (const c of Object.values(F.react)) for (const v of Object.values(c)) assert.ok(!latin(v[lang]), v[lang]);
  for (const v of Object.values(F.opener)) assert.ok(!latin(v[lang]), v[lang]);
}
assert.equal(F.fill(F.copy.en.gate, { n: 5, l: 3, k: 6, list: 'step 2 or step 4' }), 'Level 5 needed, you are 3: earn 6 more stars. Replay step 2 or step 4.');
console.log('story-flow ok');
