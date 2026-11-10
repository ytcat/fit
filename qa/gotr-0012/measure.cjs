// GOTR-0012 headless mitt-work measurement. Usage (from the repo root):
//   node qa/gotr-0012/measure.cjs [out.json]          (TIMING=random for the Variable-rhythm Watch sequence)
// Reports, per species and per move, for the auto sequence (Watch) and manual Play mode:
// arm extension and elbow angle at the pad-contact event, contact yes/no, partner separation,
// planted-foot drift, root drift, wrist alignment, catching-arm shape and glove/pad clearances.
// All positions are measured in ARENA-LOCAL coordinates (boxer faces +z, coach faces -z).
const fs=require('fs'),vm=require('vm'),path=require('path');process.chdir(process.env.APP_ROOT||path.join(__dirname,'..','..'));
global.THREE=require(process.cwd()+'/assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','boxing-footwear.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','training-gear.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);
if(process.env.TIMING){e.practiceTiming=process.env.TIMING;e.practiceSeed=+(process.env.SEED||20261110);}
const V=(...a)=>new THREE.Vector3(...a),Q=()=>new THREE.Quaternion(),deg=r=>r*180/Math.PI,r1=n=>Math.round(n*10)/10,r3=n=>Math.round(n*1000)/1000;
const W=n=>n.getWorldPosition(V()),L=n=>e.arena.group.worldToLocal(n.isVector3?n.clone():W(n));
const rearMove=m=>['cross','rear_hook','rear_uppercut'].includes(m);
const arm=(coach,side)=>{const j=coach.joints,s=L(j['arm'+side]),el=L(j['elbow'+side]),h=L(j['hand'+side]);return {s,el,h,ext:100*s.distanceTo(h)/(s.distanceTo(el)+el.distanceTo(h)),elbow:deg(s.clone().sub(el).angleTo(h.clone().sub(el)))};};
// Conservative head/torso ellipsoids (same shapes the rope clearance uses) in bone space.
const volumes=coach=>{const j=coach.joints,v=[[j.head,[0,.12,.015],[.205,.24,.195],'skull'],[j.head,[0,.055,.20],[.17,.13,.16],'muzzle'],[j.chest,[0,.10,0],[.32,.26,.255],'chest'],[j.spine,[0,.07,.01],[.255,.25,.21],'abdomen']];if(coach.species==='lion')v.push([j.head,[0,.065,-.065],[.36,.38,.28],'mane']);for(const ear of coach.rabbitEars||[])v.push([ear,[0,.20,0],[.068,.26,.048],'ear']);return v;};
// Approximate signed distance (metres) from a world point to the nearest listed volume.
const clearance=(coach,world,names)=>{let best=Infinity,part='';for(const [node,centre,radii,name] of volumes(coach)){if(names&&!names.includes(name))continue;const p=node.worldToLocal(world.clone()).sub(V(...centre)),k=Math.hypot(p.x/radii[0],p.y/radii[1],p.z/radii[2]),d=(k-1)*p.length()/Math.max(k,1e-6);if(d<best){best=d;part=name;}}return {d:best,part};};
const padPoints=pad=>{const f=pad.userData.face,out=[pad.localToWorld(f.clone())];for(let i=0;i<8;i++){const a=i/8*Math.PI*2;out.push(pad.localToWorld(V(Math.cos(a)*.131,-.12+Math.sin(a)*.155,.083)));}return out;};
const wristAlign=(coach,side)=>{const j=coach.joints,distal=W(j['hand'+side]).sub(W(j['elbow'+side])).normalize(),long=V(0,-1,0).applyQuaternion(j['hand'+side].getWorldQuaternion(Q()));return distal.dot(long);};
function tracker(d){
 const hero=e.coach,tr=d.trainer,state={rootDrift:0,slide:0,slideWho:'',minHeads:Infinity,minWrist:1,roots:null,feet:{},lifted:{}};
 return {state,sample(f){
  e.scene.updateMatrixWorld(true);
  const roots=[hero.root.position.clone(),tr.root.position.clone()];if(!state.roots)state.roots=roots;else state.rootDrift=Math.max(state.rootDrift,roots[0].distanceTo(state.roots[0]),roots[1].distanceTo(state.roots[1]));
  state.minHeads=Math.min(state.minHeads,L(hero.joints.head).distanceTo(L(tr.joints.head)));
  for(const [who,coach,metrics] of [['boxer',hero,f.hero],['coach',tr,f.partner]])for(const foot of metrics?.footTargets||[]){
   const key=who+foot.side,now=L(coach.root.localToWorld(V(...foot.contact))),before=state.feet[key];
   // A planted sole (no lift on this and the previous tick) must stay exactly where it is.
   if(before&&before.lift<1e-6&&foot.lift<1e-6){const drift=Math.hypot(now.x-before.p.x,now.z-before.p.z);if(drift>state.slide){state.slide=drift;state.slideWho=key;}}
   if(foot.lift>1e-6)state.lifted[key]=Math.max(state.lifted[key]||0,foot.lift);
   state.feet[key]={p:now,lift:foot.lift};
  }
  for(const coach of [hero,tr])for(const side of ['L','R'])state.minWrist=Math.min(state.minWrist,wristAlign(coach,side));
 }};
}
function summarise(move,frames,d){
 const hero=e.coach,tr=d.trainer,rear=rearMove(move),side=rear?'R':'L',gi=rear?1:0,row={move,contact:false};
 let peak=0,peakElbow=0,defence=0,minGloveCoach=Infinity,gloveCoachPart='',minPadBoxer=Infinity,padBoxerPart='',maxHeroErr=0,maxCoachErr=0,start=null,headTravel=0,shoulderTravel=0,hipTravel=0,minPadGap=Infinity;
 for(const fr of frames){
  const a=fr.arm[side];if(start===null)start=fr;
  if(fr.phase>.15&&fr.phase<.8&&a.ext>peak){peak=a.ext;peakElbow=a.elbow;}
  defence+=fr.defences;headTravel=Math.max(headTravel,fr.head.z-start.head.z);shoulderTravel=Math.max(shoulderTravel,a.s.z-start.arm[side].s.z);hipTravel=Math.max(hipTravel,fr.hips.z-start.hips.z);
  if(fr.gloveCoach.d<minGloveCoach){minGloveCoach=fr.gloveCoach.d;gloveCoachPart=fr.gloveCoach.part;}
  if(fr.padBoxer.d<minPadBoxer){minPadBoxer=fr.padBoxer.d;padBoxerPart=fr.padBoxer.part;}
  maxHeroErr=Math.max(maxHeroErr,...fr.heroErr);maxCoachErr=Math.max(maxCoachErr,...fr.coachErr);minPadGap=Math.min(minPadGap,fr.padGap[gi]);
  if(fr.contact&&!row.contact){const t=fr.coachArm[side];Object.assign(row,{contact:true,ext:r1(a.ext),elbow:r1(a.elbow),speed:+fr.contact.closingSpeed.toFixed(2),phase:+fr.phase.toFixed(3),hipYaw:r1(fr.hipYaw),chestYaw:r1(fr.chestYaw),coachExt:r1(t.ext),coachElbow:r1(t.elbow),offCentre:r3(Math.hypot(fr.contact.localPoint[0]-0,fr.contact.localPoint[1]+.12))});}
 }
 return Object.assign(row,{peakExt:r1(peak),peakElbow:r1(peakElbow),defence:move==='roll'?defence>0:undefined,shoulderTravel:r3(shoulderTravel),hipTravel:r3(hipTravel),headTravel:r3(headTravel),minPadGap:r3(minPadGap),minGloveToCoach:r3(minGloveCoach),gloveCoachPart,minPadToBoxer:r3(minPadBoxer),padBoxerPart,maxHeroErr:r3(maxHeroErr),maxCoachErr:r3(maxCoachErr)});
}
function frameRecord(f,d){
 const hero=e.coach,tr=d.trainer,j=hero.joints;
 const gloves=[0,1].map(i=>hero.root.localToWorld(V(...f.hero.gloves[i].knuckles)));
 let gloveCoach={d:Infinity,part:''};for(const g of gloves){const c=clearance(tr,g);c.d-=.078;if(c.d<gloveCoach.d)gloveCoach=c;}
 let padBoxer={d:Infinity,part:''};for(const pad of d.mitts)for(const p of padPoints(pad)){const c=clearance(hero,p);if(c.d<padBoxer.d)padBoxer=c;}
 const padGap=[0,1].map(i=>d.mitts[i].localToWorld(d.mitts[i].userData.face.clone()).distanceTo(hero.root.localToWorld(V(...f.hero.gloves[i].strikePoint))));
 return {move:f.hero.move,phase:f.hero.phase,arm:{L:arm(hero,'L'),R:arm(hero,'R')},coachArm:{L:arm(tr,'L'),R:arm(tr,'R')},head:L(j.head),hips:L(j.hips),hipYaw:deg(j.hips.rotation.y),chestYaw:deg(j.hips.rotation.y+j.spine.rotation.y+j.chest.rotation.y),contact:f.contacts?.[0]||null,defences:f.defences||0,gloveCoach,padBoxer,padGap,heroErr:f.hero.handErrors,coachErr:f.partner.handErrors};
}
function geometry(d){const hero=e.coach,tr=d.trainer;e.scene.updateMatrixWorld(true);const lead=arm(hero,'L'),pad=L(d.mitts[0].localToWorld(d.mitts[0].userData.face.clone())),kn=L(hero.root.localToWorld(V(...hero.metrics.gloves[0].strikePoint)));
 return {rootSeparation:r3(L(hero.root).distanceTo(L(tr.root))),headToHead:r3(L(hero.joints.head).distanceTo(L(tr.joints.head))),chestToChest:r3(L(hero.joints.chest).distanceTo(L(tr.joints.chest))),armLength:r3(lead.s.distanceTo(lead.el)+lead.el.distanceTo(lead.h)),guardKnuckleToPad:r3(pad.z-kn.z)};}
const out={generated:new Date().toISOString().slice(0,10),timing:e.practiceTiming||'sync',species:{}};
for(const species of ['lion','rabbit']){
 const result=out.species[species]={};
 // ---- Watch mode: two full passes of the eight-move coach sequence.
 e.targetMode='none';e.roster.select(species);e.player.setEnabled(false);e.animTime=0;e.arena.setTarget('pads');let d=e.arena.careerDrill,track=tracker(d),beats=[],current=null,guardGeometry=null;
 const horizon=e.practiceTiming==='random'?40:19.2;
 for(let tick=1;tick<=Math.round(horizon*120);tick++){const f=e.arena.update(tick/120);track.sample(f);const rec=frameRecord(f,d);
  if(tick===2)guardGeometry=geometry(d);
  const key=rec.move==='guard'?null:(f.padPhase?.index??Math.floor(tick/120/1.2))+':'+rec.move;
  if(key&&(!current||current.key!==key)){current={key,move:rec.move,frames:[]};beats.push(current);}if(!key)current=null;
  if(current)current.frames.push(rec);}
 result.geometry=guardGeometry;result.watch=beats.filter(b=>b.frames.length>20).map(b=>summarise(b.move,b.frames,d));
 result.watchIntegrity={rootDrift:r3(track.state.rootDrift),plantedFootSlide:r3(track.state.slide),slideWho:track.state.slideWho,liftedFeet:Object.fromEntries(Object.entries(track.state.lifted).map(([k,v])=>[k,r3(v)])),minHeadToHead:r3(track.state.minHeads),minWristAlignment:+track.state.minWrist.toFixed(6)};
 // ---- Manual Play mode: each move pressed alone after the coach has settled, then a fast mixed chain.
 e.player.setEnabled(true);result.manual=[];let manualSlide=0,manualRoot=0,manualWrist=1;
 for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut','roll']){
  e.animTime=0;e.arena.setTarget('pads');e.player.reset();d=e.arena.careerDrill;track=tracker(d);let t=0;for(;t<1.5;t+=1/120){e.animTime=t;track.sample(e.arena.update(t));}
  if(!e.player.press(move))throw Error('press '+move);const frames=[];
  for(let i=0;i<150;i++){t+=1/120;e.animTime=t;const f=e.arena.update(t);track.sample(f);const rec=frameRecord(f,d);if(rec.move===move)frames.push(rec);}
  result.manual.push(summarise(move,frames,d));manualSlide=Math.max(manualSlide,track.state.slide);manualRoot=Math.max(manualRoot,track.state.rootDrift);manualWrist=Math.min(manualWrist,track.state.minWrist);
 }
 // Mixed chain: every punch queued as fast as the input layer accepts it.
 {e.animTime=0;e.arena.setTarget('pads');e.player.reset();d=e.arena.careerDrill;track=tracker(d);let t=0;for(;t<.5;t+=1/120){e.animTime=t;track.sample(e.arena.update(t));}
  const order=['hook','jab','rear_uppercut','cross','roll','jab','uppercut','cross','rear_hook','jab'],landed=[],chain=[];let next=0,defences=0;
  for(let i=0;i<1200&&(next<order.length||e.player.current);i++){if(next<order.length&&!e.player.current&&!e.player.queue.length&&e.player.press(order[next]))next++;t+=1/120;e.animTime=t;const f=e.arena.update(t);track.sample(f);defences+=f.defences||0;for(const hit of f.contacts){const a=arm(e.coach,hit.hand);landed.push(hit.move);chain.push({move:hit.move,ext:r1(a.ext),elbow:r1(a.elbow)});}}
  result.manualChain={order,landed,defences,contacts:chain,plantedFootSlide:r3(track.state.slide),rootDrift:r3(track.state.rootDrift)};}
 result.manualIntegrity={rootDrift:r3(manualRoot),plantedFootSlide:r3(manualSlide),minWristAlignment:+manualWrist.toFixed(6)};
 e.player.setEnabled(false);
}
const file=process.argv[2];if(file)fs.writeFileSync(path.resolve(__dirname,file),JSON.stringify(out,null,1));
for(const [species,r] of Object.entries(out.species)){
 console.log('\n== '+species+' ==',JSON.stringify(r.geometry));
 const cols=['move','contact','ext','elbow','speed','phase','peakExt','defence','hipYaw','chestYaw','shoulderTravel','hipTravel','coachExt','coachElbow','offCentre','minGloveToCoach','minPadToBoxer','padBoxerPart'];
 console.log('Watch ('+out.timing+')');console.table(r.watch.slice(0,16).map(x=>Object.fromEntries(cols.map(k=>[k,x[k]]))));console.log(JSON.stringify(r.watchIntegrity));
 console.log('Manual Play');console.table(r.manual.map(x=>Object.fromEntries(cols.map(k=>[k,x[k]]))));console.log(JSON.stringify(r.manualIntegrity),JSON.stringify(r.manualChain));
}
