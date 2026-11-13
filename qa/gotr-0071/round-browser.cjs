// GOTR-0071: the 15-second round at the Coach's mitts. Per language at 402x690: free training in Auto, tap the edge timer,
// play the round with real punch orders (BoxingInput via the Fighter pad rules), let it end; counts sounds and bells and
// saves pictures. Game time is stepped in the page (headless WebGL is ~1 fps), then one real frame renders each picture.
// Static server (APP_URL, default http://127.0.0.1:8771/). SHOTS=dir for pictures. ONLY="en,he" to limit languages. TAG=prefix.
const { chromium } = require('playwright'), assert = require('node:assert/strict');
const URL = process.env.APP_URL || 'http://127.0.0.1:8771/', SHOTS = process.env.SHOTS || '', TAG = process.env.TAG || '';
const LANGS = (process.env.ONLY || 'en,he').split(',');
const wait = (p, f, a, t = 300000) => p.waitForFunction(f, a, { timeout: t });
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  try {
    for (const lang of LANGS) {
      const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.goto(URL, { timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
      await p.evaluate(l => { localStorage.clear(); localStorage.setItem('shadowbox-language', l); }, lang);
      await p.reload({ timeout: 300000 }); await wait(p, () => window.ringfighterGame && window.GameModes);
      await wait(p, () => document.querySelector('dialog.career-welcome[open]'));
      await p.evaluate(() => document.querySelector('dialog.career-welcome[open] button[type=submit]').click());
      await wait(p, () => app.engine.coach?.anatomy); await p.waitForTimeout(1500);
      await p.evaluate(() => { try { StoryScenes.stop(); } catch {} ringfighterGame.startTraining({ mode: 'pads', play: false, setupOnly: true }); app.engine.isPlaying = true; app.audio.init(true); });
      await wait(p, () => app.audio.samples.size > 5 && app.audio.ctx?.state === 'running', null, 120000);
      await p.evaluate(() => {
        window.__rounds = []; addEventListener('ringfighter-round', ev => __rounds.push(ev.detail.phase + ':' + ev.detail.reason + '@' + (performance.now() | 0))); window.__log = []; const a = app.audio, o = a.playSample.bind(a); a.playSample = (n, ...r) => { const g = o(n, ...r); __log.push([typeof n === 'string' ? n : 'buf', !!g]); return g; };
        const ob = a.bell.bind(a); a.bell = k => { __log.push(['BELL:' + (k || 'start'), true]); return ob(k); };
        // one game frame exactly as engine.animate does it, without rendering
        window.__sim = (s, punch) => { const e = app.engine; let sw = 0, im = 0, n = 0; for (let t = 0; t < s; t += .05, n++) { if (!e.isPlaying) break; if (punch && n % 12 === 0 && e.player?.enabled) e.player.press(['jab', 'cross', 'hook'][(n / 12) % 3]); e.animTime += .05; const f = e.arena.update(e.animTime, e.technique, e.currentAnim); e.career.onFrame(f, .05); for (const x of f.swings || []) { sw++; e.onSwing?.(x); } for (const h of [...f.contacts, ...(f.platformContacts || [])]) { im++; e.onImpact?.(h); } } return { sw, im }; };
      });
      const state = () => p.evaluate(() => { const line = document.querySelector('.gm-round'), r = line && !line.hidden ? line.getBoundingClientRect() : null;
        return { player: app.engine.player?.enabled, active: app.engine.career.active ? +(app.engine.career.active.duration - app.engine.career.active.seconds).toFixed(1) : null, playing: app.engine.isPlaying,
          sounds: __log.filter(x => x[1]).length, bells: __log.filter(x => x[0].startsWith('BELL')).map(x => x[0]).join(','), rounds: (window.__rounds || []).join(' '), timer: document.querySelector('.gm-tool-timer')?.textContent, timerLabel: document.querySelector('.gm-tool-timer')?.getAttribute('aria-label'),
          pad: document.body.classList.contains('fighter-pad-on'), line: line && !line.hidden ? line.innerText.replace(/\s+/g, ' ') : null, lineBox: r && [r.left, r.top, r.right, r.bottom].map(Math.round), overFighters: r ? over(r) : 0 };
        // the Fighter's and the Coach's screen boxes (whole body incl. head), projected with the game camera; the line must not touch them
        function over(r) { const e = app.engine, cv = e.renderer.domElement.getBoundingClientRect(); let n = 0;
          for (const o of [e.coach?.root, e.arena?.rabbit?.root].filter(Boolean)) { o.updateWorldMatrix(true, true); const bx = new THREE.Box3().setFromObject(o); if (bx.isEmpty()) continue; let l = 1e9, t = 1e9, rr = -1e9, bb = -1e9;
            for (const x of [bx.min.x, bx.max.x]) for (const y of [bx.min.y, bx.max.y]) for (const z of [bx.min.z, bx.max.z]) { const v = new THREE.Vector3(x, y, z).project(e.camera); const px = cv.left + (v.x + 1) / 2 * cv.width, py = cv.top + (1 - v.y) / 2 * cv.height; l = Math.min(l, px); rr = Math.max(rr, px); t = Math.min(t, py); bb = Math.max(bb, py); }
            if (Math.min(r.right, rr) - Math.max(r.left, l) > .5 && Math.min(r.bottom, bb) - Math.max(r.top, t) > .5) n++; }
          return n; } });
      const shot = async name => { if (!SHOTS) return; await p.evaluate(() => { app.engine.lastRenderStamp = null; }); await p.waitForTimeout(2500); await p.screenshot({ path: `${SHOTS}/${TAG}402x690-${lang}-${name}.png` }); };
      const run = async (label, s, punch) => { const r = await p.evaluate(([s, punch]) => { __log = []; return __sim(s, punch); }, [s, punch]); const st = await state(); console.log(lang, label, JSON.stringify({ ...r, ...st })); return { ...r, ...st }; };
      const free = await run('free Auto 6s', 6); assert.ok(free.sounds > 4, 'free Auto training is audible');
      await p.evaluate(() => GameModes.paint()); await shot('1-idle');
      await p.evaluate(() => { __log = []; document.querySelector('.gm-tool-timer').click(); });
      await p.waitForTimeout(400); await p.evaluate(() => { window.ringsideLayout?.paint(); GameModes.paint(); }); const started = await state(); console.log(lang, 'tapped', JSON.stringify(started));
      await shot('2-start');
      const mid = await run('round 6s with punches', 6, true);
      await p.evaluate(() => GameModes.paint()); await shot('3-round');
      const end = await run('round end', 10, true);
      await p.evaluate(() => { window.ringsideLayout?.paint(); GameModes.paint(); }); const after = await state(); console.log(lang, 'after', JSON.stringify(after));
      await shot('4-result');
      if (process.env.ASSERT) {
        assert.equal(started.active > 14, true, 'round started'); assert.ok(started.bells.includes('BELL:start'), 'start bell');
        assert.ok(started.line, 'start line shown'); assert.ok(started.pad, 'punch pad visible when the round is played by hand');
        assert.ok(mid.im > 0 && mid.sounds > 0, 'landed punches on the mitts are audible during the round');
        assert.ok(end.bells.includes('BELL:end'), 'final bell'); assert.equal(after.active, null); assert.ok(after.line, 'result line');
        assert.equal(started.overFighters + mid.overFighters + after.overFighters, 0, 'the round line covers neither the Fighter nor the Coach');
        assert.equal(after.playing, true, 'the scene keeps running after the final bell');
        assert.deepEqual(errors, []);
      }
      await p.close();
    }
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
