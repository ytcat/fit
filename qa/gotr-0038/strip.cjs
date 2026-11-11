/* GOTR-0038 + GOTR-0032 evidence: matched before/after frames in the real app (headless Chromium, software GL).
   "before" serves career-drills.js from the base commit (886b5eb, v1.20 + earlier fixes). The mitt station is
   driven by hand at 120 Hz through the engine's arena (no wall clock), so both versions show the same instants.
   - roll drill (Watch): the coach sweeps the hook; frames at 0.30/0.45/0.60/0.75 s into the roll beat;
   - cross (Play): frames 20/24/28/32/40 ticks after the press (contact at tick ~28).
   Usage (repo root, preview on 127.0.0.1:8161): node qa/gotr-0038/strip.cjs ; then python3 -I qa/gotr-0038/compose.py */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'frames'),url=process.env.QA_URL||'http://127.0.0.1:8161/',base=process.env.QA_BASE||'886b5eb';
const old=execFileSync('git',['show',base+':career-drills.js'],{cwd:root,encoding:'utf8',maxBuffer:1<<26});fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),results=[];try{
 for(const version of (process.env.VERSIONS||'before,after').split(',')){
  const page=await browser.newPage({viewport:{width:430,height:640}});page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(version==='before')await page.route('**/career-drills.js*',r=>r.fulfill({contentType:'text/javascript',body:old}));
  await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
  await page.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   window.__m={begin(play){const e=app.engine;ringfighterGame.startTraining({mode:'pads',play});document.querySelectorAll('dialog[open]').forEach(d=>d.close());e.isPlaying=false;this.t=e.animTime;this.t0=this.t;this.hit=null;this.n=0;},
    step(){const e=app.engine;this.t+=1/120;this.n++;e.animTime=this.t;const f=e.arena.update(this.t);if(!this.hit&&(f.contacts||[]).some(c=>c.receiver==='pads'))this.hit=this.n;return f;},
    shot(){const e=app.engine;e.world?.update(e.animTime,'pads');e.renderer.render(e.scene,e.camera);e.lastRenderStamp=null;}};});
  // Roll drill in Watch: beat 2 of the coach sequence (t 2.4-3.6 s from the station start).
  await page.evaluate(()=>__m.begin(false));let at=0;
  for(const s of [.30,.45,.60,.75]){const target=Math.round((2.4+s)*120);await page.evaluate(n=>{for(let i=0;i<n;i++)__m.step();__m.shot();},target-at);at=target;
   const file=path.join(out,`${version}-roll-${Math.round(s*100)}.png`);await page.locator('#boxerCanvas').screenshot({path:file});results.push({version,drill:'roll',at:s,file:path.basename(file)});}
  // Cross in Play.
  await page.evaluate(()=>{__m.begin(true);for(let i=0;i<60;i++)__m.step();__m.n=0;__m.hit=null;app.engine.player.press('cross');});at=0;
  for(const k of [20,24,28,32,40]){await page.evaluate(n=>{for(let i=0;i<n;i++)__m.step();__m.shot();},k-at);at=k;
   const file=path.join(out,`${version}-cross-${k}.png`);await page.locator('#boxerCanvas').screenshot({path:file});results.push({version,drill:'cross',tick:k,file:path.basename(file)});}
  const hit=await page.evaluate(()=>__m.hit);console.log(version,'cross contact tick',hit,'errors',errors.length);results.push({version,crossContactTick:hit,errors});await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'strip-results.json'),JSON.stringify({base,browser:browser.version(),physicalPhone:false,results},null,1));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
