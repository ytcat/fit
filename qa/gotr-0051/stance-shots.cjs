/* GOTR-0051 evidence: the shipped guard, front and side, both species, at the heavy bag and in a fight, in the real
   app (headless Chromium, software GL). The camera is placed relative to each fighter's own facing.
   Usage (repo root, preview on 127.0.0.1:8161): node qa/gotr-0051/stance-shots.cjs ; python3 -I qa/gotr-0051/compose.py */
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const out=path.join(__dirname,'frames'),url=process.env.QA_URL||'http://127.0.0.1:8161/';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:420,height:560}});page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
 await page.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  // Only this script draws: the app's own loop (camera director, intro orbit) must not overwrite the frame.
  const e0=app.engine,draw=e0.renderer.render.bind(e0.renderer);e0.renderer.render=()=>{};window.__draw=draw;
  const css=document.createElement('style');css.textContent='#stageContainer>*:not(canvas){visibility:hidden!important}';document.head.append(css);
  window.__shot=(coach,view,mode,hide=[])=>{const e=app.engine,cam=e.camera;for(const n of hide)if(n)n.visible=false;coach.root.updateMatrixWorld(true);const o=coach.root.localToWorld(new THREE.Vector3(0,1.45,.1)),p=coach.root.localToWorld(view==='front'?new THREE.Vector3(.25,1.6,2.6):new THREE.Vector3(-2.6,1.6,.2));
   cam.zoom=1;cam.position.copy(p);cam.lookAt(o);cam.updateProjectionMatrix();e.world?.update(e.animTime,mode);__draw(e.scene,cam);for(const n of hide)if(n)n.visible=true;};});
 for(const species of ['lion','rabbit']){
  await page.evaluate(species=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(e.coach.species!==species)e.roster.select(species);ringfighterGame.startTraining({mode:'none',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.isPlaying=false;let t=e.animTime;for(let i=0;i<90;i++){t+=1/120;e.animTime=t;e.arena.update(t,e.technique,e.currentAnim);}},species);
  for(const view of ['front','side']){await page.evaluate(v=>__shot(app.engine.coach,v,'none',[]),view);await page.locator('#boxerCanvas').screenshot({path:path.join(out,`shadow-${species}-${view}.png`)});}
 }
 await page.evaluate(()=>{const e=app.engine;e.career=null;e.fightOptions={preset:'quick',seed:74};trainingControls.chooseTarget('fight');e.isPlaying=false;const v=e.arena.fightView,m=v.match;m.phase='round';m.roundTime=2;m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.reaction=null;}m.setPlayer(null);for(let i=0;i<30;i++)v.step();v.tick=1e9;e.animTime=m.time;window.__v=v;});
 for(const species of ['lion','rabbit'])for(const view of ['front','side']){await page.evaluate(([s,v])=>__shot(__v.coaches[s],v,'fight',[__v.coaches[s==='lion'?'rabbit':'lion'].root,__v.referee?.root]),[species,view]);await page.locator('#boxerCanvas').screenshot({path:path.join(out,`fight-${species}-${view}.png`)});}
 console.log('done, errors',errors.length);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
