// QA only. No application source, saved settings, repo history or live app edits.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.env.M0_OUT||'/workspace/lion-realism-evidence/280775e');
const action=process.argv[2]||'smoke',frames=Number(process.env.M0_FRAMES||120),warmup=Number(process.env.M0_WARMUP||30);
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(file.endsWith('/'))file+='index.html';if(!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}try{const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wav':'audio/wav','.svg':'image/svg+xml'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}}).listen(0,'127.0.0.1');
const write=(p,data)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n');};
const profiles=[{id:'desktop',viewport:{width:1100,height:950},deviceScaleFactor:1},{id:'phone',viewport:{width:393,height:852},deviceScaleFactor:2,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}];
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--enable-precise-memory-info']});
async function load(profile,video=false){
 const context=await browser.newContext({...profile,id:undefined,bypassCSP:true,...(video?{recordVideo:{dir:path.join(out,'video'),size:{width:720,height:900}}}:{})});const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.setDefaultTimeout(120000);
 await page.addInitScript({path:path.join(__dirname,'instrument.js')});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.app?.engine?.coach?.anatomy);
 await page.evaluate(()=>{M0.readyObservedMs=performance.now();});const setup=await page.evaluate(()=>M0.boot());
 await page.locator('#stageSound').click();await page.waitForFunction(()=>app.audio.ctx?.state==='running'&&app.audio.samples.size===10);
 return {context,page,errors,setup};
}
try{
 if(action==='smoke'){
  const {context,page,errors,setup}=await load(profiles[0]);const config=await page.evaluate(()=>M0.configure('idle'));const inventory=await page.evaluate(()=>M0.inventory(app.engine.coach.root));const sample=await page.evaluate(()=>M0.sample(5,3));
  write(path.join(out,'smoke.json'),{setup,config,inventory,sample,errors});await page.addScriptTag({path:path.join(__dirname,'studio.js')});await page.evaluate(()=>{M0.studio();M0.style('textured','neutral');M0.pose({crop:'face'});});const debug=await page.evaluate(()=>{const e=app.engine,c=e.renderer.domElement;e.renderer.render(e.scene,e.camera);return {png:c.toDataURL(),css:getComputedStyle(c).cssText,rect:c.getBoundingClientRect().toJSON(),visible:getComputedStyle(c).visibility,display:getComputedStyle(c).display,counts:e.renderer.info.render,camera:e.camera.position.toArray(),nodes:e.scene.children.map(n=>({type:n.type,visible:n.visible,root:n===e.coach.root})),html:c.outerHTML}});fs.writeFileSync(path.join(out,'smoke-canvas.png'),Buffer.from(debug.png.split(',')[1],'base64'));delete debug.png;write(path.join(out,'smoke-debug.json'),debug);await page.screenshot({path:path.join(out,'smoke-face.png')});console.log(JSON.stringify({setup,summary:inventory.summary,sample:sample.summary,errors}));await context.close();
 }
 if(action==='profile'){
  const scenarios=[{id:'idle',mode:'idle'},{id:'training-heavy',mode:'training'},{id:'fight',mode:'fight'},{id:'fight-low',mode:'fight',tier:'low'},{id:'idle-no-mane',mode:'idle',mane:false},{id:'fight-no-coat-shadows',mode:'fight',coatShadow:false}];
  for(const profile of profiles)for(const s of scenarios){
   const {context,page,errors,setup}=await load(profile);const config=await page.evaluate(s=>M0.configure(s.mode,s.tier||'default',s.mane!==false,s.coatShadow!==false),s);
   const inventory=await page.evaluate(()=>({lion:M0.inventory(app.engine.coach.root),scene:M0.inventory(app.engine.scene)}));const sample=await page.evaluate(({frames,warmup})=>M0.sample(frames,warmup),{frames,warmup});
   const shaders=await page.evaluate(()=>M0.shaders());const result={profile:profile.id,scenario:s.id,browser:browser.version(),setup,config,inventory,sample,errors};write(path.join(out,'profiles',profile.id+'-'+s.id+'.json'),result);
   if(s.id==='fight'||s.id==='idle')write(path.join(out,'shaders',profile.id+'-'+s.id+'.json'),shaders);
   await page.evaluate(()=>{const preview=()=>{app.engine.renderer.render(app.engine.scene,app.engine.camera);M0.nativeRAF(preview);};M0.nativeRAF(preview);});
   await page.screenshot({path:path.join(out,'profiles',profile.id+'-'+s.id+'.png'),timeout:120000});console.log(JSON.stringify({profile:profile.id,scenario:s.id,summary:sample.summary,errors}));await context.close();
  }
 }
 if(action==='capture'){
  const {context,page,errors,setup}=await load(profiles[0]);await page.addScriptTag({path:path.join(__dirname,'studio.js')});await page.evaluate(()=>{M0.studio();M0.preview=false;});
  const views=[['front',0],['left-45',Math.PI/4],['left',Math.PI/2],['rear-left',3*Math.PI/4],['rear',Math.PI],['rear-right',5*Math.PI/4],['right',3*Math.PI/2],['right-45',7*Math.PI/4]],cases=[];
  for(const [style,lighting] of [['textured','neutral'],['clay','neutral'],['textured','production']])for(const crop of ['body','face'])for(const [view,yaw] of views)cases.push({id:`${style}-${lighting}-${crop}-${view}`,style,lighting,crop,view,yaw,move:'guard',phase:0});
  const actions=[['jab',.30],['jab',.50],['jab',.78],['cross',.30],['cross',.50],['cross',.78],['hook',.18],['hook',.47],['hook',.80],['rear_hook',.18],['rear_hook',.47],['rear_hook',.80],['uppercut',.22],['uppercut',.36],['uppercut',.47],['uppercut',.80],['rear_uppercut',.22],['rear_uppercut',.36],['rear_uppercut',.47],['rear_uppercut',.80],['slip',.45],['roll',.45],['step',.25],['step',.55],['step',.85]];
  for(const style of ['textured','clay'])for(const [move,phase] of actions)for(const [view,yaw] of [['front',0],['three-quarter',-.65]])cases.push({id:`${style}-neutral-motion-${move}-${phase}-${view}`,style,lighting:'neutral',move,phase,yaw,crop:'body',view});
  for(const style of ['textured','clay'])for(const move of ['guard','jab','cross','hook','rear_hook','uppercut','rear_uppercut'])cases.push({id:`${style}-neutral-axilla-${move}`,style,lighting:'neutral',move,phase:move==='guard'?0:.47,yaw:-.65,crop:'axilla'});
  const expressions=[['neutral',null,0],['blink',null,4.5],['head-left',{amount:.8,part:'head',move:'cross',side:-1},1],['head-right',{amount:.8,part:'head',move:'cross',side:1},1],['body-hit',{amount:.8,part:'body',move:'cross',side:-1},1],['blocked',{amount:.8,part:'guard',move:'cross',side:-1},1]];
  for(const style of ['textured','clay'])for(const [name,hit,simulationTime] of expressions)for(const [view,yaw] of [['front',0],['three-quarter',-.65]])cases.push({id:`${style}-neutral-expression-${name}-${view}`,style,lighting:'neutral',move:'guard',phase:0,yaw,crop:'face',hit,simulationTime});
  for(const side of ['L','R'])for(const crop of ['glove-palm','glove-back','glove-knuckles'])cases.push({id:`textured-neutral-${crop}-${side}`,style:'textured',lighting:'neutral',move:side==='L'?'jab':'cross',phase:.5,yaw:0,crop,side});
  for(const side of ['L','R'])for(const phase of [0,.47])cases.push({id:`textured-neutral-boot-${side}-${phase}`,style:'textured',lighting:'neutral',move:side==='L'?'jab':'cross',phase,yaw:0,crop:'boot',side});
  cases.sort((a,b)=>(a.style+a.lighting).localeCompare(b.style+b.lighting));const manifest=[];let previousStyle='';
  for(const spec of cases){
   if(spec.style+spec.lighting!==previousStyle){await page.evaluate(s=>M0.style(s.style,s.lighting),spec);previousStyle=spec.style+spec.lighting;}
   const data=await page.evaluate(s=>{const row=M0.pose(s);row.png=app.engine.renderer.domElement.toDataURL('image/png');return row;},spec),file=path.join(out,'renders',spec.id+'.png');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.from(data.png.split(',')[1],'base64'));delete data.png;manifest.push({...spec,...data,file:path.relative(out,file),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});write(path.join(out,'render-manifest.json'),{sourceSHA:'280775eef9cb80903eaf258cb43f7900cd0d61a4',setup,images:manifest,errors});
   if(manifest.length%10===0)console.log(JSON.stringify({captured:manifest.length,total:cases.length}));
  }
  // Actual production fight scene, separately from neutral studio diagnostics.
  await page.evaluate(()=>{M0.preview=false;M0.style('textured','production');M0.studioGroup.visible=false;const e=app.engine;M0.configure('fight');e.camera.position.set(0,1.55,4.6);e.camera.lookAt(0,1.15,0);for(let i=0;i<45;i++)e.arena.update(i/60,'fight','one_two');const draw=()=>{e.renderer.render(e.scene,e.camera);M0.nativeRAF(draw);};M0.nativeRAF(draw);});
  await page.screenshot({path:path.join(out,'fight-production.png'),clip:{x:0,y:0,width:720,height:900},timeout:120000});
  console.log(JSON.stringify({captured:manifest.length,errors}));await context.close();
 }
 if(action==='screenshots'){
  const {context,page,errors,setup}=await load(profiles[0]);await page.addScriptTag({path:path.join(__dirname,'studio.js')});await page.evaluate(()=>{M0.studio();M0.style('textured','neutral');});const rows=[];
  for(const crop of ['face','body'])for(let i=0;i<8;i++){const spec={crop,yaw:i*Math.PI/4,move:'guard',phase:0},data=await page.evaluate(s=>M0.pose(s),spec),file=`${crop}-${i}.png`;fs.mkdirSync(path.join(out,'browser-studio'),{recursive:true});await page.screenshot({path:path.join(out,'browser-studio',file),clip:{x:0,y:0,width:720,height:900},timeout:120000});rows.push({...data,file});}
  write(path.join(out,'browser-studio/manifest.json'),{setup,images:rows,errors});console.log(JSON.stringify({browserScreenshots:rows.length,errors}));await context.close();
 }
 if(action==='video'){
  const {context,page,errors,setup}=await load({...profiles[0],viewport:{width:720,height:900}});await page.addScriptTag({path:path.join(__dirname,'studio.js')});await page.evaluate(()=>{M0.studio();M0.preview=false;M0.style('textured','neutral');M0.pose({move:'guard',phase:0,simulationTime:0});});
  const recording=await page.evaluate(async()=>{const chunks=[],stream=app.engine.renderer.domElement.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm'});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();const moves=['guard','jab','cross','hook','rear_hook','uppercut','rear_uppercut','slip','roll','step'],rows=[];const start=await new Promise(r=>M0.nativeRAF(r));let last=start;
   while(performance.now()-start<20000){const wall=await new Promise(r=>M0.nativeRAF(r)),age=(wall-start)/1000,index=Math.min(9,Math.floor(age/2)),move=moves[index],phase=(age%2)/2;M0.pose({move,phase,yaw:index<5?-.5:Math.PI/4,simulationTime:age},false);rows.push({age,move,phase,frameIntervalMs:wall-last});last=wall;}
   await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});stream.getTracks().forEach(t=>t.stop());const bytes=new Uint8Array(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {timeline:rows,base64:btoa(binary),mime:recorder.mimeType};});write(path.join(out,'video/timeline.json'),{setup,timeline:recording.timeline,errors,mime:recording.mime,note:'Actual WebGL canvas captureStream + MediaRecorder playback; no interpolated frames. Not a sustained physical-phone FPS benchmark.'});fs.writeFileSync(path.join(out,'video/lion-baseline-sequence.webm'),Buffer.from(recording.base64,'base64'));await context.close();console.log(JSON.stringify({frames:recording.timeline.length,errors}));
 }
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exit(1)});
