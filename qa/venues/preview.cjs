// Same production renderer and scene; module injected without changing index.html.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.env.APP_ROOT||path.resolve(__dirname,'../..'),out=process.env.QA_OUT||'/workspace/ringfighter-review/venues-release';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(file===root)file+='/index.html';if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}}).listen(Number(process.env.PORT||8127),'127.0.0.1');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:1000,height:800},deviceScaleFactor:1,bypassCSP:true});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.addInitScript({path:path.join(root,'qa/lion-realism-m0/instrument.js')});await page.addInitScript(()=>M0.paused=true);await page.goto(`http://127.0.0.1:${server.address().port}/?game=classic`);await page.waitForFunction(()=>window.app?.engine?.coach?.anatomy&&window.ringsideLayout);
 if(await page.getByRole('button',{name:'Play as guest',exact:true}).count())await page.getByRole('button',{name:'Play as guest',exact:true}).click();
 if(!await page.evaluate(()=>!!window.GameVenues))await page.addScriptTag({path:path.join(root,'game-venues.js')});
 await page.evaluate(async()=>{await M0.boot();const e=app.engine;e.career=null;e.isPlaying=false;e.fightOptions={seed:74};trainingControls.chooseTarget('fight');e.isPlaying=false;e.arena.group.rotation.y=0;const v=e.arena.fightView;v.match.phase='round';v.match.decide=()=>{};for(const f of Object.values(v.match.fighters)){f.action=null;f.next=Infinity;}v.pose();
  for(const o of M0.observers)o.disconnect();e.stage.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;margin:0;border:0';document.body.append(e.stage);e.canvas.style.cssText='width:100%;height:100%;display:block';for(const child of e.stage.children)if(child!==e.canvas&&!child.contains(e.canvas))child.style.display='none';
 });
 // Export the exact generated signage textures for readable locale inspection.
 if(process.env.SIGNAGE_ONLY==='1'){
  for(const id of ['neon_strip','harbor_dome'])for(const lang of ['en','he','ru']){
   const textures=await page.evaluate(({id,lang})=>{const e=app.engine;GameVenues.apply(e,id,lang);return ['Arena scoreboard','Championship banner'].map(name=>({name,data:e.world.arena.getObjectByName(name).material.map.image.toDataURL('image/png').split(',')[1]}));},{id,lang});
   for(const {name,data}of textures)fs.writeFileSync(path.join(out,`${id}-${lang}-${name==='Arena scoreboard'?'sign':'banner'}.png`),Buffer.from(data,'base64'));
  }
  console.log('PASS exported production signage textures in EN/HE/RU');return;
 }
 // Produce gallery art from this renderer at one shared camera; no production scene changes.
 await page.setViewportSize({width:640,height:380});
 await page.evaluate(()=>{const e=app.engine,v=e.arena.fightView;e.renderer.setPixelRatio(1);e.renderer.setSize(640,380,false);e.camera.aspect=640/380;e.camera.zoom=1;e.camera.position.set(4.1,4.4,9);e.camera.lookAt(new THREE.Vector3(0,1.9,0));e.camera.updateProjectionMatrix();window.venueQAVisibility=[...new Set([...Object.values(v.coaches).map(c=>c.root),v.referee.root,v.audience.root])].map(root=>[root,root.visible]);for(const [root]of venueQAVisibility)root.visible=false;e.world.update(0,'fight');});
 for(const id of ['default','neon_strip','harbor_dome']){await page.evaluate(id=>{const e=app.engine;GameVenues.apply(e,id);e.renderer.render(e.scene,e.camera);},id);await page.locator('#boxerCanvas').screenshot({path:path.join(out,`thumbnail-${id}.png`)});console.log('thumbnail-'+id+'.png');}
 await page.evaluate(()=>{for(const [root,visible]of venueQAVisibility)root.visible=visible;delete window.venueQAVisibility;});
 if(process.env.THUMBNAILS_ONLY==='1')return;
 const frames=[];
 for(const size of [{name:'desktop',width:1000,height:800},{name:'mobile',width:393,height:852}]){
  await page.setViewportSize(size);
  for(const view of ['front','quarter','reverse'])for(const id of ['default','neon_strip','harbor_dome']){
   const result=await page.evaluate(({size,view,id})=>{const e=app.engine;e.renderer.setPixelRatio(1);e.renderer.setSize(size.width,size.height,false);e.camera.aspect=size.width/size.height;e.camera.zoom=1;
    const d=size.name==='mobile'?17.2:8.8,angle=view==='front'?0:view==='quarter'?.63:2.55;e.camera.position.set(Math.sin(angle)*d,size.name==='mobile'?5:3.8,Math.cos(angle)*d);e.camera.lookAt(new THREE.Vector3(0,1.7,0));e.camera.updateProjectionMatrix();e.world.update(0,'fight');
    // Invoke existing visibility logic at identical time/camera for every theme.
    e.arena.fightView.pose();e.arena.group.rotation.y=0;e.world.update(0,'fight');GameVenues.apply(e,id);
    e.renderer.render(e.scene,e.camera);const uploads={...M0.uploads},start=performance.now();for(let i=0;i<1;i++){GameVenues.apply(e,id);e.renderer.render(e.scene,e.camera);}const ms=performance.now()-start;
    const inventory=M0.inventory(e.scene).summary;return {materials:inventory.uniqueMaterials,textureBytes:inventory.textureRGBA8WithMipsEstimate,calls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles,geometries:e.renderer.info.memory.geometries,textures:e.renderer.info.memory.textures,programs:e.renderer.info.programs.length,steadyBufferUploads:M0.uploads.bufferCalls-uploads.bufferCalls,steadyTextureUploads:M0.uploads.textureCalls-uploads.textureCalls,renderSubmissionMs:ms};
   },{size,view,id});
   const name=`${size.name}-${view}-${id}.png`;await page.locator('#boxerCanvas').screenshot({path:path.join(out,name)});frames.push({size:size.name,view,id,file:name,...result});fs.writeFileSync(path.join(out,'frames.json'),JSON.stringify(frames,null,2));console.log(name,result.calls,result.triangles);
  }
 }
 const restoration=await page.evaluate(()=>{const e=app.engine;GameVenues.apply(e,'default');e.renderer.render(e.scene,e.camera);return {camera:e.camera.position.toArray(),memory:{...e.renderer.info.memory},programs:e.renderer.info.programs.length};});
 const restored=await page.locator('#boxerCanvas').screenshot({path:path.join(out,'mobile-reverse-restored.png')});
 assert.deepEqual(restored,fs.readFileSync(path.join(out,'mobile-reverse-default.png')),'return to default restores identical rendered pixels');
 for(const lang of ['he','ru']){await page.evaluate(lang=>{const e=app.engine;GameVenues.apply(e,'neon_strip',lang);e.camera.position.set(0,5,17.2);e.camera.lookAt(new THREE.Vector3(0,2,0));e.world.update(0,'fight');e.renderer.render(e.scene,e.camera);},lang);await page.locator('#boxerCanvas').screenshot({path:path.join(out,`mobile-${lang}.png`)});}
 const stability=await page.evaluate(()=>{const e=app.engine;GameVenues.apply(e,'neon_strip','en');GameVenues.apply(e,'harbor_dome','en');e.renderer.render(e.scene,e.camera);const warm={...e.renderer.info.memory};for(let i=0;i<30;i++){GameVenues.apply(e,['default','neon_strip','harbor_dome'][i%3],['en','he','ru'][Math.floor(i/3)%3]);}GameVenues.apply(e,'neon_strip','en');GameVenues.apply(e,'harbor_dome','en');e.renderer.render(e.scene,e.camera);const settled={...e.renderer.info.memory};GameVenues.dispose(e);e.renderer.render(e.scene,e.camera);return {warm,settled,disposed:{...e.renderer.info.memory}};});
 assert.equal(stability.settled.geometries,stability.warm.geometries);assert.ok(stability.settled.textures<=stability.warm.textures,'theme/locale switching keeps GPU resources bounded');
 const checks=await page.evaluate(()=>{const e=app.engine;return {linked:e.renderer.info.programs.every(p=>e.renderer.getContext().getProgramParameter(p.program,e.renderer.getContext().LINK_STATUS)),environment:M0.environment};});
 assert.deepEqual(errors,[]);assert.ok(checks.linked);for(const f of frames){const baseline=frames.find(b=>b.size===f.size&&b.view===f.view&&b.id==='default');assert.equal(f.calls,baseline.calls);assert.equal(f.triangles,baseline.triangles);assert.equal(f.steadyTextureUploads,0);assert.equal(f.steadyBufferUploads,0);assert.equal(f.geometries,baseline.geometries);}
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({frames,errors,restoration,stability,...checks,physicalPhone:false,note:'Chromium SwiftShader; submission times are not physical phone FPS. Same camera/rig state per theme, no new lights or geometry.'},null,2));console.log('PASS 18 same-camera venue renders plus HE/RU, identical draw/triangle counts and zero steady texture uploads');
 }finally{await browser.close();server.close();}})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
