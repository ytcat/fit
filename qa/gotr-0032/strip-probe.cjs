/* GOTR-0032: why mitt screenshots did not show the stepped pose. Prints the fighter's move, lead/rear wrist
   positions and the drill clock after manual 120 Hz steps in the real app. Usage: node qa/gotr-0032/strip-probe.cjs */
const {chromium}=require('playwright');const url=process.env.QA_URL||'http://127.0.0.1:8161/';
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});try{const p=await b.newPage({viewport:{width:430,height:640}});p.setDefaultTimeout(300000);
 await p.goto(url);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:300000});
 const r=await p.evaluate(()=>{try{if(!app.engine.career?.store?.current?.())app.engine.career.store.guest();}catch{}document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  const e=app.engine,out=[];ringfighterGame.startTraining({mode:'pads',play:true});const t0=e.animTime;e.isPlaying=false;let t=t0;
  const step=()=>{t+=1/120;e.animTime=t;return e.arena.update(t);};const hand=()=>e.coach.joints.handR.getWorldPosition(new THREE.Vector3()).toArray().map(x=>+x.toFixed(3));
  for(let i=0;i<60;i++)step();out.push({mode:e.arena.mode,drill:!!e.arena.careerDrill,enabled:e.player.enabled,t0,hand:hand()});
  const pressed=e.player.press('cross');out.push({pressed,current:!!e.player.current});
  for(let i=1;i<=40;i++){const f=step();if(i%8===0||f.contacts?.length)out.push({i,move:e.coach.metrics?.move,phase:+(e.coach.metrics?.phase||0).toFixed(2),hand:hand(),contacts:f.contacts?.length||0,poseTime:f.poseTime});}
  return out;});
 console.log(JSON.stringify(r,null,0));}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
