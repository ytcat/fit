// GOTR-0097 evidence: frames of the Chapter 1 opening film at exact scene times (the step-off, the walk, the crossing, the street).
//   node qa/gotr-0097/tools/film.cjs <name> [width] [height]
// Env: APP_URL (default http://127.0.0.1:18734/), SHOTS="label:t,..." (scene seconds), COLS (frames per row, default all),
//      QUALITY=low|high (DreamScenes quality switch, when the build has one), CAM="x,y,z|lx,ly,lz" (a fixed camera: side views),
//      FOLLOW=1 (the fixed camera moves with the Fighter along x/z), SINGLE=1 also writes each frame alone.
// Each frame: seek to t - 0.6 s, step the film with 1/30 s frames without drawing (so the smoothed pose is the one the film
// plays), then draw with the clock held. Writes qa/gotr-0097/<name>.webp and <name>.json (calls / triangles per frame, console).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:18734/', OUT = path.join(__dirname, '..');
(async () => {
  const [name = 'film', w = 402, h = 690] = process.argv.slice(2);
  const shots = (process.env.SHOTS || 'walk:17.6').split(',').map(s => { const q = s.split(':'); return { label: q[0], t: +q[1] }; });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } }), log = [];
  p.on('pageerror', e => log.push('PAGEERROR ' + e.message)); p.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(m.type() + ' ' + m.text().slice(0, 240)); });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* private mode */ } });
  await p.goto(URL, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.DreamScenes && window.StoryCast, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  const city = await p.evaluate(() => window.CityAssets ? window.CityAssets.preload().then(() => window.CityAssets.status()) : null);
  await p.evaluate(q => { if (q && window.DreamScenes.quality) DreamScenes.quality(q); window.__done = null; StoryScenes.stop(); StoryScenes.play('dream_opening', { noMap: true, onDone: r => { window.__done = r; } }); }, process.env.QUALITY || '');
  await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase !== 'load' && DreamScenes.debug.frame, null, { timeout: 300000 });
  await p.evaluate(cam => {
    const run = DreamScenes.debug, orig = run.frame, e = app.engine; window.__hold = true;
    run.frame = d => orig(window.__hold ? 1e-4 : d); e.fightIQDemo = run;
    window.__step = (t, n) => { const r = e.renderer.render; e.renderer.render = () => {}; DreamScenes.seek(t - n / 30); try { for (let i = 0; i < n; i++) orig(1 / 30); } finally { e.renderer.render = r; } };
    if (cam) { const [a, l] = cam.split('|').map(s => s.split(',').map(Number)), r = e.renderer.render.bind(e.renderer);
      e.renderer.render = (sc, c) => { if (!run.rigs?.fighter) return r(sc, c); const f = run.rigs.fighter.root.position, dx = window.__follow ? f.x : 0, dz = window.__follow ? f.z : 0; c.position.set(a[0] + dx, a[1], a[2] + dz); c.lookAt(l[0] + dx, l[1], l[2] + dz); c.updateMatrixWorld(); r(sc, c); }; }
  }, process.env.CAM || '');
  if (process.env.FOLLOW) await p.evaluate(() => { window.__follow = true; });
  const frames = [], files = [], wait = async () => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 2, n0, { timeout: 300000 }); };
  for (const s of shots) {
    await p.evaluate(t => window.__step(t, 18), s.t); await wait();
    const png = path.join(OUT, `.${name}-${frames.length}.png`); await p.screenshot({ path: png, timeout: 300000 }); files.push(png);
    const full = await p.evaluate(() => { const r = app.engine.renderer, i = r.info; i.autoReset = false; i.reset(); if (r.shadowMap.enabled) r.shadowMap.needsUpdate = true; DreamScenes.debug.frame(1e-4); const o = { calls: i.render.calls, triangles: i.render.triangles }; i.autoReset = true; return o; }); // main pass + shadow pass
    const st = await p.evaluate(() => { const d = DreamScenes.debug, f = d.rigs?.fighter, o = d.set?.objects, j = f?.joints; return { ...DreamScenes.stats(), t: +d.t.toFixed(3), fighter: f && f.root.visible ? f.root.position.toArray().map(v => +v.toFixed(3)) : null, pelvis: j ? +j.hips.getWorldPosition(new THREE.Vector3()).y.toFixed(4) : null, feet: f ? DreamPose.feet(f).map(a => a.map(v => +v.toFixed(3))) : null, shadows: !!app.engine.renderer.shadowMap?.enabled }; });
    delete st.set; st.withShadowPass = full; frames.push({ label: s.label, ...st }); console.log(s.label, JSON.stringify(st));
  }
  await p.evaluate(() => StoryScenes.stop());
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify({ name, viewport: [+w, +h], city, frames, log }, null, 1) + '\n');
  console.log('city', JSON.stringify(city), '| console', log.length ? log.join(' | ') : 'clean');
  await b.close();
  const py = `
import sys
from PIL import Image, ImageDraw
out, cols, single, labels, files = sys.argv[1], int(sys.argv[2]), sys.argv[3] == '1', sys.argv[4].split('|'), sys.argv[5:]
ims = [Image.open(f).convert('RGB') for f in files]
if single:
    for im, l in zip(ims, labels): im.save(out.replace('.webp', '-' + l + '.webp'), quality=86)
w, h = ims[0].size; s = min(1.0, 420.0 / w) if len(ims) > 1 else 1.0; tw, th = int(w * s), int(h * s); cols = cols or len(ims); rows = -(-len(ims) // cols)
sheet = Image.new('RGB', (cols * tw, rows * th), (16, 18, 22)); d = ImageDraw.Draw(sheet)
for i, (im, l) in enumerate(zip(ims, labels)):
    x, y = (i % cols) * tw, (i // cols) * th; sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y)); d.rectangle([x, y, x + 8 + 7 * len(l), y + 16], fill=(0, 0, 0)); d.text((x + 4, y + 2), l, fill=(255, 255, 255))
sheet.save(out, quality=84)
`;
  execFileSync('python3', ['-c', py, path.join(OUT, name + '.webp'), process.env.COLS || '0', process.env.SINGLE ? '1' : '0', frames.map(f => f.label).join('|'), ...files]);
  files.forEach(f => fs.unlinkSync(f));
})().catch(e => { console.error(e); process.exit(1); });
