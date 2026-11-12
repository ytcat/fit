/* GOTR-0064 evidence: lion and rabbit heads, front / three-quarter / side, in shadow training and in a fight, in the
   real app (headless Chromium, software GL) at the phone (402x690) and desktop (1366x768) viewports.
   Each viewport gives a head close-up set and a full-figure set at about the distance of the game cameras.
   The script places its own camera (canvas aspect, no fighter-pad view offset) and reads the frame from the GL canvas.
   Usage (repo root, preview on 127.0.0.1:8264): node qa/gotr-0064/head-shots.cjs <before|after> ; python3 -I qa/gotr-0064/compose.py */
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const tag=process.argv[2]||'after',out=path.join(__dirname,'frames',tag),url=process.env.QA_URL||'http://127.0.0.1:8264/';fs.mkdirSync(out,{recursive:true});
const views=['front','quarter','side'],only=process.env.QA_ONLY,modes=(process.env.QA_MODES||'shadow,fight').split(',');
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 for(const [name,width,height] of [['phone',402,690],['desktop',1366,768]]){if(only&&only!==name)continue;
 const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
 await page.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  // Only this script draws: the app's own loop (camera director, intro orbit) must not overwrite the frame.
  const e0=app.engine,draw=e0.renderer.render.bind(e0.renderer);e0.renderer.render=()=>{};window.__draw=draw;
  const css=document.createElement('style');css.textContent='#stageContainer>*:not(canvas){visibility:hidden!important}';document.head.append(css);
  window.__shot=(coach,view,mode,close,hide=[])=>{const e=app.engine,cam=e.camera;for(const n of hide)if(n)n.visible=false;coach.root.updateMatrixWorld(true);
   const head=coach.joints.head.getWorldPosition(new THREE.Vector3()),o=close?head.clone().add(new THREE.Vector3(0,.10,0)):coach.root.localToWorld(new THREE.Vector3(0,1.25,.1));
   const q=coach.root.getWorldQuaternion(new THREE.Quaternion()),d=(view==='front'?new THREE.Vector3(.08,.05,1):view==='quarter'?new THREE.Vector3(-.75,.08,.75):new THREE.Vector3(-1,.05,.06)).normalize().applyQuaternion(q);
   const canvas=e.renderer.domElement,aspect=cam.aspect=canvas.width/canvas.height;if(cam.view)cam.clearViewOffset();const dist=close?(aspect<1?1.7:1.25):(aspect<1?6.2:3.9);
   cam.zoom=1;cam.position.copy(o).addScaledVector(d,dist);cam.lookAt(o);cam.updateProjectionMatrix();cam.updateMatrixWorld(true);e.world?.update(e.animTime,mode);__draw(e.scene,cam);window.__frame=e.renderer.domElement.toDataURL('image/png');for(const n of hide)if(n)n.visible=true;};});
 // Read the frame straight from the GL canvas, so no menu or overlay of the page can cover it.
 const snap=async file=>fs.writeFileSync(path.join(out,file),Buffer.from((await page.evaluate(()=>window.__frame)).split(',')[1],'base64'));
 if(modes.includes('shadow'))for(const species of ['lion','rabbit']){
  await page.evaluate(species=>{const e=app.engine;if(e.coach.species!==species)e.roster.select(species);},species);await page.waitForTimeout(2500);
  await page.evaluate(species=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.startTraining({mode:'none',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.isPlaying=false;let t=e.animTime;for(let i=0;i<90;i++){t+=1/120;e.animTime=t;e.arena.update(t,e.technique,e.currentAnim);}},species);
  for(const view of views)for(const close of [1,0]){await page.evaluate(([v,c])=>__shot(app.engine.coach,v,'none',c,[]),[view,close]);await snap(`${name}-shadow-${species}-${view}-${close?'head':'full'}.png`);}
 }
 if(modes.includes('fight')){
 await page.evaluate(()=>{const e=app.engine;e.career=null;e.fightOptions={preset:'quick',seed:74};trainingControls.chooseTarget('fight');e.isPlaying=false;const v=e.arena.fightView,m=v.match;m.phase='round';m.roundTime=2;m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.reaction=null;}m.setPlayer(null);for(let i=0;i<30;i++)v.step();v.tick=1e9;e.animTime=m.time;window.__v=v;});
 for(const species of ['lion','rabbit'])for(const view of views)for(const close of [1,0]){await page.evaluate(([s,v,c])=>__shot(__v.coaches[s],v,'fight',c,[__v.coaches[s==='lion'?'rabbit':'lion'].root,__v.referee?.root]),[species,view,close]);await snap(`${name}-fight-${species}-${view}-${close?'head':'full'}.png`);}
 }
 console.log(name,'done, errors',errors.length,errors.slice(0,3));await page.close();}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
