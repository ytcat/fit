/* GOTR-0027 / GOTR-0028 motion measurement (headless, deterministic, no GPU).
   Usage (repo root): node qa/gotr-0027/measure.cjs out.json [label]
   env CASES=heavy,shadow,pads,spar,fight  SPECIES=lion,rabbit  SECONDS=8
   Per mode and frame schedule (steady 60 Hz, phone-like 16.7/33.3/50 ms mix, dense 480 Hz):
   - glove (wrist) speed, per-frame velocity change (|dv|) and the largest velocity jumps,
   - pose time lag (display time minus the time the shown pose belongs to) and its jitter,
   - CPU milliseconds per update (idle frames vs frames with a punch in flight),
   - planted-foot slide of every fighter (sole point moving while its foot is not lifted),
     split into frames within 0.6 s after a hit on that fighter and all other frames. */
const fs=require('fs'),path=require('path');
const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
// As in the browser: glove and bag padding deform in the vertex shader, not on the CPU.
require('vm').runInThisContext(fs.readFileSync('padding-deformation.js','utf8'),{filename:'padding-deformation.js'});global.location=undefined;window.BoxingPadding.enable();
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const r3=x=>x==null?null:Math.round(x*1000)/1000;
const q=(xs,p)=>{xs=xs.filter(Number.isFinite);if(!xs.length)return null;const s=[...xs].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor((s.length-1)*p+.5))];};
const now=()=>Number(process.hrtime.bigint())/1e6;
// Deterministic phone-like schedule: mostly 60 Hz, with held frames (2x, 3x periods).
function schedule(kind,seconds){
 const out=[];let t=0,seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 while(t<seconds){let d=1/60;if(kind==='dense')d=1/480;else if(kind==='tick120')d=1/120;else if(kind==='phone'){const r=rnd();d=r<.70?1/60:r<.90?2/60:3/60;}t+=d;out.push(d);}
 return out;
}
function setup(mode,species){
 const e=engine(species);e.technique='combo';e.currentAnim='one_two';
 if(mode==='fight'){e.player.setEnabled(false);e.targetMode='fight';e.fightOptions={preset:'quick',seed:11};e.arena.setTarget('fight');const m=e.arena.fightView.match;m.phase=m.phase==='intro'?m.phase:m.phase;}
 else if(mode==='pads'){e.targetMode='none';e.arena.setTarget('pads');}
 else if(mode==='shadow'){e.targetMode='none';e.arena.setTarget('none');}
 else if(mode==='spar'){e.targetMode='rabbit';e.arena.setTarget('rabbit');}
 else {e.targetMode='heavy';e.arena.setTarget('heavy');}
 return e;
}
function actors(e,mode){
 const a=e.arena;
 if(mode==='fight')return {hero:a.fightView.coaches[e.coach.species==='rabbit'?'rabbit':'lion'],partner:a.fightView.coaches[e.coach.species==='rabbit'?'lion':'rabbit']};
 if(mode==='spar')return {hero:e.coach,partner:a.rabbit};
 if(mode==='pads')return {hero:e.coach,partner:a.careerDrill?.trainer||null};
 return {hero:e.coach,partner:null};
}
const sole=(coach,side)=>coach.joints['foot'+side].localToWorld(V(0,-.102,.215));
function run(mode,species,kind,seconds){
 const e=setup(mode,species),list=schedule(kind,seconds),A=actors(e,mode),fight=mode==='fight'?e.arena.fightView:null;
 if(fight){const m=fight.match;/* skip the intro so the round runs */for(let i=0;i<60*12&&m.phase!=='round';i++){fight.update((fight.tick+1)/60);}}
 let t=fight?fight.tick/60:0;e.animTime=t;e.arena.update(t,e.technique,e.currentAnim);
 const frames=[],hitTimes={hero:[],partner:[]},prevFeet={},cost={idle:[],punch:[]};let first=t;
 for(const d of list){
  const dt=Math.min(d,.05);t+=dt;e.animTime=t;
  const c0=now(),frame=e.arena.update(t,e.technique,e.currentAnim),c1=now();
  for(const hit of frame.contacts||[]){
   const receiver=hit.receiver;const who=mode==='fight'?(fight.coaches[receiver]===A.hero?'hero':'partner'):receiver==='rabbit'?'partner':receiver==='lion'?'hero':null;if(who)hitTimes[who].push(t);
  }
  const hero=A.hero,move=fight?fight.specs?.[hero===fight.coaches.lion?'lion':'rabbit']?.move:hero.metrics?.move,attack=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'].includes(move);
  (attack?cost.punch:cost.idle).push(c1-c0);
  const poseTime=fight?fight.tick/60:frame?.poseTime??(['heavy','dummy','speed'].includes(e.arena.mode)?e.arena.previousTime:t);
  const rec={t,dt,move,attack,poseTime,cpu:c1-c0,contacts:(frame.contacts||[]).length,hands:['L','R'].map(s=>hero.joints['hand'+s].getWorldPosition(V()).toArray()),feet:{}};
  for(const [who,coach] of Object.entries(A)){if(!coach)continue;rec.feet[who]=coach.metrics.footTargets.map(f=>{const p=sole(coach,f.side);return {side:f.side,lift:f.lift||0,p:p.toArray()};});}
  frames.push(rec);
 }
 return {frames,hitTimes,cost,first};
}
function analyse({frames,hitTimes,cost},kind){
 // Glove velocity per frame and the change in velocity from one frame to the next.
 const speeds=[],jumps=[];
 for(let i=1;i<frames.length;i++){
  const a=frames[i-1],b=frames[i];b.v=b.hands.map((p,k)=>p.map((x,j)=>(x-a.hands[k][j])/b.dt));b.speed=b.v.map(v=>Math.hypot(...v));speeds.push(...b.speed);
  if(a.v){for(let k=0;k<2;k++){const dv=Math.hypot(...b.v[k].map((x,j)=>x-a.v[k][j]));jumps.push({t:r3(b.t),hand:k?'R':'L',dv:r3(dv),acc:r3(dv/b.dt),move:b.move,speed:r3(b.speed[k])});}}
 }
 jumps.sort((x,y)=>y.dv-x.dv);
 const lag=frames.map(f=>f.t-f.poseTime),mean=lag.reduce((s,x)=>s+x,0)/lag.length,jitter=Math.sqrt(lag.reduce((s,x)=>s+(x-mean)**2,0)/lag.length);
 // Displayed step vs. elapsed time: an "uneven" frame shows a pose step that is not proportional to its display interval.
 const steps=frames.slice(1).map((f,i)=>({shown:f.poseTime-frames[i].poseTime,real:f.t-frames[i].t})),uneven=steps.filter(s=>Math.abs(s.shown-s.real)>.004).length;
 // Planted-foot slide per fighter.
 const slide={};
 for(const who of Object.keys(frames[0].feet)){
  const after=t=>hitTimes[who].some(h=>t>=h&&t<=h+.6);let hitMax=0,hitSum=0,otherMax=0,otherSum=0,hitFrames=0,slidingFrames=0;
  for(let i=1;i<frames.length;i++){
   for(let k=0;k<2;k++){
    const a=frames[i-1].feet[who][k],b=frames[i].feet[who][k];if(a.lift>.002||b.lift>.002)continue;
    const d=Math.hypot(b.p[0]-a.p[0],b.p[2]-a.p[2]);
    if(after(frames[i].t)){hitMax=Math.max(hitMax,d);hitSum+=d;if(d>.002)slidingFrames++;}else{otherMax=Math.max(otherMax,d);otherSum+=d;}
   }
   if(after(frames[i].t))hitFrames++;
  }
  slide[who]={hits:hitTimes[who].length,hitFrames,maxPerFrameAfterHit_mm:r3(hitMax*1000),totalAfterHits_mm:r3(hitSum*1000),framesSlidingOver2mm:slidingFrames,maxPerFrameOtherwise_mm:r3(otherMax*1000),totalOtherwise_mm:r3(otherSum*1000)};
 }
 return {frames:frames.length,gloveSpeed:{p50:r3(q(speeds,.5)),p99:r3(q(speeds,.99)),max:r3(Math.max(...speeds))},
  velocityJump:{p50:r3(q(jumps.map(j=>j.dv),.5)),p99:r3(q(jumps.map(j=>j.dv),.99)),max:r3(jumps[0]?.dv),top:jumps.slice(0,5)},
  poseLag_ms:{mean:r3(mean*1000),jitter:r3(jitter*1000),max:r3(Math.max(...lag)*1000)},unevenFrames:uneven,
  cpu_ms:{idleP50:r3(q(cost.idle,.5)),idleP95:r3(q(cost.idle,.95)),punchP50:r3(q(cost.punch,.5)),punchP95:r3(q(cost.punch,.95)),punchFrames:cost.punch.length},slide};
}
if(require.main===module){
 const out=process.argv[2],label=process.argv[3]||'run',cases=(process.env.CASES||'heavy,shadow,pads,spar,fight').split(','),species=(process.env.SPECIES||'lion,rabbit').split(','),seconds=+(process.env.SECONDS||8),kinds=(process.env.KINDS||'steady,phone,dense').split(',');
 const report={label,seconds,results:{}};
 for(const mode of cases)for(const s of species)for(const kind of kinds){
  if(mode==='fight'&&kind==='dense')continue;
  const res=analyse(run(mode,s,kind,seconds),kind);report.results[mode+'-'+s+'-'+kind]=res;
  process.stderr.write([mode,s,kind,'speed p99',res.gloveSpeed.p99,'dv p99/max',res.velocityJump.p99,res.velocityJump.max,'lag jitter',res.poseLag_ms.jitter,'uneven',res.unevenFrames,'cpu idle/punch',res.cpu_ms.idleP50,res.cpu_ms.punchP50,res.cpu_ms.punchP95,'slide',JSON.stringify(res.slide)].join(' ')+'\n');
 }
 if(out)fs.writeFileSync(out,JSON.stringify(report,null,1));
}
module.exports={run,analyse,schedule,setup};
