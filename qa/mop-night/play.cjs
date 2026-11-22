// Night shift bot: plays the required shift from the story with real touch drags (402x690), rinses with the Rinse button
// on the bucket when the mop turns grey, and reaches 1, 2 and 3 stars in three shifts (the first from the story, two
// replays). Checks the saved mission stars, the wage, and that the story moves on to Night Shadowboxing. Pictures and
// play.json go to <outdir>.  usage: node qa/mop-night/play.cjs <outdir>
const { open, launchShift, frames } = require('./launch.cjs'), path = require('path'), fs = require('fs'), assert = require('assert/strict');
(async () => {
  const out = process.argv[2] || __dirname; fs.mkdirSync(out, { recursive: true });
  const { p, touch, close, errors } = await open();
  const proj = (x, z) => p.evaluate(([x, z]) => StoryScenes.debug.projectFloor(x, z), [x, z]);
  const shot = name => p.screenshot({ path: path.join(out, name + '.png') });
  const save = () => p.evaluate(() => { const g = ringfighterGame.store.game(); return { stars: g.adventure.missions.clean_gym?.stars || 0, value: g.adventure.missions.clean_gym?.value, coins: GameDomain.wallet(g).coins, wages: g.ledger.filter(t => t.rule === 'job-pay-v1').length, current: StoryFlow.state(g, 1).current?.id }; });
  const report = { shifts: [], errors };
  try {
    const R = await p.evaluate(() => MopCore.MOP);
    const headAt = (x, z, tol = .1) => p.waitForFunction(([x, z, tol]) => { const s = StoryScenes.debug.sim; return s.done || (Math.hypot(s.point.x - x, s.point.z - z) < tol && !s.lift && !s.rinsing); }, [x, z, tol], { timeout: 180000 });
    const marks = () => p.evaluate(() => StoryScenes.debug.sim.marks);
    let pics = {};
    const rinse = async () => {
      const b = await p.locator('.mop-night-rinse').boundingBox();
      if (!pics.dirty) { await shot('after-03-dirty-mop'); pics.dirty = 1; }
      await touch('touchStart', [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }]); await touch('touchEnd');
      if (!pics.rinse) { await p.waitForFunction(() => StoryScenes.debug.memo.qa?.phase === 'wring', null, { timeout: 60000 }); await shot('after-04-rinse-wring'); pics.rinse = 1; }
      await p.waitForFunction(() => !StoryScenes.debug.sim.rinsing, null, { timeout: 60000 });
    };
    const mop = async goal => {
      for (let pass = 0; pass < 2; pass++) for (let row = 0, z = R.minZ + .14; z < R.maxZ - .05; row++, z += .26) {
        const [x0, x1] = row % 2 ? [R.maxX - .1, R.minX + .1] : [R.minX + .1, R.maxX - .1];
        if (await marks() >= goal || await p.evaluate(() => StoryScenes.debug.sim.done)) return;
        await touch('touchStart', [await proj(x0, z)]); await headAt(x0, z);
        for (let k = 1; k <= 6; k++) {
          const x = x0 + (x1 - x0) * k / 6; await touch('touchMove', [await proj(x, z)]); await headAt(x, z, .12);
          if (await marks() >= goal) break;
          if (await p.evaluate(() => StoryScenes.debug.sim.load > .5)) { await touch('touchEnd'); await rinse(); await touch('touchStart', [await proj(x, z)]); await headAt(x, z); }
          if (!pics.mid && await marks() >= 12) { await shot('after-02-mopping'); pics.mid = 1; }
        }
        await touch('touchEnd');
      }
    };
    const relaunch = () => p.evaluate(() => { const rg = ringfighterGame, st = rg.store; for (const d of document.querySelectorAll('dialog[open]')) d.close(); AdventureOldTown.closeBeat?.(); AdventureOldTown.launch({ store: st, startTraining: rg.startTraining, startFight: rg.startFight, change: a => st.gameAction(a).ok }, 'clean_gym'); });
    for (const [i, goal] of [25, 50, 75].entries()) {
      const before = await save();
      if (i === 0) await launchShift(p); else { await relaunch(); await p.waitForFunction(() => StoryScenes.debug?.sim && StoryScenes.debug.projectFloor && StoryScenes.stats()?.calls && StoryScenes.debug.sim.marks === 0, null, { timeout: 120000 }); }
      await frames(p, 4);
      if (i === 0) { assert.equal(before.current, 'clean_gym'); await shot('after-01-start-note'); }
      const t0 = Date.now(); await mop(goal);
      const m = await marks(), left = await p.evaluate(() => StoryScenes.debug.sim.left);
      if (!await p.evaluate(() => StoryScenes.debug.sim.done)) await p.locator('.story-mop-finish').tap();
      await p.waitForFunction(() => StoryScenes.debug?.result && document.querySelector('.story-result'), null, { timeout: 60000 }); await frames(p, 3);
      const res = await p.evaluate(() => ({ ...StoryScenes.debug.result, saved: StoryScenes.debug.saved?.ok }));
      await shot(`after-05-result-${i + 1}`);
      await p.locator('.story-result .story-btn-main').tap(); await p.waitForFunction(() => !StoryScenes.playing, null, { timeout: 60000 });
      await p.waitForTimeout(1500); const after = await save();
      report.shifts.push({ goal, marksAtFinish: m, timeLeft: +left.toFixed(1), result: res, before, after, realSeconds: Math.round((Date.now() - t0) / 1000) });
      console.log(JSON.stringify(report.shifts.at(-1)));
      assert.equal(res.stars, i + 1, 'stars'); assert.ok(res.saved); assert.equal(after.stars, Math.max(before.stars, i + 1), 'best stars saved');
      assert.equal(after.coins - before.coins, [6, 10, 15][i], 'wage'); assert.equal(after.current, 'night_shadow', 'the story moves on');
    }
    // a time-out with a dirty floor: lights out, no stars, nothing saved
    await relaunch(); await p.waitForFunction(() => StoryScenes.debug?.sim && StoryScenes.stats()?.calls && StoryScenes.debug.sim.marks === 0, null, { timeout: 120000 });
    await p.evaluate(() => { const s = StoryScenes.debug.sim; s.started = true; s.left = 1.2; }); await p.waitForFunction(() => StoryScenes.debug?.result, null, { timeout: 60000 }); await frames(p, 6);
    await shot('after-06-lights-out'); report.lightsOut = await p.evaluate(() => StoryScenes.debug.result);
    await p.locator('.story-result .story-btn-main').tap();
    report.final = await save(); report.errors = errors;
    fs.writeFileSync(path.join(out, 'play.json'), JSON.stringify(report, null, 1));
    console.log('final', JSON.stringify(report.final), 'errors', JSON.stringify(errors));
  } finally { await close(); }
})().catch(e => { console.error(e); process.exit(1); });
