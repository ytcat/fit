// Rig-space joint positions of the Fighter standing in Otto's shop, and the extent of his head/mane and body round the
// right shoulder (skinned vertices), to size the bag carry. usage: node qa/arm-fixes/dims.cjs <lion|rabbit> [t]
const path = require('path'), { open, film } = require('./harness.cjs');
(async () => {
  const h = await open(process.argv[2] || 'lion'), p = h.page;
  await p.addScriptTag({ path: path.join(__dirname, 'probe.js') });
  await film(p, 'dream_otto_shop');
  await p.evaluate(t => __armQA.seek(t), +(process.argv[3] || 24.5)); for (let i = 0; i < 40; i++) await p.evaluate(() => __armQA.step(1 / 60));
  console.log(JSON.stringify(await p.evaluate(() => {
    const c = DreamScenes.debug.rigs.fighter, j = c.joints, root = c.root, V = THREE.Vector3, r = o => root.worldToLocal(o.getWorldPosition(new V())).toArray().map(v => +v.toFixed(3));
    const out = {}; for (const n of ['hips', 'spine', 'chest', 'neck', 'head', 'scapulaR', 'armR', 'elbowR', 'handR', 'armL', 'handL']) out[n] = r(j[n]);
    out.upper = +j.elbowR.position.length().toFixed(3); out.fore = +j.handR.position.length().toFixed(3);
    // body points above y 1.3 and at x > -0.05: the highest per x band, and the outermost x per height band (rig space)
    const pts = __armQA.bodyPoints(c), L = pts.body.map(p => root.worldToLocal(p.clone()));
    const top = {}; for (const q of L) { if (q.y < 1.2) continue; const b = (Math.round(q.x / .05) * .05).toFixed(2); top[b] = Math.max(top[b] ?? -9, +q.y.toFixed(3)); }
    const side = {}; for (const q of L) { if (q.y < 1.2) continue; const b = (Math.round(q.y / .05) * .05).toFixed(2); side[b] = Math.max(side[b] ?? -9, +q.x.toFixed(3)); }
    out.topByX = top; out.maxXByY = side; return out;
  })));
  await h.close();
})().catch(e => { console.error(e); process.exit(1); });
