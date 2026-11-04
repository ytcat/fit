// Run with the same Playwright/Chromium setup as browser.cjs.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';try{res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}}).listen(0,'127.0.0.1');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-unsafe-swiftshader']});try{
for(const [width,height] of [[1100,950],[393,852]]){
 const p=await browser.newPage({viewport:{width,height},bypassCSP:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>window.app?.engine?.coach);
 await p.evaluate(()=>{app.engine.isPlaying=false;});
 await p.locator('#timingBtn').click();await p.locator('[data-timing="random"]').click();
 assert.equal(await p.evaluate(()=>app.engine.practiceTiming),'random');
 assert.match(await p.locator('#timingBtn').innerText(),/Variable/);
 for(const mode of ['none','heavy','dummy','speed','rabbit']){
  await p.locator('#equipmentBtn').click();await p.locator(`[data-target="${mode}"]`).click();
  assert.equal(await p.locator('#timingBtn').isEnabled(),true);
  assert.equal(await p.evaluate(()=>app.engine.practiceTiming),'random');
  await p.evaluate(()=>{app.engine.isPlaying=false;});
 }
 for(const lang of ['HE','RU','EN'])await p.evaluate(lang=>document.getElementById('lang'+lang).click(),lang);
 assert.equal(await p.evaluate(()=>app.engine.practiceTiming),'random');
 const bounds=await p.locator('#timingBtn').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height,'timing control must fit phone');
 await p.locator('#timingBtn').click();await p.locator('[data-timing="sync"]').click();assert.equal(await p.evaluate(()=>app.engine.practiceTiming),'sync');
 await p.evaluate(()=>trainingControls.chooseTarget('fight'));assert.ok(await p.locator('#timingBtn').isDisabled());
 await p.evaluate(()=>{trainingControls.chooseTarget('dummy');app.engine.isPlaying=false;});
 await p.mouse.click(20,20);await p.waitForFunction(()=>app.audio.samples.size===10);
 const audio=await p.evaluate(async()=>{
  const live=app.audio;for(const n of ['body-1','body-2','pad','swing','effort-1','effort-2','clap-1','clap-2','clap-3','bell'])if(!live.samples.has(n))throw Error('missing sample '+n);
  const off=new OfflineAudioContext(2,24000*7,24000);let time=0;
  const ctx=new Proxy(off,{get:(target,key)=>key==='state'?'running':key==='currentTime'?time:typeof target[key]==='function'?target[key].bind(target):target[key]});
  const mix=new AudioEngine();mix.ctx=ctx;mix.samples=live.samples;mix.rawSounds=null;
  mix.swing({move:'uppercut'});time=.3;mix.hit({kind:'head',receiver:'rabbit',closingSpeed:6});mix.pain({kind:'head',receiver:'rabbit',closingSpeed:6,severity:1});
  const voices=mix.voices.size;mix.pain({kind:'head',receiver:'rabbit',closingSpeed:6});if(mix.voices.size!==voices)throw Error('pain repeats before recovery');
  mix.pain({kind:'head',receiver:'lion',blocked:true,closingSpeed:6});if(mix.voices.size!==voices)throw Error('blocked strike produced pain');
  time=.9;mix.hit({receiver:'heavy',closingSpeed:5});time=1.3;mix.hit({receiver:'speed',closingSpeed:3});time=1.6;mix.bell('final');time=2.8;mix.applause();
  const before=mix.voices.size;mix.muted=true;mix.hit({receiver:'dummy',closingSpeed:8});mix.bell();mix.applause();mix.swing({move:'cross'});if(mix.voices.size!==before)throw Error('muted sound scheduled');
  const rendered=await off.startRendering();let peak=0,energy=0,difference=0;const a=rendered.getChannelData(0),b=rendered.getChannelData(1);
  for(let i=0;i<a.length;i++){if(!Number.isFinite(a[i])||!Number.isFinite(b[i]))throw Error('nonfinite mix');peak=Math.max(peak,Math.abs(a[i]),Math.abs(b[i]));energy+=a[i]**2;difference+=Math.abs(a[i]-b[i]);}
  return {peak,rms:Math.sqrt(energy/a.length),stereo:difference,voices:mix.voices.size};
 });assert.ok(audio.peak>.02&&audio.peak<.95&&audio.rms>.005&&audio.stereo>10);assert.equal(audio.voices,0,'ended sample voices must clean up');
 await p.evaluate(()=>{app.audio.hit({receiver:'dummy',kind:'body',closingSpeed:8});document.getElementById('soundBtn').click();});
 await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>app.audio.muted),true);assert.ok(await p.evaluate(()=>app.audio.output.gain.value<.01));
 await p.screenshot({path:`/tmp/r75-final-${width}.png`});assert.deepEqual(errors,[]);console.log('PASS R75 browser',width,{audio});await p.close();
}
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exit(1)});
