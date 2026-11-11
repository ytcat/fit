// GOTR-0056 layers 2 + 3: story sets. Both Chapter 1 scenes play to the end and skip works; the carry-the-bag mini-game
// completes with stars (scripted player through the real key handlers) and records heavy_bag_van; draw calls / triangles.
// Static server: python3 -m http.server 8197 --bind 127.0.0.1. Env: APP_URL, SHOTS (folder for png), SIZES, LANGS.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8197/', SHOTS = process.env.SHOTS || '', LANGS = (process.env.LANGS || 'en').split(',');
const SIZES = (process.env.SIZES || '402x690,1366x768').split(',').map(s => s.split('x').map(Number));
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t, polling: 250 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryScenes);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const [W, H] of SIZES) for (const lang of LANGS) {
      const tag = `${W}x${H}-${lang}`, p = await b.newPage({ viewport: { width: W, height: H } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('Story QA'); });
      await p.evaluate(l => app.setLanguage(l), lang);
      const where = () => p.evaluate(() => { const r = app.engine.coach.root; return { parent: r.parent?.type || null, x: r.position.x, z: r.position.z, inStage: !!document.querySelector('main#stageContainer canvas'), stageInBody: document.getElementById('stageContainer')?.closest('dialog') === null }; });
      const before = await where();
      for (const id of ['arrival', 'brick']) {
        await p.evaluate(id => { window.__done = null; StoryScenes.play(id, { onDone: r => { window.__done = r; }, timeScale: 2 }); }, id);
        await wait(p, () => app.engine.fightIQDemo && StoryScenes.stats());
        const mid = await p.evaluate(() => new Promise(res => { const seen = new Set(); let frames = 0, last = -1; const iv = setInterval(() => { const l = document.querySelector('.story-line p'); if (l) seen.add(l.textContent); const t = StoryScenes.debug?.t; if (t !== last) { frames++; last = t; } if (window.__done) { clearInterval(iv); res({ seen: [...seen], done: window.__done, stats: StoryScenes.stats(), polls: frames }); } }, 100); }));
        console.log(tag, id, JSON.stringify(mid)); assert.equal(mid.done.skipped, false, id + ' played to the end'); assert.ok(mid.seen.length >= 1, id + ' line shown');
        // tap to skip
        await p.evaluate(id => { window.__done = null; StoryScenes.play(id, { onDone: r => { window.__done = r; } }); }, id);
        await wait(p, () => app.engine.fightIQDemo && StoryScenes.stats()); await p.waitForTimeout(800);
        if (SHOTS && lang === 'en') { await p.evaluate(id => { StoryScenes.debug.t = id === 'arrival' ? 7.4 : 4.4; }, id); await p.waitForTimeout(2500); await p.screenshot({ path: `${SHOTS}/${id}-${W}x${H}.png`, timeout: 300000 }); }
        await p.mouse.click(W / 2, H / 3); await wait(p, () => window.__done, null, 60000);
        const sk = await p.evaluate(() => ({ done: window.__done, hook: !!app.engine.fightIQDemo, dialogs: document.querySelectorAll('dialog.story-scene').length }));
        console.log(tag, id, 'skip', JSON.stringify(sk)); assert.equal(sk.done.skipped, true); assert.equal(sk.hook, false); assert.equal(sk.dialogs, 0);
      }
      const after = await where(); console.log(tag, 'rig/stage before/after', JSON.stringify({ before, after }));
      assert.deepEqual(after, before, 'the Fighter rig and the stage are back where they were');
      // mini-game: a scripted careful player presses the real arrow keys (window keydown/keyup)
      await p.evaluate(() => { window.__done = null; StoryScenes.play('carry_bag', { onDone: r => { window.__done = r; }, timeScale: 3 }); });
      await wait(p, () => app.engine.fightIQDemo && StoryScenes.debug?.sim && StoryScenes.stats());
      await p.evaluate(() => {
        const R = StoryCore.CARRY, key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[k] }));
        window.__prompts = new Set();
        const tick = setInterval(() => {
          const r = StoryScenes.debug, pr = document.querySelector('.story-prompt')?.textContent; if (pr) window.__prompts.add(pr);
          if (!r || r.result) { clearInterval(tick); return; }
          const g = r.sim; if (!g) return;
          if (g.sway && g.theta > .45) { const k = StoryCore.swayKey(g.sway.dir); key(k, true); key(k, false); }
          const o = g.nextObstacle();
          if (o && !g.stride && o.s - g.s <= 1.0 && o.s - g.s >= .2) { key('right', false); key('right', true); return; }
          const c = R.cyclist, near = g.s < c.s - c.half && g.s > c.s - c.half - 1.2;
          if (near) { const clear = (c.s + c.half + .05 - g.s) / R.walk + .6; for (let k = 0; k <= clear; k += 1 / 60) if (g.cyclist(g.t + k).inLane) { if (g.held.right) key('right', false); return; } }
          if (!g.held.right) key('right', true);
        }, 16);
      });
      if (SHOTS && lang === 'en') { await wait(p, () => StoryScenes.debug?.sim?.sway || StoryScenes.debug?.result); await p.screenshot({ path: `${SHOTS}/carry-${W}x${H}.png`, timeout: 300000 }); }
      await wait(p, () => StoryScenes.debug?.result);
      const run = await p.evaluate(() => ({ result: StoryScenes.debug.result, saved: StoryScenes.debug.saved, text: document.querySelector('.story-result')?.innerText, prompts: [...window.__prompts], stats: StoryScenes.stats(), log: StoryScenes.debug.sim.log.filter(e => !['stride', 'sway', 'caught', 'door'].includes(e.type)) }));
      console.log(tag, 'carry', JSON.stringify(run));
      assert.ok(run.result?.finished, 'reached the door'); assert.ok(run.result.stars >= 2, 'stars: ' + run.result.stars); assert.ok(run.saved?.ok, 'recorded: ' + JSON.stringify(run.saved));
      const rec = await p.evaluate(() => app.engine.career.store.game().adventure?.missions?.heavy_bag_van);
      console.log(tag, 'saved', JSON.stringify(rec)); assert.ok(rec?.stars >= run.result.stars);
      if (SHOTS && lang === 'en') await p.screenshot({ path: `${SHOTS}/carry-result-${W}x${H}.png`, timeout: 300000 });
      await p.evaluate(() => document.querySelector('.story-result .story-btn-main').click()); await wait(p, () => window.__done, null, 60000);
      const fin = await p.evaluate(() => ({ done: window.__done, hook: !!app.engine.fightIQDemo, docW: document.documentElement.scrollWidth }));
      assert.equal(fin.hook, false); assert.ok(fin.docW <= W, 'no horizontal scroll'); assert.equal((await where()).stageInBody, true);
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('story sets browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
