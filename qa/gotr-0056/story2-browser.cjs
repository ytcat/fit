// GOTR-0056 story 2: every Chapter 1 scene plays to the end with its lines in the bottom third and no framed character
// cut by the frame; skip works; both mini-games (carry_bag, snoring_guard) finish with stars through the real keys and
// the game's D-pad is shown; rigs and the stage go back; draw calls / triangles per scene.
// Static server: python3 -m http.server 8197 --bind 127.0.0.1. Env: APP_URL, SHOTS (png folder), SIZES, LANGS, ONLY (ids).
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8197/', SHOTS = process.env.SHOTS || '', LANGS = (process.env.LANGS || 'en').split(',');
const SIZES = (process.env.SIZES || '402x690,1366x768').split(',').map(s => s.split('x').map(Number)), ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const SHOT_AT = { arrival: 1.9, brick: 4.6, dash: 4.6, boss_intro: 4.2, boss_outro: 5.2 };
const wait = (p, f, a, t = 900000) => p.waitForFunction(f, a, { timeout: t, polling: 250 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryScenes);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const [W, H] of SIZES) for (const lang of LANGS) {
      const tag = `${W}x${H}-${lang}`, p = await b.newPage({ viewport: { width: W, height: H } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('Story QA'); });
      await p.evaluate(l => app.setLanguage(l), lang); await p.evaluate(f => { window.__forceShadows = f; }, !!process.env.SHADOWS);
      const where = () => p.evaluate(() => { const r = app.engine.coach.root; return { parent: r.parent?.type || null, x: r.position.x, z: r.position.z, inStage: !!document.querySelector('main#stageContainer canvas'), stageInBody: document.getElementById('stageContainer')?.closest('dialog') === null }; });
      const before = await where(), ids = await p.evaluate(() => ({ scenes: StoryScenes.sceneIds, games: StoryScenes.gameIds }));
      assert.deepEqual(ids.scenes.sort(), ['arrival', 'boss_intro', 'boss_outro', 'brick', 'dash']); assert.deepEqual(ids.games.sort(), ['carry_bag', 'snoring_guard']);
      for (const id of ids.scenes.filter(i => !ONLY || ONLY.includes(i))) {
        await p.evaluate(id => { window.__done = null; StoryScenes.play(id, { onDone: r => { window.__done = r; }, timeScale: 2 }); }, id);
        await wait(p, () => app.engine.fightIQDemo && StoryScenes.stats());
        const mid = await p.evaluate(H => new Promise(res => { const seen = {}, calls = []; const iv = setInterval(() => {
          const box = document.querySelector('.story-line'), t = box?.querySelector('.story-text'), n = box?.querySelector('.story-name');
          if (t && !seen[t.textContent]) { const r = box.getBoundingClientRect(); seen[t.textContent] = { who: n.textContent, top: +(r.top / H).toFixed(2), bottom: +(r.bottom / H).toFixed(2), left: Math.round(r.left), right: Math.round(r.right), face: !!box.querySelector('svg'), bg: getComputedStyle(box).backgroundColor, px: parseFloat(getComputedStyle(t).fontSize) }; }
          const s = StoryScenes.stats(); if (s) calls.push(s.calls);
          if (window.__done) { clearInterval(iv); res({ lines: seen, done: window.__done, stats: StoryScenes.stats(), maxCalls: Math.max(...calls) }); } }, 100); }), H);
        console.log(tag, id, JSON.stringify(mid));
        assert.equal(mid.done.skipped, false, id + ' played to the end'); const L = Object.values(mid.lines); assert.ok(L.length >= 1, id + ' lines shown');
        for (const l of L) { assert.ok(l.top >= .55 && l.bottom <= 1, id + ' line in the bottom third: ' + JSON.stringify(l)); assert.ok(l.left >= 0 && l.right <= W, id + ' line inside the screen'); assert.ok(l.face && l.who && l.px >= 17 && /rgba\(0, 0, 0, 0\)|transparent/.test(l.bg), id + ' portrait, name, readable, no box'); }
        assert.ok(mid.stats.worstEdge <= 1.001, id + ' framed characters stay inside the frame: ' + mid.stats.worstEdge);
        if (SHOTS && lang === 'en' && SHOT_AT[id]) {
          await p.evaluate(id => { window.__done = null; if (window.__forceShadows) app.engine.renderer.shadowMap.enabled = true; StoryScenes.play(id, { onDone: r => { window.__done = r; }, timeScale: .02 }); }, id);
          await wait(p, () => app.engine.fightIQDemo && StoryScenes.stats()); await p.evaluate(t => { StoryScenes.debug.t = t; }, SHOT_AT[id]); await p.waitForTimeout(2500);
          await p.screenshot({ path: `${SHOTS}/${id}-${W}x${H}.png`, timeout: 300000 });
          await p.mouse.click(W / 2, H / 3); await wait(p, () => window.__done, null, 60000);
          const sk = await p.evaluate(() => ({ done: window.__done, hook: !!app.engine.fightIQDemo, dialogs: document.querySelectorAll('dialog.story-scene').length }));
          assert.equal(sk.done.skipped, true, 'tap skips'); assert.equal(sk.hook, false); assert.equal(sk.dialogs, 0);
        }
      }
      const after = await where(); assert.deepEqual(after, before, 'the Fighter rig and the stage are back where they were');
      // mini-games: scripted careful players press the real arrow keys (window keydown/keyup)
      for (const id of ids.games.filter(i => !ONLY || ONLY.includes(i))) {
        await p.evaluate(id => { window.__done = null; StoryScenes.play(id, { onDone: r => { window.__done = r; }, timeScale: 3 }); }, id);
        await wait(p, () => app.engine.fightIQDemo && StoryScenes.debug?.sim && StoryScenes.stats());
        const ui = await p.evaluate(() => { const r = e => { const b = e?.getBoundingClientRect(); return b ? [b.x, b.y, b.width, b.height].map(Math.round) : null; }; return { dpad: r(document.querySelector('.story-pad .fp-dpad')), round: getComputedStyle(document.querySelector('.story-pad .fp-dpad')).borderRadius, caps: [...document.querySelectorAll('.story-pad .fp-cap')].map(c => c.textContent), goalPx: parseFloat(getComputedStyle(document.querySelector('.story-goal')).fontSize) }; });
        console.log(tag, id, 'pad', JSON.stringify(ui)); assert.ok(ui.dpad && ui.dpad[2] >= 110 && ui.round === '50%' && ui.caps.length === 4 && ui.goalPx <= 14, 'game D-pad and small goal text');
        assert.ok(ui.dpad[0] >= 0 && ui.dpad[1] + ui.dpad[3] <= H, 'pad inside the screen');
        await p.evaluate(id => {
          const key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[k] }));
          const tap = k => { key(k, true); key(k, false); }; window.__prompts = new Set();
          const tick = setInterval(() => {
            const r = StoryScenes.debug, pr = document.querySelector('.story-prompt-text')?.textContent; if (pr) window.__prompts.add(pr);
            if (!r || r.result) { clearInterval(tick); return; }
            const g = r.sim; if (!g) return;
            if (id === 'snoring_guard') { const v = g.view(); if (!g.held) key('right', true); if (v.swing && v.swing.k > .5 && !v.dodge) tap(v.prompt); if (v.atBell) tap('up'); return; }
            const R = StoryCore.CARRY;
            if (g.sway && g.theta > .45) tap(StoryCore.swayKey(g.sway.dir));
            const o = g.nextObstacle();
            if (o && !g.stride && o.s - g.s <= 1.0 && o.s - g.s >= .2) { key('right', false); key('right', true); return; }
            const c = R.cyclist, near = g.s < c.s - c.half && g.s > c.s - c.half - 1.2;
            if (near) { const clear = (c.s + c.half + .05 - g.s) / R.walk + .6; for (let k = 0; k <= clear; k += 1 / 60) if (g.cyclist(g.t + k).inLane) { if (g.held.right) key('right', false); return; } }
            if (!g.held.right) key('right', true);
          }, 16);
        }, id);
        if (SHOTS && lang === 'en') { await wait(p, id => { const g = StoryScenes.debug?.sim; return StoryScenes.debug?.result || (g && (id === 'snoring_guard' ? g.i >= 3 && g.swing : g.sway)); }, id); await p.screenshot({ path: `${SHOTS}/${id}-${W}x${H}.png`, timeout: 300000 }); }
        await wait(p, () => StoryScenes.debug?.result);
        const run = await p.evaluate(() => ({ result: StoryScenes.debug.result, saved: StoryScenes.debug.saved, text: document.querySelector('.story-result')?.innerText.replace(/\n+/g, ' | '), prompts: [...window.__prompts], stats: StoryScenes.stats() }));
        console.log(tag, id, JSON.stringify(run));
        assert.ok(run.result?.finished, id + ' finished'); assert.ok(run.result.stars >= 2, id + ' stars: ' + run.result.stars); assert.ok(run.saved?.ok, id + ' recorded: ' + JSON.stringify(run.saved));
        const rec = await p.evaluate(m => app.engine.career.store.game().adventure?.missions?.[m], run.result.missionId); assert.ok(rec?.stars >= run.result.stars, 'saved ' + JSON.stringify(rec));
        await p.evaluate(() => document.querySelector('.story-result .story-btn-main').click()); await wait(p, () => window.__done, null, 60000);
      }
      if (process.env.FIGHT) { // the boss outro is triggered from a finished bout: play it over a running fight and check the rigs go back
        await p.evaluate(() => ringfighterGame.quick()); await p.waitForTimeout(5000);
        await p.evaluate(() => { const snap = () => { const r = app.engine.coach.root; return { parent: r.parent?.uuid || null, pos: r.position.toArray().map(v => +v.toFixed(4)), ry: +r.rotation.y.toFixed(4), view: !!app.engine.arena.fightView, mode: app.engine.targetMode }; }; window.__fight = { before: snap() }; StoryScenes.play('boss_outro', { timeScale: 3, onDone: r => { window.__fight.after = snap(); window.__fight.done = r; } }); });
        await wait(p, () => window.__fight.done); const f = await p.evaluate(() => window.__fight); console.log(tag, 'boss_outro over a fight', JSON.stringify(f));
        assert.equal(f.done.skipped, false); assert.deepEqual(f.after, f.before, 'fight rigs restored'); await p.waitForTimeout(1500);
        await p.evaluate(() => { app.engine.career?.finish?.(); });
      }
      const fin = await p.evaluate(() => ({ hook: !!app.engine.fightIQDemo, docW: document.documentElement.scrollWidth }));
      assert.equal(fin.hook, false); assert.ok(fin.docW <= W, 'no horizontal scroll'); if (!process.env.FIGHT) assert.deepEqual(await where(), before);
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('story 2 browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
