// Actual app captures and upload/shader checks. Software browser != physical phone.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.env.APP_ROOT||path.resolve(__dirname,'../..'),out=process.env.QA_OUT||'/tmp/tactics-browser',kind=process.env.QA_KIND||'motion';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(f===root)f+='/index.html';if(!f.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}}).listen(0,'127.0.0.1');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:1100,height:950},hasTouch:true,bypassCSP:true});p.setDefaultTimeout(120000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript({path:path.join(__dirname,'../lion-realism-m0/instrument.js')});await p.addInitScript(()=>M0.paused=true);await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>window.app?.engine?.coach?.anatomy&&window.ringsideLayout);if(await p.getByRole('button',{name:'Play as guest',exact:true}).count())await p.getByRole('button',{name:'Play as guest',exact:true}).click();await p.evaluate(async()=>{await M0.boot();app.engine.isPlaying=false;});
 const shots=[],metrics=[];
 for(const kind of ['guard','paw','rope','fight']){
  metrics.push(await p.evaluate(kind=>{
   const e=app.engine;e.renderer.setPixelRatio(.75);e.renderer.shadowMap.enabled=false;e.camera.near=.01;e.camera.zoom=1;
   if(kind==='guard'){
    trainingControls.chooseTarget('none');e.coach.update(.35,'guard','one_two');
    e.camera.position.set(2.5,1.70,2.6);e.camera.lookAt(0,1.45,0);
   }else if(kind==='paw'||kind==='rope'){
    trainingControls.chooseTarget('rope');e.animTime=.1;e.arena.update(.1,e.technique,e.currentAnim);
    const prop=e.arena.careerDrill.grips[0],target=prop.localToWorld(new THREE.Vector3(0,-.09,.025));
    e.camera.position.copy(kind==='paw'?target.clone().add(new THREE.Vector3(-.38,-.05,.25)):new THREE.Vector3(2.6,1.6,3.8));e.camera.lookAt(kind==='paw'?target:new THREE.Vector3(0,1.2,0));
   }else{
    e.fightOptions={seed:82};trainingControls.chooseTarget('fight');const v=e.arena.fightView;v.match.phase='round';
    for(let i=0;i<120;i++)v.step();e.animTime=v.match.time;e.camera.position.set(3.1,2.1,4.1);e.camera.lookAt(0,1.25,0);
   }
   e.isPlaying=false;e.camera.updateProjectionMatrix();e.world.update(e.animTime,e.arena.mode);e.renderer.render(e.scene,e.camera);
   const c=e.coach;return {kind,hands:['L','R'].map(s=>c.point(c.joints['hand'+s]).toArray()),calls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles};
  },kind));
  const file=kind+'.png';await p.locator('#boxerCanvas').screenshot({path:path.join(out,file)});shots.push(file);
 }
 assert.deepEqual(errors,[]);assert.ok(await p.evaluate(()=>app.engine.renderer.info.programs.every(x=>app.engine.renderer.getContext().getProgramParameter(x.program,app.engine.renderer.getContext().LINK_STATUS))));
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({sourceSha:require('child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),shots,metrics,errors,physicalPhone:false,browser:b.version()},null,2));console.log('PASS actual guard, paw, rope and fight app captures, no console/shader errors');
 }finally{await b.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
