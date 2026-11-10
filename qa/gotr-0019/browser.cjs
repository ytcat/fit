/* GOTR-0019 side-view camera lock, in the real app. The numeric part runs the app's own loop with
   drawing stubbed out (software WebGL needs seconds per frame). Real renders: qa/gotr-0019/shots.cjs.
   Usage: node qa/gotr-0019/browser.cjs [phone|land|desk]   (APP_URL, default http://127.0.0.1:8145) */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const URL=process.env.APP_URL||'http://127.0.0.1:8145',OUT=path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});
const VIEWS={phone:{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true},land:{viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true},desk:{viewport:{width:1366,height:768},deviceScaleFactor:1}};
const ready=p=>p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:240000});
// Runs in the page: follow the live loop for `seconds` and report framing of both subjects every frame.
const watch=async({seconds,settle})=>{
 const e=app.engine,c=e.camera,v=new THREE.Vector3(),rows=[];let frames=0,scored=0,worst=0,side=0,height=[1e9,-1e9],phases=new Set(),last=null,jerk=0,velocity=null,stamp=0,current='',changed=0;
 const subjects=()=>{const a=e.arena,f=a.mode==='fight'&&a.fightView;return f?[f.coaches.lion,f.coaches.rabbit]:[e.coach,a.careerDrill&&a.careerDrill.trainer||a.models[a.mode]];};
 await new Promise((done,fail)=>{const start=performance.now(),tick=now=>{try{
  const t=(performance.now()-start)/1000,[a,b]=subjects(),pa=a.root.getWorldPosition(new THREE.Vector3()),pb=(b.root||b).getWorldPosition(new THREE.Vector3());
  const phase=e.arena.fightView?e.arena.fightView.match.phase:'training';phases.add(phase);if(phase!==current){current=phase;changed=t;}
  // The bout itself is scored; between phases the fighters are re-placed in one step and the camera eases over.
  if(t>=settle&&t-changed>=1.5&&(phase==='round'||phase==='training')){scored++;
   c.updateMatrixWorld(true);c.matrixWorldInverse.copy(c.matrixWorld).invert();
   // Head and gloves of each boxer (or the top of the equipment) and the floor under them.
   const marks=[pa.clone().setY(0),pb.clone().setY(0)];for(const s of [a,b]){if(s.joints)for(const key of ['head','handL','handR'])if(s.joints[key])marks.push(s.joints[key].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,key==='head'?.32:0,0)));else marks.push((s.root||s).getWorldPosition(new THREE.Vector3()).setY(2.3));}
   for(const m of marks){v.copy(m).project(c);worst=Math.max(worst,Math.abs(v.x),Math.abs(v.y));}
   const mid=pa.clone().add(pb).multiplyScalar(.5),d=pb.clone().sub(pa).setY(0),o=c.position.clone().sub(mid).setY(0);if(d.length()>.4)side=Math.max(side,Math.abs(o.normalize().dot(d.normalize())));
   height[0]=Math.min(height[0],c.position.y);height[1]=Math.max(height[1],c.position.y);
   // Camera velocity from display timestamps: a smooth camera changes speed gradually, whatever the frame rate.
   if(last&&velocity&&now-stamp>0&&now-stamp<=50){const next=c.position.clone().sub(last).multiplyScalar(1000/(now-stamp));jerk=Math.max(jerk,next.distanceTo(velocity));}
  }
  velocity=last&&now-stamp>0&&now-stamp<=50?c.position.clone().sub(last).multiplyScalar(1000/(now-stamp)):null;stamp=now;last=c.position.clone();frames++;if(t<seconds)requestAnimationFrame(tick);else done();}catch(error){fail(error);}};requestAnimationFrame(tick);});
 return {frames,scoredFrames:scored,worstEdge:+worst.toFixed(3),sideError:+side.toFixed(3),sideDegrees:+(Math.asin(Math.min(1,side))*180/Math.PI).toFixed(1),cameraHeight:height.map(n=>+n.toFixed(4)),maxSpeedChangePerFrame:+jerk.toFixed(3),phases:[...phases],mode:e.cameraDirector.mode,zoom:+c.zoom.toFixed(3)};
};
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),only=process.argv[2],report={};
 for(const [name,view] of Object.entries(VIEWS)){
  if(only&&only!==name)continue;
  const context=await browser.newContext(view),page=await context.newPage(),errors=[];page.on('pageerror',x=>{errors.push(x.message);console.log('pageerror',x.message);});page.setDefaultTimeout(90000);const step=text=>console.log(name,new Date().toISOString().slice(11,19),text);
  // Reduced motion removes the fight intro here; the intro has its own script in qa/gotr-0020.
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(URL);await ready(page);
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.engine.renderer.render=()=>{};app.engine.updateQuality=()=>{};});
  const r=report[name]={};
  // One labelled toggle, in three languages.
  r.labels={};for(const lang of ['en','he','ru']){await page.evaluate(l=>app.setLanguage(l),lang);await page.waitForTimeout(250);r.labels[lang]=await page.evaluate(()=>{const b=document.getElementById('camLock'),box=b.getBoundingClientRect(),stage=document.getElementById('stageContainer').getBoundingClientRect();return {text:b.textContent.trim(),aria:b.getAttribute('aria-label'),pressed:b.getAttribute('aria-pressed'),box:[box.left,box.top,box.width,box.height].map(Math.round),inside:box.left>=stage.left&&box.right<=stage.right&&box.top>=stage.top&&box.bottom<=stage.bottom,fits:b.scrollWidth<=b.clientWidth+1,count:document.querySelectorAll('#camLock').length};});}
  assert.deepEqual([r.labels.en.text,r.labels.he.text,r.labels.ru.text],['Side lock','נעילת צד','Вид сбоку']);for(const l of Object.values(r.labels)){assert.equal(l.pressed,'false');assert.ok(l.inside&&l.fits&&l.count===1&&l.box[2]>=44&&l.box[3]>=44,JSON.stringify(l));}
  await page.evaluate(()=>app.setLanguage('en'));
  step('labels ok');
  // Gestures at a training station (no overlays): the same drag orbits when free and does nothing when locked.
  await page.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  const box=await page.locator('#boxerCanvas').boundingBox(),cx=box.x+box.width*.3,cy=box.y+box.height*.45;
  const pose=()=>page.evaluate(()=>({yaw:app.engine.viewControls.yaw,zoom:app.engine.camera.zoom,mode:app.engine.cameraDirector.mode,camera:app.engine.camera.position.toArray()}));
  const drag=async()=>{await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+120,cy+60,{steps:6});await page.mouse.up();await page.waitForTimeout(150);};
  const g0=await pose();await drag();const g1=await pose();assert.ok(Math.abs(g1.yaw-g0.yaw)>.5,'sanity: a drag orbits the free camera');
  await page.click('#camLock');assert.equal(await page.getAttribute('#camLock','aria-pressed'),'true');await page.waitForTimeout(3000);
  const g2=await pose();await drag();const g3=await pose();assert.equal(g3.yaw,g2.yaw,'orbit drag ignored while locked');assert.ok(Math.hypot(...g3.camera.map((n,i)=>n-g2.camera[i]))<.02,'camera does not move on a drag while locked');
  await page.mouse.move(cx,cy);await page.mouse.wheel(0,-300);await page.waitForTimeout(300);const g4=await pose();assert.ok(g4.zoom>1.1&&g4.zoom<=1.85,'wheel zoom works while locked: '+g4.zoom);
  await page.mouse.wheel(0,5000);await page.waitForTimeout(300);const g5=await pose();assert.ok(Math.abs(g5.zoom-.55)<1e-6,'zoom-out limit while locked: '+g5.zoom);
  r.gestures={freeDragYaw:+(g1.yaw-g0.yaw).toFixed(3),lockedDragYaw:g3.yaw-g2.yaw,wheelZoom:+g4.zoom.toFixed(3),zoomOutLimit:g5.zoom};
  await page.evaluate(()=>{app.engine.viewControls.zoom(1/app.engine.camera.zoom);});
  step('gestures ok');
  // Fight with the lock on: follow the whole 20-second bout.
  await page.evaluate(()=>{ringfighterGame.startFight({seed:20261110,watch:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  assert.equal(await page.getAttribute('#camLock','aria-pressed'),'true','lock survives entering a fight');
  r.fight=await page.evaluate(watch,{seconds:26,settle:2.5});
  step('fight watched');
  // Station change and pause keep the lock; then a mitt session.
  await page.evaluate(()=>{ringfighterGame.startTraining({mode:'pads'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  assert.equal(await page.getAttribute('#camLock','aria-pressed'),'true','lock survives a station change');
  r.mitts=await page.evaluate(watch,{seconds:15,settle:2.5});
  await page.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());});r.heavy=await page.evaluate(watch,{seconds:8,settle:2.5});
  await page.evaluate(()=>{app.engine.isPlaying=false;});await page.waitForTimeout(600);r.paused=await page.evaluate(()=>({mode:app.engine.cameraDirector.mode,pressed:document.getElementById('camLock').getAttribute('aria-pressed')}));assert.deepEqual(r.paused,{mode:'lock',pressed:'true'});
  for(const key of ['fight','mitts','heavy']){const m=r[key];assert.ok(m.worstEdge<1,key+' subjects leave the frame: '+m.worstEdge);assert.ok(m.scoredFrames>200,key+' scored frames: '+m.scoredFrames);assert.ok(m.sideError<.26,key+' not side-on: '+m.sideDegrees+' deg');assert.ok(m.cameraHeight[1]-m.cameraHeight[0]<(key==='fight'&&name==='phone'?1.2:.005),key+' camera height moved: '+m.cameraHeight);assert.equal(m.mode,'lock');}
  assert.ok(r.fight.phases.includes('round'),'the bout was fought');
  step('stations ok');
  // Unlock: the previous free camera returns.
  await page.evaluate(()=>{app.engine.isPlaying=true;ringfighterGame.startFight({seed:20261110,watch:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());});await page.waitForTimeout(1500);
  await page.click('#camLock');await page.waitForTimeout(2500);
  r.unlocked=await page.evaluate(()=>({mode:app.engine.cameraDirector.mode,pressed:document.getElementById('camLock').getAttribute('aria-pressed'),camera:app.engine.camera.position.toArray().map(n=>+n.toFixed(3)),zoom:app.engine.camera.zoom}));
  assert.equal(r.unlocked.mode,'free');assert.equal(r.unlocked.pressed,'false');r.free=await page.evaluate(()=>{const v=app.engine.viewControls;return v.target.clone().add(v.offset.clone().applyAxisAngle(new THREE.Vector3(0,1,0),v.yaw)).toArray().map(n=>+n.toFixed(3));});assert.deepEqual(r.unlocked.camera,r.free,'free fight camera restored');
  assert.deepEqual(errors,[]);console.log(name,JSON.stringify(r));await context.close();
 }
 fs.writeFileSync(path.join(OUT,'lock'+(only?'-'+only:'')+'.json'),JSON.stringify(report,null,1));await browser.close();console.log('SIDE LOCK ASSERTIONS PASSED');
})().catch(x=>{console.error('FAIL',x.message||x);process.exit(1);});
