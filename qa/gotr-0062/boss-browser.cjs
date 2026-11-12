// GOTR-0062 Boss Brick in the browser: the boss bout starts from the story, Brick's tell (right glove down) and the
// scouted call line, a read (Duck) and an answer (Uppercut) pressed on the real pad, a phase change, the weak point.
// Checks the call line and goal line never overlap a fighter's head or body. Screenshots (webp) at 402x690 and 1366x768.
// APP_URL, SHOTS=dir, ONLY=402 (one size).
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), { execFileSync } = require('node:child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8462/', SHOTS = process.env.SHOTS || '';
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t, polling: 50 });
const ready = p => wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
async function shot(p, name) {
  if (!SHOTS) return; const png = `${SHOTS}/${name}.png`; await p.screenshot({ path: png, timeout: 300000 });
  try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=80)', png, png.replace(/\.png$/, '.webp')]); fs.unlinkSync(png); } catch { /* keep the png */ }
}
// Screen boxes of both fighters (head and body, with a margin) against the HUD text boxes.
const overlap = p => p.evaluate(() => {
  const e = app.engine, v = e.arena.fightView, cam = e.camera, cv = e.renderer.domElement.getBoundingClientRect();
  const scr = o => { const w = o.getWorldPosition(new THREE.Vector3()).project(cam); return { x: cv.left + (w.x + 1) / 2 * cv.width, y: cv.top + (1 - w.y) / 2 * cv.height }; };
  const boxes = [];
  for (const a of ['lion', 'rabbit']) { const j = v.coaches[a].joints, h = scr(j.head), pts = [h, scr(j.chest), scr(j.hips || j.chest)]; const xs = pts.map(q => q.x), ys = pts.map(q => q.y); boxes.push({ a, l: Math.min(...xs) - 45, r: Math.max(...xs) + 45, t: h.y - 55, b: Math.max(...ys) + 20 }); }
  const hud = [...document.querySelectorAll('#bossCall:not(:empty), #advGoal .adv-goal-text')].map(el => { const r = el.getBoundingClientRect(); return { id: el.id || el.className, l: r.left, r: r.right, t: r.top, b: r.bottom, text: el.textContent }; });
  const hits = []; for (const h of hud) for (const f of boxes) if (h.r > f.l && h.l < f.r && h.b > f.t && h.t < f.b) hits.push(h.id + ' over ' + f.a);
  return { hits, hud: hud.map(h => ({ id: h.id, t: Math.round(h.t), b: Math.round(h.b) })), boxes: boxes.map(b => ({ a: b.a, t: Math.round(b.t), b: Math.round(b.b) })) };
});
(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const sizes = process.env.ONLY ? [[402, 690]] : [[402, 690], [1366, 768]];
    for (const [vw, vh] of sizes) {
      const tag = `${vw}x${vh}`, p = await b.newPage({ viewport: { width: vw, height: vh } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await ready(p);
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.clear(); localStorage.setItem('shadowbox-language', 'en'); app.engine.career.store.create('Boss QA'); localStorage.setItem('gotr.adv.intro.' + app.engine.career.store.current().id, '1'); });
      await p.reload({ timeout: 300000 }); await ready(p);
      // scouted: the tell is marked in the fight
      await p.evaluate(() => {
        document.querySelectorAll('dialog[open]').forEach(d => d.close()); const g = ringfighterGame; g.store.gameAction({ type: 'adventure', adventure: 'scout', bossId: 'brick', correct: true });
        const ctx = { store: g.store, startTraining: g.startTraining, startFight: g.startFight, change: a => { const r = g.store.gameAction(a); if (r.ok) g.apply?.(); return r.ok; } };
        AdventureOldTown.launch(ctx, 'brick');
      });
      await wait(p, () => AdventureOldTown.run?.boss && app.engine.arena.fightView.match.phase === 'round');
      console.log(tag, 'round started', await p.evaluate(() => document.getElementById('advGoal').innerText));
      // the tell: Brick's right glove drops; screenshot in the middle of the tell
      await wait(p, () => { const s = AdventureOldTown.run.boss.state, m = app.engine.arena.fightView.match; return s.tell && m.time - s.tell.start > .45; });
      const tell = await p.evaluate(() => {
        const v = app.engine.arena.fightView, r = AdventureOldTown.run, boss = r.boss.boss, j = v.coaches[boss].joints, root = v.coaches[boss].root;
        const loc = n => root.worldToLocal(j[n].getWorldPosition(new THREE.Vector3())), hl = loc('handL'), hr = loc('handR'), head = loc('head');
        return { call: document.getElementById('bossCall').textContent, style: v.match.fighters[boss].action.guardStyle, handL: hl.toArray().map(x => +x.toFixed(2)), handR: hr.toArray().map(x => +x.toFixed(2)), head: +head.y.toFixed(2) };
      });
      console.log(tag, 'tell', JSON.stringify(tell)); assert.equal(tell.call, 'Right hand down → Duck!'); assert.equal(tell.style, 'drop_lead');
      const o1 = await overlap(p); console.log(tag, 'overlap tell', JSON.stringify(o1)); assert.equal(o1.hits.length, 0, JSON.stringify(o1));
      await shot(p, `${tag}-1-tell`);
      // answer it on the pad: Duck now, Uppercut once he is over-committed
      for (let i = 0; i < 3; i++) {
        if (i) await wait(p, () => { const s = AdventureOldTown.run.boss.state; return s.tell && app.engine.arena.fightView.match.time - s.tell.start > .2; });
        await p.evaluate(() => app.engine.player.press('roll'));
        const res = await p.evaluate(() => new Promise(res => { const t0 = performance.now(), s = AdventureOldTown.run.boss.state, r0 = s.reads, m0 = s.misses; const tick = () => { if (s.reads > r0) res('read'); else if (s.misses > m0) res('miss'); else if (performance.now() - t0 > 30000) res('timeout'); else requestAnimationFrame(tick); }; tick(); }));
        if (res === 'read') { await p.evaluate(() => app.engine.player.press('uppercut')); await p.waitForTimeout(120); if (i === 0) await shot(p, `${tag}-2-read-answer`); }
        console.log(tag, 'tell', i + 1, res, await p.evaluate(() => { const s = AdventureOldTown.run.boss.state; return JSON.stringify({ reads: s.reads, answers: s.answers, weak: s.weakCount, call: document.getElementById('bossCall').textContent }); }));
      }
      const st = await p.evaluate(() => { const s = AdventureOldTown.run.boss.state; return { reads: s.reads, weak: s.weakCount }; });
      if (st.weak) { await p.waitForTimeout(400); const o3 = await overlap(p); assert.equal(o3.hits.length, 0, JSON.stringify(o3)); await shot(p, `${tag}-3-weak-point`); console.log(tag, 'weak point', await p.evaluate(() => document.getElementById('bossCall').textContent)); }
      // phase change: Brick's health to 59% -> phase 2 line, push-in, the charge
      await p.evaluate(() => { const r = AdventureOldTown.run; app.engine.arena.fightView.match.fighters[r.boss.boss].condition = 59; });
      await wait(p, () => AdventureOldTown.run.boss.state.phase === 2); await p.waitForTimeout(500);
      const ph = await p.evaluate(() => ({ strip: document.getElementById('advGoal').innerText, call: document.getElementById('bossCall').textContent }));
      console.log(tag, 'phase 2', JSON.stringify(ph)); assert.ok(/Phase 2\/3: Charging/.test(ph.strip) && /coming through/.test(ph.call), JSON.stringify(ph));
      const o2 = await overlap(p); console.log(tag, 'overlap phase', JSON.stringify(o2.hits)); assert.equal(o2.hits.length, 0, JSON.stringify(o2));
      await shot(p, `${tag}-4-phase2`);
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('boss browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
