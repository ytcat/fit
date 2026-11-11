// Layout survey of the current fight screen (before Burst): element rectangles and screenshots.
// Usage: node qa/gotr-0005/survey-layout.cjs <outdir> [port]
const {chromium}=require('playwright');
const out=process.argv[2]||'.',port=process.argv[3]||8152;
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
for(const [name,vp] of [['phone',{width:393,height:852}],['small',{width:360,height:640}],['land',{width:852,height:393}],['desk',{width:1366,height:768}]]){
 const p=await b.newPage({viewport:vp});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:'+port);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
 for(const mode of ['watch','play']){
  await p.evaluate(mode=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById(mode==='play'?'playMode':'watchMode').click();},mode);
  await p.waitForTimeout(6000);
  const rects=await p.evaluate(()=>{const sel=['#fightHud','#fightHealth','#camLock','#playBtn','#manualStatus','.manual-pages','.input-mode-switch','.game-loadout','#manualControls','.manual-rail[data-side=lead]','.manual-rail[data-side=rear]','#stageContainer','.club-view-tools','.club-stage-heading','#burstControl','footer'];return sel.map(s=>{const n=document.querySelector(s);if(!n||!n.offsetParent&&s!=='footer')return [s,'hidden'];const r=n.getBoundingClientRect();return [s,[r.left,r.top,r.right,r.bottom].map(Math.round).join(',')];});});
  console.log(name,mode,JSON.stringify(rects));
  await p.screenshot({path:`${out}/${name}-${mode}.png`});
 }
 if(errors.length)console.log('ERR',errors);await p.close();}
await b.close();})().catch(e=>{console.error('FAIL',e);process.exit(1);});
