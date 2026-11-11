/* GOTR-0032 evidence: matched before/after frames of a mitt cross (Play) and a fight cross in the real app
   (headless Chromium, software GL). "before" serves the motion files from the integration branch
   (QA_BASE, default claude/serene-cannon-riwk4l). Each case runs in a fresh page and is stepped by hand
   (mitts 120 Hz, fight 60 Hz ticks) so both versions show the same instants.
   Usage (repo root, preview on 127.0.0.1:8161): node qa/gotr-0032/cross-strips.cjs ; python3 -I qa/gotr-0032/cross-compose.py */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'frames'),url=process.env.QA_URL||'http://127.0.0.1:8161/',base=process.env.QA_BASE||'claude/serene-cannon-riwk4l';
const files=['boxing-coach-v2.js','career-drills.js','fight-arena.js','training-arena.js'],old=Object.fromEntries(files.map(f=>[f,execFileSync('git',['show',base+':'+f],{cwd:root,encoding:'utf8',maxBuffer:1<<26})]));fs.mkdirSync(out,{recursive:true});
async function open(browser,version){
 const page=await browser.newPage({viewport:{width:430,height:640}});page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(version==='before')for(const f of files)await page.route('**/'+f+'*',r=>r.fulfill({contentType:'text/javascript',body:old[f]}));
 await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
 await page.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
 return {page,errors};
}
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),results=[];try{
 for(const version of ['before','after']){
  // Mitt cross, Play.
  let {page,errors}=await open(browser,version);
  const mitt=await page.evaluate(()=>{const e=app.engine;ringfighterGame.startTraining({mode:'pads',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.isPlaying=false;let t=e.animTime;
   window.__s={step(){t+=1/120;e.animTime=t;return e.arena.update(t);},shot(){e.world?.update(e.animTime,'pads');e.renderer.render(e.scene,e.camera);}};
   for(let i=0;i<60;i++)__s.step();e.player.press('cross');let hit=null;const probe=[];for(let i=1;i<=34;i++){const f=__s.step();if(!hit&&(f.contacts||[]).some(c=>c.receiver==='pads'))hit=i;}return hit;});
  // Replay is not reliable; start a fresh page and shoot on the way.
  await page.close();({page,errors}=await open(browser,version));
  await page.evaluate(()=>{const e=app.engine;ringfighterGame.startTraining({mode:'pads',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.isPlaying=false;let t=e.animTime;
   window.__s={step(){t+=1/120;e.animTime=t;return e.arena.update(t);},shot(){e.world?.update(e.animTime,'pads');e.renderer.render(e.scene,e.camera);}};for(let i=0;i<60;i++)__s.step();e.player.press('cross');});
  let at=0;for(const k of [mitt-8,mitt-4,mitt,mitt+4,mitt+12]){await page.evaluate(n=>{for(let i=0;i<n;i++)__s.step();__s.shot();},k-at);at=k;
   const file=path.join(out,`${version}-mitt-${k-mitt}.png`);await page.locator('#boxerCanvas').screenshot({path:file});results.push({version,case:'mitt',offset:k-mitt,file:path.basename(file)});}
  results.push({version,case:'mitt',contactTick:mitt,errors:errors.slice()});console.log(version,'mitt cross contact tick',mitt);await page.close();
  // Fight cross, staged at range (same staging as qa/gotr-0024/render.cjs).
  ({page,errors}=await open(browser,version));
  const fight=await page.evaluate(()=>{const e=app.engine;e.career=null;e.fightOptions={preset:'quick',seed:74};trainingControls.chooseTarget('fight');e.isPlaying=false;
   const v=e.arena.fightView,m=v.match;m.phase='round';m.roundTime=2;m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.tempo=1;f.stamina=1;f.reaction=null;}
   m.fighters.rabbit.action={id:900,actor:'rabbit',move:'guard',guardStyle:'body',start:-1.75,duration:60,attack:false,defend:true};m.setPlayer(null);for(let i=0;i<20;i++)v.step();
   window.__f={v,shot(){v.tick=1e9;e.animTime=m.time;window.fightUI?.render(v);const g=e.arena.group,roots=Object.values(v.coaches).map(k=>k.root.position),mid=roots[0].clone().add(roots[1]).multiplyScalar(.5),axis=roots[1].clone().sub(roots[0]).normalize(),side=new THREE.Vector3(axis.z,0,-axis.x);
    e.camera.zoom=1;e.camera.position.copy(g.localToWorld(mid.clone().addScaledVector(side,-3.0).setY(1.75)));e.camera.lookAt(g.localToWorld(mid.clone().setY(1.55)));e.camera.updateProjectionMatrix();e.world?.update(e.animTime,'fight');e.renderer.render(e.scene,e.camera);}};
   m.attack('lion','cross','head');for(let i=1;i<=60;i++){v.step();if(v.contacts.find(c=>c.actor==='lion'))return i;}return null;});
  await page.close();({page,errors}=await open(browser,version));
  await page.evaluate(()=>{const e=app.engine;e.career=null;e.fightOptions={preset:'quick',seed:74};trainingControls.chooseTarget('fight');e.isPlaying=false;
   const v=e.arena.fightView,m=v.match;m.phase='round';m.roundTime=2;m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.tempo=1;f.stamina=1;f.reaction=null;}
   m.fighters.rabbit.action={id:900,actor:'rabbit',move:'guard',guardStyle:'body',start:-1.75,duration:60,attack:false,defend:true};m.setPlayer(null);for(let i=0;i<20;i++)v.step();
   window.__f={v,shot(){v.tick=1e9;e.animTime=m.time;window.fightUI?.render(v);const g=e.arena.group,roots=Object.values(v.coaches).map(k=>k.root.position),mid=roots[0].clone().add(roots[1]).multiplyScalar(.5),axis=roots[1].clone().sub(roots[0]).normalize(),side=new THREE.Vector3(axis.z,0,-axis.x);
    e.camera.zoom=1;e.camera.position.copy(g.localToWorld(mid.clone().addScaledVector(side,-3.0).setY(1.75)));e.camera.lookAt(g.localToWorld(mid.clone().setY(1.55)));e.camera.updateProjectionMatrix();e.world?.update(e.animTime,'fight');e.renderer.render(e.scene,e.camera);}};
   m.attack('lion','cross','head');});
  at=0;for(const k of [fight-6,fight-3,fight,fight+2,fight+6]){await page.evaluate(n=>{for(let i=0;i<n;i++)__f.v.step();__f.shot();},k-at);at=k;
   const file=path.join(out,`${version}-fight-${k-fight}.png`);await page.locator('#boxerCanvas').screenshot({path:file});results.push({version,case:'fight',offset:k-fight,file:path.basename(file)});}
  results.push({version,case:'fight',contactFrame:fight,errors:errors.slice()});console.log(version,'fight cross contact frame',fight);await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'cross-strips.json'),JSON.stringify({base,browser:browser.version(),physicalPhone:false,results},null,1));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
