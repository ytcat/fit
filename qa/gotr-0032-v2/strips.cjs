/* GOTR-0032 v2 evidence: before/after frames of every punch on the mitts and on the heavy bag (Play) in the real app,
   headless Chromium (software GL), 402x690. "before" serves the motion files from QA_BASE (default 37247bc, v1.87).
   Input goes through window.fighterPad.press ('straight' | 'hook' | 'uppercut'); the rear hand is chosen the way the pad
   does it (a second press soon after a lead press). The page clock is paused and stepped by hand at 120 Hz, so both
   versions show the same instants. Frames at TICKS after the press (default 10,18,24,30,44; the deferred skins are synced before each picture); contact tick recorded per punch.
   Usage (repo root): node qa/gotr-0032-v2/strips.cjs [outdir]   env CASES=pads,heavy QA_BASE=<sha>
   Then: python3 -I qa/gotr-0032-v2/compose.py */
const fs=require('fs'),path=require('path'),http=require('http'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=process.argv[2]||path.join(__dirname,'frames'),base=process.env.QA_BASE||'37247bc';
const files=['boxing-coach-v2.js','career-drills.js','training-arena.js'],old=Object.fromEntries(files.map(f=>[f,execFileSync('git',['show',base+':'+f],{cwd:root,encoding:'utf8',maxBuffer:1<<26})]));fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.wav':'audio/wav','.opus':'audio/ogg','.m4a':'audio/mp4','.jpg':'image/jpeg'};
const server=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';if(!f.startsWith(root)||!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
const punches=[['jab','straight',false],['cross','straight',true],['hook','hook',false],['rear_hook','hook',true],['uppercut','uppercut',false],['rear_uppercut','uppercut',true]];
async function open(browser,version,url){
 const page=await browser.newPage({viewport:{width:402,height:690}});page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(version==='before')for(const f of files)await page.route('**/'+f+'*',r=>r.fulfill({contentType:'text/javascript',body:old[f]}));
 await page.addInitScript(()=>{try{localStorage.setItem('gotr.adv.nointro','1');}catch{}});
 await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy&&window.fighterPad,null,{timeout:300000});
 await page.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
 return {page,errors};
}
server.listen(0,async()=>{const url=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch({args:['--enable-unsafe-swiftshader']}),results=[];try{
 for(const mode of (process.env.CASES||'pads,heavy').split(','))for(const version of ['before','after']){
  const {page,errors}=await open(browser,version,url);
  await page.evaluate(mode=>{const e=app.engine;ringfighterGame.startTraining({mode,play:true,setupOnly:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   setInterval(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()),300);e.isPlaying=false;let t=e.animTime;
   window.__s={step(){t+=1/120;e.animTime=t;return e.arena.update(t,e.technique,e.currentAnim);},shot(){for(const c of [e.coach,e.arena.careerDrill?.trainer,e.arena.rabbit])c?.syncSkin?.();e.world?.update?.(e.animTime,mode);e.renderer.render(e.scene,e.camera);},
    press(kind,rear){const pad=window.fighterPad;if(!pad.shown){pad.paint?.(true);}pad.hands.reset();if(rear)pad.hands.commit('lead',performance.now());const ok=pad.press(kind,'qa');e.isPlaying=false;return ok;}};
   window.fighterPad.paint?.(true);},mode);
  for(const [move,kind,rear] of punches){
   const r=await page.evaluate(([kind,rear])=>{const e=app.engine;e.isPlaying=false;if(ringfighterGame.isModalOpen)ringfighterGame.close();document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.player.reset();for(let i=0;i<90;i++)__s.step();const ok=__s.press(kind,rear),id=e.player.current?.move||e.player.queue[0]?.move;return {ok,id,shown:window.fighterPad.shown,enabled:e.player.enabled,mode:e.targetMode,modal:ringfighterGame.isModalOpen};},[kind,rear]);
   if(!r.ok||r.id!==move){results.push({version,mode,move,error:'press failed',r});console.log(version,mode,move,'press failed',JSON.stringify(r));continue;}
   let contact=null;
   const ticks=(process.env.TICKS||'10,18,24,30,44').split(',').map(Number);let at=0;
   for(const k of ticks){
    const c=await page.evaluate(n=>{let hit=null;for(let i=0;i<n;i++){const f=__s.step();if(hit==null&&(f.contacts||[]).some(c=>c.actor==='lion'&&c.receiver!=='lion'))hit=i;}__s.shot();return hit;},k-at);
    if(c!=null&&contact==null)contact=at+c+1;at=k;
    const file=path.join(out,`${version}-${mode}-${move}-${String(k).padStart(2,'0')}.png`);await page.locator('#boxerCanvas').screenshot({path:file});
    results.push({version,mode,move,tick:k,file:path.basename(file)});
   }
   results.push({version,mode,move,contactTick:contact});console.log(version,mode,move,'contact tick',contact);
  }
  results.push({version,mode,errors:errors.slice()});if(errors.length)console.log(version,mode,'page errors',errors.slice(0,3));await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'strips.json'),JSON.stringify({base,browser:browser.version(),viewport:'402x690',physicalPhone:false,results},null,1));
}finally{await browser.close();server.close();}});
