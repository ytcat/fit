/* GOTR-0024 / GOTR-0025 evidence: matched before/after frame strips from the
   real app (headless Chromium, software WebGL). "before" serves the base
   commit's punch files; "after" is this branch. Staged fight, seed 74.
   - cross and hook to an open head: frames at -2,-1,0,+2,+5,+12 frames
     (60 Hz) around the contact frame;
   - player one-two combination: frames every 0.15 s from the press.
   Usage: node qa/gotr-0024/render.cjs  (preview on 127.0.0.1:8151)
   Not a physical-phone check. */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=__dirname,url=process.env.QA_URL||'http://127.0.0.1:8151/',base=process.env.QA_BASE||'031f8a6';
const files=['fight-arena.js','boxing-coach-v2.js','boxing-routines.js','boxing-input.js'],old=Object.fromEntries(files.map(f=>[f,execFileSync('git',['show',base+':'+f],{cwd:root,encoding:'utf8',maxBuffer:1<<26})]));
const shotsDir=path.join(out,'frames');fs.mkdirSync(shotsDir,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),results=[];try{
 for(const version of ['before','after']){
  const page=await browser.newPage({viewport:{width:640,height:560}});page.setDefaultTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(version==='before')for(const f of files)await page.route('**/'+f+'*',r=>r.fulfill({contentType:'text/javascript',body:old[f]}));
  await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:240000});
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   window.__pf={
    stage(){const e=app.engine,career=e.career;e.career=null;e.fightOptions={preset:'quick',seed:74};trainingControls.chooseTarget('fight');e.career=career;e.isPlaying=false;
     const v=e.arena.fightView,m=v.match;m.phase='round';m.roundTime=2;m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.tempo=1;f.stamina=1;f.reaction=null;}
     m.fighters.rabbit.action={id:900,actor:'rabbit',move:'guard',guardStyle:'body',start:-1.75,duration:60,attack:false,defend:true};m.setPlayer(null);for(let i=0;i<20;i++)v.step();return v;},
    render(v){const e=app.engine,m=v.match;v.tick=1e9;e.animTime=m.time;window.fightUI?.render(v);e.camera.zoom=1;
     const g=e.arena.group,roots=Object.values(v.coaches).map(k=>k.root.position),mid=roots[0].clone().add(roots[1]).multiplyScalar(.5),axis=roots[1].clone().sub(roots[0]).normalize(),sideways=new THREE.Vector3(axis.z,0,-axis.x);
     e.camera.position.copy(g.localToWorld(mid.clone().addScaledVector(sideways,-3.0).setY(1.75)));e.camera.lookAt(g.localToWorld(mid.clone().setY(1.55)));e.camera.updateProjectionMatrix();e.world?.update(e.animTime,'fight');e.renderer.render(e.scene,e.camera);}
   };});
  for(const move of ['cross','hook']){
   const n=await page.evaluate(move=>{const v=__pf.stage(),m=v.match;m.attack('lion',move,'head');for(let i=1;i<=70;i++){v.step();if(v.contacts.find(c=>c.actor==='lion'))return i;}return null;},move);
   const offsets=[-2,-1,0,2,5,12];
   await page.evaluate(()=>{window.__pfv=__pf.stage();});
   await page.evaluate(move=>__pfv.match.attack('lion',move,'head'),move);
   let at=0;
   for(const k of offsets){const target=n+k;const info=await page.evaluate(steps=>{const v=__pfv;for(let i=0;i<steps;i++)v.step();__pf.render(v);return {t:+v.match.time.toFixed(3)};},target-at);at=target;
    const file=path.join(shotsDir,`${version}-${move}-${k>=0?'+':''}${k}.png`);await page.locator('#boxerCanvas').screenshot({path:file});results.push({version,move,contactFrame:n,offset:k,...info,file:path.basename(file)});}
   console.log(version,move,'contact frame',n,'=',(n/60).toFixed(3),'s');
  }
  // One-two combination from the player's input (Play), frames every 0.15 s.
  await page.evaluate(()=>{window.__pfv=__pf.stage();const m=__pfv.match;m.setPlayer('lion');const combo={id:'combo_one_two',total:2};m.requestPlayerCombo([{move:'jab',attack:true,input:'jab',duration:.54,combo:{...combo,step:1}},{move:'cross',attack:true,input:'cross',duration:.64,combo:{...combo,step:2}}],'combo_one_two');});
  for(let i=0;i<8;i++){const info=await page.evaluate(()=>{const v=__pfv;for(let s=0;s<9;s++)v.step();__pf.render(v);const a=v.match.fighters.lion.action;return {move:a?.move||'guard'};});
   const file=path.join(shotsDir,`${version}-onetwo-${i}.png`);await page.locator('#boxerCanvas').screenshot({path:file});results.push({version,combo:'one_two',index:i,t:+((i+1)*.15).toFixed(2),...info,file:path.basename(file)});}
  results.push({version,errors:errors.slice()});console.log(version,'errors',errors.length);
  await page.close();
 }
 fs.writeFileSync(path.join(out,'render-results.json'),JSON.stringify({base,browser:browser.version(),physicalPhone:false,results},null,1));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
