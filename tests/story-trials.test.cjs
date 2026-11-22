// Skill trials (GOTR-0061): the adventure's side games are short trials on the boxing mechanics. Rules, scoring, the value
// each mission records and its stars, escalation, risk/reward and determinism.
const assert = require('node:assert/strict');
global.window = global;
const A = require('../adventure-progress.js'), T = require('../adventure/story/trials-core.js');
const starsFor = A.starsFor, DT = 1 / 120;
const play = (g, bot, max = 200) => { let n = 0; while (!g.done && n++ < max / DT) { bot(g, g.view()); g.step(DT); } return g; };
const tap = (g, k) => { g.key(k, true); g.key(k, false); };
for (const R of [T.BAG, T.ECHO, T.BARRAGE, T.CUTOFF, T.BET]) { const m = A.missions.find(x => x.id === R.missionId); assert.ok(m, R.missionId); assert.equal(m.metric, R.metric, R.missionId + ' records the mission metric'); }

// ---- Brick's bag (GOTR-0077): a real swinging bag; the punch lands where the glove meets the leather
{
  const R = T.BAG, PUNCHES = ['straight', 'hook', 'uppercut'], ideal = (g, v) => { if (v.prompt && v.prompt !== 'back' && !g.punch && g.t >= v.due) tap(g, v.type); }, back = (g, v) => { if (v.phase === 'bite' && !v.hold && (!g.dodge || g.t > g.dodge.at + 1.3)) tap(g, 'left'); };
  const ace = play(new T.BagTrial(), ideal), r = ace.result(starsFor);
  assert.equal(r.finished, true); assert.equal(r.value, 0); assert.equal(r.hits, R.swings); assert.equal(r.stars, 3); assert.equal(r.streak, R.swings);
  assert.ok(r.time >= 25 && r.time <= 60, 'a 25-60 s trial: ' + r.time); assert.ok(r.score > R.swings * 150, 'streak multiplier: ' + r.score);
  assert.deepEqual(new Set(ace.types).size, 3, 'all three punches are called for');
  // the same bag as the picture (bag-break-core.js BAG) and a real pendulum: small swings keep the rigid pendulum's period
  const B = require('../adventure/story/bag-break-core.js').BAG; assert.deepEqual([R.r, R.h, R.d], [B.r, B.h, B.ring], 'rules and picture share the bag');
  const P = T.bagPhysics(); let q = { a1: .05, w1: 0, a2: .05, w2: 0, p: 0, wp: 0, s: 0, ws: 0 }, last = 0, cross = [];
  let amp = 0; for (let n = 0; n < 1200; n++) { const q2 = P.step(q, DT); if (q.a1 > 0 && q2.a1 <= 0) cross.push(n * DT); q = q2; if (n > 1200 - 300) amp = Math.max(amp, Math.abs(q.a1)); }
  const T2 = cross[1] - cross[0]; assert.ok(Math.abs(T2 / P.period - 1) < .03, `period ${T2.toFixed(3)} s vs ${P.period.toFixed(3)} s`); assert.ok(amp < .05 && amp > .025, 'light damping, the swing dies out slowly: ' + amp.toFixed(3));
  // every hit is decided at the glove: at the moment the rules land it the striking hand is on the leather (within 5 mm), never inside
  const g = new T.BagTrial(), landed = []; let n = 0;
  while (!g.done && n++ < 30000) { const v = g.view(); ideal(g, v); const p = g.punch; g.step(DT); if (p && p.contact && !p.checked && g.t >= p.contact.t) { p.checked = true; const L = g.phys.leather(g.bagAt(p.contact.t - 1e-6), p.contact.hand); landed.push(L.gap - R.glove); } }
  assert.equal(landed.length, R.swings); for (const gap of landed) assert.ok(gap <= .001 && gap > -.006, 'glove on the leather: ' + gap);
  // the swing tells the range: a Straight swing stays further out than a Hook, an Uppercut comes closest; nothing comes into the guard
  const apex = type => { const h = new T.BagTrial(); h.types[0] = type; h.i = 0; h.call(0, -.2); let s = h.sw.start, body = 9; for (let k = 0; k < 300; k++) { s = h.phys.step(s, DT); body = Math.min(body, h.bodyGap(s, 0)); if (s.w1 <= 0 && k > 4) break; } return { a: s.a1, body, win: h.sw.close - h.sw.open }; };
  const st = apex('straight'), hk = apex('hook'), up = apex('uppercut');
  assert.ok(st.a < hk.a && hk.a < up.a, `apex angles ${st.a.toFixed(2)} < ${hk.a.toFixed(2)} < ${up.a.toFixed(2)}`); for (const x of [st, hk, up]) assert.ok(x.body >= R.clear - .005, 'clear of the guard: ' + x.body);
  for (const x of [st, hk, up]) assert.ok(x.win >= .35 && x.win <= .8, 'a fair press window: ' + x.win.toFixed(2));
  // a first-time player who presses when the ring closes, up to 0.15 s off either way, lands the first three swings
  for (const off of [-.15, -.08, 0, .08]) { const f = new T.BagTrial(); play(f, (g2, v) => { if (v.prompt && v.prompt !== 'back' && !g2.punch && g2.t >= v.due + off && g2.i < 3) tap(g2, v.type); }, 12); assert.ok(f.hits >= 2 && f.log.some(e => e.type === 'hit' || e.type === 'perfect'), `offset ${off}: ${f.hits} hits in the first swings`); }
  // wrong punch: a mistake and the bag comes back; stepping back saves the second mistake, standing still is "bagged"
  const w = new T.BagTrial(); while (!w.view().open) w.step(DT); tap(w, w.sw.type === 'hook' ? 'straight' : 'hook'); while (!w.sw.verdict) w.step(DT);
  assert.equal(w.mistakes, 1); assert.equal(w.streak, 0); assert.equal(w.flash.type, 'wrong');
  while (!w.sw.bite) w.step(DT); assert.equal(w.view().prompt, 'back'); assert.equal(w.i, 0, 'the bite belongs to the same swing');
  while (w.view().hold) w.step(DT); tap(w, 'left'); while (w.i === 0) w.step(DT); assert.equal(w.mistakes, 1, 'stepped back from the returning bag'); assert.equal(w.dodged, 1);
  const s2 = new T.BagTrial(); while (!s2.view().open) s2.step(DT); tap(s2, s2.sw.type === 'hook' ? 'straight' : 'hook'); while (s2.i === 0) s2.step(DT); assert.equal(s2.mistakes, 2); assert.equal(s2.bitten, 1);
  // doing nothing: every swing goes by and every bite lands
  const lazy = play(new T.BagTrial(), () => {}).result(starsFor); assert.equal(lazy.value, R.swings * 2); assert.equal(lazy.stars, 0);
  // too early (the glove runs out before the bag comes) is a mistake judged when the punch ends; one punch per swing: mashing loses
  const e = new T.BagTrial(); e.step(.2); tap(e, e.sw.type); for (let k = 0; k < 40; k++) e.step(DT); assert.equal(e.mistakes, 1); assert.equal(e.flash.type, 'early');
  const mash = play(new T.BagTrial(), (g2, v) => { if (!g2.punch) tap(g2, PUNCHES[Math.floor(g2.t * 7) % 3]); back(g2, v); }).result(starsFor); assert.ok(mash.value >= 12, 'mashing does not earn a medal: ' + mash.value);
  // a punch takes the bag: right after a hit it moves away from the Fighter
  const k = new T.BagTrial(); while (!k.hits) { ideal(k, k.view()); k.step(DT); } k.step(.05); assert.ok(k.view().bag.w1 < -.1, 'the bag swings away: ' + k.view().bag.w1);
  // hard: faster and tighter, still clean for a perfect player; deterministic
  const hard = play(new T.BagTrial(undefined, { hard: true }), ideal).result(starsFor); assert.equal(hard.hard, true); assert.ok(hard.time < r.time * .95, `hard is faster: ${hard.time} vs ${r.time}`); assert.equal(hard.value, 0);
  assert.deepEqual(play(new T.BagTrial(), ideal).result(starsFor), r, 'deterministic');
}
// ---- Sleep talker: repeat the growing combo
{
  const ace = play(new T.EchoTrial(), (g, v) => { if (v.phase === 'input') tap(g, v.seq[v.idx]); }), r = ace.result(starsFor);
  assert.equal(r.value, 9); assert.equal(r.stars, 3); assert.equal(r.lives, 3); assert.ok(r.time >= 20 && r.time <= 90, 'time ' + r.time);
  assert.ok(T.ECHO.lengths.every((n, i) => !i || n >= T.ECHO.lengths[i - 1]), 'sequences never shrink'); assert.equal(T.ECHO.lengths.at(-1), 6);
  const g = new T.EchoTrial(); const lit = []; while (g.view().phase !== 'input') { const v = g.view(); if (v.lit >= 0 && lit.at(-1) !== v.lit) lit.push(v.lit); g.step(DT); }
  assert.deepEqual(lit, [0, 1], 'the lamps light in order'); tap(g, g.seq[0] === 'hook' ? 'straight' : 'hook'); assert.equal(g.view().phase, 'wake', 'a wrong hit wakes him'); assert.equal(g.view().prompt, 'down');
  while (g.view().wake < .7) g.step(DT); tap(g, 'down'); while (g.phase === 'wake') g.step(DT); assert.equal(g.lives, 3, 'ducked the pillow'); assert.equal(g.round, 0, 'the round is asked again');
  const sleepy = play(new T.EchoTrial(), () => {}).result(starsFor); assert.equal(sleepy.value, 0); assert.equal(sleepy.lives, 0); assert.equal(sleepy.stars, 0);
  const half = play(new T.EchoTrial(), (g2, v) => { if (v.phase === 'input') tap(g2, v.round < 4 ? v.seq[v.idx] : v.seq[v.idx] === 'hook' ? 'straight' : 'hook'); }).result(starsFor); assert.equal(half.value, 4); assert.equal(half.stars, 1);
}
// ---- Rooftop barrage: dodge by arc, punch the marked ones back
{
  const safe = (g, v) => { if (v.balloon && v.balloon.k > .62 && !v.dodge && v.balloon.state === 'fly') tap(g, v.prompt); };
  const s = play(new T.BarrageTrial(), safe).result(starsFor); assert.equal(s.value, 12); assert.equal(s.stars, 3); assert.equal(s.hits, 0); assert.equal(s.reflected, 0); assert.ok(s.time >= 20 && s.time <= 60, 'time ' + s.time);
  const bold = play(new T.BarrageTrial(), (g, v) => { if (v.balloon?.marked) { if (v.canReflect) tap(g, 'straight'); } else safe(g, v); }).result(starsFor);
  assert.ok(bold.reflected >= 3, 'marked balloons: ' + bold.reflected); assert.equal(bold.hits, 0); assert.ok(bold.score > s.score, 'reflecting pays more: ' + bold.score + ' > ' + s.score);
  const g = new T.BarrageTrial(); const mi = g.list.findIndex(b => b.marked); while (g.i < mi || !g.view().balloon) { safe(g, g.view()); g.step(DT); } tap(g, 'straight'); assert.equal(g.b.state, 'whiff', 'punching too early is the risk'); while (g.i === mi) g.step(DT); assert.equal(g.hits, 1);
  const wet = play(new T.BarrageTrial(), () => {}).result(starsFor); assert.equal(wet.hits, T.BARRAGE.count); assert.equal(wet.value, 0); assert.equal(wet.stars, 0);
  const wrong = play(new T.BarrageTrial(), (g2, v) => { if (v.balloon && v.balloon.k > .62 && !v.dodge) tap(g2, v.prompt === 'left' ? 'down' : 'left'); }).result(starsFor); assert.equal(wrong.hits, T.BARRAGE.count, 'the dodge must match the arc');
  assert.deepEqual(Object.values(T.BARRAGE.keys).sort(), ['down', 'left', 'right']);
}
// ---- Cut him off: stay level, step in
{
  const cut = (g, v) => { const [fc, fr] = v.cell.f, [rc, rr] = v.cell.rc; if (fr !== rr) g.key(rr > fr ? 'down' : 'up', true); else if (fc - rc > 1) g.key('left', true); };
  const pro = play(new T.CutoffTrial(), cut).result(starsFor); assert.equal(pro.finished, true); assert.equal(pro.catches, 5); assert.ok(pro.value >= 8, 'not over in a blink: ' + pro.value); assert.equal(pro.escapes, 0); assert.ok(pro.value <= 20 && pro.stars === 3, 'clean cut-off is gold: ' + pro.value + ' s');
  const idle = play(new T.CutoffTrial(), () => {}).result(starsFor); assert.equal(idle.finished, false); assert.ok(idle.escapes >= 3, 'he runs past a Fighter who does not move'); assert.equal(idle.stars, 0);
  const g = new T.CutoffTrial(); g.f = { c: 5, r: 4, fc: 5, fr: 4, t0: 0 }; g.rc = { c: 4, r: 1, fc: 4, fr: 1, t0: 0 }; assert.ok(g.options().some(o => o.c === 5), 'two lanes away: the way past is open');
  g.f = { c: 5, r: 2, fc: 5, fr: 2, t0: 0 }; assert.ok(!g.options().some(o => o.c === 5), 'level with him: the way past is closed');
  g.rc = { c: 0, r: 0, fc: 0, fr: 0, t0: 0 }; g.f = { c: 1, r: 1, fc: 1, fr: 1, t0: 0 }; assert.equal(g.options().length, 0, 'cornered'); g.f = { c: 2, r: 1, fc: 2, fr: 1, t0: 0 }; assert.ok(g.options().length > 0);
  const f = new T.CutoffTrial(); f.rc = { c: 5, r: 2, fc: 5, fr: 2, t0: 0 }; f.key('left', true); assert.deepEqual([f.f.c, f.f.r], [6, 2], 'cannot step onto him'); f.step(.5); f.key('up', true); f.key('up', true); assert.equal(f.f.r, 1, 'one step per move time');
  const esc = new T.CutoffTrial(); esc.rc = { c: 6, r: 0, fc: 6, fr: 0, t0: 0 }; esc.f = { c: 3, r: 4, fc: 3, fr: 4, t0: 0 }; esc.nextBeat = 0; const t0 = esc.t; esc.step(DT); assert.equal(esc.escapes, 1); assert.ok(esc.t - t0 >= T.CUTOFF.escape, 'an escape costs 5 s');
}
// ---- The hustler's bet: punish real openings only
{
  const read = (g, v) => { if (v.phase === 'open' && !v.punished && v.k > .15) tap(g, 'straight'); if (v.phase === 'offer') tap(g, 'down'); };
  const cool = play(new T.BetTrial(), read).result(starsFor); assert.equal(cool.hits, T.BET.opens); assert.equal(cool.value, 12); assert.equal(cool.stars, 3); assert.equal(cool.bites, 0); assert.ok(cool.time >= 25 && cool.time <= 70, 'time ' + cool.time);
  const g0 = new T.BetTrial(); assert.equal(g0.events[0], 'feint', 'he starts with a feint'); assert.equal(g0.events.filter(e => e === 'open').length, T.BET.opens);
  const greedy = play(new T.BetTrial(), (g, v) => { if (v.phase !== 'idle' && v.phase !== 'offer' && !v.punished) tap(g, 'straight'); }).result(starsFor); assert.equal(greedy.bites, 3, 'three bites lose the bet'); assert.ok(greedy.hits < T.BET.opens);
  const mash = play(new T.BetTrial(), g => tap(g, 'hook')).result(starsFor); assert.equal(mash.bites, 3); assert.equal(mash.stars, 0);
  // double or nothing: only offered after four hits; winning doubles the score, losing halves the record and clears the score
  const dbl = bot => play(new T.BetTrial(), (g, v) => { if (v.phase === 'offer') tap(g, 'up'); else if (v.stage === 'bonus') bot(g, v); else if (v.phase === 'open' && !v.punished && v.k > .15 && g.hits < 6) tap(g, 'straight'); });
  const win = dbl((g, v) => { if (v.phase === 'open' && !v.punished) tap(g, 'straight'); }).result(starsFor); assert.equal(win.doubled, true); assert.equal(win.hits, 8); assert.equal(win.score > 0, true);
  const base = play(new T.BetTrial(), (g, v) => { if (v.phase === 'offer') tap(g, 'down'); else if (v.phase === 'open' && !v.punished && v.k > .15 && g.hits < 6) tap(g, 'straight'); }).result(starsFor); assert.equal(win.score, base.score * 2, 'double');
  const bust = dbl((g, v) => { if (v.phase === 'feint') tap(g, 'straight'); }).result(starsFor); assert.equal(bust.hits, 3); assert.equal(bust.score, 0, 'nothing');
  const slow = dbl(() => {}).result(starsFor); assert.equal(slow.hits, 3, 'missing the last opening loses the double');
  const few = new T.BetTrial(); play(few, (g, v) => { if (v.phase === 'offer') throw Error('no offer under four hits'); }); assert.equal(few.hits, 0);
  assert.ok(T.BET.open[1] < T.BET.open[0], 'openings get shorter');
}
// streak multiplier: every four in a row add one, up to five
{ const t = new T.Trial({}); for (let i = 0; i < 30; i++) t.gain(100); assert.equal(t.mult, 5); t.fail(); assert.equal(t.mult, 1); assert.equal(t.maxStreak, 30); }
console.log('story-trials ok');
