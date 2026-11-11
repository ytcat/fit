/* GOTR-0032 mitt-work power measurement (headless, deterministic, 120 Hz like the pad clock).
   Usage (repo root): node qa/gotr-0032/measure.cjs out.json [label]
   For each of the six punches pressed alone in Play (lion and rabbit), and for the Watch sequence:
   - striking knuckle speed 1 and 2 ticks before contact, peak before contact, approach/peak,
   - closing speed recorded by the contact event, time from press to contact,
   - mitt face displacement after contact (peak, ms to peak, back within 2 cm by), coach wrist/elbow/shoulder give,
   - straights: elbow angle and extension at contact (GOTR-0012),
   - planted-foot slide of both partners during the punch. */
const fs=require('fs'),path=require('path');
const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
require('vm').runInThisContext(fs.readFileSync('padding-deformation.js','utf8'),{filename:'padding-deformation.js'});window.BoxingPadding.enable();
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),r3=x=>x==null?null:Math.round(x*1000)/1000,rear=m=>['cross','rear_hook','rear_uppercut'].includes(m),deg=THREE.MathUtils.radToDeg;
const moves=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
function state(e){
 const d=e.arena.careerDrill,hero=e.coach,tr=d.trainer,W=n=>n.getWorldPosition(V());
 return {knuckle:['L','R'].map((s,i)=>hero.root.localToWorld(V(...hero.metrics.gloves[i].strikePoint))),face:d.mitts.map(p=>p.localToWorld(p.userData.face.clone())),normal:d.mitts.map(p=>V(0,0,1).transformDirection(p.matrixWorld)),
  coach:{L:{hand:W(tr.joints.handL),elbow:W(tr.joints.elbowL),shoulder:W(tr.joints.armL)},R:{hand:W(tr.joints.handR),elbow:W(tr.joints.elbowR),shoulder:W(tr.joints.armR)},chest:W(tr.joints.chest)},
  heroArm:['L','R'].map(s=>({shoulder:W(hero.joints['arm'+s]),elbow:W(hero.joints['elbow'+s]),hand:W(hero.joints['hand'+s])})),
  soles:[hero,tr].map(c=>c.metrics.footTargets.map(f=>({lift:f.lift||0,p:c.joints['foot'+f.side].localToWorld(V(0,-.102,.215))})))};
}
function punch(e,move,dt){
 const side=rear(move)?1:0,sideName=side?'R':'L';let t=e.animTime;
 if(!e.player.press(move))return {pressed:false};
 const t0=t,frames=[];let contact=null;
 for(let i=0;i<Math.round(1.6/dt);i++){t+=dt;e.animTime=t;const f=e.arena.update(t);const s=state(e);s.t=t-t0;frames.push(s);const hit=(f.contacts||[]).find(h=>h.receiver==='pads');if(hit&&!contact)contact={i:frames.length-1,closing:hit.closingSpeed,impulse:hit.impulse};}
 const sp=i=>i>0?frames[i].knuckle[side].distanceTo(frames[i-1].knuckle[side])/dt:0;
 const out={pressed:true,landed:!!contact};
 let slide=0;for(let i=1;i<frames.length;i++)for(let a=0;a<2;a++)for(let k=0;k<2;k++){const p=frames[i-1].soles[a][k],q=frames[i].soles[a][k];if(p.lift>.002||q.lift>.002)continue;slide=Math.max(slide,Math.hypot(q.p.x-p.p.x,q.p.z-p.p.z));}
 out.plantedSlideMax_mm=r3(slide*1000);
 if(!contact)return out;
 const c=contact.i;let peak=0;for(let i=1;i<=c;i++)peak=Math.max(peak,sp(i));
 // Speed into the mitt: the tick that ends at contact is partly through the pad, so report the two before it too.
 Object.assign(out,{toContact:r3(frames[c].t),closing:r3(contact.closing),speedContactTick:r3(sp(c)),speedBefore1:r3(sp(c-1)),speedBefore2:r3(sp(c-2)),peakBefore:r3(peak),approachOverPeak:r3(sp(c-1)/peak)});
 // Mitt face travel after contact, relative to the face at the contact tick.
 const f0=frames[c].face[side];let disp=0,at=0,back=null;for(let i=c;i<Math.min(frames.length,c+Math.round(.5/dt));i++){const d=frames[i].face[side].distanceTo(f0);if(d>disp){disp=d;at=frames[i].t-frames[c].t;}}
 for(let i=c+1;i<frames.length;i++){if(frames[i].t-frames[c].t>at&&frames[i].face[side].distanceTo(f0)<.02){back=frames[i].t-frames[c].t;break;}}
 const g=k=>{let m=0;for(let i=c;i<Math.min(frames.length,c+Math.round(.3/dt));i++)m=Math.max(m,frames[i].coach[sideName][k].distanceTo(frames[c].coach[sideName][k]));return m;};
 let chest=0;for(let i=c;i<Math.min(frames.length,c+Math.round(.3/dt));i++)chest=Math.max(chest,frames[i].coach.chest.distanceTo(frames[c].coach.chest));
 // How deep the striking knuckle point goes past the mitt face plane around contact (positive = into the pad).
 let depth=-1;for(let i=Math.max(0,c-2);i<Math.min(frames.length,c+Math.round(.1/dt));i++)depth=Math.max(depth,-frames[i].knuckle[side].clone().sub(frames[i].face[side]).dot(frames[i].normal[side]));out.knuckleIntoPad_cm=r3(depth*100);
 Object.assign(out,{mittPeakDisp_cm:r3(disp*100),mittPeakAt_ms:Math.round(at*1000),mittBackWithin2cm_ms:back==null?null:Math.round(back*1000),coachHandGive_cm:r3(g('hand')*100),coachElbowGive_cm:r3(g('elbow')*100),coachShoulderGive_cm:r3(g('shoulder')*100),coachChestGive_cm:r3(chest*100)});
 if(move==='jab'||move==='cross'){const a=frames[c].heroArm[side],u=a.elbow.clone().sub(a.shoulder),l=a.hand.clone().sub(a.elbow);out.elbowAngle=Math.round(180-deg(u.angleTo(l)));out.extension=r3(a.hand.distanceTo(a.shoulder)/(u.length()+l.length()));}
 // Settle so the next punch starts from guard.
 for(let i=0;i<Math.round(.6/dt);i++){t+=dt;e.animTime=t;e.arena.update(t);}
 return out;
}
function fresh(species,dt){const e=engine(species);e.targetMode='pads';e.player.setEnabled(true);e.arena.setTarget('pads');let t=0;for(;t<1.2;t+=dt){e.animTime=t;e.arena.update(t);}e.animTime=t;e.player.reset();return e;}
// Reaction attributable to the hit: the same punch with the mitt contact suppressed ("ghost") is subtracted.
function reaction(species,move,dt){
 const side=rear(move)?1:0,sideName=side?'R':'L',run=ghost=>{const e=fresh(species,dt),P=CareerDrill.prototype,real=P.contactWithMitt;if(ghost)P.contactWithMitt=function(...a){real.apply(this,a);return false;};
  const frames=[];let t=e.animTime,c=null;e.player.press(move);try{for(let i=0;i<Math.round(1.2/dt);i++){t+=dt;e.animTime=t;const f=e.arena.update(t);frames.push(state(e));if(c==null&&(f.contacts||[]).some(h=>h.receiver==='pads'))c=i;}}finally{P.contactWithMitt=real;}return {frames,c};};
 const a=run(false),b=run(true);if(a.c==null)return null;const n=Math.min(a.frames.length,b.frames.length),win=Math.min(n,a.c+Math.round(.4/dt));
 const d=(get)=>{let m=0,at=0;for(let i=a.c;i<win;i++){const v=get(a.frames[i]).distanceTo(get(b.frames[i]));if(v>m){m=v;at=(i-a.c)*dt;}}return [m,at];};
 const [mitt,mittAt]=d(f=>f.face[side]),[hand]=d(f=>f.coach[sideName].hand),[elbow]=d(f=>f.coach[sideName].elbow),[shoulder]=d(f=>f.coach[sideName].shoulder),[chest]=d(f=>f.coach.chest),[glove,gloveAt]=d(f=>f.knuckle[side]);
 let back=null;for(let i=a.c+Math.round(mittAt/dt)+1;i<win;i++)if(a.frames[i].face[side].distanceTo(b.frames[i].face[side])<.01){back=(i-a.c)*dt;break;}
 return {mittPop_cm:r3(mitt*100),mittPopAt_ms:Math.round(mittAt*1000),mittPopUnder1cm_ms:back==null?null:Math.round(back*1000),coachHand_cm:r3(hand*100),coachElbow_cm:r3(elbow*100),coachShoulder_cm:r3(shoulder*100),coachChest_cm:r3(chest*100),strikerGlove_cm:r3(glove*100),strikerGloveAt_ms:Math.round(gloveAt*1000)};
}
function play(species,dt=1/120){
 const res={};
 for(const move of moves){const e=fresh(species,dt);res[move]=punch(e,move,dt);res[move].reaction=reaction(species,move,dt);}
 return res;
}
function watch(species,dt=1/120,seconds=9.6){
 const e=engine(species);e.targetMode='pads';e.player.setEnabled(false);e.arena.setTarget('pads');const res=[];let t=0,last=null;
 for(;t<seconds;t+=dt){e.animTime=t;const f=e.arena.update(t),s=state(e);for(const h of f.contacts||[])if(h.receiver==='pads'){const side=rear(h.move)?1:0;res.push({move:h.move,closing:r3(h.closingSpeed),speedTick:last?r3(s.knuckle[side].distanceTo(last.knuckle[side])/dt):null});}last=s;}
 return res;
}
if(require.main===module){
 const out=process.argv[2],label=process.argv[3]||'run',report={label,play:{},watch:{}};
 for(const s of (process.env.SPECIES||'lion').split(',')){report.play[s]=play(s);report.watch[s]=watch(s);}
 for(const s of Object.keys(report.play))for(const m of moves){const r=report.play[s][m];console.log(s.padEnd(6),m.padEnd(13),'closing',r.closing,'before',r.speedBefore2,r.speedBefore1,'peak',r.peakBefore,'mitt',r.mittPeakDisp_cm,'cm@',r.mittPeakAt_ms,'back',r.mittBackWithin2cm_ms,'give hand/elbow/shoulder/chest',r.coachHandGive_cm,r.coachElbowGive_cm,r.coachShoulderGive_cm,r.coachChestGive_cm,r.elbowAngle!=null?'elbow '+r.elbowAngle+' ext '+r.extension:'','into pad cm',r.knuckleIntoPad_cm,'slide',r.plantedSlideMax_mm,'\n   reaction',JSON.stringify(r.reaction));}
 console.log('watch lion',JSON.stringify(report.watch.lion));
 if(out)fs.writeFileSync(out,JSON.stringify(report,null,1));
}
module.exports={play,watch};
