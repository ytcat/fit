// node tests/dream-market-films.test.cjs — Chapter 1 beats 5-7 as films (GOTR-0096): the apology, the market robbery and its
// reward, Otto's Corner. Scripts (market-core.js), wiring into the step list (story-flow.js, oldtown.js), the reward = the bag's
// price, and in the browser: each film plays at its step, can be skipped, hands the rigs back (mirrored root, outfit, Fang's
// jacket, Mrs. Hazel's handbag), the purchase inside the shop film completes beat 7, the robbery hands off to the street fight.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
process.chdir(path.join(__dirname, '..'));
const G = require('../glossary.js'), C = require('../adventure/story/dream-core.js'), MC = require('../adventure/story/market-core.js');
const D = require('../game-domain.js'), SF = require('../adventure/story-flow.js');

// ---- scripts
assert.deepEqual(MC.ids, ['dream_apology', 'dream_market_robbery', 'dream_market_reward', 'dream_otto_shop']);
const price = D.gear.find(x => x.id === 'heavy_bag').price;
for (const id of MC.ids) {
  const s = MC.fill(MC.scenes[id], price);
  assert.deepEqual(C.validate(s), [], id + ' script is valid');
  assert.equal(C.sample(s, 0).done, false); assert.equal(C.sample(s, s.duration + 1).done, true, id + ' ends');
  for (const l of s.lines) {
    assert.ok(l.text.en.length <= 56, id + ' line is short: ' + l.text.en); assert.ok(!/\{price\}/.test(JSON.stringify(l.text)), 'price filled');
    for (const lang of ['he', 'ru']) assert.ok(!/[A-Za-z]/.test(G.strip(l.text[lang])), id + ' ' + lang + ' untranslated: ' + l.text[lang]);
  }
  for (let t = 0; t <= s.duration; t += .25) { const f = C.sample(s, t); assert.ok(f.camera.pos.every(Number.isFinite) && f.camera.look.every(Number.isFinite), id + ' camera at ' + t); for (const a of Object.values(f.actors)) assert.ok([a.x, a.y, a.z, a.ry, a.dist].every(Number.isFinite), id + ' actor at ' + t); }
  for (const [k, a] of Object.entries(s.actors)) for (let t = .1; t < s.duration; t += .1) { const x = C.sample(s, t).actors[k]; if (x.walking && x.act !== 'off') assert.ok(x.speed < 2.4, `${id} ${k} moves like a person at ${t.toFixed(1)}: ${x.speed.toFixed(2)} m/s`); }
  assert.equal(s.outfit.fighter, 'street', id + ': street clothes (gym in the morning, street, shop)');
  for (const k of Object.keys(s.actors)) for (let t = 0; t <= s.duration; t += .5) assert.ok(!['box', 'guard'].includes(C.sample(s, t).actors[k].act), id + ': nobody in a guard outside the fight');
}
const ap = MC.scenes.dream_apology, rob = MC.scenes.dream_market_robbery, rew = MC.scenes.dream_market_reward, shop = MC.scenes.dream_otto_shop;
assert.equal(ap.set, 'dream_gym'); assert.equal(ap.gymBag, 'broken', 'the old bag lies on the floor'); assert.equal(ap.tap, true);
{ const said = ap.lines.map(l => l.text.en).join(' '); for (const w of [/my bag/, /I'm sorry/, /pay it back/, /Market Row/]) assert.ok(w.test(said), 'beat 5 says ' + w); }
{ const a = C.sample(ap, ap.duration).actors.fighter, b = C.sample(ap, 26).actors.fighter; assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 5, 'he walks out at the end'); }
assert.equal(rob.set, 'dream_market'); assert.ok(!rob.tap, 'the robbery runs on its own');
{ const hb = rob.carry.handbag, at = t => hb.filter(k => k.t <= t).pop().on; assert.equal(at(1), 'hazel'); assert.equal(at(7), 'fang', 'Fang snatches the handbag'); assert.equal(at(rob.duration), 'ground', 'he drops it before the fight');
  const f = C.sample(rob, rob.duration).actors, d = Math.hypot(f.fang.x - f.fighter.x, f.fang.z - f.fighter.z); assert.ok(d > .9 && d < 2.2, 'they face each other: ' + d.toFixed(2));
  assert.ok(rob.actors.fang.keys.some(k => k.act === 'jacketoff'), 'the jacket comes off'); const j = rob.actors.fang.keys.findIndex(k => k.act === 'jacketoff'); assert.ok(rob.actors.fang.keys[j + 1].t - rob.actors.fang.keys[j].t >= MC.JACKET_T, 'the jacket beat is not cut short');
  assert.ok(C.sample(rob, 8.0).actors.fang.walking && C.sample(rob, 8.0).actors.fang.speed > 1.6, 'Fang runs with the bag'); }
{ const hb = rew.carry.handbag, pouch = rew.carry.pouch; assert.equal(hb[hb.length - 1].on, 'hazel', 'the handbag goes back to Mrs. Hazel'); assert.equal(pouch[pouch.length - 1].on, 'fighter', 'the reward ends in his hand');
  const said = MC.fill(rew, price).lines.map(l => l.text.en).join(' '); assert.ok(said.includes(String(price)), 'the reward names the price'); assert.ok(/new heavy bag/.test(said)); }
assert.equal(shop.set, 'dream_shop'); assert.ok(shop.buy.t > 0 && shop.buy.t < shop.duration); assert.ok(shop.lines.some(l => /\{price\}/.test(l.text.en) && l.t < shop.buy.t), 'the price is said before the purchase');
{ const hv = shop.carry.heavybag; assert.equal(hv[0].on, 'display'); assert.ok(hv.some(k => k.on === 'shoulder' && k.t > shop.buy.t), 'he carries the bag out after buying it');
  const end = C.sample(shop, shop.duration).actors.fighter, mid = C.sample(shop, 29).actors.fighter; assert.ok(end.x < 20 && mid.x > 30, 'out of the shop onto the street'); }

// ---- the reward is exactly the heavy bag's price (the amount itself lives in game-domain.js)
assert.equal(D.storyRewards.market_robber, price);
assert.ok(fs.readFileSync('game-domain.js', 'utf8').includes("market_robber:gear.find(x=>x.id==='heavy_bag').price"), 'the reward is defined by the bag price');

// ---- wiring: the films replace the stand-ins at their steps
const OT = fs.readFileSync('adventure/oldtown.js', 'utf8');
assert.ok(/dream_apology: \{ kind: 'film', scene: 'dream_apology' \}/.test(OT), 'beat 5 is a film step');
assert.ok(/market_robber: \{ kind: 'story_fight', venue: 'street', cast: 'fang', after: 'dream_market_reward'/.test(OT), 'beat 6: street fight vs Fang, reward film after a win');
assert.ok(/buy_heavy_bag: \{ kind: 'buy', item: 'heavy_bag', film: 'dream_otto_shop' \}/.test(OT), 'beat 7: the shop film');
assert.ok(/fresh && next === 'market_robber' && before\(ctx, next\)/.test(OT), 'the apology leads straight into the market');
assert.ok(/onBuy: \(\) => \{ const res = recordStory\(ctx, id\)/.test(OT), 'the purchase inside the film is the step\'s own save action');
for (const id of ['dream_apology', 'market_robber', 'buy_heavy_bag']) assert.ok(!SF.find(id).stand, id + ': no stand-in any more');
assert.equal(SF.find('market_robber').scene, 'dream_market_robbery', 'the robbery film plays before the street fight');
const html = fs.readFileSync('index.html', 'utf8'), manifest = fs.readFileSync('offline-manifest.json', 'utf8');
for (const f of ['market-core.js', 'market-sets.js']) { assert.ok(html.includes('./adventure/story/' + f + '?v='), f + ' loaded'); assert.ok(manifest.includes('adventure/story/' + f), f + ' cached offline'); }
assert.ok(html.indexOf('dream-core.js') < html.indexOf('market-core.js') && html.indexOf('market-core.js') < html.indexOf('dream-scenes.js') && html.indexOf('dream-sets.js') < html.indexOf('market-sets.js'), 'load order');
const docs = fs.readFileSync('docs/adventure/FILMS.md', 'utf8') + fs.readFileSync('docs/adventure/DREAM_HOOKS.md', 'utf8');
for (const w of ['dream_apology', 'dream_market_robbery', 'dream_market_reward', 'dream_otto_shop']) assert.ok(docs.includes(w), 'documented: ' + w);
console.log('PASS market films: scripts, reward = bag price, wiring');

// ---- in the browser (skips without Playwright)
let chromium; try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); } catch { console.log('SKIP browser part: Playwright is not installed'); process.exit(0); } }
const ROOT = process.cwd(), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep) || f === ROOT) f = path.join(f, 'index.html');
  fs.readFile(f, (err, data) => { if (err) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(data); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const p = await browser.newPage({ viewport: { width: 402, height: 690 } }), errors = []; p.on('pageerror', x => errors.push(x.message));
    const wait = (f, a) => p.waitForFunction(f, a, { timeout: 300000 });
    await p.addInitScript(() => { try { if (!sessionStorage.getItem('qa')) { localStorage.clear(); sessionStorage.setItem('qa', '1'); } localStorage.setItem('shadowbox-language', 'en'); localStorage.setItem('gotr.adv.nointro', '1'); } catch { /* none */ } });
    await p.goto(url, { timeout: 300000 }); await wait(() => window.ringfighterGame && window.GameModes && window.DreamScenes && window.MarketProps);
    await wait(() => document.querySelector('dialog.career-welcome[open]'));
    await p.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Market QA'; d.querySelector('button[type=submit]').click(); });
    await wait(() => app.engine.coach?.anatomy); await p.evaluate(() => window.StoryScenes?.stop?.()); await p.waitForTimeout(800);
    assert.deepEqual(await p.evaluate(() => MarketCore.ids.every(id => StoryScenes.sceneIds.includes(id) && DreamScenes.has(id))), true, 'the films are known to StoryScenes');
    const rigState = () => p.evaluate(() => { const c = app.engine.coach, f = StoryCast.rig('fang', app.engine), hz = StoryCast.rig('hazel', app.engine); return { scale: c.root.scale.toArray(), outfit: StoryCast.outfitOf(c), fang: f.castWear, fangScale: f.root.scale.toArray(), handbag: StoryCast.market.handbag(hz)?.parent === hz.joints.handL, demo: !!app.engine.fightIQDemo, dialog: !!document.querySelector('dialog.dream-scene') }; });
    const before = await rigState();
    // dev: finish the steps up to beat 5 with their minimum pass (the development build's own skip)
    const ctx = () => p.evaluate(() => { window.__ctx = { store: ringfighterGame.store, startTraining: ringfighterGame.startTraining, startFight: ringfighterGame.startFight, change: a => { const r = ringfighterGame.store.gameAction(a); if (r.ok) ringfighterGame.apply?.(); return r.ok; } }; });
    await ctx(); await p.evaluate(() => { window.__plays = []; const S = StoryScenes, play = S.play; S.play = (id, o) => { window.__plays.push(id); return play.call(S, id, o); }; });
    for (const id of ['dream_arrival', 'dream_gym_talk', 'first_brick', 'night_shadow', 'night_bag']) assert.ok(await p.evaluate(id => AdventureOldTown.devSkip(__ctx, id), id), 'dev skip ' + id);
    await p.waitForTimeout(800); await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.closeBeat(); });
    // beat 5: the apology film plays at its step, in street clothes, mirrored root; Skip ends it and the step is recorded
    await p.evaluate(() => AdventureOldTown.before(__ctx, 'dream_apology'));
    await wait(() => DreamScenes.playing === 'dream_apology' && DreamScenes.debug?.phase === 'play');
    await p.waitForTimeout(1200);
    const mid = await p.evaluate(() => ({ scale: app.engine.coach.root.scale.toArray(), outfit: StoryCast.outfitOf(app.engine.coach), bag: DreamScenes.debug.set.objects.oldBag?.state, skip: !!document.querySelector('dialog.dream-scene .dream-skip') }));
    assert.deepEqual(mid.scale, [-1, 1, 1], 'mirrored root'); assert.equal(mid.outfit, 'street'); assert.equal(mid.bag, 'broken', 'the old bag on the floor'); assert.ok(mid.skip);
    await p.evaluate(() => document.querySelector('dialog.dream-scene .dream-skip').click());
    // the apology leads straight into the robbery film
    await wait(() => DreamScenes.playing === 'dream_market_robbery' && DreamScenes.debug?.phase === 'play');
    assert.equal(await p.evaluate(() => StoryFlow.doneOf(ringfighterGame.store.game(), StoryFlow.find('dream_apology'))), true, 'beat 5 recorded');
    await p.evaluate(() => DreamScenes.seek(7)); await p.waitForTimeout(1500);
    const snatch = await p.evaluate(() => { const f = StoryCast.rig('fang', app.engine), hb = StoryCast.market.handbag(StoryCast.rig('hazel', app.engine)); let o = hb, inFang = false; while (o) { if (o === f.root) inFang = true; o = o.parent; } return { inFang, scale: f.root.scale.toArray(), wear: f.castWear }; });
    assert.ok(snatch.inFang, 'Fang has the handbag'); assert.deepEqual(snatch.scale, [-1, 1, 1], 'Fang mirrored like every rig'); assert.equal(snatch.wear, 'jacket');
    await p.evaluate(() => DreamScenes.seek(16)); await p.waitForTimeout(1500);
    assert.equal(await p.evaluate(() => StoryCast.rig('fang', app.engine).castWear), 'fight', 'the jacket is off before the fight');
    // the film ends -> the street fight with Fang (ringless street, bare hands)
    await p.evaluate(() => DreamScenes.seek(18.7));
    await wait(() => !DreamScenes.playing && AdventureOldTown.run?.id === 'market_robber' && app.engine.arena?.fightView);
    await p.waitForTimeout(2500);
    const fight = await p.evaluate(() => { const v = app.engine.arena.fightView, f = StoryCast.rig('fang', app.engine), foe = Object.values(v.coaches || {}).includes(f); return { foe, venue: ringfighterGame.store.game()?.venue || null, ringless: !!v.ringless, ring: v.ring?.visible, fangGloves: !!f.gloveMeshes?.L?.visible, fighter: StoryCast.outfitOf(app.engine.coach), name: v.careerEntry?.opponentName }; });
    assert.ok(fight.foe, 'Fang is the Opponent'); assert.equal(fight.name, 'Fang'); assert.equal(fight.fangGloves, false, 'bare hands');
    assert.ok(fight.ringless && fight.ring === false, 'no ring in the street: ' + JSON.stringify(fight)); assert.equal(fight.fighter, 'street', 'street clothes in the street fight');
    // a win: the reward film plays, the coins are exactly the bag's price; Fang is handed back in his jacket
    const coins0 = await p.evaluate(() => GameDomain.wallet(ringfighterGame.store.game()).coins);
    await p.evaluate(() => { const v = app.engine.arena.fightView; v.match.result = { winner: v.careerEntry.species, method: 'KO' }; AdventureOldTown.storyFightDone(v); });
    await wait(() => DreamScenes.playing === 'dream_market_reward' && DreamScenes.debug?.phase === 'play');
    const paid = await p.evaluate(() => GameDomain.wallet(ringfighterGame.store.game()).coins); assert.equal(paid - coins0, D.storyRewards.market_robber, 'reward = bag price');
    assert.equal(await p.evaluate(() => StoryCast.rig('fang', app.engine).castWear), 'jacket', 'Fang back in his jacket after the fight');
    await p.evaluate(() => document.querySelector('dialog.dream-scene .dream-skip').click()); await wait(() => !DreamScenes.playing); await p.waitForTimeout(1500);
    await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.closeBeat(); app.engine.arena?.fightView && ringfighterGame.close?.(); });
    // beat 7: the shop film; Skip before buying shows the counter (nothing bought); the Buy button inside the film completes the step
    await p.evaluate(() => AdventureOldTown.before(__ctx, 'buy_heavy_bag'));
    await wait(() => DreamScenes.playing === 'dream_otto_shop' && DreamScenes.debug?.phase === 'play');
    await p.evaluate(() => document.querySelector('dialog.dream-scene .dream-skip').click());
    await wait(() => !DreamScenes.playing && document.getElementById('sfBeat'));
    assert.equal(await p.evaluate(() => GameDomain.ownsGear(ringfighterGame.store.game(), 'heavy_bag')), false, 'Skip buys nothing');
    await p.evaluate(() => { AdventureOldTown.closeBeat(); document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.before(__ctx, 'buy_heavy_bag'); });
    await wait(() => DreamScenes.playing === 'dream_otto_shop' && DreamScenes.debug?.phase === 'play');
    await p.evaluate(() => DreamScenes.seek(30)); await p.waitForTimeout(1500);
    assert.equal(await p.evaluate(() => !document.querySelector('.dream-buy').hidden && DreamScenes.debug.t), MC.scenes.dream_otto_shop.buy.t, 'the film waits at the purchase with a Buy button');
    await p.evaluate(() => document.querySelector('.dream-buy').click()); await p.waitForTimeout(600);
    assert.equal(await p.evaluate(() => GameDomain.ownsGear(ringfighterGame.store.game(), 'heavy_bag') && StoryFlow.doneOf(ringfighterGame.store.game(), StoryFlow.find('buy_heavy_bag'))), true, 'the purchase completes beat 7');
    assert.equal(await p.evaluate(() => GameDomain.wallet(ringfighterGame.store.game()).coins), paid - price, 'paid exactly the bag price');
    await p.evaluate(() => DreamScenes.seek(29)); await p.waitForTimeout(1500);
    assert.ok(await p.evaluate(() => DreamScenes.debug.t) > MC.scenes.dream_otto_shop.buy.t, 'the film goes on after the purchase');
    await p.evaluate(() => document.querySelector('dialog.dream-scene .dream-skip').click()); await wait(() => !DreamScenes.playing); await p.waitForTimeout(1200);
    const after = await rigState();
    assert.deepEqual(after.scale, before.scale, 'root scale handed back'); assert.equal(after.outfit, before.outfit, 'outfit handed back');
    assert.equal(after.fang, 'jacket'); assert.equal(after.handbag, true, 'the handbag is back in her hand'); assert.equal(after.demo, false); assert.equal(after.dialog, false);
    assert.equal(await p.evaluate(() => BagBreak.gymState()), 'new', 'the gym shows the new bag');
    const plays = await p.evaluate(() => window.__plays.filter(id => /^dream_(apology|market|otto)/.test(id)));
    assert.deepEqual(plays, ['dream_apology', 'dream_market_robbery', 'dream_market_reward', 'dream_otto_shop', 'dream_otto_shop'], 'each film at its step');
    assert.deepEqual(errors, [], 'no page errors');
    console.log('PASS browser: films at their steps, Skip, hand-off to the street fight vs Fang, reward = bag price, purchase in the film, rigs handed back');
  } finally { await browser.close(); server.close(); }
})().catch(x => { console.error(x); process.exit(1); });
