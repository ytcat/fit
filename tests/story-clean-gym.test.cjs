// GOTR-0099: direct floor sweeping, saved wage, story wiring and real touch projects onto the 3D work area.
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const M = require('../adventure/story/mop-core.js'), A = require('../adventure-progress.js'), D = require('../game-domain.js'), SF = require('../adventure/story-flow.js'), ST = require('../adventure/story.js');
process.chdir(path.join(__dirname,'..'));

// No time pressure, no progress from a tap, no bridge from outside/cancel, and free movement to any stain.
{
  const g=new M.MopTrial(), [x,z]=M.MOP.spots[0];
  for(let i=0;i<10000;i++) g.step(1/120);
  assert.equal(g.done,false); assert.equal(g.marks,0); assert.equal(g.finish(),false);
  assert.equal(g.begin({x:100,z}),false);
  assert.equal(g.begin({x,z}),true); g.drag({x,z}); assert.equal(g.marks,0);
  g.drag({x:100,z}); g.drag({x:x+.4,z}); assert.equal(g.marks,0);
  g.begin({x:x-.4,z}); g.release(); g.drag({x:x+.4,z}); assert.equal(g.marks,0);
  g.begin({x:x-.45,z:z+.1}); g.drag({x:x+.45,z:z+.1});
  assert.ok(g.marks>0 && g.marks<25); const k=g.removed;
  g.drag({x:x-.45,z:z+.1}); assert.equal(g.removed,k,'wiping the same strip again cannot score twice');
  g.release();
  const kbd=new M.MopTrial(), p={...kbd.point}; kbd.key('right',true); kbd.step(1/240);
  assert.ok(kbd.point.x>p.x); assert.equal(kbd.marks,0,'keyboard movement alone does not wipe');
}
function scrub(g,[x,z]) {
  for(const offset of [-.18,0,.18]){
    g.begin({x:x-.42,z:z+offset}); g.drag({x:x+.42,z:z+offset});g.release();
  }
}
{
  const g=new M.MopTrial();
  for(const s of M.MOP.spots.slice(0,3)) scrub(g,s);
  assert.equal(g.marks,30); assert.ok(g.finish()); assert.equal(g.finish(),false);
  for(const s of M.MOP.spots) scrub(g,s);
  assert.equal(g.marks,30,'finished shift is immutable'); assert.equal(g.result(A.starsFor).stars,1);
  const all=new M.MopTrial(); for(const s of M.MOP.spots) scrub(all,s);
  assert.equal(all.marks,100); assert.equal(all.done,true); assert.equal(all.result(A.starsFor).stars,3);
  assert.equal(new M.MopTrial().marks,0,'fresh shifts have fresh dirt');
  assert.deepEqual([...M.PAY], [...D.jobs.clean_gym]);
  const old=A.fresh(); old.missions.clean_gym={stars:2,value:15,plays:3}; A.validate(old);
  assert.deepEqual(old.missions.clean_gym,{stars:2,value:50,plays:3},'legacy save migration unchanged');
}
// ---- the wage in the save: only after a recorded shift, coins by its stars, repeatable, forged entries rejected
{
  const p = { id: 'p1', name: 'QA', boxers: { lion: { xp: 0 }, rabbit: { xp: 0 } } };
  const gg = { ledger: [{ id: 'baseline:p1', type: 'baseline', coins: 0, xp: 0, rule: 'migration-v1' }], adventure: A.fresh() }, act = a => { try { return { ok: true, ...D.action(gg, a, p) }; } catch (x) { return { ok: false, error: x.message }; } };
  assert.equal(act({ type: 'job', jobId: 'clean_gym', stars: 1 }).ok, false, 'no shift recorded yet');
  A.recordMission(gg, 'clean_gym', { marks: 52 }, true);
  assert.equal(act({ type: 'job', jobId: 'clean_gym', stars: 3 }).ok, false, 'more stars than the shift earned');
  const one = act({ type: 'job', jobId: 'clean_gym', stars: 2 }); assert.ok(one.ok, one.error); assert.equal(one.coins, 10); assert.equal(gg.ledger.at(-1).id, 'job:clean_gym:1');
  assert.equal(act({ type: 'job', jobId: 'clean_gym', stars: 2 }).ok, false, 'one wage per recorded shift');
  A.recordMission(gg, 'clean_gym', { marks: 30 }, true); const two = act({ type: 'job', jobId: 'clean_gym', stars: 1 }); assert.ok(two.ok); assert.equal(two.coins, 6, 'repeatable: the next shift pays again');
  assert.equal(gg.ledger.filter(t => t.rule === 'job-pay-v1').reduce((n, t) => n + t.coins, 0), 16);
  assert.equal(act({ type: 'job', jobId: 'sweep_docks', stars: 1 }).ok, false, 'unknown job');
  // through the real store: saved, reloaded and re-validated; a forged wage is refused on load
  const { CareerStore } = require('../career-progress.js'), mem = () => ({ values: new Map(), getItem(k) { return this.values.get(k) || null; }, setItem(k, v) { this.values.set(k, v); } });
  const disk = mem(), s = new CareerStore(disk); s.create('Mop QA');
  assert.ok(s.gameAction({ type: 'adventure', adventure: 'mission', missionId: 'clean_gym', measured: { marks: 80 } }).ok);
  const paid = s.gameAction({ type: 'job', jobId: 'clean_gym', stars: 3 }); assert.ok(paid.ok, paid.error); assert.equal(s.wallet().coins, 15);
  assert.equal(new CareerStore(disk).wallet().coins, 15, 'the wage survives a reload');
  const raw = JSON.parse([...disk.values.values()].find(v => v.includes('job-pay-v1'))), key = [...disk.values.keys()].find(k => disk.values.get(k).includes('job-pay-v1'));
  const forged = JSON.stringify(raw).replace('"coins":15,"xp":0,"rule":"job-pay-v1"', '"coins":500,"xp":0,"rule":"job-pay-v1"'); assert.notEqual(forged, JSON.stringify(raw));
  const d2 = mem(); for (const [k, v] of disk.values) d2.setItem(k, k === key ? forged : v); assert.notEqual(new CareerStore(d2).wallet().coins, 500, 'a forged wage does not load');
}
// ---- the step: side job A runs the game; the stand-in note is gone; Bruno's lines exist in EN/HE/RU and reach the journal
{
  const ot = fs.readFileSync('adventure/oldtown.js', 'utf8'); assert.match(ot, /clean_gym: \{ kind: 'scene', scene: 'clean_gym' \}/);
  const s = SF.find('clean_gym'); assert.equal(s.side, undefined); assert.equal(SF.unlocks('first_brick').next,'clean_gym'); assert.equal(s.stand, undefined, 'no stand-in any more');
  for (const k of ['job', 'job_0', 'job_1', 'job_2', 'job_3']) { const l = ST.lines.clean_gym[k][0]; assert.equal(l.who, 'bruno'); for (const lang of ['en', 'he', 'ru']) assert.ok(l.text[lang] && l.text[lang].length < 80, k + ' ' + lang); }
  const g = { adventure: A.fresh() }; A.recordMission(g, 'clean_gym', { marks: 25 }, true); assert.equal(SF.doneOf(g, s), true, 'one star finishes the required shift');
  const html = fs.readFileSync('index.html', 'utf8'); assert.ok(html.indexOf('adventure/story/mop-core.js') > html.indexOf('adventure/story/trials-core.js') && html.indexOf('adventure/story/mop-game.js') > html.indexOf('adventure/story/story-scenes.js'), 'load order');
  const man = fs.readFileSync('offline-manifest.json', 'utf8'); assert.ok(man.includes('mop-core.js') && man.includes('mop-game.js'), 'offline manifest');
}

{
  const win={StoryScenes:{games:{}}}, ctx={window:win,THREE:require('../assets/vendor/three.min.js'),console};
  vm.runInNewContext(fs.readFileSync('adventure/story/mop-game.js','utf8'),ctx);
  const g=win.StoryScenes.games.clean_gym;
  assert.ok(g.direct && g.mount); assert.equal(g.set,'dream_gym'); assert.equal(g.wear,'street');
  assert.deepEqual(Object.keys(g.roles),['fighter','bruno']);
  for(const l of ['en','he','ru']) for(const k of ['title','goal','help','keyboard','finish']) assert.ok(g.words[l][k]);
}
console.log('PASS clean-gym direct sweep, no timer, safe input, old saves, wages and story wiring');

if(process.argv.includes('--static-only')&&process.env.GOTR_REQUIRE_MOP_BROWSER!=='1') process.exit(0);
let chromium;
try { ({chromium}=require('playwright')); } catch {
  try { ({chromium}=require('/opt/node-tools/node_modules/playwright')); } catch {
    if(process.env.GOTR_REQUIRE_MOP_BROWSER==='1') throw Error('Required Chromium mop coverage needs Playwright');
    console.log('SKIP browser part: Playwright is not installed'); process.exit(0);
  }
}
const ROOT = process.cwd(), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const server = http.createServer((q, r) => { let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0]))); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } if (f.endsWith(path.sep) || f === ROOT) f = path.join(f, 'index.html');
  fs.readFile(f, (err, data) => { if (err) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(data); }); });
(async () => {
  await new Promise(r=>server.listen(0,'127.0.0.1',r)); const url='http://127.0.0.1:'+server.address().port+'/';
  const browser=await chromium.launch({executablePath:process.env.GOTR_CHROMIUM||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
  try {
    const p=await browser.newPage({viewport:{width:402,height:690},hasTouch:true,isMobile:true}), errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    const CDP=await p.context().newCDPSession(p);
    const touch=(type,a=[])=>CDP.send('Input.dispatchTouchEvent',{type,touchPoints:a.map(({x,y})=>({x,y,id:1}))});
    const wait=(fn,a)=>p.waitForFunction(fn,a,{timeout:90000});
    const art=process.env.GOTR_MOP_ARTIFACTS;
    const shot=async name=>{
      if(!art) return; fs.mkdirSync(art,{recursive:true});
      await p.evaluate(()=>{const r=window.StoryScenes?.debug;if(r?.frame){window.__mopCapture={r,frame:r.frame};r.frame=()=>{};}});
      try { await p.screenshot({path:path.join(art,name+'.png'),timeout:60000}); }
      finally { await p.evaluate(()=>{const x=window.__mopCapture;if(x){x.r.frame=x.frame;delete window.__mopCapture;}}); }
    };
    await p.addInitScript(()=>{localStorage.setItem('shadowbox-language','en');localStorage.setItem('gotr.adv.nointro','1');});
    await p.goto(url); await wait(()=>window.ringfighterGame?.store&&window.MopGame&&window.StoryScenes?.games.clean_gym);
    if(await p.locator('dialog.career-welcome[open]').count()){
      await p.locator('dialog.career-welcome[open] input[name=player]').fill('Mop QA');
      await p.locator('dialog.career-welcome[open] button[type=submit]').tap();
    }
    await wait(()=>app.engine.coach?.anatomy&&ringfighterGame.store.game());
    await p.evaluate(()=>{StoryScenes?.stop();ringfighterGame.close();});
    const begin=async (afterBrick=false)=>{
      const gate=await p.evaluate(afterBrick=>{
        const rg=ringfighterGame, st=rg.store; rg.close();
        for(const d of document.querySelectorAll('dialog[open]')) d.close();
        const change=a=>{const r=st.gameAction(a);if(r.ok)rg.apply?.();return r.ok;};
        for(const step of ['dream_arrival','dream_gym_talk','first_brick']){
          const s=StoryFlow.find(step);
          if(!StoryFlow.doneOf(st.game(),s)) change({type:'adventure',adventure:'story',step,outcome:step==='first_brick'?'lost':undefined});
        }
        if(!StoryFlow.playable(st.game(),'clean_gym')) throw Error('required shift not unlocked by first Brick bout');
        const cx={store:st,startTraining:rg.startTraining,startFight:rg.startFight,change};
        const selected=afterBrick?StoryFlow.state(st.game(),1).current?.id:null;
        if(afterBrick){
          const forced=AdventureOldTown.before(cx,'night_shadow',{force:true});
          const devSkip=AdventureOldTown.devSkip(cx,'clean_gym');
          AdventureOldTown.afterBeat('first_brick',{ok:true,won:false});
          return {selected,forced,devSkip};
        }
        AdventureOldTown.start(cx,'clean_gym');
      },afterBrick);
      const next=p.locator('#sfBeat .sf-beat-main');
      if(afterBrick){
        assert.deepEqual(gate,{selected:'clean_gym',forced:false,devSkip:false});
        assert.match(await next.textContent(),/Clean the gym/i);
        await next.tap();
      }
      if(await next.count()) await next.tap();
      await wait(()=>StoryScenes.debug?.sim&&StoryScenes.debug.projectFloor&&app.engine.fightIQDemo===StoryScenes.debug&&StoryScenes.stats()?.calls);
    };
    const state=()=>p.evaluate(()=>({marks:StoryScenes.debug?.sim?.marks,progress:document.querySelector('.story-mop-bar')?.getAttribute('aria-valuenow'),coins:GameDomain.wallet(ringfighterGame.store.game()).coins,wages:ringfighterGame.store.game().ledger.filter(t=>t.rule==='job-pay-v1').length}));
    const before=await p.evaluate(()=>({scale:app.engine.coach.root.scale.toArray(),outfit:StoryCast.outfitOf(app.engine.coach),parent:app.engine.stage.parentElement.id,coins:GameDomain.wallet(ringfighterGame.store.game()).coins}));
    await begin(true);
    const inGame=await p.evaluate(()=>({
      outfit:StoryCast.outfitOf(app.engine.coach),
      oldControls:!!document.querySelector('dialog[data-game=clean_gym] > .story-pad'),
      bags:app.engine.coach.root.parent?.children.some(x=>/Mop lanes/.test(x.name)),
      projected:window.MopCore.MOP.spots.map(([x,z])=>{const p=StoryScenes.debug.projectFloor(x,z);return {...p,hit:document.elementFromPoint(p.x,p.y)?.classList.contains('story-mop-surface')};}),
      h:innerHeight,w:innerWidth
    }));
    await shot('01-dirty-floor');
    assert.equal(inGame.outfit,'street'); assert.equal(inGame.oldControls,false); assert.equal(inGame.bags,false);
    assert.ok(inGame.projected.every(a=>a.x>22&&a.x<inGame.w-22&&a.y>100&&a.y<inGame.h-95&&a.hit),'all stains are drag targets: '+JSON.stringify(inGame));
    const [x,z]=M.MOP.spots[0], project=(x,z)=>p.evaluate(([x,z])=>StoryScenes.debug.projectFloor(x,z),[x,z]);
    const center=await project(x,z), right=await project(x+.41,z);
    await touch('touchStart',[{x:6,y:140}]); await touch('touchMove',[center]); await touch('touchEnd');
    assert.equal((await state()).marks,0,'drag beginning outside the floor cannot clean');
    await touch('touchStart',[center]); await touch('touchCancel'); await touch('touchMove',[right]).catch(()=>{}); await touch('touchEnd').catch(()=>{});
    assert.equal((await state()).marks,0,'tap/cancel cannot clean');
    const wipe=async ([x,z],rows=[-.18,0,.18])=>{
      for(const dz of rows){
        const [a,b]=await p.evaluate(([x,z])=>[-.42,.42].map(dx=>StoryScenes.debug.projectFloor(x+dx,z)),[x,z+dz]);
        await touch('touchStart',[a]); await touch('touchMove',[b]); await touch('touchEnd');
      }
    };
    await wipe(M.MOP.spots[0]);
    await wait(()=>Number(document.querySelector('.story-mop-bar')?.getAttribute('aria-valuenow'))>=5);
    const dirty=await state(); assert.ok(dirty.marks>=5); assert.equal(dirty.coins,before.coins);
    await shot('02-mid-sweep');
    await p.locator('dialog[data-game=clean_gym] .story-retry').tap(); await wait(()=>StoryScenes.debug.sim.marks===0);
    await p.locator('dialog[data-game=clean_gym] .story-quit:not(.story-retry)').tap(); await wait(()=>!StoryScenes.playing);
    assert.deepEqual(await state().then(t=>[t.coins,t.wages]),[before.coins,0],'quit and retry do not pay');
    assert.deepEqual(await p.evaluate(()=>{const g=ringfighterGame.store.game();return [StoryFlow.state(g,1).current.id,StoryFlow.playable(g,'night_shadow')]}),['clean_gym',false],'quit leaves cleaning required');
    await begin();
    await p.setViewportSize({width:690,height:402});
    await wait(()=>innerWidth===690);
    await p.setViewportSize({width:402,height:690});
    await wait(()=>innerWidth===402&&document.querySelector('.story-mop-surface'));
    for(const s of M.MOP.spots.slice(0,6)) await wipe(s);
    await wait(()=>Number(document.querySelector('.story-mop-bar')?.getAttribute('aria-valuenow'))>=25);
    const ongoing=await state(); assert.ok(ongoing.marks>=25&&ongoing.marks<=63,JSON.stringify(ongoing)); assert.equal(ongoing.coins,before.coins);
    await p.locator('.story-mop-finish').tap();
    await wait(()=>StoryScenes.debug?.result?.finished&&document.querySelector('.story-result-pay'));
    const got=await p.evaluate(()=>({stars:StoryScenes.debug.result.stars,pay:StoryScenes.debug.result.pay,saved:StoryScenes.debug.saved?.ok}));
    assert.ok(got.saved); assert.equal(got.pay,M.PAY[got.stars]); assert.ok(got.pay>=6);
    await shot('03-shift-complete');
    await p.locator('.story-result .story-btn-main').tap(); await wait(()=>!StoryScenes.playing);
    const after=await p.evaluate(()=>({
      scale:app.engine.coach.root.scale.toArray(),outfit:StoryCast.outfitOf(app.engine.coach),parent:app.engine.stage.parentElement.id,
      done:StoryFlow.doneOf(ringfighterGame.store.game(),StoryFlow.find('clean_gym')),
      coins:GameDomain.wallet(ringfighterGame.store.game()).coins,
      wages:ringfighterGame.store.game().ledger.filter(t=>t.rule==='job-pay-v1').length
    }));
    assert.deepEqual(after.scale,before.scale);assert.equal(after.outfit,before.outfit);assert.equal(after.parent,before.parent);
    assert.equal(after.done,true);assert.equal(await p.evaluate(()=>StoryFlow.state(ringfighterGame.store.game(),1).current.id),'night_shadow');assert.equal(after.wages,1);assert.equal(after.coins-before.coins,got.pay);
    const best=await p.evaluate(()=>ringfighterGame.store.game().adventure.missions.clean_gym.stars);
    await begin();
    assert.equal((await state()).marks,0);
    for(const s of M.MOP.spots.slice(-3)) await wipe(s);
    await wait(()=>Number(document.querySelector('.story-mop-bar')?.getAttribute('aria-valuenow'))>=25);
    await p.locator('.story-mop-finish').tap();
    await wait(()=>StoryScenes.debug?.result?.finished&&document.querySelector('.story-result-pay'));
    const replay=await p.evaluate(()=>({paid:StoryScenes.debug.result.pay,stars:StoryScenes.debug.result.stars,best:ringfighterGame.store.game().adventure.missions.clean_gym.stars}));
    assert.equal(replay.paid,6); assert.equal(replay.stars,1); assert.equal(replay.best,best);
    await p.locator('.story-result .story-btn-main').tap(); await wait(()=>!StoryScenes.playing);
    assert.deepEqual(await state().then(o=>[o.coins,o.wages]),[after.coins+6,2]);
    assert.deepEqual(errors,[]);
    console.log('PASS browser: clean-gym job',JSON.stringify({device:'402x690 touch',partial:ongoing.marks,got,replay}));
  } finally { await browser.close(); server.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
