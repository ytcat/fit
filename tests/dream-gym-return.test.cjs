// Chapter 1 in-game training films: script, scenery, animation, and handoff.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const Core = require('../adventure/story/dream-core.js'), Bag = require('../adventure/story/bag-break-core.js');
const Film = require('../adventure/story/gym-return-core.js'), Flow = require('../adventure/story-flow.js');
const ROOT = path.resolve(__dirname, '..');
const sceneIds = { bag_drill: 'dream_new_bag', fight_prep: 'dream_offer' };
for (const [step, id] of Object.entries(sceneIds)) {
  assert.equal(Flow.find(step).scene, id, 'existing story mission attaches film');
  const s = Film.scenes[id];
  assert.deepEqual(Core.validate(s), []);
  assert.ok(s.actors.pip && s.actors.bruno && s.actors.fighter);
  assert.ok(s.lines.every(l => Object.values(l.text).length === 3));
  for (let t = 0; t < s.duration; t += .05) {
    const f = Core.sample(s,t);
    assert.ok([...f.camera.pos, ...f.camera.look, ...Object.values(f.actors).flatMap(a => [a.x,a.y,a.z,a.ry])].every(Number.isFinite));
  }
  assert.equal(Core.sample(s, s.duration).done, true);
}
assert.deepEqual(Film.strikes.map(s => s.who), ['fighter','pip','fighter','pip']);
assert.ok(Film.strikes.slice(1).every((s,i) => s.t > Film.strikes[i].t + Film.strikes[i].dur));
for (const s of Film.strikes) assert.equal(Film.punch(s.who,s.t+.1).move,s.move);
assert.equal(Film.angle(0),0);
assert.ok(Film.angle(7.4) > 0 && Film.angle(8.6) < 0);
const rest = Bag.sample(0), copy = JSON.stringify(rest), sample = Film.bagPose(rest,7.5);
assert.equal(sample.links.length,rest.links.length); assert.equal(JSON.stringify(rest),copy);
assert.ok(sample.links.flatMap(l => [...l.p,...l.d]).every(Number.isFinite));
for (const file of ['index.html', 'offline-manifest.json']) assert.ok(fs.readFileSync(path.join(ROOT,file),'utf8').includes('adventure/story/gym-return-core.js?v=1'));
console.log('PASS gym return scripts: both timelines, alternate strikes, bag response, localization and story wiring');

let chromium;
try { ({ chromium } = require('playwright')); }
catch {
  if (process.env.GOTR_REQUIRE_GYM_BROWSER === '1') throw Error('Gym film browser verification requires Playwright');
  console.log('SKIP gym return browser: Playwright is not installed'); process.exit(0);
}
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.glb':'model/gltf-binary', '.woff2':'font/woff2' };
const server = http.createServer((req,res) => {
  const p = new URL(req.url,'http://127.0.0.1').pathname;
  const f = path.resolve(ROOT, '.' + (p === '/' ? '/index.html' : p));
  if (!f.startsWith(ROOT + path.sep)) return res.writeHead(403).end();
  fs.readFile(f,(err,data) => {
    if (err) return res.writeHead(404).end();
    res.writeHead(200,{'Content-Type':mime[path.extname(f)] || 'application/octet-stream','Cache-Control':'no-store'}).end(data);
  });
});
(async () => {
  await new Promise(r => server.listen(0,'127.0.0.1',r));
  let browser;
  try {
    browser = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
    for (const [step,id] of Object.entries(sceneIds)) {
      const page = await browser.newPage({viewport:{width:402,height:690}});
      const wait = (f,x) => page.waitForFunction(f,x,{timeout:60000});
      const errors = []; page.on('pageerror',e => errors.push(e.message));
      await page.addInitScript(() => {
        localStorage.setItem('shadowbox-language','en'); localStorage.setItem('gotr.adv.nointro','1');
      });
      await page.goto('http://127.0.0.1:' + server.address().port);
      await wait(() => window.ringfighterGame && window.DreamScenes && window.GymReturnCore);
      await wait(() => document.querySelector('dialog.career-welcome[open]'));
      await page.evaluate(() => { const d = document.querySelector('dialog.career-welcome[open]'); d.querySelector('input').value = 'Gym Film QA'; d.querySelector('button[type=submit]').click(); });
      await wait(() => window.app?.engine?.coach?.anatomy);
      const seeded = await page.evaluate(step => {
        StoryScenes.stop();
        const g = ringfighterGame;
        const ctx = window.__gymCtx = { store:g.store, startFight:g.startFight, startTraining: (...args) => { window.__gymTraining = args[0]; return g.startTraining(...args); }, change:a => { const r = g.store.gameAction(a); if (r.ok) g.apply?.(); return r.ok; } };
        for (const id of AdventureProgress.dreamSteps) {
          if (id === step) break;
          if (!AdventureOldTown.devSkip(ctx,id)) return id;
        }
        document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.closeBeat();
        return AdventureOldTown.before(ctx,step) ? true : 'cannot start';
      },step);
      assert.equal(seeded,true,'starting ' + step + ' prerequisite');
      await wait(id => DreamScenes.playing === id && DreamScenes.debug?.phase === 'play',id);
      const visible = await page.evaluate(() => {
        const r = DreamScenes.debug.rigs; return { distinct:r.pip !== r.fighter, species:r.pip.species, bag:DreamScenes.debug.set.objects.oldBag?.state, overlay:!!document.querySelector('dialog.dream-scene[open] .dream-skip') };
      });
      assert.deepEqual(visible,{distinct:true,species:'rabbit',bag:'new',overlay:true});
      if (process.env.GOTR_GYM_ARTIFACTS) {
        fs.mkdirSync(process.env.GOTR_GYM_ARTIFACTS,{recursive:true});
        await page.evaluate(t => DreamScenes.seek(t),step === 'bag_drill' ? 7.25 : 4.65);
        await page.waitForTimeout(500);
        await page.screenshot({path:path.join(process.env.GOTR_GYM_ARTIFACTS,id + '.png')});
      }
      if (step === 'bag_drill') await page.locator('dialog.dream-scene .dream-skip').click();
      else await page.keyboard.press('Escape');
      await wait(() => !!window.__gymTraining && !DreamScenes.playing);
      assert.equal(await page.evaluate(() => window.__gymTraining.mode),step === 'bag_drill' ? 'heavy' : 'pads');
      assert.equal(await page.evaluate(step => StoryFlow.doneOf(ringfighterGame.store.game(),StoryFlow.find(step)),step),false,'skipping film does not complete training');
      assert.deepEqual(errors,[]);
      await page.close();
    }
    console.log('PASS gym return browser: two real mobile-size films, Mack, Skip to heavy bag, Escape to mitts, no premature story completion');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
