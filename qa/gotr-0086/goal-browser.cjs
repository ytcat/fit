// GOTR-0086: after the first Brick fight the next step (night Shadowboxing) must not keep the bout announcement ("KO … won"), and
// the goal line must sit clear of the Fighter's head and of the edge tools (Auto, timer, settings, modes), wrapping instead of "…".
// Fresh profile at 402x690, EN and HE: arrival + talk recorded, the real Brick fight started and ended by KO, the AFTER beat's Next
// starts step 4; then measured. Usage: APP_URL=http://127.0.0.1:8293/ SHOTS=qa/gotr-0086 node qa/gotr-0086/goal-browser.cjs
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), { execFileSync } = require('node:child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8293/', SHOTS = process.env.SHOTS || '', LANGS = (process.env.LANGS || 'en,he').split(',');
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t, polling: 250 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
async function shot(p, name) {
  if (!SHOTS) return; const png = `${SHOTS}/${name}.png`; await p.screenshot({ path: png, timeout: 300000 });
  try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=80)', png, png.replace(/\.png$/, '.webp')]); fs.unlinkSync(png); } catch { /* keep the png */ }
}
// The Fighter's head on screen: the head joint and a sphere around it (radius 0.24 m, mane included), projected.
const measure = p => p.evaluate(() => {
  const e = app.engine, cam = e.camera, c = e.renderer.domElement.getBoundingClientRect(), T = THREE, h = e.coach.joints.head.getWorldPosition(new T.Vector3()), R = .24;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const dx of [-R, R]) for (const dy of [-R * .8, R * 1.4]) for (const dz of [-R, R]) { const q = h.clone().add(new T.Vector3(dx, dy, dz)).project(cam); const sx = c.left + (q.x + 1) / 2 * c.width, sy = c.top + (1 - q.y) / 2 * c.height; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
  const head = [x0, y0, x1, y1].map(Math.round), g = document.getElementById('advGoal'), txt = g?.querySelector('.adv-goal-text'), gr = g?.getBoundingClientRect();
  const goal = gr ? [gr.left, gr.top, gr.right, gr.bottom].map(Math.round) : null, hit = (a, b) => a && b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const stage = document.getElementById('stageContainer'), tools = [...stage.querySelectorAll('button')].filter(b => !g?.contains(b) && b.offsetParent !== null && getComputedStyle(b).visibility !== 'hidden').map(b => { const r = b.getBoundingClientRect(); return { id: b.id || b.className.split(' ')[0] || b.textContent.slice(0, 10), box: [r.left, r.top, r.right, r.bottom].map(Math.round) }; }).filter(t => t.box[2] > t.box[0]);
  const ann = document.querySelector('#stageContainer .bout-announcement'), annShown = !!ann && !ann.hidden && ann.getClientRects().length > 0 && getComputedStyle(ann).visibility !== 'hidden', kb = document.getElementById('fightKnockout'), kbShown = !!kb && !kb.hidden && kb.getClientRects().length > 0;
  return { head, goal, text: txt?.textContent, ellipsis: txt ? txt.scrollWidth > txt.clientWidth + 1 : null, overHead: hit(goal, head), underTools: tools.filter(t => hit(goal, t.box)).map(t => t.id), announcement: annShown ? ann.textContent : kbShown ? kb.textContent : null, mode: e.targetMode, active: !!e.career.active, wonText: [...document.querySelectorAll('body *')].filter(x => x.children.length <= 2 && /won|KO|ניצח|победил/.test(x.textContent) && x.textContent.length < 40 && x.getClientRects().length && !x.hidden && getComputedStyle(x).visibility !== 'hidden' && getComputedStyle(x).display !== 'none').map(x => (x.id || x.className) + ':' + x.textContent) };
});
(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of LANGS) {
      const tag = `402x690-${lang}`, p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(l => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.clear(); localStorage.setItem('shadowbox-language', l); }, lang); await p.reload({ timeout: 300000 }); await ready(p);
      await p.evaluate(l => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); app.setLanguage(l); const s = app.engine.career.store; s.create('Barak'); localStorage.setItem('gotr.adv.intro.' + s.current().id, '1'); for (const step of ['dream_arrival', 'dream_gym_talk']) ringfighterGame.store.gameAction({ type: 'adventure', adventure: 'story', step }); }, lang);
      // The real first Brick fight, ended by KO for the Fighter (any result advances).
      await p.evaluate(() => { const g = ringfighterGame.store; AdventureOldTown.storyFightStart({ store: g, startTraining: ringfighterGame.startTraining, startFight: ringfighterGame.startFight, change: a => { const r = g.gameAction(a); if (r.ok) ringfighterGame.apply?.(); return r.ok; } }, 'first_brick'); });
      await wait(p, () => app.engine.arena?.fightView?.match); await p.waitForTimeout(2500);
      await p.evaluate(() => { const v = app.engine.arena.fightView; v.match.finish(v.careerEntry.species, 'KO'); });
      await wait(p, () => { const a = document.querySelector('#stageContainer .bout-announcement'); return a && !a.hidden && /KO/.test(a.textContent); }); console.log(tag, 'fight over: announcement shown');
      await wait(p, () => window.StoryScenes?.playing === 'dream_after_brick' || document.querySelector('dialog[open] #sfBeat .sf-beat-main'), null, 300000);
      if (await p.evaluate(() => window.StoryScenes?.playing)) { await p.evaluate(() => StoryScenes.stop()); await wait(p, () => document.querySelector('dialog[open] #sfBeat .sf-beat-main'), null, 300000); }
      await p.waitForTimeout(800); await p.evaluate(() => document.querySelector('#sfBeat .sf-beat-main').click()); // Next: 4. Night Shadowboxing
      await wait(p, () => document.querySelector('#sfBeat .sf-beat-main') && /Shadowboxing/.test(document.getElementById('sfBeat').innerText)); await p.waitForTimeout(600);
      await p.evaluate(() => document.querySelector('#sfBeat .sf-beat-main').click());
      await wait(p, () => document.getElementById('advGoal') && app.engine.career.active && app.engine.targetMode === 'none'); await p.waitForTimeout(10000);
      const m0 = await measure(p); console.log(tag, 'first look', JSON.stringify(m0)); await p.waitForTimeout(4000);
      const m = await measure(p); console.log(tag, 'shadowboxing', JSON.stringify(m)); await shot(p, `${tag}-shadowboxing-after-brick`); const m2 = await measure(p); console.log(tag, 'after the picture', JSON.stringify(m2)); assert.deepEqual(m2.wonText, [], 'no result text left'); assert.equal(m2.overHead, false);
      assert.equal(m.announcement, null, 'the bout announcement is gone'); assert.equal(m.overHead, false, 'goal line over the head'); assert.deepEqual(m.underTools, [], 'goal line under the edge tools'); assert.equal(m.ellipsis, false, 'goal line cut with …');
      await p.evaluate(() => app.engine.career.finish()); await p.waitForTimeout(1500);
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('goal line browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
