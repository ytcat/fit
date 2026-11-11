// GOTR-0036: seconds of round time until each fighter's Burst meter is full, in Watch fights (AI vs AI).
const {chromium}=require('playwright');
const url=process.argv[2]||'http://127.0.0.1:8131/',fights=+(process.argv[3]||3);
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const out=[];
 for(let k=0;k<fights;k++){const t0=Date.now(),log=m=>console.error(((Date.now()-t0)/1000).toFixed(0)+'s '+m);const p=await b.newPage({viewport:{width:480,height:320}});
  await p.goto(url);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:180000});
  log('loaded');await p.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.quick();});
  await p.waitForFunction(()=>app.engine.arena?.fightView?.match,null,{timeout:120000});
  log('match');await p.evaluate(()=>document.getElementById('watchMode')?.click());const iv=setInterval(()=>p.evaluate(()=>{const m=app.engine.arena?.fightView?.match;return m?m.phase+' '+m.time.toFixed(1)+' '+m.fighters.lion.burst.charge.toFixed(2):'none'}).then(log).catch(()=>{}),30000);
  const r=await p.evaluate(()=>new Promise(done=>{const full={},samples=[];let last=-1;const tick=()=>{const m=app.engine.arena?.fightView?.match;if(!m){requestAnimationFrame(tick);return;}
   if(m.phase==='round'){const t=+m.time.toFixed(2);for(const a of ['lion','rabbit']){const s=m.burstState(a);if(full[a]===undefined&&(s.status==='ready'||s.status==='queued'||s.status==='active'))full[a]=t;}
    if(Math.floor(t/5)!==last){last=Math.floor(t/5);samples.push([t,+m.fighters.lion.burst.charge.toFixed(2),+m.fighters.rabbit.burst.charge.toFixed(2)]);}}
   if(m.result||m.time>60||(full.lion!==undefined&&full.rabbit!==undefined))return done({full,samples,result:!!m.result,time:+m.time.toFixed(1)});requestAnimationFrame(tick);};tick();}));
  clearInterval(iv);out.push(r);console.log(JSON.stringify(r));await p.close();}
 await b.close();})();
