/* GOTR-0074 evidence: the default guard from the front, 3/4 and the side (the fighter's LEFT side), in shadow
   training and in a fight, plus one jab and one cross frame, for lion and rabbit, in the real app at phone size
   (headless Chromium, software GL). Cameras are placed relative to each fighter's own facing; in the fight the
   opponent and referee are hidden so the pose is unobstructed.
   Usage (repo root, preview on 127.0.0.1:8161): node qa/gotr-0074/renders.cjs ; python3 -I qa/gotr-0074/compose.py */
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const out=path.join(__dirname,'frames'),url=process.env.QA_URL||'http://127.0.0.1:8161/';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:402,height:690}});page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
 await page.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  const e=app.engine,draw=e.renderer.render.bind(e.renderer);e.renderer.render=()=>{};window.__draw=draw;
  const css=document.createElement('style');css.textContent='#stageContainer>*:not(canvas){visibility:hidden!important}';document.head.append(css);
  const views={front:[.15,1.5,3.0],quarter:[-1.9,1.55,2.3],side:[-3.0,1.5,.25]};
  window.__shot=(coach,view,mode,hide=[])=>{const cam=e.camera;for(const n of hide)if(n)n.visible=false;coach.root.updateMatrixWorld(true);const o=coach.root.localToWorld(new THREE.Vector3(0,1.25,.15)),p=coach.root.localToWorld(new THREE.Vector3(...views[view]));
   cam.zoom=1;cam.position.copy(p);cam.lookAt(o);cam.updateProjectionMatrix();e.world?.update(e.animTime,mode);__draw(e.scene,cam);for(const n of hide)if(n)n.visible=true;};
  window.__train=species=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(e.coach.species!==species)e.roster.select(species);ringfighterGame.startTraining({mode:'none',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.isPlaying=false;window.__t=e.animTime;for(let i=0;i<90;i++)__step();};
  window.__step=()=>{window.__t+=1/120;e.animTime=window.__t;return e.arena.update(window.__t,e.technique,e.currentAnim);};});
 const shot=async name=>page.locator('#boxerCanvas').screenshot({path:path.join(out,name+'.png')});
 for(const species of ['lion','rabbit']){
  await page.evaluate(s=>__train(s),species);
  for(const view of ['front','quarter','side']){await page.evaluate(v=>__shot(app.engine.coach,v,'none'),view);await shot(`${species}-shadow-${view}`);}
  for(const move of ['jab','cross']){
   const info=await page.evaluate(move=>{const e=app.engine;e.player.reset();e.player.press(move);let best=0,n=0;for(let i=0;i<60;i++){__step();const c=e.coach,side=move==='jab'?'L':'R',reach=c.point(c.joints['hand'+side]).z;if(reach>best){best=reach;n=i;}else if(i>n+1)break;}__shot(e.coach,'quarter','none');const m=e.coach.metrics;for(let i=0;i<120;i++)__step();return {move:m.move,reach:+best.toFixed(2)};},move);
   await shot(`${species}-shadow-${move}`);console.log(species,move,JSON.stringify(info));
  }
 }
 await page.evaluate(()=>{const e=app.engine;e.career=null;e.fightOptions={preset:'quick',seed:74};trainingControls.chooseTarget('fight');e.isPlaying=false;const v=e.arena.fightView,m=v.match;m.phase='round';m.roundTime=2;m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.reaction=null;}m.setPlayer(null);for(let i=0;i<30;i++)v.step();v.tick=1e9;e.animTime=m.time;window.__v=v;});
 for(const species of ['lion','rabbit'])for(const view of ['front','quarter','side']){await page.evaluate(([s,v])=>__shot(__v.coaches[s],v,'fight',[__v.coaches[s==='lion'?'rabbit':'lion'].root,__v.referee?.root]),[species,view]);await shot(`${species}-fight-${view}`);}
 // Both fighters together, as the game frames them (side on).
 await page.evaluate(()=>{const e=app.engine,v=__v,cam=e.camera,a=v.coaches.lion.root.getWorldPosition(new THREE.Vector3()),b=v.coaches.rabbit.root.getWorldPosition(new THREE.Vector3()),mid=a.clone().add(b).multiplyScalar(.5),axis=b.clone().sub(a).normalize(),side=new THREE.Vector3(axis.z,0,-axis.x);cam.zoom=1;cam.position.copy(mid.clone().addScaledVector(side,3.4).setY(1.6));cam.lookAt(mid.clone().setY(1.3));cam.updateProjectionMatrix();e.world?.update(e.animTime,'fight');__draw(e.scene,cam);});
 await shot('fight-pair');
 console.log('done, errors',errors.length,errors.slice(0,2).join(' | '));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
