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
  assert.equal(s.playTailAfterDialogue,true,'final subtitle must leave time for the scene action');
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
for (const file of ['index.html', 'offline-manifest.json']) assert.ok(fs.readFileSync(path.join(ROOT,file),'utf8').includes('adventure/story/gym-return-core.js?v='));
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
      const page = await browser.newPage({viewport:{width:402,height:690},hasTouch:true,isMobile:true});
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
      const seeded = await page.evaluate(({step,id}) => {
        StoryScenes.stop();
        if (window.FreeWalk) window.FreeWalk.available = () => false; // GOTR-0122: the film chain without the story walk (device fallback); walks: tests/story-walk.test.cjs
        const g = ringfighterGame;
        window.__gymTraining = []; window.__gymEnds = [];
        const ctx = window.__gymCtx = { store:g.store, startFight:g.startFight, startTraining: (...args) => { window.__gymTraining.push(args[0].mode); return g.startTraining(...args); }, change:a => { const r = g.store.gameAction(a); if (r.ok) g.apply?.(); return r.ok; } };
        const play = StoryScenes.play;
        StoryScenes.play = (scene,options) => {
          if (scene === 'bag_duo') window.__gymTraining.push('bag_duo'); // beat 8 opens the two-sided drill game (GOTR-0106)
          if (scene !== id) return play(scene,options);
          const playback = window.__gymPlayback = {
            ...options, timeScale:8,
            onDone: result => { window.__gymEnds.push(result); options.onDone(result); }
          };
          return play(scene,playback);
        };
        for (const id of AdventureProgress.dreamSteps) {
          if (id === step) break;
          if (!AdventureOldTown.devSkip(ctx,id)) return id;
          if (id==='first_brick' && !ctx.store.gameAction({type:'adventure',adventure:'mission',missionId:'clean_gym',measured:{marks:25}}).ok) return 'clean_gym';
        }
        document.querySelectorAll('dialog[open]').forEach(d => d.close()); AdventureOldTown.closeBeat();
        return AdventureOldTown.before(ctx,step) ? true : 'cannot start';
      },{step,id});
      assert.equal(seeded,true,'starting ' + step + ' prerequisite');
      await wait(id => DreamScenes.playing === id && DreamScenes.debug?.phase === 'play',id);
      const visible = await page.evaluate(() => {
        const r = DreamScenes.debug.rigs; return { distinct:r.pip !== r.fighter, species:r.pip.species, bag:DreamScenes.debug.set.objects.oldBag?.state, overlay:!!document.querySelector('dialog.dream-scene[open] .dream-skip') };
      });
      assert.deepEqual(visible,{distinct:true,species:'rabbit',bag:'new',overlay:true});
      const tapAt = async selector => {
        const target = await page.evaluate(sel => {
          const element = document.querySelector(sel), box = element?.getBoundingClientRect();
          if (!box?.width || !box.height) return null;
          const x = box.left + box.width/2, y = box.top + box.height/2;
          const hit = document.elementFromPoint(x,y);
          return element.contains(hit) ? {x,y} : null;
        },selector);
        assert.ok(target, selector + ' is a touchscreen hit target');
        await page.touchscreen.tap(target.x,target.y);
      };
      if (step === 'bag_drill') await page.evaluate(() => {
        // Record real bag samples across render frames so a slow runner cannot miss the peaks.
        const bag = DreamScenes.debug.set.objects.oldBag, pose = bag.pose; window.__gymMotion = {positive:false,negative:false};
        bag.pose = function(sample) {
          if (sample.bag.th > .03) __gymMotion.positive = true;
          if (sample.bag.th < -.03) __gymMotion.negative = true;
          return pose.call(this,sample);
        };
      });
      if (process.env.GOTR_GYM_ARTIFACTS) {
        await page.evaluate(t => {
          // Pause only after the real film advances to the target frame; never seek.
          const run = DreamScenes.debug, frame = run.frame;
          run.frame = delta => {
            if (run.t >= t) window.__gymCaptureReady = true;
            else frame(delta);
          };
          window.__gymResumeFrame = () => { run.frame = frame; };
        },step === 'bag_drill' ? 7.18 : 7.25);
      }
      for (let line = 0; line < 2; line++) {
        try {
          await page.waitForFunction(line => DreamScenes.debug?.lineIndex === line && DreamScenes.debug?.waiting,line,{timeout:100000});
        } catch (failure) {
          const state = await page.evaluate(() => ({scene:DreamScenes.playing,t:DreamScenes.debug?.t,ack:DreamScenes.debug?.ack,waiting:DreamScenes.debug?.waiting,lineIndex:DreamScenes.debug?.lineIndex,ends:window.__gymEnds,errors:document.querySelector('.story-busy')?.textContent}));
          console.error('GYM FILM DIALOGUE STATE ' + id + ': ' + JSON.stringify({line,state,errors}));
          throw failure;
        }
        console.log('Ready for real touch at dialogue ' + line + ': ' + id);
        if (line === 1) await page.evaluate(() => { window.__gymPlayback.timeScale = 4; });
        await tapAt('dialog.dream-scene');
      }
      if (process.env.GOTR_GYM_ARTIFACTS) {
        await page.waitForFunction(() => window.__gymCaptureReady && !!DreamScenes.playing,null,{timeout:100000});
        fs.mkdirSync(process.env.GOTR_GYM_ARTIFACTS,{recursive:true});
        try { await page.screenshot({path:path.join(process.env.GOTR_GYM_ARTIFACTS,id + '-natural-tail.png'),timeout:60000}); }
        finally { await page.evaluate(() => window.__gymResumeFrame()); }
      }
      if (step === 'bag_drill') {
        await wait(() => DreamScenes.debug?.t >= 8.4 && window.__gymMotion.positive && window.__gymMotion.negative);
      } else {
        await wait(() => DreamScenes.debug?.t >= 7.1 && DreamScenes.debug?.rigs.fighter.root.position.z < 2.75);
      }
      assert.equal(await page.evaluate(() => window.__gymTraining.length),0,'the drill starts only after the tail');
      console.log('PASS witnessed real touch-through and post-dialogue motion: ' + id);
      // The motion is already witnessed above; run only the remaining tail faster on this CPU-only test.
      // Do not seek, force the callback, or alter normal playback speed in the game.
      await page.evaluate(() => { window.__gymPlayback.timeScale = 8; });
      const mode = step === 'bag_drill' ? 'bag_duo' : 'pads', game = mode === 'bag_duo';
      const assertHandoff = async (n,skipped) => {
        try {
          await page.waitForFunction(([n,game]) => window.__gymEnds.length >= n && window.__gymTraining.length >= n && !DreamScenes.playing && (game ? StoryScenes.playing === 'bag_duo' && !!document.querySelector('dialog.story-scene[data-game="bag_duo"][open]') : !!app.engine.career.active),[n,game],{timeout:90000});
        } catch (failure) {
          const state = await page.evaluate(() => ({scene:DreamScenes.playing,t:DreamScenes.debug?.t,ack:DreamScenes.debug?.ack,phase:DreamScenes.debug?.phase,ends:window.__gymEnds,training:window.__gymTraining,active:app.engine.career.active?.mode,mode:app.engine.targetMode}));
          console.error('GYM FILM HANDOFF STATE ' + id + ': ' + JSON.stringify({n,state,errors}));
          throw failure;
        }
        assert.deepEqual(await page.evaluate(game => ({training:window.__gymTraining,ends:window.__gymEnds.map(e => [e.skipped,e.error || null]),active:game ? StoryScenes.playing : app.engine.career.active.mode,dialog:!!document.querySelector('dialog.dream-scene[open]')}),game),
          {training:Array(n).fill(mode),ends:n === 1 ? [[false,null]] : [[false,null],[skipped,null]],active:mode,dialog:false});
        assert.equal(await page.evaluate(step => StoryFlow.doneOf(ringfighterGame.store.game(),StoryFlow.find(step)),step),false,'the film does not complete the drill');
      };
      await assertHandoff(1,false);
      console.log('PASS natural film handoff: ' + step);
      assert.equal(await page.evaluate(({step,id}) => {
        if (StoryScenes.playing === 'bag_duo') StoryScenes.stop(); // leave the drill game before replaying the film
        AdventureOldTown.leave();
        localStorage.removeItem('gotr-scene-' + id);
        return AdventureOldTown.before(window.__gymCtx,step);
      },{step,id}),true);
      await wait(id => DreamScenes.playing === id && DreamScenes.debug?.phase === 'play',id);
      if (step === 'bag_drill') await tapAt('dialog.dream-scene .dream-skip');
      else await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
      await assertHandoff(2,true);
      assert.deepEqual(errors,[]);
      await page.close();
    }
    console.log('PASS gym return browser: normal touch-through preserves both cinematic tails and opens the correct drills once; touchscreen Skip and Escape also work');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
