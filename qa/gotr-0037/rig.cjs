/* GOTR-0037 shared QA rig: open the app (or reuse a CDP browser) and render the fighter with a
   fixed camera relative to the rig, so before/after shots match exactly (same camera, same lights).
   CDP=http://127.0.0.1:9337 reuses an already running Chrome; otherwise one headless browser is launched. */
const {chromium}=require('playwright');
const POSES={guard:[0,'guard'],jab:[.525,'jab'],hook:[.55,'hook'],uppercut:[.55,'uppercut'],tpose:[0,'tpose']};
// [distance, camera height, target height (m above hips, rig scale), yaw from the rig's front]
const VIEWS={front:[3,.35,.30,0],q34:[3,.35,.30,.75],side:[3,.35,.30,Math.PI/2],back:[3,.35,.30,Math.PI],
 torso:[2.1,.50,.40,0],torso34:[2.1,.50,.40,.6],backclose:[2.1,.55,.42,Math.PI],arm:[1.9,.60,.52,1.15],shoulder:[1.6,.62,.55,-1.35],legs:[2.0,-.15,-.30,Math.PI-.5],
 atlasfront:[3.9,.25,.02,0],atlasback:[3.9,.25,.02,Math.PI],atlas34:[3.9,.25,.02,Math.PI-.8]};
async function open(url,viewport={width:1100,height:800}){
 let browser,page;
 if(process.env.CDP){browser=await chromium.connectOverCDP(process.env.CDP);const ctx=browser.contexts()[0]||await browser.newContext();page=await ctx.newPage();await page.setViewportSize(viewport);}
 else{browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});page=await browser.newPage({viewport});}
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{timeout:300000});await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
 await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.engine.qualityLock=5;app.engine.updateQuality?.(0);});
 return {browser,page,errors,async close(){if(process.env.CDP)await page.close();else await browser.close();}};
}
// rig: 'fighter' (app.engine.coach) or, in a fight, 'lion'/'rabbit'. pose null keeps the live pose.
async function shoot(page,{rig='fighter',pose='guard',view='front',size=640}){
 const url=await page.evaluate(({rig,pose,view,size,POSES,VIEWS})=>{
  const e=app.engine,c=rig==='fighter'?e.coach:e.arena.fightView.coaches[rig];e.isPlaying=false;
  if(pose==='tpose'){for(const b of c.bones)b.quaternion.identity();c.syncSkin();}
  else if(pose){const [t,move]=POSES[pose];c.update(t,move,'one_two',{simulationTime:t});}
  c.root.updateMatrixWorld(true);
  const q=c.root.getWorldQuaternion(new THREE.Quaternion()),base=c.joints.hips.getWorldPosition(new THREE.Vector3()),s=c.root.getWorldScale(new THREE.Vector3()).y;
  const fwd=new THREE.Vector3(0,0,1).applyQuaternion(q);fwd.y=0;fwd.normalize();const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),fwd).normalize();
  const [dist,h,tgtY,a]=VIEWS[view],dir=fwd.clone().multiplyScalar(Math.cos(a)).addScaledVector(right,Math.sin(a));
  const target=base.clone().add(new THREE.Vector3(0,tgtY*s,0)),cam=new THREE.PerspectiveCamera(dist>2.5?34:30,1,.05,60);
  cam.position.copy(target).addScaledVector(dir,dist*s).add(new THREE.Vector3(0,(h-tgtY+.1)*s,0));cam.lookAt(target);cam.updateMatrixWorld();
  const r=e.renderer,old=r.getSize(new THREE.Vector2()),pr=r.getPixelRatio();r.setPixelRatio(1);r.setSize(size,size,false);
  r.render(e.scene,cam);const out=r.domElement.toDataURL('image/png');r.setPixelRatio(pr);r.setSize(old.x,old.y,false);e.lastRenderStamp=null;
  window.__qaCamera=cam;return out;
 },{rig,pose,view,size,POSES,VIEWS});
 return Buffer.from(url.split(',')[1],'base64');
}
module.exports={open,shoot,POSES,VIEWS};
