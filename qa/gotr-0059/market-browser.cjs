// GOTR-0059: Market Row in the real app: sheet, playable street missions, King Hyena, route 2 -> 3. Static server :8191.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8191/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
const openMarket = p => p.evaluate(() => new Promise(r => ringfighterGame.open('adventure', { onReady: h => { window.advH = h; h.select('market'); r(); } })));
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of ['en', 'he']) {
      const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.removeItem('gotr.adv.route.2'); if (!app.engine.career.store.current()) app.engine.career.store.create('Market QA'); });
      await p.reload({ timeout: 300000 }); await ready(p); await p.evaluate(l => app.setLanguage(l), lang);
      await p.evaluate(() => { const s = app.engine.career.store; s.gameAction({ type: 'adventure', adventure: 'boss', bossId: 'brick', won: true }); }); // chapter 2 reached: its side zone appears
      await openMarket(p); await p.waitForSelector('.adv-tile[data-mission=curb_footwork]', { timeout: 300000 }); await p.waitForTimeout(1500);
      const sheet = await p.evaluate(() => { const c = document.querySelector('.adv-card'), t = document.querySelector('.adv-tiles'), cr = c.getBoundingClientRect(), tr = t.getBoundingClientRect(); return { title: c.querySelector('h3').textContent, glance: c.querySelector('.adv-glance').innerText.replace(/\n+/g, ' '), order: [...c.querySelectorAll('.adv-tile[data-mission]')].map(x => (x.classList.contains('adv-tile-soon') ? 'S' : 'P')).join(''), ids: [...c.querySelectorAll('.adv-tile[data-mission]')].map(x => x.dataset.mission), next: document.querySelector('.adv-tile-next')?.dataset.mission, side: !!c.querySelector('.adv-tile-side'), journal: !!c.querySelector('.adv-tile-journal'), tilesInside: tr.bottom <= cr.bottom + 1, docW: document.documentElement.scrollWidth, boss: c.querySelector('.adv-boss-gate')?.textContent }; });
      console.log(lang, 'sheet', JSON.stringify(sheet));
      assert.ok(/Vix|ויקס/.test(sheet.glance) && /Lv 12/.test(sheet.glance) && /^P{6}S{3}$/.test(sheet.order) && sheet.next === 'curb_footwork' && sheet.side && sheet.journal && sheet.tilesInside && sheet.docW <= 402 && /12/.test(sheet.boss), JSON.stringify(sheet));
      // footwork: counts Step presses
      await p.evaluate(() => document.querySelector('.adv-tile[data-mission=curb_footwork]').click()); await p.waitForTimeout(300);
      await p.evaluate(() => document.querySelector('.adv-detail .adv-go').click()); await wait(p, () => document.getElementById('advGoal') && app.engine.career.active);
      const st = await p.evaluate(() => ({ strip: document.getElementById('advGoal').innerText, venue: app.engine.career.store.game().venue, mode: app.engine.targetMode }));
      console.log(lang, 'footwork start', JSON.stringify(st)); assert.equal(st.venue, 'street'); assert.ok(/0\/12/.test(st.strip));
      const steps = await p.evaluate(async () => { let ok = 0; for (const id of ['step_left', 'step_right', 'step_left']) { try { if (app.engine.player.press(id)) ok++; } catch { /* busy */ } await new Promise(r => setTimeout(r, 900)); } return { ok, value: AdventureOldTown.run.value }; });
      console.log(lang, 'steps accepted vs counted', JSON.stringify(steps)); assert.equal(steps.ok, steps.value);
      await p.evaluate(() => document.querySelector('#advGoal .adv-goal-quit').click()); await p.waitForSelector('.adv-tile', { timeout: 300000 }); await p.waitForTimeout(1200);
      // clean hands: a won bout with no hits taken = 3 stars; Next bar
      assert.ok(await p.evaluate(() => document.querySelector('.adv-card h3').textContent.length > 0 && !!document.querySelector('.adv-tile[data-mission=clean_hands]')), 'quit returns to the Market Row sheet');
      await p.evaluate(() => { document.querySelector('.adv-tile[data-mission=clean_hands]').click(); }); await p.waitForTimeout(300);
      await p.evaluate(() => document.querySelector('.adv-detail .adv-go').click()); await wait(p, () => app.engine.arena?.fightView && document.getElementById('advGoal'));
      const f = await p.evaluate(() => { const v = app.engine.arena.fightView; v.match.finish(v.careerEntry.species, 'ko'); return { name: v.careerEntry.opponentName, venue: app.engine.career.store.game().venue }; });
      console.log(lang, 'clean hands fight', JSON.stringify(f)); assert.equal(f.venue, 'street');
      await wait(p, () => document.getElementById('advNext'));
      const r = await p.evaluate(() => ({ rec: app.engine.career.store.game().adventure.missions.clean_hands, next: document.querySelector('#advNext .adv-next-main').textContent, noModal: !document.querySelector('dialog[open]') }));
      console.log(lang, 'clean hands result', JSON.stringify(r)); assert.equal(r.rec.stars, 3); assert.ok(r.noModal && /Next mission|המשימה הבאה/.test(r.next));
      // boss King Hyena
      await p.evaluate(() => { document.querySelector('#advNext .adv-next-alt:last-child').click(); }); await p.waitForSelector('.adv-boss', { timeout: 300000 }); await p.waitForTimeout(1200);
      await p.evaluate(() => { document.querySelector('.adv-card').classList.add('open'); document.querySelector('.adv-boss > .adv-actions .adv-go').click(); });
      await p.evaluate(() => document.querySelectorAll('.adv-warn button')[0].click());
      await wait(p, () => app.engine.arena?.fightView && document.getElementById('advGoal'));
      const bf = await p.evaluate(() => { const v = app.engine.arena.fightView; return { name: v.careerEntry.opponentName, venue: app.engine.career.store.game().venue, rounds: v.match.rounds, strip: document.getElementById('advGoal').innerText }; });
      console.log(lang, 'boss fight', JSON.stringify(bf)); assert.ok(/King Hyena|מלך הצבועים/.test(bf.name) && bf.venue === 'street' && bf.rounds === 2);
      await p.evaluate(() => { const v = app.engine.arena.fightView; v.match.finish(v.careerEntry.species, 'ko'); });
      await wait(p, () => document.getElementById('advNext'));
      const bn = await p.evaluate(() => ({ rec: app.engine.career.store.game().adventure.bosses.king_hyena, next: document.querySelector('#advNext .adv-next-main').textContent }));
      console.log(lang, 'boss result', JSON.stringify(bn)); assert.ok(bn.rec?.wins === 1 && /Docks|הנמל|Доки/.test(bn.next));
      // route 2 -> 3 along the streets
      await p.evaluate(() => [...document.querySelectorAll('#advNext button')].pop().click()); await p.waitForSelector('.adv-tile', { timeout: 300000 }); await p.waitForTimeout(1500);
      await p.evaluate(() => new Promise(r => ringfighterGame.open('adventure', { onReady: h => { window.advH = h; h.select('market'); r(); } })));
      const path = await p.evaluate(() => { const m = advH.map, a = m.places.find(q => q.id === 'market'), c = m.places.find(q => q.id === 'docks'), r = m.route(a.anchor, c.anchor); return r && { n: r.length }; });
      console.log(lang, 'route 2->3', JSON.stringify(path)); assert.ok(path && path.n > 10, 'a street route exists from Market Row to the Docks');
      await wait(p, () => document.querySelectorAll('.adv-route-dot.on').length >= 8, null, 90000);
      console.log(lang, 'dots on', await p.evaluate(() => document.querySelectorAll('.adv-route-dot.on').length));
      if (SHOTS && lang === 'en') { await p.screenshot({ path: `${SHOTS}/market-route.png`, timeout: 300000 }); }
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('market browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
