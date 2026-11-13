// GOTR-0087 evidence: frames of the bag-break film (dream_bag_break) as one strip, plus the gym afterwards.
//   node qa/gotr-0087/tools/film.cjs <name> [width] [height]
// Env: APP_URL (default http://127.0.0.1:8587/), SHOTS="label:t,..." (film wall seconds; "label:after" = the gym set with the
//      bag in its 'broken' state), COLS (frames per row), SINGLE=1 also writes each frame alone.
// Writes qa/gotr-0087/<name>.webp and <name>.json (renderer numbers per frame, console errors).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8587/', OUT = path.join(__dirname, '..');
const DEF = 'night:0.6,jab:2.06,load:3.95,impact:4.24,snap:4.86,fall:5.6,floor:6.9,stare:9.4,glove:10.6,line:12.6';
(async () => {
  const [name = 'film', w = 402, h = 690] = process.argv.slice(2);
  const shots = (process.env.SHOTS || DEF).split(',').map(s => { const q = s.split(':'); return { label: q[0], t: q[1] === 'after' ? 'after' : +q[1] }; });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } }), log = [];
  p.on('pageerror', e => log.push('PAGEERROR ' + e.message)); p.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(m.type() + ' ' + m.text().slice(0, 240)); });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* private mode */ } });
  await p.goto(URL, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.BagBreak && window.StoryCast && window.DreamScenes, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  const frames = [], files = [], wait = async () => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 2, n0, { timeout: 300000 }); };
  let started = false;
  for (const s of shots) {
    if (s.t === 'after') {
      // the gym set as every later gym scene builds it, with the save saying 'broken' (BagBreak.force), drawn by the game's renderer
      await p.evaluate(() => StoryScenes.stop()); started = false; await p.waitForTimeout(500);
      const url = await p.evaluate(async cam => {
        const e = app.engine, r = e.renderer; await StorySets.ready(); DreamSets?.register?.(); BagBreak.force = 'broken';
        const scene = new THREE.Scene(), set = StorySets.build('dream_gym', scene, { renderer: r, shadows: !!r.shadowMap?.enabled }); BagBreak.force = null;
        const sz = r.getSize(new THREE.Vector2()), camera = new THREE.PerspectiveCamera(cam.fov, sz.x / sz.y, .1, 120); camera.position.fromArray(cam.pos); camera.lookAt(new THREE.Vector3(...cam.look)); set.focus?.(cam.look[0], cam.look[2]);
        await new Promise(q => setTimeout(q, 800)); if (r.shadowMap?.enabled) r.shadowMap.needsUpdate = true; const was = e.fightIQDemo; e.fightIQDemo = { frame() {} }; r.render(scene, camera); const out = r.domElement.toDataURL('image/png'); e.fightIQDemo = was; window.__afterState = set.objects.oldBag?.state; set.dispose(); return out;
      }, JSON.parse(process.env.AFTER_CAM || '{"pos":[4.5,1.7,2.4],"look":[4.4,1.55,-2.6],"fov":66}'));
      const png = path.join(OUT, `.${name}-${frames.length}.png`); fs.writeFileSync(png, Buffer.from(url.split(',')[1], 'base64')); files.push(png);
      frames.push({ label: s.label, state: await p.evaluate(() => window.__afterState) }); console.log(s.label, frames[frames.length - 1].state); continue;
    } else {
      if (!started) { await p.evaluate(() => { StoryScenes.stop(); BagBreak.force = null; window.__done = null; StoryScenes.play('dream_bag_break', { onDone: r => { window.__done = r; } }); }); await p.waitForFunction(() => BagBreak.debug && BagBreak.debug.phase === 'play', null, { timeout: 300000 }); started = true; }
      await p.evaluate(t => BagBreak.seek(t, true), s.t); await wait();
    }
    const png = path.join(OUT, `.${name}-${frames.length}.png`); await p.screenshot({ path: png, timeout: 300000 }); files.push(png);
    const st = await p.evaluate(() => { const d = BagBreak.debug; if (!d) return { scene: StoryScenes.playing }; const bg = d.hang?.bag.group.position; return { ...BagBreak.stats(), t: +d.t.toFixed(2), sim: +d.sim.toFixed(2), pen: +(d.pen || 0).toFixed(3), bag: bg ? bg.toArray().map(v => +v.toFixed(2)) : null, glove: d.glove?.map(v => +v.toFixed(2)) || null, calib: d.calib ? { back: d.calib.back, full: d.calib.full } : null }; });
    frames.push({ label: s.label, ...st }); console.log(s.label, JSON.stringify(st));
  }
  const done = await p.evaluate(() => { StoryScenes.stop(); BagBreak.force = null; const c = app.engine.coach; return { playing: StoryScenes.playing, scale: c.root.scale.toArray(), outfit: StoryCast.outfitOf(c) }; });
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify({ name, viewport: [+w, +h], frames, afterStop: done, log }, null, 1) + '\n');
  console.log('after stop', JSON.stringify(done), '| console', log.length ? log.join(' | ') : 'clean');
  await b.close();
  const py = `
import sys
from PIL import Image, ImageDraw
out, cols, single, labels, files = sys.argv[1], int(sys.argv[2]), sys.argv[3] == '1', sys.argv[4].split('|'), sys.argv[5:]
ims = [Image.open(f).convert('RGB') for f in files]
if single:
    for im, l in zip(ims, labels): im.save(out.replace('.webp', '-' + l + '.webp'), quality=86)
w, h = ims[0].size; s = min(1.0, 300.0 / w) if len(ims) > 1 else 1.0; tw, th = int(w * s), int(h * s); cols = cols or len(ims); rows = -(-len(ims) // cols)
sheet = Image.new('RGB', (cols * tw, rows * th), (16, 18, 22)); d = ImageDraw.Draw(sheet)
for i, (im, l) in enumerate(zip(ims, labels)):
    x, y = (i % cols) * tw, (i // cols) * th; sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y)); d.rectangle([x, y, x + 8 + 7 * len(l), y + 16], fill=(0, 0, 0)); d.text((x + 4, y + 2), l, fill=(255, 255, 255))
sheet.save(out, quality=84)
`;
  execFileSync('python3', ['-c', py, path.join(OUT, name + '.webp'), process.env.COLS || '0', process.env.SINGLE ? '1' : '0', frames.map(f => f.label).join('|'), ...files]);
  files.forEach(f => fs.unlinkSync(f));
})().catch(e => { console.error(e); process.exit(1); });
