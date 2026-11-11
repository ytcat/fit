// GOTR-0036: round time until each fighter's Burst meter is first full, in Watch fights (AI vs AI, 20 s quick fight).
// Software WebGL renders ~1 fps, so like qa/gotr-0005/browser.cjs this advances the real fight clock
// (arena.update -> match.advance with real poses and the real contact solver) in 1/60 s steps without rendering.
const {chromium}=require('playwright');
const url=process.argv[2]||'http://127.0.0.1:8131/',fights=+(process.argv[3]||4);
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:480,height:320}});
 await p.goto(url);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
 const rows=[];
 for(let k=0;k<fights;k++){
  const r=await p.evaluate(async seed=>{const e=app.engine;document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   ringfighterGame.startFight({watch:true,seed});document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   const render=e.renderer.render.bind(e.renderer);e.renderer.render=()=>{};
   const wait=ms=>new Promise(r=>setTimeout(r,ms));const full={},samples={};let n=0,t=0,hits={lion:0,rabbit:0};
   for(let i=0;i<400&&!e.arena?.fightView?.match;i++)await wait(50);
   const m=e.arena.fightView.match;
   while(!m.result&&t<40){if(e.cameraDirector?.holdsClock){e.cameraDirector.skipIntro?.();await wait(30);if(++n>2000)break;continue;}
    e.animTime+=1/60;t+=1/60;const f=e.arena.update(e.animTime);e.career?.onFrame?.(f,1/60);
    if(m.phase==='round'){for(const a of ['lion','rabbit']){const s=m.burstState(a);if(full[a]===undefined&&['ready','queued','active'].includes(s.status))full[a]=+m.time.toFixed(2);}
     const sec=Math.floor(m.time/5)*5;if(samples[sec]===undefined)samples[sec]=[+m.fighters.lion.burst.charge.toFixed(2),+m.fighters.rabbit.burst.charge.toFixed(2)];}
    if(Math.round(t*60)%30===0)await wait(0);}
   e.renderer.render=render;const tot=m.totals||{};
   return {seed,full,samples,end:+m.time.toFixed(1),landed:{lion:tot.lion?.landed,rabbit:tot.rabbit?.landed},used:{lion:m.fighters.lion.burst.used,rabbit:m.fighters.rabbit.burst.used}};},11+k*7);
  rows.push(r);console.log(JSON.stringify(r));}
 const firsts=rows.flatMap(r=>['lion','rabbit'].map(a=>r.full[a]));const got=firsts.filter(x=>x!==undefined);
 console.log(JSON.stringify({fighters:firsts.length,filled:got.length,meanFirstFull:got.length?+(got.reduce((a,b)=>a+b,0)/got.length).toFixed(1):null,firsts}));
 await b.close();})();
