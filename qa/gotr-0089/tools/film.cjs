// GOTR-0089 evidence: frames of the Chapter 1 opening film as one strip, with the renderer's numbers per shot.
//   node qa/gotr-0089/tools/film.cjs <name> [width] [height]
// Env: APP_URL (default http://127.0.0.1:8489/), SHOTS="label:t,..." (scene seconds; "map:x" = x seconds into the map dive),
//      BLOCK=1 aborts every .glb request (the generated set must still play), COLS (frames per row, default all),
//      SINGLE=1 writes each frame as its own picture too, WAIT=0 does not wait for the city assets before the film starts.
// Writes qa/gotr-0089/<name>.webp and qa/gotr-0089/<name>.json (calls / triangles of every frame, console errors).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8489/', OUT = path.join(__dirname, '..');
const DEF = 'dive:map:3.1,sky:2.6,arrives:5.6,doors:8.0,step-off:8.6,face:11.0,street:14.0,walk:17.6,ahead:21.0,crossing:24.6,gym:30.5';
(async () => {
  const [name = 'film', w = 402, h = 690] = process.argv.slice(2);
  const shots = (process.env.SHOTS || DEF).split(',').map(s => { const q = s.split(':'); return q.length === 3 ? { label: q[0], map: true, t: +q[2] } : { label: q[0], t: +q[1] }; });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } }), log = [], glb = [];
  p.on('pageerror', e => log.push('PAGEERROR ' + e.message)); p.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(m.type() + ' ' + m.text().slice(0, 240)); });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* private mode */ } });
  await p.route('**/*.glb', r => { glb.push(r.request().url().split('/').pop()); return process.env.BLOCK ? r.abort() : r.continue(); });
  await p.goto(URL, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.DreamScenes && window.StoryCast, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  const city = process.env.WAIT === '0' ? null : await p.evaluate(() => window.CityAssets ? window.CityAssets.preload().then(() => window.CityAssets.status()) : null);
  const frames = [], files = [], wait = async () => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 3, n0, { timeout: 300000 }); };
  const start = map => p.evaluate(map => { window.__done = null; StoryScenes.stop(); StoryScenes.play('dream_opening', { noMap: !map, onDone: r => { window.__done = r; } }); }, map);
  let mode = null;
  for (const s of shots) {
    if (mode !== !!s.map) { mode = !!s.map; await start(mode); await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase !== 'load', null, { timeout: 300000 }); }
    if (s.map) await p.evaluate(t => { DreamScenes.debug.mapT = t; }, s.t); else await p.evaluate(t => DreamScenes.seek(t), s.t);
    await wait(); if (!s.map) { await p.evaluate(t => DreamScenes.seek(t), s.t); await wait(); }
    const png = path.join(OUT, `.${name}-${frames.length}.png`); await p.screenshot({ path: png, timeout: 300000 }); files.push(png);
    const st = await p.evaluate(() => { const d = DreamScenes.debug, f = d.rigs?.fighter, o = d.set?.objects; return { ...DreamScenes.stats(), t: +d.t.toFixed(2), city: !!o?.city?.active, fighter: f && f.root.visible ? f.root.position.toArray().map(v => +v.toFixed(3)) : null, bus: o?.bus ? +o.bus.position.x.toFixed(2) : null }; });
    frames.push({ label: s.label, ...st }); console.log(s.label, JSON.stringify(st));
  }
  const done = await p.evaluate(() => { StoryScenes.stop(); const r = app.engine.renderer.info; return { playing: DreamScenes.playing, geometries: r.memory.geometries, textures: r.memory.textures }; });
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify({ name, viewport: [+w, +h], blocked: !!process.env.BLOCK, city, glbRequests: glb, frames, afterStop: done, log }, null, 1) + '\n');
  console.log('glb requests', glb.join(' ') || 'none', '| city', JSON.stringify(city), '| after stop', JSON.stringify(done), '| console', log.length ? log.join(' | ') : 'clean');
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
