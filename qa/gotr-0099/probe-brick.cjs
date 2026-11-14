// GOTR-0099: does the first Brick fight (story path) carry the story-fight flag the fight UI reads?
//   node qa/gotr-0099/probe-brick.cjs   (APP_URL default http://127.0.0.1:8731/)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 } }); const log = [];
  p.on('pageerror', e => log.push('PAGEERROR ' + e.message));
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* private */ } });
  await p.goto(process.env.APP_URL || 'http://127.0.0.1:8731/', { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.AdventureOldTown && window.StoryCast, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
  const r = await p.evaluate(async () => {
    const rg = window.ringfighterGame, ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } };
    AdventureOldTown.storyFightStart(ctx, 'first_brick');
    const e = app.engine, v0 = e.arena.fightView; await new Promise(q => setTimeout(q, 3000));
    const v = e.arena.fightView, m = v.match; e.cameraDirector?.skipIntro?.(); while (m.phase === 'intro') m.advance(.5);
    m.finish(v.careerEntry.species, 'TKO', true);
    for (let i = 0; i < 200 && !(m.phase === 'ceremony' && m.phaseTime > 1.5); i++) { e.arena.update(e.animTime += .05, e.technique, e.currentAnim); }
    window.fightUI.render(v); await new Promise(q => setTimeout(q, 600));
    const btns = [...document.querySelectorAll('#fightResults button')].filter(x => x.offsetParent).map(x => x.textContent);
    return { same: v0 === v, flag0: !!v0?.storyFight, flag: !!v?.storyFight, gym: !!v?.gymFight, place: e.fightOptions?.place, buttons: btns };
  });
  console.log(JSON.stringify(r), log.join(' | '));
  await b.close();
})();
