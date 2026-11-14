// GOTR-0099 evidence: side job A "Clean the gym" (mop lanes) at 402x690, played through the real story step
// (AdventureOldTown.launch -> StoryScenes 'clean_gym' -> result -> Continue -> the step's after-beat on the map).
//   node qa/gotr-0099/clean-gym.cjs [name] [lang]      (APP_URL default http://127.0.0.1:8731/)
// Headless Chromium draws about one frame a second, so the game clock is stepped by hand: the rules (sim) advance in 1/120 s
// steps with a small autopilot (walks to the oldest streak, taps Mop on the beat, ducks or slips when told), then one frame
// is drawn. Writes qa/gotr-0099/<name>.webp (8-frame strip) and <name>.json (state per frame, measurements, console).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8731/', OUT = __dirname;
(async () => {
  const [name = 'clean-gym', lang = 'en'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 } }), log = [];
  p.on('pageerror', e => log.push('PAGEERROR ' + e.message)); p.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(m.type() + ' ' + m.text().slice(0, 240)); });
  await p.addInitScript(l => { try { if (!sessionStorage.getItem('qa')) { localStorage.clear(); sessionStorage.setItem('qa', '1'); } localStorage.setItem('shadowbox-language', l); localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* private mode */ } }, lang);
  await p.goto(URL, { timeout: 300000 });
  // a fresh player (the save needs one): the game's own welcome dialog
  await p.waitForFunction(() => document.querySelector('dialog.career-welcome[open]'), null, { timeout: 300000 });
  await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Mop QA'; d.querySelector('button[type=submit]').click(); });
  await p.waitForFunction(() => window.ringfighterGame && app.engine.coach?.anatomy && window.AdventureOldTown && window.StoryCast && window.MopGame && StoryScenes.games.clean_gym, null, { timeout: 300000 });
  await p.evaluate(l => {
    window.StoryScenes?.stop?.(); app.setLanguage(l);
    const rg = window.ringfighterGame; rg.close?.(); window.__ctx = { store: rg.store, startTraining: rg.startTraining, startFight: rg.startFight, change: a => { const r = rg.store.gameAction(a); if (r.ok) rg.apply?.(); return r.ok; } };
    window.__coins0 = GameDomain.wallet(rg.store.current().game).coins;
    AdventureOldTown.launch(window.__ctx, 'clean_gym');
    // autopilot on the rules: mode 'play' (clean, dodge), 'stay' (stand in the bag's lane, no defence), 'duck' (duck the bag), 'idle'
    window.__auto = (secs, mode = 'play', o = {}) => {
      const run = StoryScenes.debug, g = run.sim; let left = secs, plan = null, next = 0;
      while (left > 0 && !g.done) {
        g.step(1 / 120); left -= 1 / 120; if (g.t < next) continue; const v = g.view();
        if (v.phase === 'stunned' || v.phase === 'move' || v.phase === 'duck') continue;
        if (mode === 'stay' && o.lane != null && v.f.lane !== o.lane) { g.key('up', true); continue; }
        if (mode === 'stay' && o.spot != null && v.f.spot !== o.spot) { g.key(v.f.spot > o.spot ? 'left' : 'right', true); continue; }
        if (v.bag && v.bag.lane === v.body.lane && !v.bag.hit) {
          if (mode === 'duck' || mode === 'play') { if (v.bag.phase === 'swing' && Math.abs(v.bag.x - v.body.x) < .95 && v.bag.bottom < 2.05) { g.key('down', true); next = g.t + .1; continue; } }
          if (mode === 'stay' || mode === 'duck') continue;
        }
        if (mode === 'stay' && o.lane != null && v.f.lane !== o.lane) { g.key('up', true); continue; }
        if (mode === 'stay' && o.spot != null && v.f.spot !== o.spot) { g.key(v.f.spot > o.spot ? 'left' : 'right', true); continue; }
        if (mode === 'stay' || mode === 'idle') continue;
        if (v.on != null) { if (plan == null) plan = g.t + (1 - v.strokeK) * v.stroke - .02; if (g.t >= plan) { g.key('straight', true); plan = null; next = g.t + .05; } continue; }
        plan = null; const w = v.wet.filter(x => x.state === 'wet').sort((a, c) => a.left - c.left)[0]; if (!w) continue;
        if (w.lane !== v.f.lane) g.key('up', true); else g.key(w.spot < v.f.spot ? 'left' : 'right', true); next = g.t + .06;
      }
      return g.view();
    };
  }, lang);
  await p.waitForFunction(() => StoryScenes.debug?.sim && app.engine.fightIQDemo === StoryScenes.debug, null, { timeout: 300000 });
  const frames = [], files = [];
  const draw = async () => p.evaluate(async () => { const run = StoryScenes.debug; run.frame(1 / 60); await new Promise(r => requestAnimationFrame(r)); });
  const state = () => p.evaluate(() => {
    const run = StoryScenes.debug, v = run?.sim?.view(), c = app.engine.coach, box = n => { const q = n?.getBoundingClientRect?.(); return q && q.width ? [q.left, q.top, q.right, q.bottom].map(x => Math.round(x)) : null; };
    return v ? { t: +v.t.toFixed(2), phase: v.phase, lane: v.f.lane, spot: v.f.spot, cleaned: v.cleaned, stains: v.stains, knocks: v.knocks, dodges: v.dodges, streak: v.streak, mult: v.mult, score: v.score, bag: v.bag ? { lane: v.bag.lane, phase: v.bag.phase, x: +v.bag.x.toFixed(2), bottom: +v.bag.bottom.toFixed(2) } : null, outfit: StoryCast.outfitOf(c), gloves: !!(c.gloveMeshes?.L?.visible || c.gloveMeshes?.R?.visible), scale: c.root.scale.toArray(), stats: StoryScenes.stats(), hud: { goal: box(document.querySelector('.story-goal')), prompt: box(document.querySelector('.story-prompt-text')) } } : { scene: StoryScenes.playing };
  });
  const shot = async label => { await draw(); const png = path.join(OUT, `.${name}-${frames.length}.png`); await p.screenshot({ path: png, timeout: 300000 }); files.push(png); const s = await state(); frames.push({ label, ...s }); console.log(label, JSON.stringify(s)); };
  // 1 intro: Bruno's line in the tutorial, the lanes, the first streaks
  await p.evaluate(() => { const g = StoryScenes.debug.sim; for (let i = 0; i < 100; i++) g.step(1 / 120); });
  await shot('intro');
  await p.evaluate(() => { StoryScenes.debug.intro = 0; });
  // 2 lanes: walking to a streak
  await p.evaluate(() => { const g = StoryScenes.debug.sim; window.__auto(.3, 'play'); });
  await shot('lanes');
  // 3 mopping: on a streak, the ring nearly closed
  await p.evaluate(() => { const g = StoryScenes.debug.sim; for (let i = 0; i < 600 && !(g.view().on != null && g.view().strokeK > .8); i++) window.__auto(1 / 120, 'play'); });
  await shot('mopping');
  // 4 slip / duck under the bag: autopilot until Bruno shoves, stay in that lane and duck as it comes
  await p.evaluate(() => { const g = StoryScenes.debug.sim; for (let i = 0; i < 3000 && !(g.bag && g.bag.phase === 'warn'); i++) window.__auto(1 / 120, 'play'); const lane = g.bag.lane; window.__auto(.05, 'stay', { lane, spot: 1 }); for (let i = 0; i < 600 && !(g.view().ducking && g.bag && g.bag.credited); i++) window.__auto(1 / 120, 'duck'); });
  await shot('duck');
  // 5 knocked: the next shove, stand in its lane without defence
  await p.evaluate(() => { const g = StoryScenes.debug.sim; for (let i = 0; i < 4000 && !(g.bag && g.bag.phase === 'warn'); i++) window.__auto(1 / 120, 'play'); const lane = g.bag.lane; for (let i = 0; i < 900 && !g.stunned(); i++) window.__auto(1 / 120, 'stay', { lane, spot: 0 }); window.__auto(.18, 'idle'); });
  await shot('knocked');
  // 6 combo: clean wipes in a row (x2 or more), caught right after a clean wipe
  await p.evaluate(() => { const g = StoryScenes.debug.sim; for (let i = 0; i < 4000 && !(g.streak >= 5 && g.flash && ['hit', 'perfect'].includes(g.flash.type) && g.t - g.flash.t < .05); i++) window.__auto(1 / 120, 'play'); });
  await shot('combo');
  // 7 result: play the shift out
  await p.evaluate(() => { window.__auto(60, 'play'); });
  await p.waitForFunction(() => document.querySelector('.story-result'), null, { timeout: 120000 });
  await shot('result');
  const res = await p.evaluate(() => { const r = StoryScenes.debug.result; return { value: r.value, stars: r.stars, score: r.score, cleaned: r.cleaned, stains: r.stains, knocks: r.knocks, dodges: r.dodges, pay: r.pay, saved: StoryScenes.debug.saved?.ok, coins: GameDomain.wallet(ringfighterGame.store.current().game).coins - window.__coins0, say: document.querySelector('.story-result .story-say')?.textContent }; });
  console.log('result', JSON.stringify(res));
  // 8 Bruno's line: Continue -> the step's after-beat on the map
  await p.evaluate(() => document.querySelector('.story-result .story-btn-main').click());
  await p.waitForTimeout(6000);
  const after = await p.evaluate(() => ({ playing: StoryScenes.playing, outfit: StoryCast.outfitOf(app.engine.coach), scale: app.engine.coach.root.scale.toArray(), beat: document.querySelector('.sf-beat')?.innerText?.slice(0, 300) || null }));
  { const png = path.join(OUT, `.${name}-${frames.length}.png`); await p.screenshot({ path: png, timeout: 300000 }); files.push(png); frames.push({ label: 'bruno', ...after }); console.log('after', JSON.stringify(after)); }
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify({ name, lang, viewport: [402, 690], frames, result: res, log }, null, 1) + '\n');
  console.log('console', log.length ? log.join(' | ') : 'clean');
  await b.close();
  const py = `
import sys
from PIL import Image, ImageDraw
out, labels, files = sys.argv[1], sys.argv[2].split('|'), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = ims[0].size; s = 300.0 / w; tw, th = int(w * s), int(h * s); cols = 4; rows = -(-len(ims) // cols)
sheet = Image.new('RGB', (cols * tw, rows * th), (16, 18, 22)); d = ImageDraw.Draw(sheet)
for i, (im, l) in enumerate(zip(ims, labels)):
    x, y = (i % cols) * tw, (i // cols) * th; sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y)); d.rectangle([x, y, x + 10 + 7 * len(l), y + 16], fill=(0, 0, 0)); d.text((x + 4, y + 2), str(i + 1) + ' ' + l, fill=(255, 255, 255))
sheet.save(out, quality=84)
for im, l in zip(ims, labels): im.save(out.replace('.webp', '-' + l + '.webp'), quality=84)
`;
  execFileSync('python3', ['-c', py, path.join(OUT, name + '.webp'), frames.map(f => f.label).join('|'), ...files]);
  files.forEach(f => fs.unlinkSync(f));
})().catch(e => { console.error(e); process.exit(1); });
