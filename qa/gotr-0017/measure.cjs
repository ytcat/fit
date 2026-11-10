/* GOTR-0017 rendering audit: matched renders, frame cost, frame pacing, hitch and lowest-level checks.
   Software WebGL (SwiftShader) is NOT representative of a phone GPU. Use the deterministic counts
   (draw calls, triangles, pixels, shadow passes) for conclusions; frame times are only a relative
   before/after check on one machine, and this machine is shared, so they are noisy.

   Usage: node qa/gotr-0017/measure.cjs <capture|perf|pacing|hitches|floor> <label> [phone|desktop|small]
   APP_URL selects the build (default http://127.0.0.1:8145). The same script drives the build before
   and after the change. Output goes to qa/gotr-0017/out/<label>-*. One headless browser at a time. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const URL=process.env.APP_URL||'http://127.0.0.1:8145',[,,command='perf',label='run',only='']=process.argv;
const OUT=path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});
const VIEWS={phone:{viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true},small:{viewport:{width:360,height:640},deviceScaleFactor:2,isMobile:true,hasTouch:true},desktop:{viewport:{width:1366,height:768},deviceScaleFactor:1}};
// Seeded, watch-mode scenes; capture times are seconds of simulation, identical in every build.
const SCENES={gym:{start:"ringfighterGame.startTraining({mode:'heavy'})",times:[104/60,2.5]},mitts:{start:"ringfighterGame.startTraining({mode:'pads'})",times:[2.2,188/60]},fight:{start:"ringfighterGame.startFight({seed:20261110,watch:true})",times:[5,412/60]}};
const FRAMES=Number(process.env.FRAMES||6),PICK=(process.env.SCENES||'').split(',').filter(Boolean);
// TWEAK=<file.js> runs extra page code after a scene starts (lighting experiments only; unused for evidence).
const TWEAK=process.env.TWEAK?fs.readFileSync(process.env.TWEAK,'utf8'):'';

/* Runs in the page. Takes over the engine loop so every run replays identical simulation frames. */
async function install(){
 const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());app.setLanguage('en');
 const loop=e.animate;e.animate=()=>{};await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const render=e.renderer.render,gl=e.renderer.getContext(),pixel=new Uint8Array(4),shadowRender=e.renderer.shadowMap.render;
 let clock=0,shadow={passes:0,calls:0,triangles:0};
 // Shadow-pass draws are counted here: three r128 resets renderer.info after the shadow pass.
 e.renderer.shadowMap.render=function(...a){const i=e.renderer.info.render,c=i.calls,t=i.triangles;shadowRender.apply(this,a);if(i.calls>c){shadow.passes++;shadow.calls+=i.calls-c;shadow.triangles+=i.triangles-t;}};
 e.clock.getDelta=()=>1/60;
 window.__qa={
  seed(n=1){let s=n>>>0;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};},
  // level: 1 = the default look, 0 = the lowest level, 2 = the highest. Works on either build.
  quality(level){if(e.framePace){e.qualityLock=[0,3,6][level];e.updateQuality(0);return;}e.updateQuality=()=>{};e.qualityTier=level;e.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,[1,1.5,2][level]));e.renderer.shadowMap.enabled=level>0;e.lastRenderStamp=null;},
  frame(draw){clock+=1000/60;e.renderer.render=draw?render:()=>{};e.isPlaying=true;const s=performance.now();loop(clock);const js=performance.now()-s;e.renderer.render=render;return js;},
  // Simulate up to a time without drawing, then draw that one frame.
  until(seconds){let n=0;while(e.animTime<seconds-1/60-1e-6&&n++<20000)this.frame(false);this.frame(true);this.finish();},
  finish(){const s=performance.now();gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);return performance.now()-s;},
  shadow(){const s=shadow;shadow={passes:0,calls:0,triangles:0};return s;},
  state(){const i=e.renderer.info,key=e.scene.children.find(n=>n.isDirectionalLight&&n.castShadow);return {canvas:[e.canvas.width,e.canvas.height],pixelRatio:e.renderer.getPixelRatio(),tier:e.qualityTier,level:e.qualityLevel,shadows:e.renderer.shadowMap.enabled,shadowMap:key?[key.shadow.mapSize.x,key.shadow.mapSize.y]:null,calls:i.render.calls,triangles:i.render.triangles,programs:i.programs.length,geometries:i.memory.geometries,textures:i.memory.textures,mode:e.arena?.mode,time:+e.animTime.toFixed(4)};}
 };return true;
}

async function open(browser,view,scene,takeover=true){
 const context=await browser.newContext(VIEWS[view]),page=await context.newPage(),errors=[];page.on('pageerror',x=>errors.push(x.message));
 await page.goto(URL);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:240000});
 if(takeover){await page.evaluate(install);
  const out=await page.evaluate(({code,tweak})=>{const e=app.engine;__qa.seed(7);e.animTime=0;__qa.quality(1);(0,eval)(code);document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.isPlaying=true;if(tweak)(0,eval)(tweak);return window.__tweakOut;},{code:SCENES[scene].start,tweak:TWEAK});
  if(out)console.log('tweak',scene,JSON.stringify(out));}
 return {context,page,errors};
}
const stats=list=>{const s=[...list].sort((a,b)=>a-b);return {median:s[s.length>>1],p95:s[Math.min(s.length-1,Math.floor(s.length*.95))],min:s[0],max:s[s.length-1]};};

(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),result={label,url:URL,command,views:{}};
 for(const view of Object.keys(VIEWS)){
  if(only?only!==view:view==='small')continue;
  const rows={},problems=[];
  for(const scene of Object.keys(SCENES)){
   if(PICK.length&&!PICK.includes(scene))continue;
   const {context,page,errors}=await open(browser,view,scene,command!=='pacing');
   if(command==='capture'){
    for(const [index,seconds] of (process.env.FIRST?SCENES[scene].times.slice(0,1):SCENES[scene].times).entries()){
     const data=await page.evaluate(seconds=>{__qa.until(seconds);return {png:app.engine.canvas.toDataURL('image/png'),state:__qa.state()};},seconds);
     const file=path.join(OUT,`${label}-${scene}-${view}-${index}.png`);fs.writeFileSync(file,Buffer.from(data.png.split(',')[1],'base64'));rows[scene+index]=data.state;console.log(path.basename(file),JSON.stringify(data.state));
    }
    if(process.env.PAGE)await page.screenshot({path:path.join(OUT,`${label}-${scene}-${view}-page.png`),timeout:120000}).catch(x=>console.log('page screenshot skipped:',x.message.split('\n')[0]));
   }else if(command==='perf'){
    // Warm up (program compile, uploads), then time whole frames: JS plus a GPU sync.
    for(const level of [1,0]){
     const r=await page.evaluate(({level,frames})=>{__qa.quality(level);for(let i=0;i<60;i++)__qa.frame(false);for(let i=0;i<2;i++){__qa.frame(true);__qa.finish();}__qa.shadow();const samples=[],cpu=[];for(let i=0;i<frames;i++){const js=__qa.frame(true),gpu=__qa.finish();samples.push(js+gpu);cpu.push(js);}const shadow=__qa.shadow();return {samples,cpu,shadowCalls:shadow.calls/frames,shadowTriangles:shadow.triangles/frames,shadowPasses:shadow.passes/frames,...__qa.state()};},{level,frames:FRAMES});
     const whole=stats(r.samples),cpu=stats(r.cpu);
     rows[scene+'@'+level]={medianMs:Math.round(whole.median),p95Ms:Math.round(whole.p95),minMs:Math.round(whole.min),cpuMedianMs:+cpu.median.toFixed(1),calls:r.calls,triangles:r.triangles,shadowCalls:r.shadowCalls,shadowTriangles:r.shadowTriangles,shadowPasses:r.shadowPasses,pixels:r.canvas[0]*r.canvas[1],canvas:r.canvas,pixelRatio:r.pixelRatio,shadowMap:r.shadowMap,programs:r.programs,geometries:r.geometries,textures:r.textures};
     console.log(view,scene,'level',level,JSON.stringify(rows[scene+'@'+level]));
    }
   }else if(command==='hitches'){
    // A program, geometry or texture first needed mid-scene compiles or uploads on that frame (a hitch).
    rows[scene]=await page.evaluate(()=>{const i=app.engine.renderer.info,read=()=>({programs:i.programs.length,geometries:i.memory.geometries,textures:i.memory.textures});
     __qa.frame(true);__qa.finish();const start=read();for(let n=0;n<1500;n++)__qa.frame(false);__qa.frame(true);__qa.finish();return {start,after25s:read()};});
    console.log(view,scene,JSON.stringify(rows[scene]));
   }else if(command==='floor'){
    // Lowest quality level: the shadow pass stops. Move on 1.5 s and look for shadows left behind.
    const data=await page.evaluate(()=>{__qa.until(1);__qa.quality(0);__qa.until(2.5);return {png:app.engine.canvas.toDataURL('image/png'),state:__qa.state()};});
    fs.writeFileSync(path.join(OUT,`${label}-floor-${scene}-${view}.png`),Buffer.from(data.png.split(',')[1],'base64'));rows[scene]=data.state;console.log(view,scene,JSON.stringify(data.state));
   }else if(command==='pacing'){
    // The app's own loop and simulation at the browser's real frame cadence. Drawing is stubbed out
    // (software GL needs seconds per frame), so this isolates how far each shown frame advances the game.
    for(const busy of [0,6]){
     const frames=await page.evaluate(async({code,busy,seconds})=>{
      const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());(0,eval)(code);document.querySelectorAll('dialog[open]').forEach(d=>d.close());
      e.renderer.render=()=>{};e.updateQuality=()=>{};e.isPlaying=true;
      // Optional main-thread work of 0..busy ms at random moments, as input handlers and timers cause on a phone.
      let stop=false;if(busy)(function work(){if(stop)return;const until=performance.now()+Math.random()*busy;while(performance.now()<until);setTimeout(work,Math.random()*14);})();
      const rows=[],fixed=()=>e.arena.fightView?e.arena.fightView.tick:Math.floor((e.animTime+1e-9)*120);let stamp=null,called=0,time=0,tick=0;
      await new Promise(done=>{const start=performance.now(),watch=now=>{const at=performance.now();e.isPlaying=true;if(stamp!==null)rows.push([now-stamp,at-called,(e.animTime-time)*1000,fixed()-tick]);stamp=now;called=at;time=e.animTime;tick=fixed();if(at-start<seconds*1000)requestAnimationFrame(watch);else done();};requestAnimationFrame(watch);});
      stop=true;return rows;},{code:SCENES[scene].start,busy,seconds:Number(process.env.SECONDS||12)});
     // Frames longer than 50 ms are clamped by the engine in every build (slow motion, by design): reported, not scored.
     const scored=frames.slice(5).filter(f=>f[0]<=50&&f[0]>0),rate=scene==='fight'?60:120,rms=list=>Math.sqrt(list.reduce((s,x)=>s+x*x,0)/Math.max(1,list.length));
     const error=scored.map(f=>f[2]-f[0]),stepError=scored.map(f=>f[3]-f[0]*rate/1000),period=stats(scored.map(f=>f[0])).min;
     rows[scene+(busy?'+busy':'')]={frames:frames.length,scored:scored.length,clamped:frames.length-5-scored.length,displayIntervalMedianMs:+stats(scored.map(f=>f[0])).median.toFixed(2),callbackJitterRmsMs:+rms(scored.map(f=>f[1]-f[0])).toFixed(2),advanceErrorRmsMs:+rms(error).toFixed(3),advanceErrorMaxMs:+Math.max(...error.map(Math.abs)).toFixed(2),
      fixedRateHz:rate,stepErrorRms:+rms(stepError).toFixed(3),framesOffByAStep:scored.filter((f,i)=>Math.abs(stepError[i])>=.75).length,
      // On a display-period frame the count of fixed steps should not vary.
      stepsOnSinglePeriodFrames:scored.filter(f=>f[0]<period*1.3).reduce((m,f)=>{m[f[3]]=(m[f[3]]||0)+1;return m;},{})};
     console.log(view,scene,busy?'busy main thread':'idle main thread',JSON.stringify(rows[scene+(busy?'+busy':'')]));
    }
   }
   problems.push(...errors);await context.close();
  }
  if(problems.length)console.log('PAGE ERRORS',view,problems);result.views[view]={rows,errors:problems};
 }
 fs.writeFileSync(path.join(OUT,`${label}-${command}${only?'-'+only:''}.json`),JSON.stringify(result,null,1));await browser.close();
})().catch(x=>{console.error('FAIL',x);process.exit(1);});
