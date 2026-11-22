// Whole-body mopping QA (owner 2026-11-22: "emulate real body movement of the player"): drives the shift with real touch
// drags (side-to-side sweeps, a long push with steps, a rinse, the tired stretch), logs every rendered frame (hands on
// the handle, planted-foot drift, handle clear of the torso, steps) and freezes the frame at chosen moments to render it
// from three cameras (phone framing, side, 3/4). Writes strips and body.json to <outdir>.
// usage: node qa/mop-night/body.cjs <outdir>
const { open, launchShift, frames } = require('./launch.cjs'), path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2] || path.join(__dirname, 'body'); fs.mkdirSync(out, { recursive: true });
  const { p, touch, close, errors } = await open();
  const proj = (x, z) => p.evaluate(([x, z]) => StoryScenes.debug.projectFloor(x, z), [x, z]);
  const shots = {};
  try {
    await launchShift(p); await frames(p, 4);
    await p.evaluate(() => { // log every rendered frame; freeze()/still() hold the picture for the strips
      const r = StoryScenes.debug, f0 = r.frame; window.__log = []; window.__hold = false;
      r.frame = d => { if (window.__hold) return; f0(d); const q = r.memo.qa; if (q) window.__log.push({ t: r.t, ...q, rinsing: r.sim.rinsing, active: r.sim.view().active }); };
      window.__still = view => { window.__mopNightCam = view || null; f0(0); };
      const st = document.createElement('style'); st.id = 'qa-hide'; st.textContent = '.story-mop-hud,.story-mop-footer,.mop-night-rinse,.mop-night-note,.mop-night-pops,.story-quit{visibility:hidden!important}'; st.disabled = true; document.head.append(st);
    });
    const R = await p.evaluate(() => MopCore.MOP);
    const views = async label => { // phone framing (full), side and 3/4 (following the Fighter), held still
      await p.evaluate(() => { window.__hold = true; });
      const fpos = await p.evaluate(() => StoryScenes.debug.rigs.fighter.root.position.toArray());
      const [x, , z] = fpos, set = [['phone', null], ['side', { pos: [x + 2.7, 1.15, z + .35], look: [x, .78, z + .35], minHorizontal: 38 }], ['34', { pos: [x + 1.9, 1.55, z + 2.3], look: [x, .8, z + .3], minHorizontal: 38 }]];
      for (const [k, cam] of set) {
        await p.evaluate(([cam, hide]) => { document.getElementById('qa-hide').disabled = !hide; window.__still(cam); }, [cam, !!cam]);
        const file = path.join(out, `raw-${label}-${k}.png`); await p.screenshot({ path: file }); (shots[label] ||= {})[k] = file;
      }
      await p.evaluate(() => { document.getElementById('qa-hide').disabled = true; window.__still(null); window.__hold = false; });
    };
    const waitHead = (x, z, tol = .1) => p.waitForFunction(([x, z, tol]) => { const s = StoryScenes.debug.sim; return Math.hypot(s.point.x - x, s.point.z - z) < tol && !s.lift; }, [x, z, tol], { timeout: 120000 });
    const cx = (R.minX + R.maxX) / 2;
    // A: side-to-side sweeps in front of him (a figure-8: a little forward at the ends)
    await touch('touchStart', [await proj(cx, .35)]); await waitHead(cx, .35);
    const sweep = [[cx - .5, .45], [cx - .75, .3], [cx - .5, .2], [cx, .3], [cx + .5, .45], [cx + .75, .3], [cx + .5, .2], [cx, .3]];
    for (let rep = 0; rep < 2; rep++) for (const [i, [x, z]] of sweep.entries()) { await touch('touchMove', [await proj(x, z)]); await waitHead(x, z, .08); if (rep === 1 && i % 2 === 0) await views('sweep' + (i / 2)); }
    // B: a long push into the room and back: he walks after it (steps, planted feet)
    for (const [i, z] of [-.4, -1.1, -1.5, -.6, .6, 1.4].entries()) { await touch('touchMove', [await proj(cx + (i % 2 ? .3 : -.3), z)]); await waitHead(cx + (i % 2 ? .3 : -.3), z, .1); if (i === 1 || i === 2 || i === 5) await views('walk' + i); }
    // across to the far left: he turns and steps
    await touch('touchMove', [await proj(R.minX + .15, .9)]); await waitHead(R.minX + .15, .9); await views('left');
    await touch('touchEnd');
    // C: rinse at the bucket: carry, dunk, wring, lift
    await p.evaluate(() => { StoryScenes.debug.sim.load = .7; });
    const b = await p.locator('.mop-night-rinse').boundingBox(); await touch('touchStart', [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }]); await touch('touchEnd');
    for (const ph of ['carry', 'dunk', 'wring', 'lift']) { await p.waitForFunction(ph => StoryScenes.debug.memo.qa?.phase === ph, ph, { timeout: 60000 }); await views('rinse-' + ph); }
    await p.waitForFunction(() => !StoryScenes.debug.sim.rinsing, null, { timeout: 60000 });
    // D: near the end of the shift, idle: the tired stretch
    await p.evaluate(() => { StoryScenes.debug.sim.left = 13; });
    await p.waitForFunction(() => StoryScenes.debug.memo.qa?.stretch > .9, null, { timeout: 60000 }); await views('stretch');
    const log = await p.evaluate(() => window.__log);
    // metrics: hands on the handle while mopping; planted-foot drift; handle clear of the torso; steps
    const mop = log.filter(q => q.phase === 'mop' && q.stretch < .05 && q.low != null);
    const handErr = mop.map(q => Math.max(q.top, q.low)), both = mop.filter(q => q.both).length;
    const slide = { L: 0, R: 0 }; let spans = 0;
    for (const k of [0, 1]) { let a = null; for (const q of log) { const f = q.feet[k]; if (f.planted) { if (!a) { a = f.world; spans++; } slide[k ? 'R' : 'L'] = Math.max(slide[k ? 'R' : 'L'], Math.hypot(f.world[0] - a[0], f.world[2] - a[2])); } else a = null; } }
    const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(q * s.length))].toFixed(4); };
    const onStick = mop.filter(q => q.top < .015 && q.low < .015).length;
    const res = { onStick: +(onStick / mop.length).toFixed(3), frames: log.length, mopFrames: mop.length, bothGrips: both, hand: { median: pct(handErr, .5), p95: pct(handErr, .95), max: pct(handErr, 1), under15mm: +(handErr.filter(e => e < .015).length / handErr.length).toFixed(3) },
      plantedSpans: spans, footDriftMax: { L: +slide.L.toFixed(4), R: +slide.R.toFixed(4) }, steps: log.at(-1).steps, handleToTorsoMin: Math.min(...log.map(q => q.body)),
      twist: [Math.min(...log.map(q => q.twist)), Math.max(...log.map(q => q.twist))], lean: [Math.min(...log.map(q => q.lean)), Math.max(...log.map(q => q.lean))], drop: [Math.min(...log.map(q => q.drop)), Math.max(...log.map(q => q.drop))],
      headOff: { median: pct(mop.map(q => q.headOff), .5), p95: pct(mop.map(q => q.headOff), .95) }, apart: { median: pct(mop.map(q => q.apart), .5) }, headY: { mopMax: Math.max(...mop.map(q => q.head[1])), mopMin: Math.min(...mop.map(q => q.head[1])) }, phases: [...new Set(log.map(q => q.phase))], errors };
    fs.writeFileSync(path.join(out, 'body.json'), JSON.stringify({ res, shots, log: log.map(q => ({ t: +q.t.toFixed(2), phase: q.phase, both: q.both, top: q.top, low: q.low, headOff: q.headOff, apart: q.apart, steps: q.steps, feet: q.feet.map(f => f.planted) })) }));
    console.log(JSON.stringify(res));
  } finally { await close(); }
})().catch(e => { console.error(e); process.exit(1); });
