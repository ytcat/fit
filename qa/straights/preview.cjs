// Actual app captures and upload/shader checks. Software browser != physical phone.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.env.APP_ROOT||path.resolve(__dirname,'../..'),out=process.env.QA_OUT||'/tmp/straight-browser',kind=process.env.QA_KIND||'motion';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(f===root)f+='/index.html';if(!f.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}}).listen(0,'127.0.0.1');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:1100,height:950},hasTouch:true,bypassCSP:true});p.setDefaultTimeout(120000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript({path:path.join(__dirname,'../lion-realism-m0/instrument.js')});await p.addInitScript(()=>M0.paused=true);await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>window.app?.engine?.coach?.anatomy&&window.ringsideLayout);if(await p.getByRole('button',{name:'Play as guest',exact:true}).count())await p.getByRole('button',{name:'Play as guest',exact:true}).click();await p.evaluate(async()=>{await M0.boot();app.engine.isPlaying=false;});
 const frames=[];
 for(const actor of ['lion','rabbit'])for(const move of ['jab','cross'])for(const situation of ['body','open_head','blocked_head'])for(const time of [.20,.35,.42,.65]){
  const state=await p.evaluate(({actor,move,situation,time})=>{
   const e=app.engine,career=e.career;e.career=null;e.fightOptions={seed:74};trainingControls.chooseTarget('fight');e.career=career;e.isPlaying=false;
   const v=e.arena.fightView,m=v.match;m.phase='round';m.roundTime=2;m.decide=()=>{};for(const f of Object.values(m.fighters)){f.action=null;f.next=Infinity;f.tempo=1;}
   const receiver=actor==='lion'?'rabbit':'lion';if(situation==='open_head')m.fighters[receiver].action={id:900,actor:receiver,move:'guard',guardStyle:'body',start:-1.75,duration:5,attack:false,defend:true};
   m.attack(actor,move,situation==='body'?'body':'head');const events=[];for(let i=0;i<Math.round(time*60);i++)events.push(...v.step());
   const c=v.coaches[actor],side=move==='jab'?'L':'R',a=c.point(c.joints['arm'+side]),b=c.point(c.joints['elbow'+side]),d=c.point(c.joints['hand'+side]);
   e.animTime=m.time;window.fightUI?.render(v);e.renderer.setPixelRatio(.6);e.renderer.shadowMap.enabled=false;e.camera.zoom=1;
   return {actor,move,situation,time:m.time,angle:THREE.MathUtils.radToDeg(a.clone().sub(b).angleTo(d.clone().sub(b))),roots:Object.fromEntries(Object.entries(v.coaches).map(([a,c])=>[a,c.root.position.toArray()])),events};
  },{actor,move,situation,time});
  for(const view of time===.35?['profile','quarter']:['profile']){
   const stats=await p.evaluate(view=>{const e=app.engine,g=e.arena.group;e.camera.position.copy(g.localToWorld(view==='profile'?new THREE.Vector3(-4.8,1.9,.35):new THREE.Vector3(-3.5,1.9,3.5)));e.camera.lookAt(g.localToWorld(new THREE.Vector3(0,1.25,0)));e.camera.updateProjectionMatrix();e.world.update(e.animTime,'fight');e.renderer.render(e.scene,e.camera);return {calls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles}},view);
   const file=[actor,move,situation,time,view].join('-')+'.png';await p.locator('#boxerCanvas').screenshot({path:path.join(out,file)});frames.push({...state,view,file,...stats});
  }
 }
 assert.deepEqual(errors,[]);assert.ok(await p.evaluate(()=>app.engine.renderer.info.programs.every(x=>app.engine.renderer.getContext().getProgramParameter(x.program,app.engine.renderer.getContext().LINK_STATUS))));
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({sourceSha:require('child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),frames,errors,browser:b.version(),physicalPhone:false},null,2));console.log('PASS '+frames.length+' real fight frames; both actors, jab/cross, clean head/body and blocks; shaders and console clean');
 }finally{await b.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
