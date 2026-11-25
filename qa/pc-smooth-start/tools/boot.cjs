// First seconds after load, recorded as a video + in-page timeline. persona: adventure | training | fresh ; ROOT env ; OUT dir
// usage: node boot.cjs <persona> [W H] [lang]
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),S=require('./serve.cjs'),{execFileSync}=require('child_process');
const ROOT=process.env.ROOT||path.join(__dirname,'../../..'),OUT=process.env.OUT||path.join(__dirname,'out-boot'),persona=process.argv[2]||'adventure',W=+(process.argv[3]||1366),H=+(process.argv[4]||768),LANG=process.argv[5]||'en';
const TAG=persona+'-'+W+'x'+H+'-'+LANG;
(async()=>{fs.mkdirSync(OUT,{recursive:true});const srv=await S.start(ROOT);const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 let state;
 if(persona!=='fresh'){
  const ctx=await b.newContext({viewport:{width:W,height:H}});const p=await ctx.newPage();
  await p.addInitScript(l=>localStorage.setItem('shadowbox-language',l),LANG);
  await p.goto(srv.url);await p.waitForFunction(()=>window.ringfighterGame?.store,null,{timeout:120000});
  for(let k=0;k<120&&!(await p.evaluate(()=>!!ringfighterGame.store.game()));k++){if(await p.locator('dialog.career-welcome[open]').count()){await p.locator('dialog.career-welcome[open] input[name=player]').fill('Boot QA',{timeout:180000});await p.locator('dialog.career-welcome[open] button[type=submit]').click({timeout:180000});}await p.waitForTimeout(500);}
  await p.waitForFunction(()=>window.app?.engine?.coach?.anatomy,null,{timeout:120000});
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{const id=ringfighterGame.store.current().id;localStorage.setItem('gotr.adv.intro.'+id,'1');window.StoryScenes?.stop?.();});
  await p.waitForTimeout(800);
  if(persona==='training'){ // the real modes button: Modes -> Training
   await p.evaluate(()=>{window.StoryScenes?.stop?.();});
   await p.locator('.gm-fab').first().click();await p.waitForTimeout(400);await p.locator('.gm-item[data-mode=train], .gm-list button[data-id=train], .gm-list [data-mode=train]').first().click();
   await p.waitForTimeout(1500);
  }
  console.log('setup',await p.evaluate(()=>({tab:ringfighterGame.modalTab,mode:localStorage.getItem('gotr.mode')})));
  state=await ctx.storageState();await ctx.close();
 }
 const ctx=await b.newContext({viewport:{width:W,height:H},storageState:state,recordVideo:{dir:OUT,size:{width:W>1000?W/2:W,height:W>1000?H/2:H}}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{const T=window.__bootLog=[];const t0=performance.now();const log=s=>T.push([Math.round(performance.now()-t0),s]);
  new MutationObserver(()=>{const dl=[...document.querySelectorAll('dialog[open]')].map(d=>d.className.split(' ').slice(0,2).join('.')).join('|');if(dl!==window.__dl){window.__dl=dl;log('dialogs:'+dl);}const bc=document.documentElement.hasAttribute('data-boot')?'on':'off';if(bc!==window.__bc){window.__bc=bc;log('boot:'+bc);}}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['open','data-boot','hidden']});
  let fr=0;const tick=()=>{fr++;if(fr===1)log('first rAF');const film=!!window.StoryScenes?.playing;if(film!==window.__film){window.__film=film;log('film:'+film);}requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 await p.goto(srv.url);await p.waitForTimeout(+(process.env.WAIT||14000));
 const log=await p.evaluate(()=>window.__bootLog);const vid=await p.video().path();await ctx.close();
 const mp4=path.join(OUT,TAG+'.webm');fs.renameSync(vid,mp4);
 fs.mkdirSync(path.join(OUT,TAG),{recursive:true});
 execFileSync('ffmpeg',['-loglevel','error','-y','-i',mp4,'-vf','fps=4','-t','12',path.join(OUT,TAG,'f%03d.png')]);
 console.log(JSON.stringify(log));console.log('errors',errs);await b.close();srv.close();})();
