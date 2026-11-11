/* GOTR-0032 evidence: matched before/after frame strips of mitt punches in the real app (Play, lion,
   headless Chromium, software WebGL). "before" serves career-drills.js and index.html's sound code
   unchanged from the base commit (only career-drills.js matters for the pose). Driven at 120 Hz;
   frames at fixed 120 Hz ticks after the press of a cross and a hook (contact tick printed).
   Usage (repo root, preview on 127.0.0.1:8161): node qa/gotr-0032/strip.cjs   Not a physical-phone check. */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'frames'),url=process.env.QA_URL||'http://127.0.0.1:8161/',base=process.env.QA_BASE||'7fe5c20';
const old=execFileSync('git',['show',base+':career-drills.js'],{cwd:root,encoding:'utf8',maxBuffer:1<<26});fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),results=[];try{
 for(const version of (process.env.VERSIONS||'before,after').split(',')){
  const page=await browser.newPage({viewport:{width:430,height:640}});page.setDefaultTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(version==='before')await page.route('**/career-drills.js*',r=>r.fulfill({contentType:'text/javascript',body:old}));
  await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:240000});
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   window.__m={start(){const e=app.engine;e.career=null;trainingControls.chooseTarget('pads');e.player.setEnabled(true);e.isPlaying=false;this.t=0;for(let i=0;i<144;i++)this.step();e.player.reset();},
    step(){const e=app.engine;this.t+=1/120;e.animTime=this.t;return e.arena.update(this.t);},
    render(){const e=app.engine;e.world?.update(e.animTime,'pads');e.renderer.render(e.scene,e.camera);}};});
  // Single pass per punch (a replay after re-entering the station did not reproduce the punch): screenshots at
  // fixed ticks after the press, so both versions are matched by time; the contact tick is recorded.
  for(const move of ['cross','hook']){
   await page.evaluate(move=>{__m.start();__m.hit=null;__m.n=0;app.engine.player.press(move);},move);let at=0;
   for(const k of [20,24,28,30,32,34,36,40,48,60]){await page.evaluate(s=>{for(let i=0;i<s;i++){const f=__m.step();__m.n++;if(!__m.hit&&(f.contacts||[]).some(c=>c.receiver==='pads'))__m.hit=__m.n;}__m.render();},k-at);at=k;
    const file=path.join(out,`${version}-${move}-${k}.png`);await page.locator('#boxerCanvas').screenshot({path:file});results.push({version,move,tick:k,file:path.basename(file)});}
   const hit=await page.evaluate(()=>__m.hit);results.push({version,move,contactTick:hit});console.log(version,move,'contact tick',hit);
  }
  results.push({version,errors:errors.slice()});console.log(version,'errors',errors.length);await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'strip-results-'+(process.env.VERSIONS||'all').replace(',','-')+'.json'),JSON.stringify({base,browser:browser.version(),physicalPhone:false,results},null,1));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
