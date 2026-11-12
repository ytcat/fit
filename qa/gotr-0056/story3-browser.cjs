// GOTR-0056 / GOTR-0061: Chapter 2 scenes in the evening market set and the five skill trials. Every scene plays to the
// end with its lines in the bottom third and framed characters inside the frame; every trial shows its tutorial, the
// game's pad (D-pad + punch buttons), is finished by a scripted player through the real keys, records its mission with
// stars and shows medal + best; rigs and the stage go back; draw calls / triangles.
// Static server: python3 -m http.server 8197 --bind 127.0.0.1. Env: APP_URL, SHOTS, SIZES, LANGS, ONLY (ids), SHADOWS=1.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8197/', SHOTS = process.env.SHOTS || '', LANGS = (process.env.LANGS || 'en').split(',');
const SIZES = (process.env.SIZES || '402x690,1366x768').split(',').map(s => s.split('x').map(Number)), ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const SCENES = ['vix_intro', 'whistle_theft', 'dash_circle', 'hyena_intro', 'hyena_outro'], SHOT_AT = { vix_intro: 4.4, whistle_theft: 3.3, dash_circle: 4.6, hyena_intro: 3.6, hyena_outro: 4.6 };
const TRIALS = { carry_bag: ['heavy_bag_van', 3], snoring_guard: ['snoring_guard', 3], rooftop_barrage: ['rooftop_balloons', 1], cut_him_off: ['whistle_chase', 0], hustlers_bet: ['grandma_groceries', 1] };
const wait = (p, f, a, t = 900000) => p.waitForFunction(f, a, { timeout: t, polling: 250 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryScenes && window.StoryTrials);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const [W, H] of SIZES) for (const lang of LANGS) {
      const tag = `${W}x${H}-${lang}`, p = await b.newPage({ viewport: { width: W, height: H } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.removeItem('gotr.trial.v1'); if (!app.engine.career.store.current()) app.engine.career.store.create('Story QA'); });
      // v1.45: the first Adventure open of a new profile plays the arrival scene by itself; mark it seen so it cannot replace the scene under test
      await p.evaluate(() => { const id = app.engine.career.store.current()?.id; localStorage.setItem('gotr.adv.intro.' + id, '1'); }); await p.waitForTimeout(3500);
      await p.evaluate(() => { StoryScenes.stop(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); document.getElementById('advTitleCard')?.remove(); });
      await p.evaluate(l => app.setLanguage(l), lang); await p.evaluate(f => { window.__forceShadows = f; }, !!process.env.SHADOWS);
      const where = () => p.evaluate(() => { const r = app.engine.coach.root; return { parent: r.parent?.type || null, x: r.position.x, z: r.position.z, inStage: !!document.querySelector('main#stageContainer canvas'), stageInBody: document.getElementById('stageContainer')?.closest('dialog') === null }; });
      const before = await where(), ids = await p.evaluate(() => ({ scenes: StoryScenes.sceneIds, games: StoryScenes.gameIds }));
      for (const id of SCENES) assert.ok(ids.scenes.includes(id), 'scene ' + id); assert.deepEqual(ids.games.sort(), Object.keys(TRIALS).sort());
      for (const id of SCENES.filter(i => !ONLY || ONLY.includes(i))) {
        await p.evaluate(id => { window.__done = null; if (window.__forceShadows) app.engine.renderer.shadowMap.enabled = true; StoryScenes.play(id, { onDone: r => { window.__done = r; }, timeScale: 2 }); }, id);
        await wait(p, () => app.engine.fightIQDemo && StoryScenes.stats());
        const mid = await p.evaluate(H => new Promise(res => { const seen = {}, calls = []; const iv = setInterval(() => {
          const box = document.querySelector('.story-line'), t = box?.querySelector('.story-text'), n = box?.querySelector('.story-name');
          if (t && !seen[t.textContent]) { const r = box.getBoundingClientRect(); seen[t.textContent] = { who: n.textContent, top: +(r.top / H).toFixed(2), bottom: +(r.bottom / H).toFixed(2), left: Math.round(r.left), right: Math.round(r.right), face: !!box.querySelector('svg'), px: parseFloat(getComputedStyle(t).fontSize) }; }
          const s = StoryScenes.stats(); if (s) calls.push(s.calls);
          if (window.__done) { clearInterval(iv); res({ lines: seen, done: window.__done, stats: StoryScenes.stats(), maxCalls: Math.max(...calls) }); } }, 100); }), H);
        console.log(tag, id, JSON.stringify({ lines: Object.values(mid.lines).map(l => l.who + ' ' + l.top), stats: mid.stats, maxCalls: mid.maxCalls }));
        assert.equal(mid.done.skipped, false, id + ' played to the end'); const L = Object.values(mid.lines); assert.ok(L.length >= 2, id + ' lines shown');
        for (const l of L) { assert.ok(l.top >= .55 && l.bottom <= 1 && l.left >= 0 && l.right <= W, id + ' line in the bottom third, on screen: ' + JSON.stringify(l)); assert.ok(l.face && l.who && l.px >= 17, id + ' portrait, name, readable'); }
        assert.ok(mid.stats.worstEdge <= 1.001, id + ' framed characters stay inside the frame: ' + mid.stats.worstEdge);
        if (SHOTS && lang === 'en') {
          await p.evaluate(id => { window.__done = null; if (window.__forceShadows) app.engine.renderer.shadowMap.enabled = true; StoryScenes.play(id, { onDone: r => { window.__done = r; }, timeScale: .02 }); }, id);
          await wait(p, () => app.engine.fightIQDemo && StoryScenes.stats()); await p.evaluate(t => { StoryScenes.debug.t = t; }, SHOT_AT[id]); await p.waitForTimeout(2500);
          await p.screenshot({ path: `${SHOTS}/${id}-${W}x${H}.png`, timeout: 300000 });
          await p.mouse.click(W / 2, H / 3); await wait(p, () => window.__done, null, 60000); assert.equal((await p.evaluate(() => window.__done)).skipped, true, 'tap skips');
        }
      }
      assert.deepEqual(await where(), before, 'the Fighter rig and the stage are back where they were');
      // skill trials: scripted players press the real keys (arrows, J K L)
      let first = true;
      for (const [id, [mission, pads]] of Object.entries(TRIALS).filter(([i]) => !ONLY || ONLY.includes(i))) {
        await p.evaluate(([id, intro]) => { window.__done = null; if (window.__forceShadows) app.engine.renderer.shadowMap.enabled = true; StoryScenes.play(id, { onDone: r => { window.__done = r; }, timeScale: 6, noIntro: !intro }); }, [id, first]);
        await wait(p, () => app.engine.fightIQDemo && StoryScenes.debug?.sim && StoryScenes.stats());
        const ui = await p.evaluate(() => { const r = e => { const b = e?.getBoundingClientRect(); return b ? [b.x, b.y, b.width, b.height].map(Math.round) : null; }, tut = document.querySelector('.story-tutorial'); return { dpad: r(document.querySelector('.story-pad .fp-dpad')), btns: [...document.querySelectorAll('.story-pad .fp-btn')].map(b => [b.dataset.pad, b.textContent, ...r(b)]), tutorial: tut && !tut.hidden ? tut.innerText.replace(/\n+/g, ' | ') : null, ghost: !!document.querySelector('.story-pad [data-ghost=true]'), goalPx: parseFloat(getComputedStyle(document.querySelector('.story-goal')).fontSize), retry: !!document.querySelector('.story-retry') }; });
        console.log(tag, id, 'ui', JSON.stringify(ui));
        assert.ok(ui.dpad && ui.dpad[2] >= 110 && ui.dpad[0] >= 0 && ui.dpad[1] + ui.dpad[3] <= H, 'D-pad on screen'); assert.equal(ui.btns.length, pads, id + ' punch buttons'); for (const bt of ui.btns) assert.ok(bt[2] >= 0 && bt[2] + bt[4] <= W && bt[3] + bt[5] <= H && bt[4] >= 44, 'punch button on screen: ' + bt);
        assert.ok(ui.goalPx <= 14 && ui.retry, 'small goal text, instant restart'); if (first) assert.ok(ui.tutorial && ui.ghost, 'tutorial with ghost input'); first = false;
        await p.evaluate(id => {
          const KEY = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', straight: 'j', hook: 'k', uppercut: 'l' }, key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: KEY[k] })), tap = k => { key(k, true); key(k, false); };
          window.__pops = new Set(); window.__prompts = new Set();
          const tick = setInterval(() => { const r = StoryScenes.debug; for (const n of document.querySelectorAll('.story-pop')) window.__pops.add(n.textContent); const pr = document.querySelector('.story-prompt-text')?.textContent; if (pr) window.__prompts.add(pr); if (!r || r.result) clearInterval(tick); }, 30);
          // The scripted player looks at the trial before every fixed rule step (the software renderer is far below 60 fps), and answers with real key events.
          const g = StoryScenes.debug.sim, step = g.step.bind(g);
          g.step = dt => { bot(g.view()); return step(dt); };
          const bot = v => {
            if (id === 'carry_bag') { if (v.phase === 'swing' && v.k >= .93) tap(v.type); else if (v.phase === 'back' && v.back > .5) tap('left'); }
            else if (id === 'snoring_guard') { if (v.phase === 'input') tap(v.seq[v.idx]); else if (v.phase === 'wake' && v.wake > .6) tap('down'); }
            else if (id === 'rooftop_barrage') { if (v.canReflect) tap('straight'); else if (v.balloon && v.balloon.state === 'fly' && !v.balloon.marked && v.balloon.k > .7 && !v.dodge) tap(v.prompt); else if (v.balloon && v.balloon.marked && v.balloon.state === 'fly' && v.balloon.k > .9 && !v.canReflect && !v.dodge) tap(v.prompt); }
            else if (id === 'cut_him_off') { const [fc, fr] = v.cell.f, [rc, rr] = v.cell.rc; if (fr !== rr) tap(rr > fr ? 'down' : 'up'); else if (fc - rc > 1) tap('left'); }
            else if (id === 'hustlers_bet') { if (v.phase === 'open' && !v.punished && v.k > .1) tap('straight'); else if (v.phase === 'offer') tap('down'); }
          };
        }, id);
        if (SHOTS && lang === 'en') { await wait(p, () => StoryScenes.debug?.result || (StoryScenes.debug?.sim?.view().progress >= .3 && document.querySelector('.story-prompt-text')?.textContent)); await p.screenshot({ path: `${SHOTS}/${id}-${W}x${H}.png`, timeout: 300000 }); }
        await wait(p, () => StoryScenes.debug?.result);
        const run = await p.evaluate(() => ({ result: StoryScenes.debug.result, saved: StoryScenes.debug.saved, best: StoryScenes.debug.best, text: document.querySelector('.story-result')?.innerText.replace(/\n+/g, ' | '), pops: [...window.__pops].slice(0, 8), prompts: [...window.__prompts].slice(0, 8), stats: StoryScenes.stats(), hardBtn: !!document.querySelector('.story-btn-hard') }));
        console.log(tag, id, JSON.stringify(run));
        assert.ok(run.result?.finished, id + ' finished'); assert.ok(run.result.stars >= 2, id + ' medal: ' + run.result.stars); assert.ok(run.saved?.ok, id + ' recorded: ' + JSON.stringify(run.saved)); assert.ok(run.result.score > 0 && run.best.isNew && run.pops.length, id + ' score, best, feedback');
        assert.equal(run.hardBtn, run.result.stars === 3, 'gold unlocks the hard variant'); assert.ok(run.stats.worstEdge <= 1.001, id + ' frame edge ' + run.stats.worstEdge);
        const rec = await p.evaluate(m => app.engine.career.store.game().adventure?.missions?.[m], mission); assert.ok(rec?.stars >= run.result.stars, 'saved ' + JSON.stringify(rec));
        if (SHOTS && lang === 'en' && id === 'hustlers_bet') await p.screenshot({ path: `${SHOTS}/result-${W}x${H}.png`, timeout: 300000 });
        await p.evaluate(() => document.querySelector('.story-result .story-btn-main').click()); await wait(p, () => window.__done, null, 60000);
      }
      const fin = await p.evaluate(() => ({ hook: !!app.engine.fightIQDemo, docW: document.documentElement.scrollWidth, best: StoryScenes.best('carry_bag') }));
      assert.equal(fin.hook, false); assert.ok(fin.docW <= W, 'no horizontal scroll'); assert.deepEqual(await where(), before);
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('story 3 browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
