// GOTR-0096 evidence: the robbery film hands off into the ringless street fight with Fang, through the game's own step flow
// (dev skip to beat 6, AdventureOldTown.before('market_robber')). Writes qa/gotr-0096/robbery-fight.webp (film end + fight)
// and robbery-fight.json.   node qa/gotr-0096/tools/handoff.cjs   (APP_URL default http://127.0.0.1:8796/)
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const URL = process.env.APP_URL || 'http://127.0.0.1:8796/', OUT = path.join(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 402, height: 690 } }), log = [], wait = f => p.waitForFunction(f, null, { timeout: 600000 });
  p.on('pageerror', e => log.push('PAGEERROR ' + e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('qa')) { localStorage.clear(); sessionStorage.setItem('qa', '1'); } localStorage.setItem('shadowbox-language', 'en'); localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* none */ } });
  await p.goto(URL, { timeout: 300000 });
  await wait(() => window.ringfighterGame && window.DreamScenes && window.MarketProps && document.querySelector('dialog.career-welcome[open]'));
  await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Hand-off QA'; d.querySelector('button[type=submit]').click(); });
  await wait(() => app.engine.coach?.anatomy); await p.evaluate(() => window.StoryScenes?.stop?.()); await p.waitForTimeout(800);
  await p.evaluate(() => { window.__ctx = { store: ringfighterGame.store, startTraining: ringfighterGame.startTraining, startFight: ringfighterGame.startFight, change: a => { const r = ringfighterGame.store.gameAction(a); if (r.ok) ringfighterGame.apply?.(); return r.ok; } };
    for (const id of ['dream_arrival', 'dream_gym_talk', 'first_brick', 'night_shadow', 'night_bag', 'dream_apology']) AdventureOldTown.devSkip(__ctx, id); });
  await p.waitForTimeout(800); await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.closeBeat(); AdventureOldTown.before(__ctx, 'market_robber'); });
  await wait(() => DreamScenes.playing === 'dream_market_robbery' && DreamScenes.debug?.phase === 'play');
  const files = [], labels = [], shot = async l => { const f = path.join(OUT, `.handoff-${files.length}.png`); await p.screenshot({ path: f, timeout: 300000 }); files.push(f); labels.push(l); };
  await p.evaluate(() => DreamScenes.seek(18.2)); await p.waitForTimeout(4000); await shot('film end');
  await p.evaluate(() => DreamScenes.seek(18.8));
  await wait(() => !DreamScenes.playing && AdventureOldTown.run?.id === 'market_robber' && app.engine.arena?.fightView);
  const n = async k => { const n0 = await p.evaluate(() => app.engine.renderer.info.render.frame); await p.waitForFunction(m => app.engine.renderer.info.render.frame >= m, n0 + k, { timeout: 600000 }); };
  await n(4); await shot('fight start'); await n(10); await shot('fight');
  const st = await p.evaluate(() => { const v = app.engine.arena.fightView, f = StoryCast.rig('fang', app.engine); return { foe: Object.values(v.coaches || {}).includes(f), name: v.careerEntry?.opponentName, ringless: v.ringless?.id || null, ringVisible: v.ring?.visible, fangGloves: !!f.gloveMeshes?.L?.visible, fangWear: f.castWear, fighter: StoryCast.outfitOf(app.engine.coach), scale: [app.engine.coach.root.scale.x, f.root.scale.x] }; });
  console.log(JSON.stringify(st), log.join(' | ') || 'clean');
  fs.writeFileSync(path.join(OUT, 'robbery-fight.json'), JSON.stringify({ state: st, labels, log }, null, 1) + '\n');
  await b.close();
  execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
out, labels, files = sys.argv[1], sys.argv[2].split('|'), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]; w, h = ims[0].size
sheet = Image.new('RGB', (w * len(ims), h)); d = ImageDraw.Draw(sheet)
for i, (im, l) in enumerate(zip(ims, labels)): sheet.paste(im, (i * w, 0)); d.rectangle([i * w, 0, i * w + 8 + 7 * len(l), 16], fill=(0, 0, 0)); d.text((i * w + 4, 2), l, fill=(255, 255, 255))
sheet.save(out, quality=84)`, path.join(OUT, 'robbery-fight.webp'), labels.join('|'), ...files]);
  files.forEach(f => fs.unlinkSync(f));
})().catch(e => { console.error(e); process.exit(1); });
