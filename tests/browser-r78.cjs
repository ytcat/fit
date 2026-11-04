// Run with the same Playwright/Chromium setup as browser.cjs.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';try{res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}}).listen(0,'127.0.0.1');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
for(const [width,height] of [[1100,950],[393,852]]){
 const p=await b.newPage({viewport:{width,height},hasTouch:true,userAgent:width<600?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1':undefined,bypassCSP:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>window.app?.engine?.coach?.anatomy);await p.evaluate(()=>{app.engine.isPlaying=false;});
 await p.locator('#stageSound').tap();await p.waitForFunction(()=>app.audio.ctx?.state==='running'&&app.audio.samples.size===10);
 const audio=await p.evaluate(()=>({breath1:app.audio.samples.get('effort-1').duration,breath2:app.audio.samples.get('effort-2').duration,pad:app.audio.samples.get('pad').duration}));assert.ok(audio.breath1>.24&&audio.breath1<.26&&audio.breath2>.31&&audio.breath2<.33&&audio.pad<.17,'current playback must use new dry Foley, not old game voices');
 await p.locator('#combinationBtn').click();await p.locator('[data-routine="freestyle"]').click();assert.equal(await p.evaluate(()=>app.engine.technique),'freestyle');
 for(const mode of ['none','heavy','dummy','rabbit']){
  await p.locator('#equipmentBtn').click();await p.locator(`[data-target="${mode}"]`).click();assert.equal(await p.evaluate(()=>app.engine.technique),'freestyle','generated mode must survive target changes');
  const result=await p.evaluate(()=>{const e=app.engine;e.isPlaying=false;let hits=0;for(let i=0;i<=150;i++){e.animTime=i/60;const m=e.arena.update(e.animTime,'freestyle','one_two');if(!m.hero.handErrors.every(n=>n<.002))throw Error('unreachable generated wrist');hits+=m.contacts.length;}return {hits,move:e.coach.metrics.move};});assert.ok(result.move);
 }
 for(const lang of ['HE','RU','EN'])await p.evaluate(l=>document.getElementById('lang'+l).click(),lang);assert.equal(await p.evaluate(()=>app.engine.technique),'freestyle');
 const trade=await p.evaluate(()=>{
  const e=app.engine;e.fightOptions={seed:78};trainingControls.chooseTarget('fight');e.isPlaying=false;const v=e.arena.fightView,m=v.match;m.phase='round';m.time=151.5;m.decide=()=>{};
  for(const f of Object.values(m.fighters)){f.next=Infinity;f.action=null;f.stamina=1;f.tempo=1;}m.attack('lion','uppercut','head');m.attack('rabbit','rear_uppercut','head').start-=.08;let max=0;
  for(let frame=0;frame<90;frame++){v.step();for(const actor of ['lion','rabbit'])for(const side of ['L','R']){const c=v.coaches[actor],i=side==='R'?1:0,elbow=c.joints['elbow'+side].getWorldPosition(new THREE.Vector3()),wrist=c.joints['hand'+side].getWorldPosition(new THREE.Vector3());const points=[{p:c.root.localToWorld(new THREE.Vector3(...c.metrics.gloves[i].knuckles)),r:.078},...[.35,.65,1].map(t=>({p:elbow.clone().lerp(wrist,t),r:t===1?.05:.052}))];for(const s of points)max=Math.max(max,e.arena.bodyCollision(s.p,v.coaches[actor==='lion'?'rabbit':'lion'],s.r).penetration);}}
  v.tick=Math.floor(m.time*60);e.animTime=m.time;v.update(m.time);e.lastRenderStamp=null;
  const ring=v.ring.children.map(x=>x.name);return {max,thrown:m.totals.lion.thrown+m.totals.rabbit.thrown,woven:ring.includes('Woven boxing canvas'),ropes:ring.filter(x=>x==='Wrapped tensioned ring rope').length,native:v.coaches.rabbit.nativeRabbit,muscles:v.coaches.lion.anatomy.value.length};
 });assert.ok(trade.max<.027&&trade.thrown===2&&trade.woven&&trade.ropes===16&&trade.native&&trade.muscles===14);
 await p.screenshot({path:`/tmp/r78-arena-${width}.png`,timeout:120000});
 const rendered=await p.evaluate(async()=>{
  const off=new OfflineAudioContext(2,24000*3,24000);let time=0;const ctx=new Proxy(off,{get:(o,k)=>k==='state'?'running':k==='currentTime'?time:typeof o[k]==='function'?o[k].bind(o):o[k]});const mix=new AudioEngine();mix.ctx=ctx;mix.samples=app.audio.samples;
  mix.swing({move:'cross'});time=.14;mix.hit({kind:'head',receiver:'rabbit',closingSpeed:6});mix.pain({kind:'head',receiver:'rabbit',closingSpeed:6});time=.8;mix.hit({kind:'body',receiver:'lion',closingSpeed:7});mix.pain({kind:'body',receiver:'lion',closingSpeed:7});time=1.6;mix.hit({receiver:'heavy',closingSpeed:6});
  const b=await off.startRendering();let peak=0,energy=0;for(const sample of b.getChannelData(0)){if(!Number.isFinite(sample))throw Error('invalid sound');peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;}return {peak,rms:Math.sqrt(energy/b.length),voices:mix.voices.size};
 });assert.ok(rendered.peak>.05&&rendered.peak<.95&&rendered.rms>.005&&rendered.voices===0);
 assert.deepEqual(errors,[]);console.log('PASS R78 browser',width,{audio,trade,rendered});await p.close();
}
}finally{await b.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exit(1)});
