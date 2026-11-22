/* GOTR-0032 v2 / GOTR-0027: punch drive and smoothness on the mitts and the heavy bag (headless, deterministic, 120 Hz).
   Usage (repo root): node qa/gotr-0032-v2/measure.cjs out.json      env CASES=pads,heavy  SPECIES=lion  GAPS=0.12,0.18,0.25
   Per single punch (pressed from a settled guard, Play):
     approach  striking-knuckle speed over the last tick before contact (m/s); peak = max before contact
     elbow     elbow angle of the striking arm at contact (deg)
     hipTurn / shoulderTurn  max change of the hip line / shoulder line yaw from the guard up to contact (deg)
     transfer  pelvis travel toward the target from the guard up to contact (cm); heel = rear-foot lift (cm)
     snapMs    time from contact until the striking knuckle is back within 6 cm of its guard position, relative to the head
     dvMax     largest per-tick velocity change of any knuckle/elbow, excluding the contact tick and the 3 after (m/s per tick)
     dvGuard   same for the non-striking (guard) knuckle; pops = isolated one-tick spikes (dv > 2.5 m/s, neighbours < half)
     popCm     mitt recoil / bag displacement peak (cm)
   Rapid sequences: coach-called style combinations pressed at GAPS spacing; per gap the largest per-tick velocity change
   of knuckles and elbows outside contact ticks, p99/p99.9 and the isolated pops. */
const fs=require('fs'),path=require('path');
const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
require('vm').runInThisContext(fs.readFileSync('padding-deformation.js','utf8'),{filename:'padding-deformation.js'});window.BoxingPadding.enable();
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),rearMove=m=>['cross','rear_hook','rear_uppercut'].includes(m),r1=x=>x==null?null:Math.round(x*10)/10,r2=x=>x==null?null:Math.round(x*100)/100;
const moves=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'],dt=1/120,POP=2.5;
const deg=THREE.MathUtils.radToDeg;
function sampler(e){
 const c=e.coach,j=c.joints,W=n=>n.getWorldPosition(V());
 return ()=>{c.root.updateMatrixWorld(true);const k=i=>c.root.localToWorld(V(...c.metrics.gloves[i].strikePoint));
  const fwd=V(0,0,1).transformDirection(c.root.matrixWorld);fwd.y=0;fwd.normalize();
  const yaw=(a,b)=>{const d=W(b).sub(W(a));return Math.atan2(d.x,d.z);};
  return {kn:[k(0),k(1)],el:[W(j.elbowL),W(j.elbowR)],sh:[W(j.armL),W(j.armR)],hips:W(j.hips),head:W(j.head),
   hipYaw:yaw(j.thighL,j.thighR),shYaw:yaw(j.armL,j.armR),fwd,feet:[W(j.footL),W(j.footR)],
   elbowAngle:[0,1].map(i=>{const s=i?'R':'L',a=W(j['arm'+s]),b=W(j['elbow'+s]),h=W(j['hand'+s]);return deg(a.sub(b).angleTo(h.sub(b)));})};};
}
function station(target,species){const e=engine(species);e.targetMode=target;e.player.setEnabled(true);e.arena.setTarget(target);e.technique='combo';e.currentAnim='one_two';return e;}
function runner(e){
 let t=0;const s=sampler(e),frames=[];
 const pop=()=>{if(e.arena.careerDrill){const m=e.arena.careerDrill.mitts;return Math.max(...m.map(p=>Math.abs(p.userData.recoil||0)));}const b=e.arena.models?.heavy;return b?Math.hypot(b.rotation.x,b.rotation.z)*1.0:0;};
 const step=()=>{t+=dt;e.animTime=t;const f=e.arena.update(t,e.technique,e.currentAnim);const fr=s();fr.t=t;fr.contacts=(f.contacts||[]).filter(c=>c.actor!==c.receiver&&c.receiver!=='platform').map(c=>({move:c.move,hand:c.hand,speed:c.closingSpeed??c.speed}));fr.pop=pop();fr.move=e.player.current?.move||'guard';frames.push(fr);return fr;};
 return {step,frames,get t(){return t;}};
}
function vel(a,b){return b.clone().sub(a).multiplyScalar(1/dt);}
// Largest per-tick velocity change over knuckles and elbows, skipping ticks near contacts.
function jerkScan(frames,from,to,skip){
 const keys=[['kn',0],['kn',1],['el',0],['el',1]];let best={dv:0};const list=[];
 for(let i=Math.max(from,2);i<Math.min(to,frames.length);i++){if(skip(i))continue;
  for(const [k,h] of keys){const v1=vel(frames[i-2][k][h],frames[i-1][k][h]),v2=vel(frames[i-1][k][h],frames[i][k][h]),dv=v2.distanceTo(v1);list.push({i,k,h,dv});if(dv>best.dv)best={dv,i,t:frames[i].t,track:k+(h?'R':'L'),move:frames[i].move,vBefore:v1.length(),vAfter:v2.length()};}}
 return {best,list};
}
function pops(list){
 const by={};for(const x of list)(by[x.k+x.h]=by[x.k+x.h]||{})[x.i]=x.dv;let n=0;const where=[];
 for(const [tr,m] of Object.entries(by))for(const [i,dv] of Object.entries(m)){const a=m[+i-1]??0,b=m[+i+1]??0;if(dv>POP&&a<dv*.5&&b<dv*.5){n++;where.push({track:tr,i:+i,dv:r2(dv)});}}
 return {n,where:where.sort((a,b)=>b.dv-a.dv).slice(0,6)};
}
function nearContact(frames,i){for(let k=0;k<=3;k++)if(frames[i-k]?.contacts.length)return true;return false;}
const ang=(a,b)=>{let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return Math.abs(deg(d));};
function single(target,species,move,keep){
 const e=station(target,species),r=runner(e);for(let i=0;i<144;i++)r.step();
 e.player.reset();r.step();const i0=r.frames.length,g=r.frames[i0-1];e.player.press(move);
 for(let i=0;i<Math.round(1.3/dt);i++)r.step();
 const F=r.frames,side=rearMove(move)?1:0;let ci=-1;for(let i=i0;i<F.length;i++)if(F[i].contacts.length){ci=i;break;}
 const sp=i=>F[i].kn[side].distanceTo(F[i-1].kn[side])/dt;let peak=0;const end=ci>0?ci:F.length;for(let i=i0+1;i<end;i++)peak=Math.max(peak,sp(i));
 const at=ci>0?ci:i0+Math.round(.32/dt),c=F[at];
 let hipTurn=0,shTurn=0,transfer=0,heel=0;for(let i=i0;i<=at;i++){hipTurn=Math.max(hipTurn,ang(F[i].hipYaw,g.hipYaw));shTurn=Math.max(shTurn,ang(F[i].shYaw,g.shYaw));transfer=Math.max(transfer,F[i].hips.clone().sub(g.hips).dot(g.fwd));heel=Math.max(heel,F[i].feet[1].y-g.feet[1].y);}
 // snap: back within 6 cm of the guard position relative to the head (a step in or out does not count against it)
 let snap=null;const rel=f=>f.kn[side].clone().sub(f.head);if(ci>0)for(let i=ci+1;i<F.length;i++)if(rel(F[i]).distanceTo(rel(g))<.06){snap=(i-ci)*dt*1000;break;}
 const scan=jerkScan(F,i0,F.length,i=>nearContact(F,i)),guard=scan.list.filter(x=>x.h!==side&&x.k==='kn');
 let popPeak=0;for(let i=i0;i<F.length;i++)popPeak=Math.max(popPeak,F[i].pop);
 const out={move,contact:ci>0,toContactMs:ci>0?Math.round((ci-i0)*dt*1000):null,approach:ci>0?r2(sp(ci-1)):null,closing:ci>0?r2(F[ci].contacts[0].speed):null,peak:r2(peak),elbow:r1(c.elbowAngle[side]),
  hipTurn:r1(hipTurn),shoulderTurn:r1(shTurn),transfer:r1(transfer*100),heel:r1(heel*100),snapMs:snap==null?null:Math.round(snap),
  dvMax:r2(scan.best.dv),dvAt:scan.best.track+'@'+Math.round((scan.best.t-F[i0].t)*1000)+'ms',dvGuard:r2(Math.max(0,...guard.map(x=>x.dv))),pops:pops(scan.list).n,popCm:r1(popPeak*100)};
 if(keep)out.frames=F.slice(i0-1);
 return out;
}
const CALLS=[['jab'],['jab','cross'],['jab','cross','hook'],['jab','cross','uppercut'],['hook','uppercut','hook'],['jab','cross','hook','rear_uppercut'],['jab','hook','cross','hook'],['uppercut','rear_hook','cross'],['cross','hook','cross'],['rear_uppercut','hook','cross','hook']];
function rapid(target,species,gap){
 const e=station(target,species),r=runner(e);for(let i=0;i<144;i++)r.step();e.player.reset();
 const out={gap,dvMax:0,where:null,pops:0,popList:[],refused:0,pressed:0};const allList=[];
 for(const seq of CALLS){const i0=r.frames.length;let k=0,next=r.t;
  while(k<seq.length||e.player.current||e.player.queue.length){if(k<seq.length&&r.t>=next-1e-9){out.pressed++;if(!e.player.press(seq[k]))out.refused++;k++;next=r.t+gap;}r.step();if(r.frames.length-i0>600)break;}
  for(let i=0;i<30;i++)r.step();
  const F=r.frames,s=jerkScan(F,i0,F.length,i=>nearContact(F,i));allList.push(...s.list);
  if(s.best.dv>out.dvMax){out.dvMax=s.best.dv;out.where={seq:seq.join('-'),track:s.best.track,move:s.best.move,ms:Math.round((s.best.t-F[i0].t)*1000),vBefore:r2(s.best.vBefore),vAfter:r2(s.best.vAfter)};}
 }
 const p=pops(allList);out.pops=p.n;out.popList=p.where;out.dvMax=r2(out.dvMax);
 const dvs=allList.map(x=>x.dv).sort((a,b)=>a-b);out.p99=r2(dvs[Math.floor(dvs.length*.99)]);out.p999=r2(dvs[Math.floor(dvs.length*.999)]);
 return out;
}
if(require.main===module){
 const file=process.argv[2],species=process.env.SPECIES||'lion',cases=(process.env.CASES||'pads,heavy').split(','),report={species};
 for(const target of cases){
  report[target]={singles:{},rapid:[]};console.log('== '+target);
  for(const m of moves){const s=single(target,species,m);report[target].singles[m]=s;console.log('  '+m.padEnd(14)+JSON.stringify(s));}
  for(const gap of (process.env.GAPS||'0.12,0.18,0.25').split(',').map(Number)){const s=rapid(target,species,gap);report[target].rapid.push(s);console.log('  rapid '+gap+' '+JSON.stringify(s));}
 }
 if(file)fs.writeFileSync(file,JSON.stringify(report,null,1));
}
module.exports={single,rapid,station,runner,jerkScan,pops,moves};
