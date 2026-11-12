// GOTR-0062 Boss Brick: phases by health, the tell before the big hook and its timing window, the read (Duck) and the
// answer (Uppercut), the weak point and its bonus damage, the big hook's extra damage; scouting (save, notebook line,
// marked tell) and the chapter 1 choice (save, validation, old saves, consequences later in the story). Runs the real
// BoxingFight match without the 3D arena: contacts are reported by hand where a test needs one.
const assert = require('node:assert/strict');
global.window = global;
require('../boxing-fight.js');
const A = require('../adventure-progress.js'), G = require('../glossary.js');
window.AdventureProgress = A;
const B = require('../adventure/boss-fight.js'), F = require('../adventure/story-flow.js');
const DT = 1 / 60;
function bout(o = {}) {
  const m = new BoxingFight({ seed: o.seed || 7, preset: 'quick', rounds: 3, roundSeconds: 30, restSeconds: 8 });
  m.setPlayer('lion');
  const ctl = B.attach(m, { boss: 'brick', actor: 'rabbit', player: 'lion', scouted: o.scouted });
  return { m, ctl, s: ctl.state, f: m.fighters.rabbit };
}
const run = (m, sec) => { for (let t = 0; t < sec; t += DT) m.advance(DT); };
const until = (m, test, max = 40) => { for (let t = 0; t < max; t += DT) { m.advance(DT); const r = test(); if (r) return r; } return null; };
const lastEvent = (m, type) => [...m.events].reverse().find(e => e.type === type);
const eventAfter = (m, type, id) => m.events.find(e => e.type === type && e.id > id);

// Phases by health: 1 above 60%, 2 at 60% and below, 3 at 25% and below.
assert.equal(B.phaseFor('brick', 1), 1); assert.equal(B.phaseFor('brick', .61), 1); assert.equal(B.phaseFor('brick', .6), 2);
assert.equal(B.phaseFor('brick', .26), 2); assert.equal(B.phaseFor('brick', .25), 3); assert.equal(B.phaseFor('brick', 0), 3);
{
  const { m, s, f } = bout(); run(m, 4);
  assert.equal(s.phase, 1); const t1 = f.tempo;
  f.condition = 59; m.advance(DT);
  assert.equal(s.phase, 2, 'phase 2 at 60% health'); const ev = lastEvent(m, 'boss-phase'); assert.equal(ev.phase, 2); assert.equal(ev.key, 'charge');
  assert.ok(f.tempo > t1, 'he charges: faster tempo'); assert.equal(f.action.phaseBeat, true, 'a short beat before the new pattern');
  f.condition = 24; m.advance(DT); assert.equal(s.phase, 3); assert.equal(lastEvent(m, 'boss-phase').key, 'wild');
  assert.ok(f.skill < B.BOSSES.brick.phases[0].skill + 1 && f.tempo < t1 * 1.06, 'tired: slower, defends less');
  f.condition = 80; m.advance(DT); assert.equal(s.phase, 3, 'phases never go back');
  assert.equal(m.events.filter(e => e.type === 'boss-phase').length, 2);
}
// The tell: his right (lead) glove drops for the tell's time, then the big lead hook starts at once.
{
  const { m, s, f } = bout();
  const tell = until(m, () => lastEvent(m, 'boss-tell')); assert.ok(tell, 'a tell comes in the first seconds');
  assert.ok(tell.time >= 3 + 3 - .05 && tell.time < 3 + 3 + 2, 'first tell about 3 s after the bell: ' + tell.time);
  assert.equal(f.action.guardStyle, 'drop_lead'); assert.equal(f.action.tell, true);
  const hook = until(m, () => eventAfter(m, 'boss-hook', tell.id));
  const gap = hook.time - tell.time; assert.ok(Math.abs(gap - B.BOSSES.brick.phases[0].tell) < 2.5 * DT, 'hook starts when the tell ends: ' + gap);
  assert.equal(f.action.move, 'hook'); assert.equal(f.action.big, true);
  // no Duck: the hook ends without a read; the next tell is planned
  const end = until(m, () => eventAfter(m, 'boss-hook-end', hook.id)); assert.ok(end); assert.equal(s.reads, 0); assert.equal(s.answers, 0);
  const next = until(m, () => eventAfter(m, 'boss-tell', end.id)); assert.ok(next.time - end.time > B.BOSSES.brick.phases[0].every - 1, 'tells are spaced');
}
// The timing window: a Duck long before the tell does not count; a Duck during the tell does.
{
  const { m, s } = bout();
  until(m, () => m.phase === 'round' && m.roundTime > 1); m.requestPlayerMove({ move: 'roll', duration: .76 });
  const tell = until(m, () => lastEvent(m, 'boss-tell')); assert.equal(s.rolled, false, 'an early Duck is not a read');
  until(m, () => eventAfter(m, 'boss-hook-end', tell.id)); assert.equal(s.reads, 0);
  const t2 = until(m, () => eventAfter(m, 'boss-tell', tell.id)); run(m, .25); m.requestPlayerMove({ move: 'roll', duration: .76 }); m.advance(DT);
  assert.equal(s.rolled, true, 'Duck during the tell');
  const read = until(m, () => eventAfter(m, 'boss-read', t2.id)); assert.ok(read, 'a dodged hook is a read'); assert.equal(s.reads, 1);
  assert.equal(m.fighters.rabbit.action.stagger, true, 'he is over-committed after a missed hook');
  // Uppercut too late: after the counter window, it is not an answer
  run(m, B.BOSSES.brick.counterSeconds + .3); m.requestPlayerMove({ move: 'uppercut', target: 'head' }); m.advance(DT); assert.equal(s.answers, 0);
}
// Three right answers (Duck, then Uppercut) open the weak point; hits in it count double, then the counter starts again.
{
  const { m, s, f } = bout({ seed: 11 });
  for (let i = 1; i <= 3; i++) {
    const tell = until(m, () => s.tell && s.tell.start > (s.lastTell || -1) && s.tell); s.lastTell = tell.start;
    run(m, .2); m.requestPlayerMove({ move: 'roll', duration: .76 });
    const read = until(m, () => s.reads >= i); assert.ok(read, 'read ' + i);
    m.requestPlayerMove({ move: i === 2 ? 'rear_uppercut' : 'uppercut', target: 'head' }); m.advance(DT);
    if (i < 3) assert.equal(s.answers, i, 'answer ' + i);
  }
  const weak = lastEvent(m, 'boss-weak'); assert.ok(weak, 'weak point opens after three answers'); assert.equal(s.answers, 0, 'the count starts again');
  assert.ok(s.weakUntil - m.time > 4 && f.action.guardStyle === 'drop_both' && f.action.weak, 'he staggers with both hands down');
  // bonus damage: the same clean hit takes twice the health in the weak point
  const hit = (mm, ff) => { mm.fighters.lion.action = null; ff.stun = 0; mm.fighters.lion.stamina = 1; const a = mm.attack('lion', 'cross', 'head'); const c0 = ff.condition; mm.contact({ actor: 'lion', action: a.id, part: 'head', speed: 2 }); mm.fighters.lion.action = null; return c0 - ff.condition; };
  const inWeak = hit(m, f);
  run(m, 5); assert.ok(lastEvent(m, 'boss-weak-end'), 'the weak point closes');
  const fresh = bout({ seed: 11 }); run(fresh.m, 4); const normal = hit(fresh.m, fresh.f);
  assert.ok(Math.abs(inWeak / normal - B.BOSSES.brick.weakBonus) < .25, `weak point bonus ${inWeak.toFixed(2)} vs ${normal.toFixed(2)}`);
}
// The big hook hurts more when it lands, and a landed hook is no read even with a late Duck.
{
  const { m, s } = bout({ seed: 5 });
  until(m, () => s.hook); const lion = m.fighters.lion, c0 = lion.condition;
  m.contact({ actor: 'rabbit', action: s.hook.id, part: 'head', speed: 2 }); const big = c0 - lion.condition;
  assert.equal(s.hook.landed, true); m.requestPlayerMove({ move: 'roll', duration: .76 });
  until(m, () => !s.hook); assert.equal(s.reads, 0, 'a landed hook is not a read'); assert.equal(s.landedBig, 1);
  run(m, 1); m.fighters.rabbit.action = null; const a = m.attack('rabbit', 'hook', 'head'); const c1 = lion.condition; lion.stun = 0;
  m.contact({ actor: 'rabbit', action: a.id, part: 'head', speed: 2 }); const plain = c1 - lion.condition;
  assert.ok(big / plain > 1.3, `the big hook hits harder ${big.toFixed(2)} vs ${plain.toFixed(2)}`);
}
// A full simulated bout: the boss keeps fighting through rounds and rests without errors; detach restores the match.
{
  const { m, ctl, s } = bout({ seed: 3 }); run(m, 120);
  assert.ok(m.result || m.phase === 'ceremony' || m.round >= 3); assert.ok(s.tells >= 6, 'tells through the bout: ' + s.tells);
  ctl.detach(); assert.equal(Object.prototype.hasOwnProperty.call(m, 'decide'), false);
}
// Clip mode (scouting video): the regular does not defend the tell, so the hook can be seen landing.
{
  const m = new BoxingFight({ seed: 9, preset: 'quick', rounds: 1, roundSeconds: 14, restSeconds: 0 });
  const ctl = B.attach(m, { boss: 'brick', actor: 'rabbit', player: 'lion', clip: true }); run(m, 15);
  assert.ok(ctl.state.tells >= 2, 'the clip shows the tell at least twice: ' + ctl.state.tells);
}
// HUD text: phase line, answers, the marked tell only when scouted.
{
  const { m, ctl, s } = bout({ scouted: true });
  assert.equal(B.stripText(ctl, 'Brick', 'en'), 'Brick · Phase 1/3: Slow heavy Hooks · ○○○');
  until(m, () => s.tell); assert.equal(B.callFor(ctl, null, m.time, 'en').text, 'Right hand down → Duck!');
  const plain = bout(); until(plain.m, () => plain.s.tell); assert.equal(B.callFor(plain.ctl, null, plain.m.time, 'en'), null, 'no hint without scouting');
  const latin = t => /[A-Za-z]/.test(G.strip(String(t).replace(/\{\w+\}/g, '')));
  for (const lang of ['he', 'ru']) {
    for (const v of Object.values(B.copy.words[lang])) assert.ok(!latin(v), lang + ': ' + v);
    for (const k of ['tell', 'counter', 'notebook']) assert.ok(!latin(B.copy[k].brick[lang]), lang + ' ' + k);
    for (const p of B.copy.phases.brick) assert.ok(!latin(p[lang]), p[lang]);
    for (const v of Object.values(B.copy.lines.brick)) assert.ok(!latin(v[lang]), v[lang]);
    assert.ok(!latin(B.stripText(ctl, lang === 'he' ? 'בריק' : 'Брик', lang)));
  }
}
// Scouting: saved per boss (tries, right once = right), a step after First Sparring, the notebook line and the Coach's tip.
{
  const rec = (g, id, v) => A.recordMission(g, id, v, false);
  const g = { adventure: A.fresh() };
  assert.equal(A.scouted(g, 'brick'), false); assert.equal(F.doneOf(g, F.find('scout_brick')), false);
  const st0 = F.state(g, 1); assert.equal(st0.side.find(s => s.id === 'scout_brick').status, 'hidden', 'scouting appears after First Sparring');
  for (const m of A.missions.filter(x => x.chapter === 1 && x.id !== 'first_stance')) rec(g, m.id, m.thresholds[2]);
  assert.equal(F.state(g, 1).side.find(s => s.id === 'scout_brick').status, 'open'); assert.deepEqual(F.unlocks('morning_sparring').side, ['scout_brick']);
  assert.equal(F.state(g, 1).maxStars, 8 * 3, 'scouting gives no stars and is not counted');
  assert.ok(!F.gate({ adventure: A.fresh() }, 1)?.steps.includes('scout_brick'));
  let r = A.recordScout(g, 'brick', false, false); assert.deepEqual(r, { bossId: 'brick', correct: false, scouted: false, tries: 1 });
  assert.equal(F.doneOf(g, F.find('scout_brick')), true, 'watched = done'); assert.equal(A.scouted(g, 'brick'), false, 'wrong answer: no hint');
  r = A.recordScout(g, 'brick', true, false); assert.equal(r.scouted, true); A.recordScout(g, 'brick', false, false); assert.equal(A.scouted(g, 'brick'), true, 'once right, stays right');
  assert.deepEqual(A.validate(JSON.parse(JSON.stringify(g.adventure))).scouting, { brick: { correct: true, tries: 3 } });
  assert.throws(() => A.recordScout(g, 'king_hyena', true, false), /not open/); assert.throws(() => A.recordScout(g, 'nobody', true)); assert.throws(() => A.recordScout(g, 'brick', 'yes'));
  for (const bad of [{ brick: { correct: true, tries: 0 } }, { brick: { correct: 1, tries: 1 } }, { dragon: { correct: true, tries: 1 } }, { brick: { correct: true, tries: 1, x: 1 } }, null])
    assert.throws(() => A.validate({ ...JSON.parse(JSON.stringify(g.adventure)), scouting: bad }), JSON.stringify(bad));
  assert.equal(F.scouting.brick.answers.filter(a => a.right).length, 1); assert.equal(F.scouting.brick.answers.length, 3);
  assert.equal(F.tipFor({ adventure: A.fresh() }, 'brick').stat, 'stamina', 'all equal: Stamina tip (finish before phase 3)');
  assert.match(F.tipFor({ adventure: A.fresh() }, 'brick').text, /phase 3/);
  const strong = { adventure: A.fresh() }; for (const id of ['rope_rhythm', 'morning_sparring', 'bag_power']) rec(strong, id, A.missions.find(m => m.id === id).thresholds[2]);
  assert.equal(F.tipFor(strong, 'brick').stat, 'speed', 'the weakest stat decides the tip');
  // a beaten boss is not offered for scouting any more (unless already watched)
  const g2 = { adventure: A.fresh() }; for (const m of A.missions.filter(x => x.chapter === 1 && x.id !== 'first_stance')) rec(g2, m.id, m.thresholds[2]);
  A.recordBoss(g2, 'brick', true, false); assert.equal(F.state(g2, 1).side.find(s => s.id === 'scout_brick').status, 'hidden'); assert.equal(F.nextAfter(g2, 'brick'), 'curb_footwork');
}
// Chapter 1 choice: only after Brick, once, validated; old saves (no choices key) load and take it; consequences later.
{
  const rec = (g, id, v) => A.recordMission(g, id, v, false);
  const old = { version: 1, missions: {}, bosses: {} }; for (const m of A.missions.filter(x => x.chapter === 1 && x.id !== 'first_stance')) { old.missions[m.id] = { stars: 3, value: m.thresholds[2], plays: 1 }; }
  old.bosses.brick = { wins: 1, losses: 0, free: false };
  const g = { adventure: A.validate(JSON.parse(JSON.stringify(old))) }; assert.equal(A.choice(g, 'ch1'), null, 'an old save has no choice yet');
  assert.equal(F.pendingChoice(g, 'brick'), 'ch1', 'the choice is asked after Brick');
  const fresh = { adventure: A.fresh() }; assert.throws(() => A.recordChoice(fresh, 'ch1', 'handshake'), /boss first/); assert.equal(F.pendingChoice(fresh, 'brick'), null);
  assert.throws(() => A.recordChoice(g, 'ch1', 'hug'), /Unknown/); assert.throws(() => A.recordChoice(g, 'ch9', 'walk'), /Unknown/);
  assert.deepEqual(A.action(g, { adventure: 'choice', choiceId: 'ch1', value: 'handshake' }), { choiceId: 'ch1', value: 'handshake' });
  assert.throws(() => A.recordChoice(g, 'ch1', 'walk'), /already/); assert.equal(F.pendingChoice(g, 'brick'), null);
  const saved = JSON.parse(JSON.stringify(g.adventure)); assert.deepEqual(A.validate(saved).choices, { ch1: 'handshake' }, 'persisted through a save round-trip');
  assert.throws(() => A.validate({ ...saved, choices: { ch1: 'hug' } })); assert.throws(() => A.validate({ ...saved, bosses: {}, choices: { ch1: 'walk' } }), /choice/);
  // consequences: Story so far, later steps remember it
  const j = F.journal(g); assert.deepEqual(j.slice(j.findIndex(x => x.id === 'brick')).map(x => x.id), ['brick', 'ch1']);
  assert.match(j.find(x => x.id === 'ch1').text, /Sparring partner/);
  assert.equal(F.notesFor(g, 'king_hyena')[0].who, 'brick'); assert.match(F.notesFor(g, 'king_hyena')[0].text, /laugh/);
  assert.equal(F.notesFor(g, 'one_two_mitts').length, 0);
  const w = { adventure: JSON.parse(JSON.stringify(old)) }; A.recordChoice(w, 'ch1', 'walk');
  assert.match(F.notesFor(w, 'crowd_circle')[0].text, /Dash/); assert.match(F.journal(w).find(x => x.id === 'ch1').text, /Dash's corner/);
  void rec;
  // text: EN/HE/RU, HE/RU keep only glossary terms in Latin
  const latin = t => /[A-Za-z]/.test(G.strip(String(t).replace(/\{\w+\}/g, '')));
  const texts = [];
  for (const c of Object.values(F.choices)) { texts.push(c.title, c.ask); for (const o of Object.values(c.options)) texts.push(o.label, o.reply, o.recap); }
  for (const by of Object.values(F.notes)) for (const st of Object.values(by)) for (const n of Object.values(st)) texts.push(n.text);
  for (const a of F.scouting.brick.answers) texts.push(a.text); for (const t of Object.values(F.tips.brick)) texts.push(t);
  for (const t of texts) for (const lang of ['en', 'he', 'ru']) { assert.ok(t[lang], JSON.stringify(t)); if (lang !== 'en') assert.ok(!latin(t[lang]), lang + ': ' + t[lang]); }
}
console.log('boss-brick ok');
