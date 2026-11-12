// GOTR-0075: Guard feedback, last-seconds countdown and end-of-fight ceremony at 402x690 (EN/HE/RU).
// Per language: quick fight in Play -> Guard held (pose + hint) -> countdown at 7 s -> KO ceremony -> decision ceremony.
// Measures every HUD element against the stage edges and the fighters' projected boxes; saves pictures.
// Static server (APP_URL, default http://127.0.0.1:8771/). SHOTS=dir. ONLY="en,he,ru". ASSERT=1 fails on a rule break.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8771/', SHOTS = process.env.SHOTS || '';
const LANGS = (process.env.ONLY || 'en,he').split(',');
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
const probe = () => {
  const st = document.getElementById('stageContainer').getBoundingClientRect(), e = app.engine, v = e.arena?.fightView, cv = e.renderer.domElement.getBoundingClientRect();
  const R = n => { if (!n || n.hidden || !n.offsetParent) return null; const r = n.getBoundingClientRect(); return r.width && r.height ? { l: r.left, t: r.top, r: r.right, b: r.bottom, txt: (n.innerText || '').replace(/\s+/g, ' ').slice(0, 60) } : null; };
  const fighters = (v ? [...new Set(Object.values(v.coaches || {}))].map(c => c.root) : [e.coach?.root]).filter(Boolean).map(o => {
    o.updateWorldMatrix(true, true); const bx = new THREE.Box3().setFromObject(o); let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    for (const x of [bx.min.x, bx.max.x]) for (const y of [bx.min.y, bx.max.y]) for (const z of [bx.min.z, bx.max.z]) { const q = new THREE.Vector3(x, y, z).project(e.camera); const px = cv.left + (q.x + 1) / 2 * cv.width, py = cv.top + (1 - q.y) / 2 * cv.height; l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py); }
    return { l, t, r, b }; });
  const hit = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > .5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > .5;
  const els = { announce: '.bout-announcement', knockout: '.fight-knockout', cards: '#fightResults .fight-card-grid', actions: '#fightResults .fight-result-actions', tip: '.fp-guard-tip' }, out = {};
  for (const [k, sel] of Object.entries(els)) { const r = R(document.querySelector(sel)); if (!r) continue; out[k] = { box: [r.l, r.t, r.r, r.b].map(Math.round), txt: r.txt, clipped: r.l < st.left - .5 || r.r > st.right + .5 || r.t < st.top - .5 || r.b > st.bottom + .5, overFighter: fighters.some(f => hit(r, f)) }; }
  return { phase: v?.match?.phase, result: v?.match?.result?.stoppage || null, fighters: fighters.map(f => [f.l, f.t, f.r, f.b].map(Math.round)), ...out };
};
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] }); const bad = [];
  try {
    for (const lang of LANGS) {
      const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
      await p.evaluate(l => { localStorage.clear(); localStorage.setItem('shadowbox-language', l); }, lang);
      await p.reload({ timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
      await wait(p, () => document.querySelector('dialog.career-welcome[open]'));
      await p.evaluate(() => document.querySelector('dialog.career-welcome[open] button[type=submit]').click());
      await wait(p, () => app.engine.coach?.anatomy); await p.waitForTimeout(1500);
      await p.evaluate(() => { try { StoryScenes.stop(); } catch {} ringfighterGame.startFight({ seed: 7 }); });
      await wait(p, () => app.engine.arena?.fightView?.match && window.fighterPad?.shown, null, 240000);
      // skip the intro: straight into the round
      await p.evaluate(() => { const m = app.engine.arena.fightView.match; app.engine.cameraDirector?.skipIntro?.(); while (m.phase === 'intro') m.advance(.5); m.roundTime = 1.5; });
      const shot = async (name, ms = 2500) => { if (SHOTS) { await p.evaluate(() => { app.engine.lastRenderStamp = null; }); await p.waitForTimeout(ms); await p.screenshot({ timeout: 180000, path: `${SHOTS}/402x690-${lang}-${name}.png` }); } };
      const report = async label => { const r = await p.evaluate(probe); console.log(lang, label, JSON.stringify(r)); for (const k of ['announce', 'knockout', 'cards', 'actions', 'tip']) if (r[k] && (r[k].clipped || r[k].overFighter)) bad.push(`${lang} ${label} ${k} clipped=${r[k].clipped} overFighter=${r[k].overFighter}`); return r; };
      // Guard: lead glove position idle vs held (camera-independent: the glove's offset from the chest in the fighter's own frame)
      const glove = () => p.evaluate(() => { const m = app.engine.arena.fightView.match, c = app.engine.arena.fightView.coaches[m.playerActor], j = c.joints, L = x => c.root.worldToLocal(j[x].getWorldPosition(new THREE.Vector3())).toArray().map(v => v.toFixed(2)).join(','); return 'lead[' + L('handL') + '] rear[' + L('handR') + '] head[' + L('head') + ']'; });
      // game frames stepped in the page (headless WebGL renders ~1 frame/s): 10 idle frames, then Guard pressed and held (repeat orders)
      const step = n => p.evaluate(n => { const e = app.engine; for (let i = 0; i < n; i++) e.arena.update(e.animTime += .05, e.technique, e.currentAnim); }, n);
      await step(10); const idle = await glove();
      await p.evaluate(() => fighterPad.press('guard')); for (let k = 0; k < 5; k++) { await step(4); await p.evaluate(() => fighterPad.press('guard', 'hold')); }
      await step(2); const held = await glove(); await p.evaluate(() => { window.__hold = setInterval(() => fighterPad.press('guard', 'hold'), 150); fighterPad.guardTip(true); window.__tip = setInterval(() => fighterPad.guardTip(true), 1500); });
      console.log(lang, 'guard gloves in the fighter frame (x side, y height, z forward) idle', idle, 'held', held);
      await report('guard-held'); await shot('1-guard-held', 600);
      await p.evaluate(() => { clearInterval(window.__hold); clearInterval(window.__tip); const m = app.engine.arena.fightView.match; m.roundTime = m.roundSeconds - 7.2; });
      await p.waitForTimeout(2500); await report('countdown'); await shot('2-countdown');
      await p.evaluate(() => { const m = app.engine.arena.fightView.match; m.finish(m.playerActor === 'lion' ? 'rabbit' : 'lion', 'KO', false); m.phase = 'ceremony'; });
      await p.waitForTimeout(3000); const ko = await report('ko'); await shot('3-ko');
      if (ko.cards) bad.push(lang + ' KO shows judges cards');
      // decision: a fresh bout ended on the cards
      await p.evaluate(() => { ringfighterGame.startFight({ seed: 9, preset: 'club', rounds: 2 }); });
      await wait(p, () => app.engine.arena?.fightView?.match && !app.engine.arena.fightView.match.result, null, 240000);
      await p.evaluate(() => { const m = app.engine.arena.fightView.match; app.engine.cameraDirector?.skipIntro?.(); while (m.phase === 'intro') m.advance(.5); m.phase = 'round'; for (let i = 0; i < 40; i++) m.advance(.25); m.finish(null, 'points', true); for (let i = 0; i < 30 && m.phase !== 'ceremony'; i++) m.advance(.5); });
      await p.waitForTimeout(3000); const dec = await report('decision'); await shot('4-decision');
      if (!dec.cards) bad.push(lang + ' decision without cards');
      if (process.env.ASSERT) assert.deepEqual(errors, []);
      await p.close();
    }
  } finally { await b.close(); }
  console.log(bad.length ? 'RULE BREAKS:\n' + bad.join('\n') : 'no rule breaks');
  if (process.env.ASSERT && bad.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
