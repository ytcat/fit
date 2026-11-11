/* GOTR-0028 evidence: matched before/after frame strips of a sparring hit in the real app
   (headless Chromium, software WebGL). "before" serves training-arena.js from the base commit.
   The station is driven deterministically at 60 Hz; frames at -2, 0, +6, +12, +18, +24, +36 frames
   around the first clean hit on the partner. Also prints the partner's planted-sole slide.
   Usage (repo root, preview on 127.0.0.1:8161): node qa/gotr-0028/strip.cjs   Not a physical-phone check. */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'frames'),url=process.env.QA_URL||'http://127.0.0.1:8161/',base=process.env.QA_BASE||'7fe5c20';
const old=execFileSync('git',['show',base+':training-arena.js'],{cwd:root,encoding:'utf8',maxBuffer:1<<26});fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']}),results=[];try{
 for(const version of ['before','after']){
  const page=await browser.newPage({viewport:{width:430,height:640}});page.setDefaultTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(version==='before')await page.route('**/training-arena.js*',r=>r.fulfill({contentType:'text/javascript',body:old}));
  await page.goto(url);await page.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:240000});
  const hit=await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());const e=app.engine;e.career=null;trainingControls.chooseTarget('rabbit');e.isPlaying=false;e.technique='combo';e.currentAnim='one_two';
   window.__s={t:0,frames:[],step(){const e=app.engine;this.t+=1/60;e.animTime=this.t;const f=e.arena.update(this.t,e.technique,e.currentAnim),p=e.arena.rabbit;const soles=p.metrics.footTargets.map(x=>({lift:x.lift||0,p:p.joints['foot'+x.side].localToWorld(new THREE.Vector3(0,-.102,.215)).toArray()}));this.frames.push({t:this.t,hit:(f.contacts||[]).some(c=>c.receiver==='rabbit'),soles});return f;},
    render(){const e=app.engine;e.world?.update(e.animTime,'rabbit');e.renderer.render(e.scene,e.camera);}};
   for(let i=0;i<60*6;i++){__s.step();if(i>30&&__s.frames[i].hit)return i;}return null;});
  // Replay from the start so the frames before the hit can be drawn.
  const offsets=[-2,0,6,12,18,24,36];
  await page.evaluate(()=>{const e=app.engine;trainingControls.chooseTarget('rabbit');e.isPlaying=false;__s.t=0;__s.frames=[];});
  let at=-1;
  for(const k of offsets){const target=hit+k;await page.evaluate(n=>{for(let i=0;i<n;i++)__s.step();__s.render();},target-at);at=target;
   const file=path.join(out,`${version}-spar-${k>=0?'+':''}${k}.png`);await page.locator('#boxerCanvas').screenshot({path:file});results.push({version,offset:k,file:path.basename(file)});}
  const slide=await page.evaluate(()=>{let worst=0,total=0;const f=__s.frames;for(let i=1;i<f.length;i++)for(let k=0;k<2;k++){const a=f[i-1].soles[k],b=f[i].soles[k];if(a.lift>.002||b.lift>.002)continue;const d=Math.hypot(b.p[0]-a.p[0],b.p[2]-a.p[2]);worst=Math.max(worst,d);total+=d;}return {worst_mm:+(worst*1000).toFixed(1),total_mm:+(total*1000).toFixed(1),frames:f.length};});
  console.log(version,'hit frame',hit,'planted-sole slide',JSON.stringify(slide),'errors',errors.length);results.push({version,hitFrame:hit,slide,errors});
  await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'strip-results.json'),JSON.stringify({base,browser:browser.version(),physicalPhone:false,results},null,1));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
