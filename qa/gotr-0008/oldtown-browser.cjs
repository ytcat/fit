// GOTR-0008 slice C1: Old Town playable in the real app. Numbers first, screenshots only with SHOTS=dir.
// node qa/gotr-0008/oldtown-browser.cjs   (static server on :8191 from the repo root; APP_URL to change)
// Real play is slow in the software renderer, so mission values are driven through the same hooks the game uses
// (engine.onImpact / career.onFrame / match.finish); a few real presses are also counted to prove the live signal.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8191/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
const openTown = p => p.evaluate(() => ringfighterGame.open('adventure', { onReady: h => h.select('oldtown') }));
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const [name, vp, lang, full] of [['phone', { width: 402, height: 690 }, 'en', true], ['phone', { width: 402, height: 690 }, 'he', false], ['desk', { width: 1366, height: 768 }, 'en', false]]) {
      const p = await b.newPage({ viewport: vp }), errors = [], tag = `${name} ${lang}`;
      p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('Old Town QA'); });
      await p.reload({ timeout: 300000 }); await ready(p);
      await p.evaluate(l => app.setLanguage(l), lang);
      await openTown(p); await p.waitForSelector('.adv-mission', { timeout: 300000 }); await p.waitForTimeout(1500);
      // 1. card: nine missions, goals, funny ones "Coming soon", boss gate
      const card = await p.evaluate(() => {
        const c = document.querySelector('.adv-card'), r = c.getBoundingClientRect(), d = document.querySelector('dialog[open]').getBoundingClientRect(), rows = [...c.querySelectorAll('.adv-mission')];
        return { rows: rows.length, soon: rows.filter(x => x.querySelector('.adv-soon-pill')).map(x => x.dataset.mission), starts: rows.filter(x => x.querySelector('.adv-mini')).length, stars: c.querySelector('.adv-town-total').textContent, boss: c.querySelector('.adv-boss-gate').textContent, bossBtn: c.querySelector('.adv-boss .adv-go')?.textContent, within: r.bottom <= d.bottom + 1 && r.top >= d.top, minBtn: Math.min(...[...c.querySelectorAll('button')].filter(x => x.offsetParent).map(x => x.getBoundingClientRect().height)), stageH: Math.round(document.querySelector('.adv-stage').getBoundingClientRect().height), hScroll: c.scrollWidth > c.clientWidth + 1, dir: document.querySelector('dialog[open]').dir };
      });
      console.log(tag, 'card', JSON.stringify(card));
      assert.equal(card.rows, 9); assert.deepEqual(card.soon, ['heavy_bag_van', 'snoring_guard']); assert.equal(card.starts, 7);
      assert.ok(/0 \/ 27/.test(card.stars) && /5/.test(card.boss) && /25%/.test(card.boss), JSON.stringify(card));
      assert.ok(card.within && card.minBtn >= 32 && !card.hScroll, 'card layout ' + JSON.stringify(card));
      if (SHOTS && full) await p.screenshot({ path: `${SHOTS}/oldtown-${name}-${lang}-list.png`, timeout: 300000 });
      // 2. One-two on the mitts: start, goal strip, live signal, finish with measured values, result, back, card updated
      await p.evaluate(() => document.querySelector('[data-mission=one_two_mitts] .adv-mini').click());
      await wait(p, () => document.getElementById('advGoal') && app.engine.career.active);
      const s0 = await p.evaluate(() => ({ strip: document.getElementById('advGoal').innerText, mode: app.engine.targetMode, play: app.engine.player.enabled, modal: !!document.querySelector('dialog[open]') }));
      console.log(tag, 'start', JSON.stringify(s0)); assert.equal(s0.mode, 'pads'); assert.ok(s0.play && !s0.modal && /0\/20/.test(s0.strip), JSON.stringify(s0));
      if (full) { // live signal: real presses on the mitts
        for (let i = 0; i < 16; i++) { await p.evaluate(i => app.engine.player.press(i % 2 ? 'cross' : 'jab'), i); await p.waitForTimeout(800); }
        const live = await p.evaluate(() => AdventureOldTown.run.value); console.log(tag, 'real clean hits from 16 presses', live); assert.ok(live >= 1, 'real mitt hits counted');
      }
      const have = await p.evaluate(() => AdventureOldTown.run.value);
      await p.evaluate(n => { for (let i = 0; i < n; i++) app.engine.onImpact({ actor: 'lion', receiver: 'pads', kind: 'pad', move: i % 2 ? 'cross' : 'jab', blocked: false, impulse: 20 }); }, 20 - have);
      if (SHOTS && full) await p.screenshot({ path: `${SHOTS}/oldtown-${name}-${lang}-strip.png`, timeout: 300000 });
      await wait(p, () => document.getElementById('advNext'));
      const res = await p.evaluate(() => { const bar = document.getElementById('advNext'), pad = document.getElementById('fighterPad'), br = bar.getBoundingClientRect(), pr = pad && !pad.hidden ? pad.getBoundingClientRect() : null; return { toasts: [...document.querySelectorAll('.adv-toast')].map(x => x.textContent).join(' | '), bar: [...bar.querySelectorAll('button')].map(x => x.textContent), blocking: !!document.querySelector('dialog[open]') || !!document.getElementById('advResult'), aboveGamePad: !pr || br.bottom <= pr.top + 1, inView: br.left >= 0 && br.right <= innerWidth, game: app.engine.career.store.game().adventure.missions.one_two_mitts, stats: AdventureProgress.statPoints(app.engine.career.store.game()) }; });
      console.log(tag, 'result', JSON.stringify(res)); assert.equal(res.game.stars, 3); assert.equal(res.game.value, 20); assert.equal(res.stats.speed, 2);
      assert.ok(!res.blocking && res.aboveGamePad && res.inView, 'no blocking card, Next bar above the pad: ' + JSON.stringify(res));
      assert.ok(/★★★/.test(res.toasts) && /Speed|מהירות/.test(res.toasts) && /XP|ניסיון/.test(res.toasts), res.toasts);
      assert.ok(res.bar.length === 2 && /Bag power|מבחן כוח/.test(res.bar[0]), JSON.stringify(res.bar)); // primary: next mission, then the map
      if (SHOTS && full) await p.screenshot({ path: `${SHOTS}/oldtown-${name}-${lang}-result.png`, timeout: 300000 });
      // the primary button starts the next mission (Bag power test, heavy bag) right away
      await p.evaluate(() => document.querySelector('#advNext .adv-next-main').click());
      await wait(p, () => document.getElementById('advGoal') && app.engine.targetMode === 'heavy' && !document.getElementById('advNext'));
      console.log(tag, 'next mission strip', await p.evaluate(() => document.getElementById('advGoal').innerText));
      await p.evaluate(() => document.querySelector('#advGoal .adv-goal-quit').click());
      await p.waitForSelector('.adv-mission', { timeout: 300000 }); await p.waitForTimeout(1500);
      const back = await p.evaluate(() => ({ row: document.querySelector('[data-mission=one_two_mitts] .adv-mission-stars').textContent, total: document.querySelector('.adv-town-total').textContent, chip: document.getElementById('fighterStatsChip')?.textContent, boss: document.querySelector('.adv-boss-gate').textContent, gone: !document.getElementById('advGoal') && !document.getElementById('advNext') }));
      console.log(tag, 'back', JSON.stringify(back)); assert.ok(back.row === '★★★' && /3 \/ 27/.test(back.total) && back.gone && / 2 /.test(back.boss) && /35%/.test(back.boss), JSON.stringify(back));
      if (SHOTS && full) await p.screenshot({ path: `${SHOTS}/oldtown-${name}-${lang}-updated.png`, timeout: 300000 });
      if (full) {
        // 3. every other playable mission starts its activity with a goal strip (and quits cleanly)
        for (const [id, mode] of [['first_stance', 'rabbit'], ['bag_power', 'heavy'], ['roll_under_hook', 'pads'], ['rope_rhythm', 'rope'], ['teach_the_kid', 'heavy'], ['morning_sparring', 'fight']]) {
          await p.evaluate(i => document.querySelector(`[data-mission=${i}] .adv-mini`).click(), id);
          await wait(p, () => document.getElementById('advGoal'));
          const st = await p.evaluate(() => ({ strip: document.getElementById('advGoal').innerText, mode: app.engine.targetMode, active: !!app.engine.career.active, lesson: !!window.AcademyStage?.state }));
          console.log(tag, id, JSON.stringify(st)); assert.equal(st.mode, mode); assert.ok(/0\//.test(st.strip), id + ' ' + st.strip);
          if (id === 'bag_power') { // power marks: strong bag hits counted through the real meter formula
            await p.evaluate(() => { for (let i = 0; i < 5; i++) app.engine.onImpact({ actor: 'lion', receiver: 'heavy', kind: 'bag', move: 'cross', blocked: false, impulse: 95 }); });
            await wait(p, () => document.getElementById('advNext')); const t = await p.evaluate(() => [...document.querySelectorAll('.adv-toast')].map(x => x.textContent).join(' ')); assert.ok(/★★★/.test(t), t);
            await p.evaluate(() => [...document.querySelectorAll('#advNext button')].pop().click()); await p.waitForSelector('.adv-mission', { timeout: 300000 }); await p.waitForTimeout(1200); continue;
          }
          if (id === 'first_stance') { await p.waitForTimeout(15000); console.log(tag, 'partner punches caught in 15 s of auto play', await p.evaluate(() => AdventureOldTown.run.value)); }
          if (id === 'teach_the_kid') { assert.ok(st.lesson, 'lesson running'); }
          await p.evaluate(() => document.querySelector('#advGoal .adv-goal-quit').click());
          await p.waitForSelector('.adv-mission', { timeout: 300000 }); await p.waitForTimeout(1200);
          assert.ok(await p.evaluate(() => !document.getElementById('advGoal') && !window.AcademyStage?.state), id + ' quit leaves nothing behind');
        }
      }
      // 4. Boss Brick: dev warning, fight in the Neighborhood Hall named Brick, finish -> recordBoss
      await p.evaluate(() => document.querySelector('.adv-boss > .adv-actions .adv-go').click());
      const warn = await p.evaluate(() => { const w = document.querySelector('.adv-warn'); return { shown: !w.hidden, text: w.innerText.replace(/\n+/g, ' | '), btns: [...w.querySelectorAll('button')].map(x => x.textContent) }; });
      console.log(tag, 'warn', JSON.stringify(warn)); assert.ok(warn.shown && warn.btns.length === 2);
      if (SHOTS && full) await p.screenshot({ path: `${SHOTS}/oldtown-${name}-${lang}-boss-warning.png`, timeout: 300000 });
      await p.evaluate(() => document.querySelectorAll('.adv-warn button')[0].click());
      await wait(p, () => app.engine.arena?.fightView && document.getElementById('advGoal'));
      const fight = await p.evaluate(() => { const v = app.engine.arena.fightView, m = v.match, foe = m.fighters[v.careerEntry.species === 'lion' ? 'rabbit' : 'lion']; return { name: v.careerEntry.opponentName, venue: app.engine.career.store.game().venue, rounds: m.rounds, secs: m.roundSeconds, strip: document.getElementById('advGoal').innerText, label: GameIdentity.labels(v), foePower: +foe.power.toFixed(2) }; });
      console.log(tag, 'fight', JSON.stringify(fight)); assert.ok(/^(Brick|בריק)$/.test(fight.name) && fight.venue === 'default' && fight.rounds === 2 && fight.secs === 30);
      await p.evaluate(() => { const v = app.engine.arena.fightView; v.match.finish(v.careerEntry.species, 'ko'); });
      await wait(p, () => document.getElementById('advNext'));
      const boss = await p.evaluate(() => ({ text: document.querySelector('#advNext .adv-next-main').textContent + ' | ' + [...document.querySelectorAll('.adv-toast')].map(x => x.textContent).join(' | '), rec: app.engine.career.store.game().adventure.bosses.brick, err: document.querySelector('.game-notice')?.textContent }));
      console.log(tag, 'boss', JSON.stringify(boss)); assert.ok(boss.rec && boss.rec.wins === 1 && boss.rec.free === true, JSON.stringify(boss));
      if (SHOTS && full) await p.screenshot({ path: `${SHOTS}/oldtown-${name}-${lang}-boss-result.png`, timeout: 300000 });
      assert.ok(/Market Row|שדרת השוק/.test(boss.text), boss.text);
      await p.evaluate(() => [...document.querySelectorAll('#advNext button')].pop().click());
      await p.waitForSelector('.adv-boss', { timeout: 300000 }); await p.waitForTimeout(800);
      assert.ok(await p.evaluate(() => document.querySelector('.adv-boss').dataset.won === 'true'));
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); console.log(tag, 'page errors', JSON.stringify(bad)); assert.equal(bad.length, 0, bad.join('\n'));
      await p.close();
    }
    console.log('oldtown browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
