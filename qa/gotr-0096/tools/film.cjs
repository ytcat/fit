// GOTR-0096 evidence: frames of the beat 5-7 films (dream_apology, dream_market_robbery, dream_market_reward, dream_otto_shop)
// as one strip, played by the game's own scene player (StoryScenes.play) at the given scene times.
//   node qa/gotr-0096/tools/film.cjs <scene id> <name> [width] [height]
// Env: APP_URL (default http://127.0.0.1:8796/), SHOTS="label:t,..." (scene seconds; "label:t:buy" clicks the in-scene Buy
//      button first), COLS (frames per row), SINGLE=1 also writes each frame alone.
// Writes qa/gotr-0096/<name>.webp and <name>.json (renderer numbers per frame, rig state after the film, console errors).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8796/', OUT = path.join(__dirname, '..');
(async () => {
  const [id = 'dream_apology', name = id, w = 402, h = 690] = process.argv.slice(2);
  const shots = (process.env.SHOTS || '0:1,1:5,2:8,3:12').split(',').map(s => { const q = s.split(':'); return { label: q[0], t: +q[1], buy: q[2] === 'buy' }; });
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } }), log = [];
  p.on('pageerror', e => log.push('PAGEERROR ' + e.message)); p.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(m.type() + ' ' + m.text().slice(0, 240)); });
  await p.addInitScript(() => { try { localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* private mode */ } });
  await p.goto(URL, { timeout: 300000 });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.StoryCast?.market && window.DreamScenes && window.MarketProps, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setInterval(() => document.querySelectorAll('dialog[open]:not(.dream-scene)').forEach(d => d.close()), 300); });
  const before = await p.evaluate(() => { const c = app.engine.coach; return { scale: c.root.scale.toArray(), outfit: StoryCast.outfitOf(c) }; });
  await p.evaluate(sid => { window.__done = null; window.__buys = 0; StoryScenes.play(sid, { onDone: r => { window.__done = r; }, onBuy: () => { window.__buys++; return true; } }); }, id);
  await p.waitForFunction(() => DreamScenes.debug && DreamScenes.debug.phase === 'play' && DreamScenes.stats()?.phase === 'play', null, { timeout: 300000 });
  const frames = [], files = [], wait = async () => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(n => app.engine.renderer.info.render.frame >= n + 3, n0, { timeout: 300000 }); };
  for (const s of shots) {
    if (s.buy) { await p.evaluate(() => document.querySelector('.dream-buy')?.click()); await wait(); }
    await p.evaluate(t => DreamScenes.seek(t), s.t); await wait();
    const png = path.join(OUT, `.${name}-${frames.length}.png`); await p.screenshot({ path: png, timeout: 300000 }); files.push(png);
    const st = await p.evaluate(() => { const d = DreamScenes.debug, sub = document.querySelector('.dream-sub'), buy = document.querySelector('.dream-buy'), s0 = DreamScenes.stats() || {}; return { calls: s0.calls, triangles: s0.triangles, shot: s0.shot, t: d ? +d.t.toFixed(2) : null, line: sub ? sub.textContent : '', buyShown: !!buy && !buy.hidden, bought: d?.bought }; });
    frames.push({ label: s.label, ...st }); console.log(s.label, JSON.stringify(st));
  }
  const done = await p.evaluate(async () => {
    StoryScenes.stop(); await new Promise(r => setTimeout(r, 400)); const c = app.engine.coach, f = StoryCast.rig('fang', app.engine), hz = StoryCast.rig('hazel', app.engine), hb = StoryCast.market.handbag(hz);
    return { done: window.__done, buys: window.__buys, playing: StoryScenes.playing, scale: c.root.scale.toArray(), outfit: StoryCast.outfitOf(c), fangWear: f.castWear, handbagHome: hb?.parent === hz.joints.handL, dialogs: document.querySelectorAll('dialog.dream-scene').length };
  });
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify({ id, name, viewport: [+w, +h], before, frames, afterStop: done, log }, null, 1) + '\n');
  console.log('before', JSON.stringify(before), 'after stop', JSON.stringify(done), '| console', log.length ? log.join(' | ') : 'clean');
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
