/* GOTR-0020 fight intro orbit, in the real app. The numeric part runs the app's own loop with drawing
   stubbed out (software WebGL needs seconds per frame). Real renders: qa/gotr-0019/shots.cjs.
   Usage: node qa/gotr-0020/browser.cjs [phone|land|desk]   (APP_URL, default http://127.0.0.1:8145) */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const URL=process.env.APP_URL||'http://127.0.0.1:8145',OUT=path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});
const VIEWS={phone:{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true},land:{viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true},desk:{viewport:{width:1366,height:768},deviceScaleFactor:1}};
const ready=p=>p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:240000});
// Runs in the page: start a seeded watch bout and record the camera and the match every frame.
const bout=async({seconds,tapAt,venue})=>{
 const e=app.engine,c=e.camera;document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.renderer.render=()=>{};e.updateQuality=()=>{};
 ringfighterGame.startFight({seed:20261110,watch:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(venue&&window.GameVenues)GameVenues.apply(e,venue,app.lang);
 const match=e.arena.fightView.match,v=e.viewControls,hint=document.querySelector('.camera-intro-skip'),box=new THREE.Box3(),m=new THREE.Matrix4(),inside=new Set();
 const out={turned:0,introSeconds:null,heldSeconds:0,bellAt:null,clockAtBell:null,maxStep:0,minRadius:1e9,maxRadius:0,maxHeight:0,minHeight:1e9,hintShown:false,hintText:hint.textContent,tapped:null,frames:0};
 let angle=null,last=null,wasIntro=false,tapped=false;
 await new Promise((done,fail)=>{const start=performance.now(),tick=()=>{try{
  const t=(performance.now()-start)/1000,d=e.cameraDirector,intro=d.mode==='intro',a=Math.atan2(c.position.x,c.position.z),r=Math.hypot(c.position.x,c.position.z);out.frames++;
  if(intro){wasIntro=true;if(!hint.hidden)out.hintShown=true;if(match.time===0)out.heldSeconds=t;
   if(angle!==null){let step=a-angle;step-=Math.round(step/(2*Math.PI))*2*Math.PI;out.turned+=step;}
   out.minRadius=Math.min(out.minRadius,r);out.maxRadius=Math.max(out.maxRadius,r);out.maxHeight=Math.max(out.maxHeight,c.position.y);out.minHeight=Math.min(out.minHeight,c.position.y);
   // Is the camera inside any visible solid? (Instanced fixtures are checked per instance.)
   if(out.frames%4===0)e.scene.traverseVisible(n=>{if(!n.isMesh||n.isSkinnedMesh||!n.geometry||n.geometry.type==='PlaneGeometry')return;if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();const count=n.isInstancedMesh?n.count:1;for(let i=0;i<count;i++){if(n.isInstancedMesh){n.getMatrixAt(i,m);m.premultiply(n.matrixWorld);}else m.copy(n.matrixWorld);box.copy(n.geometry.boundingBox).applyMatrix4(m);if(box.containsPoint(c.position)&&box.getSize(new THREE.Vector3()).length()<30)inside.add(n.name||n.type);}});
  }else if(wasIntro&&out.introSeconds===null){out.introSeconds=t;out.endGap=c.position.distanceTo(v.target.clone().add(v.offset.clone().applyAxisAngle(new THREE.Vector3(0,1,0),v.yaw)));out.endStep=last?c.position.distanceTo(last):null;}
  if(last&&(intro||wasIntro&&t<(out.introSeconds||0)+.5))out.maxStep=Math.max(out.maxStep,c.position.distanceTo(last));
  if(out.bellAt===null&&match.phase==='round'){out.bellAt=t;out.clockAtBell=match.snapshot().remaining;out.simSecondsBeforeBell=+(match.time-match.phaseTime).toFixed(6);}
  if(tapAt&&!tapped&&t>=tapAt){tapped=true;const rect=e.canvas.getBoundingClientRect();out.tapped={at:t,mode:d.mode};e.canvas.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,isPrimary:true,pointerType:'touch',clientX:rect.left+rect.width/2,clientY:rect.top+rect.height*.6,bubbles:true,cancelable:true}));e.canvas.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,isPrimary:true,pointerType:'touch',bubbles:true}));out.tapped.after=d.mode;out.tapped.held=d.holdsClock;}
  angle=a;last=c.position.clone();
  if(t<seconds&&!match.result)requestAnimationFrame(tick);else done();}catch(error){fail(error);}};requestAnimationFrame(tick);});
 const s=match.snapshot();
 return {...out,turnedDegrees:Math.round(Math.abs(out.turned)*180/Math.PI),insideSolids:[...inside],result:match.result?JSON.stringify(match.result):null,totals:JSON.stringify(match.totals),endTime:+match.time.toFixed(3),yaw:v.yaw,mode:e.cameraDirector.mode,phase:s.phase};
};
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),only=process.argv[2],report={};
 for(const [name,view] of Object.entries(VIEWS)){
  if(only&&only!==name)continue;
  const context=await browser.newContext(view),page=await context.newPage(),errors=[];page.on('pageerror',x=>{errors.push(x.message);console.log('pageerror',x.message);});page.setDefaultTimeout(90000);
  await page.goto(URL);await ready(page);const r=report[name]={};
  // 1. The full intro, then the whole bout.
  r.full=await page.evaluate(bout,{seconds:45});
  assert.ok(Math.abs(r.full.turnedDegrees-360)<=12,'one full turn: '+r.full.turnedDegrees);assert.ok(r.full.introSeconds>4&&r.full.introSeconds<6.5,'about 4-6 s: '+r.full.introSeconds);
  assert.ok(r.full.endGap<1e-6,'ends exactly on the fight framing: '+r.full.endGap);assert.ok(r.full.endStep<.02,'no jump on the last frame: '+r.full.endStep);assert.ok(r.full.maxStep<.9,'no jump during the orbit: '+r.full.maxStep);
  assert.ok(Math.abs(r.full.bellAt-r.full.introSeconds)<.35,'the bell meets the final framing: bell '+r.full.bellAt+' intro '+r.full.introSeconds);assert.ok(r.full.clockAtBell>19.9,'the round clock is untouched at the bell: '+r.full.clockAtBell);
  assert.deepEqual(r.full.insideSolids,[],'camera never inside arena geometry');assert.ok(r.full.minRadius>3&&r.full.minHeight>=1.8,'outside the ring, above the seats');assert.ok(r.full.hintShown,'skip hint shown');assert.ok(r.full.result,'the bout finished');assert.equal(r.full.mode,'free');
  // 2. Reduced motion: no orbit. The intro must cost the bout nothing: the same simulated countdown before
  // the bell, the same full round clock, the same simulated bout length. (Results of two runs are NOT
  // compared: a seeded bout already differs from run to run in the build before this change.)
  await page.emulateMedia({reducedMotion:'reduce'});r.reduced=await page.evaluate(bout,{seconds:45});await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(r.reduced.introSeconds,null,'no orbit for reduced motion');assert.equal(r.reduced.turnedDegrees,0);assert.ok(Math.abs(r.reduced.simSecondsBeforeBell-3)<.02,'the match countdown is three simulated seconds: '+r.reduced.simSecondsBeforeBell);assert.equal(r.full.simSecondsBeforeBell,r.reduced.simSecondsBeforeBell,'the same simulated countdown with the intro');assert.ok(r.reduced.clockAtBell>19.9);assert.equal(r.reduced.endTime,r.full.endTime,'identical simulated bout length: '+r.full.endTime);
  // 3. Tap to skip one second in.
  r.skip=await page.evaluate(bout,{seconds:9,tapAt:1});
  assert.equal(r.skip.tapped.mode,'intro');assert.notEqual(r.skip.tapped.after,'intro','a tap ends the intro');assert.equal(r.skip.tapped.held,false,'the clock is released at once');assert.ok(r.skip.introSeconds<1.4,'skipped at '+r.skip.introSeconds);assert.ok(r.skip.bellAt>3.7&&r.skip.bellAt<4.9,'the normal 3 s countdown follows a skip: bell at '+r.skip.bellAt);assert.ok(r.skip.clockAtBell>19.9);assert.ok(r.skip.maxStep<.9,'skip does not cut: '+r.skip.maxStep);
  // 4. Side lock on: the intro ends in the locked side view.
  await page.evaluate(()=>app.engine.cameraDirector.setLock(true));r.locked=await page.evaluate(bout,{seconds:8});await page.evaluate(()=>app.engine.cameraDirector.setLock(false,true));
  assert.ok(Math.abs(r.locked.turnedDegrees-360)<=40,'a turn with the lock on: '+r.locked.turnedDegrees);assert.equal(r.locked.mode,'lock','ends locked');assert.ok(r.locked.endStep<.05,'no jump into the locked view: '+r.locked.endStep);assert.deepEqual(r.locked.insideSolids,[]);
  // 5. Every arena style, and the hint in three languages.
  r.venues={};for(const venue of await page.evaluate(()=>window.GameVenues?GameVenues.catalog.map(v=>v.id):['default'])){const v=await page.evaluate(bout,{seconds:6.5,venue});r.venues[venue]={turnedDegrees:v.turnedDegrees,introSeconds:+v.introSeconds.toFixed(2),endGap:v.endGap,insideSolids:v.insideSolids};assert.ok(Math.abs(v.turnedDegrees-360)<=12&&v.endGap<1e-6&&!v.insideSolids.length,venue+' '+JSON.stringify(r.venues[venue]));}
  r.hints={};for(const lang of ['en','he','ru']){await page.evaluate(l=>app.setLanguage(l),lang);await page.waitForTimeout(300);r.hints[lang]=await page.evaluate(()=>document.querySelector('.camera-intro-skip').textContent);}assert.deepEqual(r.hints,{en:'Tap to skip',he:'הקישו לדילוג',ru:'Нажмите, чтобы пропустить'});
  for(const k of ['full','reduced','skip','locked'])for(const drop of ['totals','result'])delete r[k][drop];
  assert.deepEqual(errors,[]);console.log(name,JSON.stringify(r));await context.close();
 }
 fs.writeFileSync(path.join(OUT,'intro'+(only?'-'+only:'')+'.json'),JSON.stringify(report,null,1));await browser.close();console.log('FIGHT INTRO ASSERTIONS PASSED');
})().catch(x=>{console.error('FAIL',x.message||x);process.exit(1);});
