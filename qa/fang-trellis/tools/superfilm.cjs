// Super Punch knockout film: real frames on the game rigs (Chromium + SwiftShader, 402x690), driven frame by frame on the
// fight clock, as contact sheets (webp). usage: node qa/super-punch/film.cjs [outDir] [case,case...]
// cases: ring (Championship ring), street (Chapter 1 market fight vs Fang), docks (Chapter 1 docks fight vs Rourke),
// basement (Underground), gym (first Brick fight on Bruno's gym floor). FILM=camera:celebration forces a variant.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..', '..', '..'), out = process.argv[2] || __dirname, only = (process.argv[3] || '').split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.opus': 'audio/ogg', '.m4a': 'audio/mp4' };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(root) || !fs.existsSync(f) || (process.env.BEFORE && f.includes('fang-head.glb'))) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
// [name, how to start, place, film (camera:celebration), frames (fight seconds after the impact; 'dip' = before it; 'end' = after the hold)]
const CASES = [
  ['ring', `()=>{__ctx.change({type:'venue',venueId:'championship'});ringfighterGame.startFight({watch:true,rounds:1,roundSeconds:60,restSeconds:0});}`, 'shoulder_push:arms_up'],
  ['ring2', `()=>{__ctx.change({type:'venue',venueId:'championship'});ringfighterGame.startFight({watch:true,rounds:1,roundSeconds:60,restSeconds:0});}`, 'low_orbit:double_biceps'],
  ['street', `()=>AdventureOldTown.storyFightStart(__ctx,'market_robber')`, 'side_track:point_crowd'],
  ['street2', `()=>{__ctx.change({type:'venue',venueId:'street'});ringfighterGame.startFight({watch:true,rounds:1,roundSeconds:60,restSeconds:0});}`, 'low_orbit:arms_up'],
  ['docks', `()=>AdventureOldTown.storyFightStart(__ctx,'docks_fight')`, 'overhead_drop:chest_pound'],
  ['basement', `()=>{__ctx.change({type:'venue',venueId:'underground'});ringfighterGame.startFight({watch:true,rounds:1,roundSeconds:60,restSeconds:0});}`, 'front_low:shuffle'],
  ['gym', `()=>AdventureOldTown.storyFightStart(__ctx,'first_brick')`, 'side_track:chest_pound'],
  ['ring-rabbit', `()=>{__ctx.change({type:'venue',venueId:'championship'});ringfighterGame.startFight({watch:true,rounds:1,roundSeconds:60,restSeconds:0});}`, 'front_low:point_crowd', 'rabbit'], // the rabbit lands it on the lion
];
const FRAMES = [['dip', 'dip'], [.015, 'contact'], [.09, 'impact (slow)'], [.18, 'slow'], [.55, 'fall'], [1.25, 'down'], [2.3, 'blackout'], [2.95, 'celebrate'], [3.8, 'celebrate'], [4.8, 'celebrate'], ['end', 'ending']];
server.listen(0, async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.setDefaultTimeout(600000);
  p.on('pageerror', e => errors.push(e.message));
  const base = `http://localhost:${server.address().port}/`;
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { } });
  const ready = () => p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.SuperPunchFilm && window.DreamPose, null, { timeout: 600000 });
  await p.goto(base, { timeout: 600000 }); await ready();
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); if (!app.engine.career.store.current()) app.engine.career.store.create('Ring QA'); });
  // every case on a freshly loaded page (no story strip, after-film or map left over from the case before)
  const boot = async () => { await p.reload(); await ready(); await p.evaluate(() => {
    setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene):not(.story-scene)').forEach(d => d.close()), 400);
    const rg = window.ringfighterGame; window.__ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } };
    const e = app.engine;
    // one 60 Hz step of the engine's clock (no drawing): the bout, the film hooks, the venue set and the career/story hooks
    window.__tick = () => { e.animTime += 1 / 60; const f = e.arena.update(e.animTime, e.technique, e.currentAnim); e.career?.onFrame?.(f, 1 / 60); e.world?.update?.(e.animTime, e.arena?.mode || 'none'); };
    window.__until = async (cond, max = 2400) => { for (let i = 0; i < max; i++) { if (cond()) return true; if (e.cameraDirector?.holdsClock) { e.cameraDirector.skipIntro?.(); } window.__tick(); if (i % 30 === 29) await new Promise(r => setTimeout(r, 0)); } return cond(); };
  }); };
  const frames = async n => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.evaluate(() => { app.engine.lastRenderStamp = null; }); await p.waitForFunction(a => app.engine.renderer.info.render.frame >= a[0] + a[1], [n0, n], { timeout: 600000 }); };
  const until = async (src, max) => { const ok = await p.evaluate(([s, m]) => window.__until(new Function('return (' + s + ')')(), m), [src, max]); if (!ok) { console.log('events', await p.evaluate(() => JSON.stringify(app.engine.arena.fightView.match.events.filter(x => /finisher|knock|final/.test(x.type)).slice(-6)))); throw new Error('not reached: ' + src); } };
  const probe = () => p.evaluate(() => {
    const v = app.engine.arena.fightView, m = v.match, sp = v.sundayPunch || {}, r = m.result, shown = n => { for (let o = n; o; o = o.parent) if (!o.visible) return false; return true; };
    const low = c => { let lo = Infinity; const P = c.skin.geometry.attributes.position; c.root.updateMatrixWorld(true); for (let i = 0; i < P.count; i += 7) lo = Math.min(lo, c.root.localToWorld(c.skinPoint(c.skin, i)).y); return +lo.toFixed(3); };
    const fallen = sp.fallen, striker = sp.striker?.actor;
    return { u: r?.finisher ? +(m.time - r.finisherTime).toFixed(3) : null, phase: m.phase, hold: m.finisherHold(), film: sp.film && { camera: sp.film.camera, celebrate: sp.film.celebrate, ending: sp.film.ending.id, story: sp.film.ending.story || null }, referee: shown(v.referee.root), ringless: v.ringless?.id || null,
      fallenLow: fallen ? low(v.coaches[fallen]) : null, strikerLow: striker ? low(v.coaches[striker]) : null, black: document.querySelector('.sp-black')?.style.opacity, cheer: v.ringless?.set?.cheer ?? null, close: v.ringless?.set?.close ?? null, dent: fallen ? v.coaches[fallen].surfaceUniforms?.dent.value.w : null, bars: document.querySelector('.sp-film')?.className, camToStriker: +app.engine.camera.position.distanceTo(v.coaches[window.__striker].root.getWorldPosition(new THREE.Vector3())).toFixed(2), camToFallen: +app.engine.camera.position.distanceTo(v.coaches[window.__striker === 'lion' ? 'rabbit' : 'lion'].root.getWorldPosition(new THREE.Vector3())).toFixed(2) };
  });
  const sheets = [];
  for (const [name, start, film, who] of CASES) {
    if (only.length && !only.includes(name)) continue;
    const t0 = Date.now();
    await boot();
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
    await p.evaluate(`(${start})()`); await p.waitForFunction(() => app.engine.arena?.fightView?.match, null, { timeout: 600000 });
    await p.evaluate(() => { app.engine.isPlaying = true; app.engine.speed = 0; if (app.engine.player) app.engine.player.enabled = false; });
    await until(`()=>app.engine.arena.fightView.match.phase==='round'&&app.engine.arena.fightView.match.time>2`, 3000);
    // the player's Fighter owns the finisher; the Opponent hurt and the Burst full (as the bout would make it)
    const forced = process.env.FILM || film;
    await p.evaluate(([forced, who]) => {
      const v = app.engine.arena.fightView, m = v.match, s = who || v.careerEntry?.species || m.playerActor || 'lion', o = s === 'lion' ? 'rabbit' : 'lion';
      m.finisherOwned = { ...(m.finisherOwned || {}), [s]: ['sunday_punch'] }; m.fighters[o].condition = 18; m.fighters[s].burst.charge = 1; window.__striker = s;
      if (forced) { const [camera, celebrate] = forced.split(':'), place = v.ringless?.id || (v.gymFight ? 'gym' : 'ring'), opp = v.coaches[o].character || o; v.sundayPunch = v.sundayPunch || {}; v.sundayPunch.film = { ...SuperPunchFilm.choose({ seed: m.seed, place, venue: place, opponent: opp, striker: s, last: null }), camera, celebrate }; }
    }, [forced, who]);
    const shots = [];
    // a Super Punch can miss or be blocked (bare hands are smaller than gloves): then the bout goes on and the player tries again
    for (let attempt = 0; attempt < 5; attempt++) {
      await p.evaluate(() => { const m = app.engine.arena.fightView.match, o = __striker === 'lion' ? 'rabbit' : 'lion'; m.fighters[o].condition = Math.min(m.fighters[o].condition, 18); m.fighters[__striker].burst.charge = 1; window.__misses = m.events.filter(x => x.type === 'finisher-miss').length; });
      await until(`()=>{const m=app.engine.arena.fightView.match;return m.fighters[__striker].action?.finisher||m.requestFinisher(__striker)}`, 900);
      await until(`()=>{const m=app.engine.arena.fightView.match,a=m.fighters[__striker].action;return m.result||a&&m.time-a.start>.42}`, 600);
      await frames(2); const file = path.join(out, `${name}-dip.png`); await p.screenshot({ path: file }); const pr = await probe(); console.log(name, 'dip', attempt, JSON.stringify(pr));
      const landed = await p.evaluate(() => window.__until(() => { const m = app.engine.arena.fightView.match; return m.result || m.events.filter(x => x.type === 'finisher-miss').length > __misses; }, 900).then(() => !!app.engine.arena.fightView.match.result?.finisher));
      if (landed) { shots.push([file, 'dip']); break; }
      console.log(name, 'missed, again'); await until(`()=>{const m=app.engine.arena.fightView.match;return !m.fighters[__striker].action}`, 300);
    }
    for (const [at, label] of FRAMES) {
      if (at === 'dip') continue;
      else if (at === 'end') await until(`()=>{const m=app.engine.arena.fightView.match;return !m.finisherHold()&&m.phase==='ceremony'&&m.phaseTime>(app.engine.arena.fightView.storyFight?.6:2.2)}`, 1800);
      else await until(`()=>{const m=app.engine.arena.fightView.match;return m.result?.finisher&&m.time-m.result.finisherTime>=${at}}`, 2400);
      await frames(2);
      const pr = await probe(); console.log(name, label, JSON.stringify(pr));
      const file = path.join(out, `${name}-${String(shots.length).padStart(2, '0')}.png`); await p.screenshot({ path: file }); shots.push([file, `${label} ${pr.u == null ? '' : 'u=' + pr.u}`]);
      const close = await p.evaluate(() => { const T = THREE, e = app.engine, r = e.renderer, c = StoryCast.rig('fang', e); if (!c?.root.parent) return null; const W = 402, H = 402, rt = new T.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.encoding = T.sRGBEncoding; const buf = new Uint8Array(W * H * 4);
        const h = c.joints.head.getWorldPosition(new T.Vector3()), fwd = new T.Vector3(0, 0, 1).applyQuaternion(c.joints.head.getWorldQuaternion(new T.Quaternion())); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(1, 0, 0); fwd.normalize(); const side = new T.Vector3(-fwd.z, 0, fwd.x);
        const cam = new T.PerspectiveCamera(30, 1, .03, 60); cam.position.copy(h).addScaledVector(fwd, 1.1).addScaledVector(side, .9).add(new T.Vector3(0, .55, 0)); cam.lookAt(h);
        let top = c.root; while (top.parent) top = top.parent; r.setRenderTarget(rt); r.render(top, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H); for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(img, 0, 0); const url1 = cv.toDataURL('image/png');
        // how deep the head goes into the ground (y 0): the model's vertices (sampled) and the head joint; plus a low side view
        const grp = c.joints.head.getObjectByName('Fang: authored head'); let lo = 1e9, below = 0, n = 0, eyeY = null; const v = new T.Vector3();
        if (grp) grp.traverse(o => { if (!o.isMesh) return; const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i += 3) { v.fromBufferAttribute(P, i); const loc = v.clone(); v.applyMatrix4(o.matrixWorld); n++; lo = Math.min(lo, v.y); if (v.y < -.01) below++; if (Math.abs(loc.x - .09) < .02 && Math.abs(loc.y - .18) < .02 && loc.z > .1) eyeY = v.y; } });
        const cam2 = new T.PerspectiveCamera(30, 1, .03, 60); cam2.position.copy(h).addScaledVector(side, 1.6); cam2.position.y = .12; cam2.lookAt(h.x, .1, h.z);
        r.setRenderTarget(rt); r.render(top, cam2); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); r.setRenderTarget(null); for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); cx.putImageData(img, 0, 0);
        const url2 = cv.toDataURL('image/png'); rt.dispose();
        return { url: url1, url2, on: !!c.castHead?.on, ground: { headJointY: +h.y.toFixed(3), modelMinY: +lo.toFixed(3), below: +(below / Math.max(1, n)).toFixed(3), eyeY: eyeY == null ? null : +eyeY.toFixed(3) } }; });
      if (close) { fs.writeFileSync(file.replace('.png', '-close.png'), Buffer.from(close.url.split(',')[1], 'base64')); fs.writeFileSync(file.replace('.png', '-ground.png'), Buffer.from(close.url2.split(',')[1], 'base64')); console.log('close head on', close.on, label, JSON.stringify(close.ground)); }
    }
    const sheet = path.join(out, `${name}-sheet.webp`), meta = await probe();
    const title = `${name}: ${meta.film?.camera} / ${meta.film?.celebrate} / ending ${meta.film?.ending}${meta.film?.story ? ' (' + meta.film.story + ')' : ''}`;
    cp.execFileSync('python3', [path.join(__dirname, 'sheet.py'), sheet, title, ...shots.flat()]);
    if (!process.env.KEEP) for (const [f] of shots) fs.unlinkSync(f);
    sheets.push(sheet); console.log('sheet', sheet, ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  }
  console.log('errors', JSON.stringify(errors));
  await b.close(); server.close();
});
