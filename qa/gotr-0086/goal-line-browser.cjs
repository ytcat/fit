// GOTR-0086 (remainder): the step goal line ("35 hits on the new bag in 40 seconds · 11/35 · ☆☆☆") must never cover the edge tools
// (modes button, Auto / timer / settings), the training cue / power gauge, or the Fighter's head, and must wrap (at most two lines)
// instead of being cut with "…". Fresh profile at 402x690 (and 360x640), EN and HE (RTL); several steps are launched straight from
// AdventureOldTown.launch and measured over a few seconds of play (the head moves). Pictures with SHOTS=dir.
// Usage: APP_URL=http://127.0.0.1:8931/ SHOTS=qa/gotr-0086 node qa/gotr-0086/goal-line-browser.cjs
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), { execFileSync } = require('node:child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8931/', SHOTS = process.env.SHOTS || '', LANGS = (process.env.LANGS || 'en,he').split(',');
const SIZES = (process.env.SIZES || '402x690,360x640').split(',').map(s => s.split('x').map(Number));
const STEPS = (process.env.STEPS || 'bag_drill,night_shadow,one_two_mitts,fight_prep').split(',');
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t, polling: 250 });
async function shot(p, name) {
  if (!SHOTS) return; const png = `${SHOTS}/${name}.png`; await p.screenshot({ path: png, timeout: 300000 });
  try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=82)', png, png.replace(/\.png$/, '.webp')]); fs.unlinkSync(png); } catch { /* keep the png */ }
}
// In the page: the goal line's box, the Fighter's head box (head joint + a sphere for mane / ears, projected) and the edge tools.
const measure = () => {
  const e = app.engine, cam = e.camera, c = e.renderer.domElement.getBoundingClientRect(), T = THREE, h = e.coach.joints.head.getWorldPosition(new T.Vector3()), R = e.coach.species === 'rabbit' ? .3 : .26;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const dx of [-R, R]) for (const dy of [-R * .8, R * 1.4]) for (const dz of [-R, R]) { const q = h.clone().add(new T.Vector3(dx, dy, dz)).project(cam); const sx = c.left + (q.x + 1) / 2 * c.width, sy = c.top + (1 - q.y) / 2 * c.height; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
  const box = n => { const r = n.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); };
  const shown = n => n && !n.hidden && n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden' && getComputedStyle(n).display !== 'none';
  const head = [x0, y0, x1, y1].map(Math.round), g = document.getElementById('advGoal'), txt = g?.querySelector('.adv-goal-text'), goal = g ? box(g) : null;
  const hit = (a, b) => a && b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const tools = [...document.querySelectorAll('#gameModes .gm-fab, #gameModes .gm-tool, #stageContainer .career-drill-cue, #stageContainer .gr-power-gauge, #stageContainer button')].filter(n => shown(n) && !g?.contains(n)).map(n => ({ id: n.id || n.className.split(' ').slice(0, 2).join('.'), box: box(n) })).filter(t => t.box[2] > t.box[0]);
  const lh = txt ? parseFloat(getComputedStyle(txt).lineHeight) || 14 : 14;
  return { head, goal, text: txt?.textContent, lines: txt ? Math.round(txt.getBoundingClientRect().height / lh) : 0, ellipsis: txt ? txt.scrollWidth > txt.clientWidth + 1 || getComputedStyle(txt).textOverflow === 'ellipsis' && getComputedStyle(txt).whiteSpace === 'nowrap' : null, overHead: hit(goal, head), underTools: tools.filter(t => hit(goal, t.box)).map(t => t.id), inStage: goal ? goal[0] >= c.left - 1 && goal[2] <= c.right + 1 && goal[1] >= c.top - 1 : null, dir: g?.dir, active: !!e.career.active };
};
(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }), fails = [];
  try {
    for (const [W, H] of SIZES) for (const lang of LANGS) {
      const tag = `${W}x${H}-${lang}`, p = await b.newPage({ viewport: { width: W, height: H } }), errors = []; p.on('pageerror', x => errors.push(x.message));
      await p.goto(URL, { timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
      await p.evaluate(l => { localStorage.clear(); localStorage.setItem('shadowbox-language', l); localStorage.setItem('gotr.adv.nointro', '1'); }, lang); await p.reload({ timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
      await wait(p, () => document.querySelector('dialog.career-welcome[open]'));
      await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Goal QA'; d.querySelector('button[type=submit]').click(); });
      await wait(p, () => document.querySelector('dialog.game-home[open]') && app.engine.coach?.anatomy); await p.evaluate(() => window.StoryScenes?.stop?.()); await p.waitForTimeout(1000);
      for (const step of STEPS) {
        await p.evaluate(id => { const g = ringfighterGame.store; ringfighterGame.close(); AdventureOldTown.launch({ store: g, startTraining: ringfighterGame.startTraining, startFight: ringfighterGame.startFight, change: a => { const r = g.gameAction(a); if (r.ok) ringfighterGame.apply?.(); return r.ok; } }, id); }, step);
        await wait(p, id => AdventureOldTown.run?.id === id && !AdventureOldTown.run.ended && document.getElementById('advGoal') && app.engine.career.active, step, 180000);
        let worst = null;
        for (let i = 0; i < 6; i++) { await p.waitForTimeout(1000); const m = await p.evaluate(measure); if (!worst || m.overHead || m.underTools.length || m.ellipsis || m.lines > 2) worst = m; if (i === 2) await shot(p, `${tag}-${step}`); }
        console.log(tag, step, JSON.stringify(worst));
        const bad = [worst.overHead && 'over the head', worst.underTools.length && 'under ' + worst.underTools.join('+'), worst.ellipsis && 'ellipsis', worst.lines > 2 && worst.lines + ' lines', worst.inStage === false && 'outside the stage'].filter(Boolean);
        if (bad.length) fails.push(`${tag} ${step}: ${bad.join(', ')}`);
        await p.evaluate(() => { AdventureOldTown.leave(); document.getElementById('advGoal')?.remove(); ringfighterGame.close(); }); await p.waitForTimeout(800);
      }
      const errs = errors.filter(x => !/GL Driver|ReadPixels/.test(x)); if (errs.length) fails.push(`${tag}: ${errs.join(' | ')}`); await p.close();
    }
  } finally { await b.close(); }
  assert.deepEqual(fails, [], fails.join('\n')); console.log('goal line browser ok');
})().catch(x => { console.error(x); process.exit(1); });
