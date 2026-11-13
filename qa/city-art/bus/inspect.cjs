// Actual local r128 GLB compatibility/animation/render checks. No game files changed.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8142/qa/city-art/bus/viewer.html');await page.waitForFunction(()=>window.asset?.ready,null,{timeout:90000});
 const report=await page.evaluate(()=>{
  const a=window.asset,r=a.renderer;let triangles=0,meshes=0;const materials=new Set();
  a.model.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;materials.add(o.material.uuid)}});
  const gl=r.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const door=a.model.getObjectByName('Entry_left_door');if(!door)throw Error('No entry hinge');
  a.setDoors(false);a.model.updateMatrixWorld(true);const closed=door.quaternion.toArray();
  a.setDoors(true);a.model.updateMatrixWorld(true);const open=door.quaternion.toArray();
  if(closed.every((x,i)=>Math.abs(x-open[i])<1e-5))throw Error('Door animation did not move its hinge');
  a.setDoors(false);
  const wheel=a.model.getObjectByName('Front_curb_wheel'),action=a.actions.Wheels_one_revolution;
  if(!action)throw Error('No wheel animation');const first=wheel.quaternion.toArray();action.play();action.time=.5;a.mixer.update(0);const rolled=wheel.quaternion.toArray();action.stop();a.mixer.update(0);
  if(first.every((x,i)=>Math.abs(x-rolled[i])<1e-5))throw Error('Wheel did not turn');
  const box=new THREE.Box3().setFromObject(a.model);
  if(Math.abs(box.min.y)>.025)throw Error('Wheel contact not on ground: '+box.min.y);
  a.render();return{three:THREE.REVISION,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),meshNodes:meshes,uniqueMaterials:materials.size,triangles,clips:a.clips.map(c=>({name:c.name,seconds:c.duration,tracks:c.tracks.length})),closedDoor:closed,openDoor:open,bounds:{min:box.min.toArray(),max:box.max.toArray()},render:{...r.info.render},geometryCount:r.info.memory.geometries,textureCount:r.info.memory.textures,physicalPhone:'NOT VERIFIED',environment:'Headless Chromium / software renderer; isolated bus scene, not full game'};
 });
 for(const view of ['front','rear','side','entry']){
  await page.evaluate(v=>{asset.setView(v);asset.setDoors(v==='entry');asset.render()},view);
  await page.screenshot({path:path.join(__dirname,'browser-'+view+'.png')});
 }
 await page.evaluate(()=>{asset.setDoors(false);asset.setView('front');asset.setNight(true);asset.render()});
 await page.screenshot({path:path.join(__dirname,'browser-night.png')});
 await page.evaluate(()=>asset.setNight(false));
 await page.evaluate(async()=>{asset.setView('front');await asset.setBaseline(true)});
 await page.screenshot({path:path.join(__dirname,'baseline-front.png')});
 await page.evaluate(async()=>{await asset.setBaseline(false);asset.setView('front');asset.render()});
 report.frameMs=await page.evaluate(async()=>{
  const times=[];let prev=performance.now();for(let i=0;i<45;i++){await new Promise(requestAnimationFrame);const now=performance.now();asset.render();if(i>=15)times.push(now-prev);prev=now;}
  times.sort((a,b)=>a-b);return{samples:times.length,median:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],note:'warm rAF intervals including software rendering; not physical device performance'};
 });
 await page.setViewportSize({width:393,height:852});
 await page.evaluate(()=>{asset.setView('front');asset.render()});
 await page.screenshot({path:path.join(__dirname,'browser-portrait.png')});
 report.mobileViewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,canvas:[document.querySelector('canvas').clientWidth,document.querySelector('canvas').clientHeight]}));
 report.errors=errors;
 fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));await browser.close();
 if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
