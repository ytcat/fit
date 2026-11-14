// GOTR-0065 ringless fights: pictures (guard, exchange, knockdown) of the Chapter 1 market robbery (Street), a Basement fight
// and the Chapter 1 docks fight (Dockside Hangar), plus a Championship Arena fight to show the ring venues are unchanged.
// node qa/gotr-0065/browser.cjs <port> [outDir]   (python3 -m http.server <port> from the repo root)
const { chromium } = require('playwright'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const [port = '8177', out = path.join(__dirname)] = process.argv.slice(2);
let frames = null;
const shot = async (p, name) => { await frames(3); const png = path.join(out, name + '.png'); await p.screenshot({ path: png, timeout: 300000 }); cp.execFileSync('python3', ['-c', `from PIL import Image;Image.open(${JSON.stringify(png)}).save(${JSON.stringify(png.replace(/png$/, 'webp'))},quality=80)`]); fs.unlinkSync(png); };
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.setDefaultTimeout(300000); p.on('pageerror', e => errors.push(e.message));
    const ready = () => p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy, null, { timeout: 300000 });
    await p.goto('http://127.0.0.1:' + port + '/'); await ready();
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); localStorage.setItem('gotr.adv.nointro', '1'); if (!app.engine.career.store.current()) app.engine.career.store.create('Ring QA'); });
    await p.reload(); await ready();
    // Clock driver (software WebGL draws ~1 fps): advance the real fight clock in 1/60 s steps without drawing, then draw for the picture.
    await p.evaluate(() => {
      setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene):not(.story-scene)').forEach(d => d.close()), 400);
      const rg = window.ringfighterGame; window.__ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } };
      const e = app.engine, render = e.renderer.render.bind(e.renderer); e.renderer.render = (...a) => { if (!window.__noRender) render(...a); };
      window.__drive = async (cond, max) => { window.__noRender = true; try { let t = 0, n = 0; while (!cond()) { if (t >= max) return false; if (!e.isPlaying || e.cameraDirector?.holdsClock || e.targetMode !== 'fight') { e.isPlaying = true; e.cameraDirector?.skipIntro?.(); await new Promise(r => setTimeout(r, 30)); if (++n > 3000) return false; continue; } e.animTime += 1 / 60; t += 1 / 60; const f = e.arena.update(e.animTime); e.career?.onFrame?.(f, 1 / 60); if (Math.round(t * 60) % 60 === 0) await new Promise(r => setTimeout(r, 0)); } return true; } finally { window.__noRender = false; } };
    });
    const until = async (src, max = 40) => { const ok = await p.evaluate(([src, max]) => window.__drive(new Function('return (' + src + ')')(), max), [src, max]); assert.ok(ok, 'not reached: ' + src); };
    frames = async n => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(a => app.engine.renderer.info.render.frame >= a[0] + a[1], [n0, n], { timeout: 600000 }); };
    const probe = () => p.evaluate(() => {
      const v = app.engine.arena.fightView, shown = n => { for (let o = n; o; o = o.parent) if (!o.visible) return false; return true; };
      const gloves = Object.values(v.coaches).flatMap(c => [c.gloveMeshes?.L, c.gloveMeshes?.R]).filter(Boolean).filter(shown).length;
      const pos = Object.values(v.coaches).map(c => c.root.position), far = Math.max(...pos.map(q => Math.hypot(q.x, q.z)));
      return { venue: app.engine.career.store.game()?.venue, ringless: v.ringless?.id || null, ringShown: v.ring.children.filter(shown).length, referee: shown(v.referee.root), gloves, outfits: Object.values(v.coaches).map(c => window.StoryCast?.outfitOf(c)), mirror: v.cast.scale.x, far: +far.toFixed(2), phase: v.match.phase, count: v.match.count, hud: document.querySelector('.fight-status, #fightStatus, .fight-hud')?.textContent?.trim().slice(0, 60) || null };
    });
    const cases = [
      ['street-market-robbery', () => AdventureOldTown.storyFightStart(window.__ctx, 'market_robber')],
      ['basement', () => { window.__ctx.change({ type: 'venue', venueId: 'underground' }); ringfighterGame.startFight({ watch: true, rounds: 1, roundSeconds: 60, restSeconds: 0 }); }],
      ['docks-fight', () => AdventureOldTown.storyFightStart(window.__ctx, 'docks_fight')],
      ['championship-ring', () => { window.__ctx.change({ type: 'venue', venueId: 'championship' }); ringfighterGame.startFight({ watch: true, rounds: 1, roundSeconds: 60, restSeconds: 0 }); }]
    ];
    for (const [name, start] of cases) {
      await p.evaluate(() => { try { AdventureOldTown.leave?.(); } catch { } try { ringfighterGame.close?.(); } catch { } document.querySelectorAll('dialog[open]:not(.story-scene)').forEach(d => d.close()); });
      await p.evaluate(`(${start})()`); await p.waitForFunction(() => app.engine.arena?.fightView?.match, null, { timeout: 300000 });
      await p.evaluate(() => { app.engine.isPlaying = true; if (app.engine.player) app.engine.player.enabled = false; });
      await until(`()=>app.engine.arena.fightView.match.phase==='round'&&app.engine.arena.fightView.match.time>1.5`);
      const guard = await probe(); console.log(name, 'guard', JSON.stringify(guard)); await shot(p, `402x690-${name}-1-guard`);
      await until(`()=>{const m=app.engine.arena.fightView.match;return m.phase==='round'&&Object.values(m.fighters).some(f=>f.action?.attack&&m.time-f.action.start>.12)}`);
      const ex = await probe(); console.log(name, 'exchange', JSON.stringify(ex)); await shot(p, `402x690-${name}-2-exchange`);
      await p.evaluate(() => { const m = app.engine.arena.fightView.match; m.fighters.rabbit.pendingDown = true; });
      await until(`()=>{const m=app.engine.arena.fightView.match;return m.phase==='count'&&m.phaseTime>1.6}`);
      const kd = await probe(); console.log(name, 'knockdown', JSON.stringify(kd)); await shot(p, `402x690-${name}-3-knockdown`);
      const ringless = name !== 'championship-ring';
      for (const s of [guard, ex, kd]) { assert.equal(!!s.ringless, ringless, name); assert.equal(s.ringShown === 0, ringless, name + ' ring parts'); assert.equal(s.referee, !ringless, name + ' referee'); assert.equal(s.gloves === 0, ringless, name + ' gloves'); assert.equal(s.mirror, -1); assert.ok(s.far < 2.3, name + ' inside the circle'); }
      await p.evaluate(() => { try { AdventureOldTown.leave?.(); } catch { } });
    }
    console.log('errors', JSON.stringify(errors)); assert.deepEqual(errors, []);
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
