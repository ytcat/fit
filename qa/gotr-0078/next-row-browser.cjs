// GOTR-0078 item 7: after a fight the "Next mission / Challenge Brick" row must sit in the bottom action area as plain buttons,
// never over a fighter (owner rule: no boxes over the game). Measures the fighters' screen boxes against the row at 402x690.
// Usage: APP_URL=http://127.0.0.1:8293/ SHOTS=qa/gotr-0078/flow node qa/gotr-0078/next-row-browser.cjs
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), { execFileSync } = require('node:child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8293/', SHOTS = process.env.SHOTS || '', LANGS = (process.env.LANGS || 'en,he').split(',');
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t, polling: 250 });
async function shot(p, name) {
  if (!SHOTS) return; const png = `${SHOTS}/${name}.png`; await p.screenshot({ path: png, timeout: 300000 });
  try { execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=80)', png, png.replace(/\.png$/, '.webp')]); fs.unlinkSync(png); } catch { /* keep the png */ }
}
// Screen boxes of both fighters (projected skinned-mesh bounds) and of the Next row.
const measure = p => p.evaluate(() => {
  const e = app.engine, cam = e.camera, c = e.renderer.domElement.getBoundingClientRect(), V = new THREE.Vector3(), boxes = [];
  for (const rig of [e.coach, e.arena?.rabbit].filter(Boolean)) {
    const root = rig.root || rig.group || rig.model || rig.mesh || rig; if (!root?.isObject3D) continue; root.updateMatrixWorld(true);
    const pts = []; root.traverse(o => { if (o.isBone) { o.getWorldPosition(V); pts.push(V.clone()); } });
    if (!pts.length) continue; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of pts) { q.project(cam); const sx = c.left + (q.x + 1) / 2 * c.width, sy = c.top + (1 - q.y) / 2 * c.height; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
    boxes.push([x0 - 12, y0 - 12, x1 + 12, y1 + 6].map(Math.round)); // bones + a margin for skin and gloves
  }
  const next = document.getElementById('advNext'), r = next?.getBoundingClientRect(), cs = next && getComputedStyle(next);
  const btns = next ? [...next.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map(Math.round); }) : [];
  const hits = btns.filter(([l, t, rr, bb]) => boxes.some(([x0, y0, x1, y1]) => l < x1 && rr > x0 && t < y1 && bb > y0));
  return { boxes, row: r ? [r.left, r.top, r.right, r.bottom].map(Math.round) : null, btns, hits: hits.length, panel: cs ? { bg: cs.backgroundColor, border: cs.borderTopWidth, shadow: cs.boxShadow } : null, vw: innerWidth, vh: innerHeight, docW: document.documentElement.scrollWidth };
});
(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const lang of LANGS) {
      const tag = `402x690-${lang}`, p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
      await p.evaluate(l => { localStorage.clear(); localStorage.setItem('shadowbox-language', l); }, lang); await p.reload({ timeout: 300000 }); await wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
      await p.evaluate(l => { app.setLanguage(l); app.engine.career.store.create('Next QA'); localStorage.setItem('gotr.adv.intro.' + app.engine.career.store.current().id, '1'); document.querySelectorAll('dialog[open]').forEach(d => d.close()); ringfighterGame.close?.(); }, lang);
      await p.evaluate(() => ringfighterGame.startFight({ preset: 'quick', rounds: 1, roundSeconds: 30, restSeconds: 0 }));
      await wait(p, () => app.engine.arena?.fightView?.match); await p.waitForTimeout(2000);
      await p.evaluate(() => { const v = app.engine.arena.fightView; v.match.finish(v.careerEntry.species, 'KO'); });
      await wait(p, () => app.engine.arena.fightView.match.result); await p.waitForTimeout(3000);
      // The award path calls AdventureOldTown.reward after a finished activity; call it the same way here (the award itself is not under test).
      await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.reward({ award: { xp: 12, coins: 9, unlocks: [] } }); });
      await wait(p, () => document.getElementById('advNext')); await p.waitForTimeout(1500);
      const m = await measure(p); console.log(tag, JSON.stringify(m)); await shot(p, `${tag}-6-next-row-after-fight`);
      assert.ok(m.boxes.length === 2, 'both fighters measured'); assert.equal(m.hits, 0, 'a Next button covers a fighter');
      assert.ok(m.panel.bg === 'rgba(0, 0, 0, 0)' && m.panel.border === '0px' && m.panel.shadow === 'none', 'no box: ' + JSON.stringify(m.panel));
      assert.ok(m.row[3] <= m.vh && m.docW <= m.vw, 'inside the screen');
      const bad = errors.filter(e => !/GL Driver|ReadPixels/.test(e)); assert.equal(bad.length, 0, bad.join('\n')); await p.close();
    }
    console.log('next row browser ok');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
