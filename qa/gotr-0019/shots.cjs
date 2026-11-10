/* Real renders for GOTR-0019 (side lock) and GOTR-0020 (fight intro). The loop is driven by hand at
   exactly 60 simulated frames per second and only the wanted frames are drawn (software WebGL is slow).
   Usage: node qa/gotr-0019/shots.cjs [phone|land|desk]   (APP_URL, default http://127.0.0.1:8145) */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const URL=process.env.APP_URL||'http://127.0.0.1:8145',LOCK=path.join(__dirname,'out'),INTRO=path.join(__dirname,'..','gotr-0020','out');for(const d of [LOCK,INTRO])fs.mkdirSync(d,{recursive:true});
const VIEWS={phone:{viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true},land:{viewport:{width:852,height:393},deviceScaleFactor:1,isMobile:true,hasTouch:true},desk:{viewport:{width:1366,height:768},deviceScaleFactor:1}};
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),only=process.argv[2];
 for(const [name,view] of Object.entries(VIEWS)){
  if(only&&only!==name)continue;
  const context=await browser.newContext(view),page=await context.newPage();page.on('pageerror',x=>console.log('pageerror',x.message));
  await page.goto(URL);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:240000});
  await page.evaluate(async()=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());const loop=e.animate,render=e.renderer.render;e.animate=()=>{};await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));e.updateQuality=()=>{};let clock=0,s=7;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
   window.__drive=(frames,draw)=>{for(let i=0;i<frames;i++){clock+=1000/60;e.renderer.render=draw&&i===frames-1?render:()=>{};e.isPlaying=true;loop(clock);}e.renderer.render=render;if(draw)e.renderer.getContext().finish();};});
  const shot=async(file,frames)=>{await page.evaluate(n=>__drive(n,true),frames);await page.screenshot({path:file,timeout:240000});console.log(path.relative(path.join(__dirname,'..','..'),file),JSON.stringify(await page.evaluate(()=>({mode:app.engine.cameraDirector.mode,phase:app.engine.arena.fightView?.match.phase,time:+app.engine.animTime.toFixed(2)}))));};
  const start=code=>page.evaluate(code=>{(0,eval)(code);document.querySelectorAll('dialog[open]').forEach(d=>d.close());},code);
  // Fight intro: start of the orbit, half way round, and the first frame after it.
  await start("ringfighterGame.startFight({seed:20261110,watch:true})");
  if(name!=='land'){await shot(path.join(INTRO,name+'-intro-1-start.png'),20);await shot(path.join(INTRO,name+'-intro-2-mid.png'),100);await shot(path.join(INTRO,name+'-intro-3-closing.png'),110);}
  await shot(path.join(INTRO,name+'-intro-4-bell.png'),name!=='land'?90:320);
  // Side lock in the bout, then at the mitts and the heavy bag.
  await page.click('#camLock');await shot(path.join(LOCK,name+'-fight-locked.png'),330);
  await start("ringfighterGame.startTraining({mode:'pads'})");await shot(path.join(LOCK,name+'-mitts-locked.png'),200);
  if(name==='phone'){await start("ringfighterGame.startTraining({mode:'heavy',play:true})");await page.evaluate(()=>document.querySelector('[data-input-page=\"moves\"]')?.click());await shot(path.join(LOCK,name+'-heavy-play-locked.png'),160);}
  await context.close();
 }
 await browser.close();
})().catch(x=>{console.error('FAIL',x.message||x);process.exit(1);});
