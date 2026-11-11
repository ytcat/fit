/* GOTR-0037 frame cost of muscle definition: render-time sampling at phone size.
   402x690 CSS px at DPR 3 (mobile emulation), quality pinned to the default level (3: DPR 1.5,
   1024 shadow map) and the floor (0: DPR 1, no shadows). The engine loop is replaced by a fixed
   60 Hz clock; every renderer.render call (shadow pass included) is timed and closed with a
   1-pixel readPixels so the GPU work is inside the sample.
   SwiftShader (software WebGL) on a shared 4-core VM is NOT a phone GPU: use the numbers only as a
   relative before/after check; builds are interleaved (A B A B ...) to spread machine noise.
   Usage: node qa/gotr-0037/perf.cjs <rounds> <label=url> <label=url> ...  -> JSON on stdout */
const {chromium}=require('playwright');
const [,,roundsArg='2',...builds]=process.argv,rounds=+roundsArg;
const SCENES={heavy:"ringfighterGame.startTraining({mode:'heavy'})",fight:"ringfighterGame.startFight({seed:20261111,watch:true})"};
async function measure(url){
 const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:402,height:690},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await p.goto(url);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
 const out={};
 for(const [scene,start] of Object.entries(SCENES)){
  await p.evaluate(start);await p.waitForTimeout(1500);
  for(const level of [3,0]){
   out[scene+'@'+level]=await p.evaluate(async level=>{
    const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    if(!window.__loop){window.__loop=e.animate;e.animate=()=>{};await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));e.clock.getDelta=()=>1/60;window.__clock=0;}
    e.qualityLock=level;e.updateQuality(0);
    const r=e.renderer,render=r.render,gl=r.getContext(),px=new Uint8Array(4),times=[];
    r.render=function(s,c){const t=performance.now();render.call(this,s,c);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);times.push(performance.now()-t);};
    for(let i=0;i<70;i++){window.__clock+=1000/60;e.isPlaying=true;e.lastRenderStamp=null;window.__loop(window.__clock);}
    r.render=render;const s=times.slice(10).sort((a,b)=>a-b),q=k=>+s[Math.floor(s.length*k)].toFixed(2);
    const info=r.info.render;return {median:q(.5),p90:q(.9),samples:s.length,canvas:[e.canvas.width,e.canvas.height],triangles:info.triangles,calls:info.calls};
   },level);
  }
 }
 out.definitionBuildMs=await p.evaluate(()=>{const d=window.AvatarAnatomy?.definition;if(!d)return null;const g=app.engine.coach.skin.geometry,t=performance.now();d.build(g,'probe'+Date.now());return +(performance.now()-t).toFixed(1);});
 await b.close();return out;
}
(async()=>{const results={};
 for(let round=0;round<rounds;round++)for(const spec of builds){const [label,url]=spec.split('=');const r=await measure(url);(results[label]=results[label]||[]).push(r);console.error(label,'round',round,JSON.stringify(r));}
 const summary={};for(const [label,runs] of Object.entries(results)){summary[label]={};for(const key of Object.keys(runs[0])){if(typeof runs[0][key]!=='object'||runs[0][key]===null){summary[label][key]=runs.map(r=>r[key]);continue;}const med=runs.map(r=>r[key].median).sort((a,b)=>a-b);summary[label][key]={median:med[Math.floor(med.length/2)],runs:med,triangles:runs[0][key].triangles,canvas:runs[0][key].canvas};}}
 console.log(JSON.stringify(summary,null,1));})().catch(e=>{console.error('FAIL',e);process.exit(1);});
