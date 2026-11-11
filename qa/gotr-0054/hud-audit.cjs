// GOTR-0054 overlap audit. Numbers first: for each state x size x language, collect every visible positioned
// element that floats over the game (inside #stageContainer or fixed on the page), then count overlapping pairs:
//   HUD vs header, HUD vs footer controls / game pad zones, HUD vs HUD, plus HUD outside the stage and stage share.
// Usage: APP_URL=http://127.0.0.1:8254/ node qa/gotr-0054/hud-audit.cjs [label]   (SHOTS=dir for screenshots, QUICK=1 for 2 sizes)
const { chromium } = require('playwright');
const URL = process.env.APP_URL || 'http://127.0.0.1:8254/', SHOTS = process.env.SHOTS || '', LABEL = process.argv[2] || 'run';
const SIZES = process.env.QUICK ? [[402, 690], [852, 393]] : [[402, 690], [360, 640], [852, 393], [1366, 768]];
const LANGS = (process.env.LANGS || 'en,he').split(',');
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });

// Runs in the page. Returns {hud:[{n,r}], header, ctrl:[...]}.
function collect() {
  const stage = document.getElementById('stageContainer'), sr = stage.getBoundingClientRect();
  const vis = el => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .05) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const name = el => el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase());
  const rect = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  // Controls the HUD must never cover: header, game pad zones, bottom footer, tab bar / toolbars, camera-side buttons, play/pause.
  const ctrlSel = ['header', 'footer', '.fp-zone', '#playBtn', '#camLock', '#burstControl', '.ringside-toolbar', '.ringside-tabs', '#camFront', '#camBack', '#camSide'];
  const ctrl = [];
  for (const s of ctrlSel) for (const el of document.querySelectorAll(s)) if (vis(el)) ctrl.push({ n: s === 'header' || s === 'footer' ? s : name(el), r: rect(el), kind: s === 'header' ? 'header' : 'control' });
  const ctrlEls = new Set(ctrlSel.flatMap(s => [...document.querySelectorAll(s)]));
  const hud = [];
  const skip = el => el === stage || el.tagName === 'CANVAS' || el.tagName === 'DIALOG' || el.closest('dialog') || el.closest('header') || el.closest('footer') || [...ctrlEls].some(c => c === el || c.contains(el)) || el.id === 'fighterPad' || el.closest('.fighter-pad') || el.id === 'restModal';
  const cand = [];
  const extra = new Set([...document.querySelectorAll('.adv-toast')].filter(vis));
  for (const el of document.querySelectorAll('body *')) {
    if (skip(el)) continue;
    const cs = getComputedStyle(el); if (cs.position !== 'absolute' && cs.position !== 'fixed' && !extra.has(el)) continue;
    if (!vis(el)) continue;
    const bg = cs.backgroundColor, hasBg = bg && !/rgba\(0, 0, 0, 0\)/.test(bg), txt = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()), hasBorder = parseFloat(cs.borderTopWidth) > 0;
    if (!(hasBg || txt || hasBorder || el.querySelector('canvas,svg,img'))) { // pure layout wrapper: its visible positioned/painted children are collected instead
      continue;
    }
    cand.push(el);
  }
  // outermost only
  for (const el of cand) if (!cand.some(o => o !== el && o.contains(el))) hud.push({ n: name(el), r: rect(el), txt: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 40), outside: !stage.contains(el) });
  // pure wrappers whose painted children overlap are handled by the outermost-painted rule above; add visible painted children of wrappers that have none
  return { stage: { l: sr.left, t: sr.top, r: sr.right, b: sr.bottom }, hud, ctrl, vw: innerWidth, vh: innerHeight };
}

function analyse(d) {
  const ov = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const area = r => (r.r - r.l) * (r.b - r.t), sa = area(d.stage), pairs = [];
  const hud = d.hud.filter(h => !h.outside || true);
  for (const h of hud) for (const c of d.ctrl) { const o = ov(h.r, c.r); if (o > 12) pairs.push([c.kind, h.n, c.n, Math.round(o)]); }
  for (let i = 0; i < hud.length; i++) for (let j = i + 1; j < hud.length; j++) { const o = ov(hud[i].r, hud[j].r); if (o > 12) pairs.push(['hud', hud[i].n, hud[j].n, Math.round(o)]); }
  const outside = hud.filter(h => h.outside || h.r.t < d.stage.t - 1 || h.r.b > d.stage.b + 1 || h.r.l < -1 || h.r.r > d.vw + 1).map(h => h.n);
  let big = { n: '', share: 0 };
  for (const h of hud) { const s = ov(h.r, d.stage) / sa; if (s > big.share) big = { n: h.n, share: s }; }
  const union = hud.reduce((u, h) => u + ov(h.r, d.stage), 0) / sa;
  return { pairs, outside, big, totalShare: union, n: hud.length, names: hud.map(h => h.n) };
}

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const totals = { header: 0, control: 0, hud: 0, outside: 0 }, rows = [];
  let maxShare = { n: '', share: 0, where: '' }, shots = 0;
  const TO_ROUND = async () => { const e = app.engine, m = e.arena.fightView.match, render = e.renderer.render.bind(e.renderer); e.renderer.render = () => {}; let n = 0;
    while (m.snapshot().phase !== 'round' && n++ < 4000) { if (e.cameraDirector?.holdsClock) { e.cameraDirector.skipIntro?.(); await new Promise(r => setTimeout(r, 20)); continue; } e.animTime += 1 / 60; const f = e.arena.update(e.animTime); e.career?.onFrame?.(f, 1 / 60); if (n % 30 === 0) await new Promise(r => setTimeout(r, 0)); }
    e.renderer.render = render; };
  const drivers = {
    training: async p => { await p.evaluate(() => ringfighterGame.startTraining({ mode: 'pads', play: true })); await p.waitForTimeout(2500); },
    mission: async p => {
      await p.evaluate(() => { const rg = ringfighterGame, ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } }; AdventureOldTown.start(ctx, 'one_two_mitts'); });
      await wait(p, () => document.getElementById('advGoal') && app.engine.career.active); await p.waitForTimeout(2500);
    },
    finished: async p => {
      await p.evaluate(() => { const n = 20 - AdventureOldTown.run.value; for (let i = 0; i < n; i++) app.engine.onImpact({ actor: 'lion', receiver: 'pads', kind: 'pad', move: i % 2 ? 'cross' : 'jab', blocked: false, impulse: 20 }); });
      await wait(p, () => document.getElementById('advNext')); await p.waitForTimeout(600); // toasts still on screen
    },
    intro: async p => { await p.evaluate(() => ringfighterGame.startFight({ preset: 'club' })); await wait(p, () => app.engine.arena?.fightView?.match); await p.waitForTimeout(1500); },
    round: async p => { await p.evaluate(TO_ROUND); await p.waitForTimeout(2500); },
    decision: async p => { await p.evaluate(() => { const m = app.engine.arena.fightView.match; m.finish(null, 'points'); m.phaseTime = 12; }); await p.waitForTimeout(2500); },
    lesson: async p => { await p.evaluate(() => { app.engine.career.finish?.(); AcademyStage.start('first_rhythm'); }); await p.waitForTimeout(2500); },
    lesson: async p => { await p.evaluate(() => { app.engine.career.finish?.(); AcademyStage.start('first_rhythm'); }); await p.waitForTimeout(2500); },
    burst: async p => {
      await p.evaluate(() => { burstControl?.resetTip?.(); });
      await p.evaluate(() => ringfighterGame.startFight({ preset: 'club' })); await wait(p, () => app.engine.arena?.fightView?.match);
      await p.evaluate(TO_ROUND); await p.evaluate(() => { const m = app.engine.arena.fightView.match; for (const a of ['lion', 'rabbit']) { const f = m.fighters[a]; f.burst.charge = 1; f.burst.open = 0; } });
      await p.waitForTimeout(2500);
    },
  };
  for (const [w, h] of SIZES) for (const lang of LANGS) {
    const p = await b.newPage({ viewport: { width: w, height: h } }), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(URL, { timeout: 300000 }); await wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('HUD QA'); });
    await p.reload({ timeout: 300000 }); await wait(p, () => window.ringfighterGame && app.engine.coach?.anatomy);
    await p.evaluate(l => { app.setLanguage(l); document.querySelectorAll('dialog[open]').forEach(d => d.close()); try { localStorage.removeItem('gotr-burst-tip'); } catch { /* */ } }, lang);
    for (const st of ['training', 'mission', 'finished', 'lesson', 'intro', 'round', 'decision', 'burst']) {
      try {
        if (st === 'lesson') await p.evaluate(() => { document.getElementById('advGoal')?.remove(); document.getElementById('advNext')?.remove(); document.getElementById('advToasts')?.remove(); });
        if (st === 'intro') await p.evaluate(() => { AcademyStage.stop?.(); document.getElementById('advGoal')?.remove(); document.getElementById('advNext')?.remove(); document.getElementById('advToasts')?.remove(); app.engine.career.finish?.(); });
        await drivers[st](p);
        const a = analyse(await p.evaluate(collect));
        for (const x of a.pairs) totals[x[0]]++; totals.outside += a.outside.length;
        if (a.big.share > maxShare.share) maxShare = { ...a.big, where: `${st} ${w}x${h} ${lang}` };
        rows.push({ st, size: `${w}x${h}`, lang, pairs: a.pairs.length, hudN: a.n, names: (st === 'burst' || st === 'finished') ? a.names : undefined, outside: a.outside, big: a.big.n + ' ' + (a.big.share * 100).toFixed(1) + '%', all: (a.totalShare * 100).toFixed(1) + '%', detail: a.pairs.slice(0, 6) });
        if (SHOTS && shots < 6 && lang === 'en' && ((w === 402 && ['finished', 'decision', 'burst'].includes(st)) || (w === 852 && st === 'mission'))) { await p.screenshot({ path: `${SHOTS}/${LABEL}-${st}-${w}x${h}.png`, timeout: 300000 }); shots++; }
      } catch (e) { rows.push({ st, size: `${w}x${h}`, lang, error: e.message.slice(0, 120) }); }
    }
    if (errors.length) rows.push({ errors: errors.slice(0, 3) });
    await p.close();
  }
  for (const r of rows) console.log(JSON.stringify(r));
  console.log(`SUMMARY ${LABEL}: pairs vs header=${totals.header} vs controls=${totals.control} hud-vs-hud=${totals.hud} outside-stage=${totals.outside} | total=${totals.header + totals.control + totals.hud} | largest single HUD share=${(maxShare.share * 100).toFixed(1)}% (${maxShare.n} @ ${maxShare.where})`);
  await b.close();
})();
