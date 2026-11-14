// GOTR-0076: the corner break between rounds (fight-corner.js) on the real fight scene (mirrored cast, both rigs).
// Sequence order and timing, hips at stool height while sitting, props gone before the bell, the bell changes nothing,
// skip, short breaks, no break in single-round bouts, no stool through the ropes.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','boxing-footwear.js','adventure/story/story-cast.js','adventure/story/street-wear.js','adventure/story/dream-pose.js','fight-corner.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data),e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),coach,animTime:0,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};
e.demoModel=coach.root;e.scene.add(coach.root);const arena=e.arena=new TrainingArena(e,data);
const {TIMELINE:T,STATES,SEAT}=FightCorner,order=STATES.map(s=>s[0]);
function bout(options){e.fightOptions={seed:3,...options};arena.setTarget('fight');const view=arena.fightView,m=view.match;for(const f of Object.values(m.fighters))f.next=Infinity;m.decide=()=>{};return {view,m};}
// run to the end of round 1 without punches, then through the break at 30 fps
function toRest(view,m,start){let t=start;while(m.phase!=='rest'&&t<start+60){arena.update(t+=1/30,'fight','one_two');}return t;}

{ // a 20 s break: every step in order, inside the break
 const {view,m}=bout({rounds:2,roundSeconds:2,restSeconds:20});const corner=view.corner;assert.ok(corner,'the fight view has a corner break');corner.cornermen();assert.ok(corner.men.lion&&corner.men.rabbit,'Bruno and Brick work the corners');const cm={ropes:1,heads:1,hand:1,at:{}};
 assert.equal(view.cast.scale.x,-1,'the cast stays mirrored');
 let t=toRest(view,m,0);assert.equal(m.phase,'rest');
 const seen=[],sitting=[],stoolBad=[],last={};let towelSeen=false,bottleAtMouth=Infinity,beforeBell=null;
 while(m.phase==='rest'){
  arena.update(t+=1/30,'fight','one_two');if(m.phase!=='rest')break;
  const n=corner.n,state=corner.state;if(seen[seen.length-1]!==state)seen.push(state);
  for(const actor of ['lion','rabbit']){
   const c=view.coaches[actor],p=corner.props[actor];assert.equal(c.root.parent,view.cast,'fighters stay in the mirrored cast');assert.equal(c.root.scale.x,1);
   const hips=view.cast.worldToLocal(c.joints.hips.getWorldPosition(V())),stool=p.stool.position;
   if(n>T.sit[1]+.1&&n<T.stand[0]-.05)sitting.push({actor,hip:hips.y,clear:Math.min(...['chest','head','armL','armR','hips','elbowL','elbowR'].map(k=>{const p=view.cast.worldToLocal(c.joints[k].getWorldPosition(V()));return 1.65-Math.max(Math.abs(p.x),Math.abs(p.z));})),off:Math.hypot(hips.x-stool.x,hips.z-stool.z),feet:['L','R'].map(s=>view.cast.worldToLocal(c.joints['foot'+s].getWorldPosition(V())).y),stoolY:stool.y,errors:c.metrics.footTargets.map(f=>f.error)});
   // the stool never passes through the ropes: near a rope line it is above the top rope or inside the ring clear of it
   if(p.stool.visible){const edge=1.65-Math.max(Math.abs(stool.x),Math.abs(stool.z));if(Math.abs(edge)<.197&&[.36,.65,.94,1.23].some(r=>r>stool.y-.012&&r<stool.y+SEAT+.012))stoolBad.push([n.toFixed(2),stool.toArray().map(v=>v.toFixed(2))]);}
   if(p.draped?.visible)towelSeen=true;
   // cornermen (owner v1.68): trunk, head and legs outside the ropes while at the ring; head gap >= 10 cm; paws never inside the head
   if(n>T.cmIn[1]&&n<T.cmOut[0]){const c=corner.clearance(actor);for(const k of ['ropes','heads','hand'])if(c[k]<cm[k]){cm[k]=c[k];cm.at[k]=actor+' '+state+' '+n.toFixed(2);}}
   if(p.bottle.visible&&n>T.drink[0]&&n<T.drink[1]){const mouth=corner.mouth(actor);bottleAtMouth=Math.min(bottleAtMouth,p.bottle.position.distanceTo(mouth));}
  }
  if(m.restSeconds-m.phaseTime<.05)beforeBell={stool:Object.values(corner.props).map(p=>p.stool.visible),towel:Object.values(corner.props).map(p=>!!p.draped?.visible||!!p.held?.visible),bottle:Object.values(corner.props).map(p=>p.bottle.visible),roots:Object.fromEntries(['lion','rabbit'].map(a=>[a,view.coaches[a].root.position.clone()]))};
 }
 assert.deepEqual(seen,order,'break steps in order: '+seen.join(' > '));
 assert.ok(corner.log.every(s=>s.time<=m.restSeconds),'every step starts inside the break');
 assert.ok(sitting.length>100,'both fighters sit for several seconds');
 for(const s of sitting){
  assert.ok(Math.abs(s.stoolY)<1e-6,'the stool stands on the canvas while he sits');
  assert.ok(s.hip>SEAT+.05&&s.hip<SEAT+.15,s.actor+' hips at stool height: hip joint '+s.hip.toFixed(3)+' over a '+SEAT+' m seat');
  assert.ok(s.off<.12,s.actor+' hips over the stool ('+s.off.toFixed(3)+' m off centre)');
  assert.ok(s.feet.every(y=>y<.2),'feet on the canvas');assert.ok(s.clear>.14,s.actor+' body joints stay '+s.clear.toFixed(3)+' m inside the ropes');assert.ok(s.errors.every(x=>x<.003),'legs reach their feet');
 }
 assert.deepEqual(stoolBad,[],'stool through the ropes');
 assert.ok(cm.ropes>=0,'cornerman body inside the ropes by '+(-cm.ropes).toFixed(3)+' m at '+cm.at.ropes);assert.ok(cm.heads>=.10,'cornerman head '+cm.heads.toFixed(3)+' m from the fighter\'s at '+cm.at.heads);assert.ok(cm.hand>=.2,'cornerman paw '+cm.hand.toFixed(3)+' m from the fighter\'s head centre at '+cm.at.hand);
 assert.ok(towelSeen,'a towel is draped over the shoulders');assert.ok(bottleAtMouth<.06,'the bottle reaches the mouth ('+bottleAtMouth.toFixed(3)+')');
 assert.ok(beforeBell,'sampled just before the bell');assert.deepEqual(beforeBell.stool,[false,false],'stools gone before the bell');assert.deepEqual(beforeBell.towel,[false,false],'towels gone before the bell');assert.deepEqual(beforeBell.bottle,[false,false]);
 // the bell: round 2 starts where the walk back ended (no jump)
 assert.equal(m.phase,'round');assert.equal(m.round,2);assert.equal(corner.active,false);
 for(const a of ['lion','rabbit'])assert.ok(view.coaches[a].root.position.distanceTo(beforeBell.roots[a])<.06,a+' moves '+view.coaches[a].root.position.distanceTo(beforeBell.roots[a]).toFixed(3)+' m at the bell');
 assert.ok(Object.values(corner.props).every(p=>!p.draped),'draped towels removed from the rigs');
 console.log('cornermen clearance: ropes',cm.ropes.toFixed(3),'heads',cm.heads.toFixed(3),'paw-head',cm.hand.toFixed(3),cm.at);console.log('20 s break:',seen.join(' > '),'| hips over seat',Math.min(...sitting.map(s=>s.hip-SEAT)).toFixed(3),'-',Math.max(...sitting.map(s=>s.hip-SEAT)).toFixed(3),'| bottle at mouth',bottleAtMouth.toFixed(3));
}
{ // a short break (8 s, the Docks): the same steps, scaled; and skipping a break
 const {view,m}=bout({rounds:3,roundSeconds:2,restSeconds:8});const corner=view.corner;let t=toRest(view,m,0);const seen=[];
 while(m.phase==='rest'){arena.update(t+=1/30,'fight','one_two');if(m.phase==='rest'&&seen[seen.length-1]!==corner.state)seen.push(corner.state);}
 assert.deepEqual(seen,order,'short break steps in order');
 t=toRest(view,m,t);assert.equal(m.phase,'rest');for(let i=0;i<90;i++)arena.update(t+=1/30,'fight','one_two');assert.equal(corner.state,'drink');
 m.phaseTime=m.restSeconds;arena.update(t+=1/30,'fight','one_two'); // what "Skip break" does
 assert.equal(m.phase,'round');assert.equal(corner.active,false);assert.ok(Object.values(corner.props).every(p=>!p.stool.visible&&!p.bottle.visible&&!p.draped),'skip clears the corner');
}
{ // ringless venue: the stool is set down by the fighter's side of the floor, no lift over ropes
 const {view,m}=bout({rounds:2,roundSeconds:2,restSeconds:20});view.ring.visible=false;const corner=view.corner;let t=toRest(view,m,0),top=0;const seen=[];
 while(m.phase==='rest'){arena.update(t+=1/30,'fight','one_two');if(m.phase!=='rest')break;if(seen[seen.length-1]!==corner.state)seen.push(corner.state);for(const p of Object.values(corner.props))if(p.stool.visible)top=Math.max(top,p.stool.position.y);}
 assert.deepEqual(seen,order,'ringless break steps in order');assert.ok(top<1.0,'no lift over ropes that are not there ('+top.toFixed(2)+')');view.ring.visible=true;
}
{ // single-round bouts have no break
 for(const options of [{rounds:1,roundSeconds:2,restSeconds:10},{rounds:1,roundSeconds:2,restSeconds:0}]){const {view,m}=bout(options);let t=0,active=false;while(!(m.phase==='ceremony'&&m.phaseTime>1)&&t<40){arena.update(t+=1/30,'fight','one_two');active=active||view.corner.active||m.phase==='rest';}
  assert.equal(active,false,'no break in a one-round bout');}
}
{ // the stools stand in the corners of their colour, seen from the arena (the cast is mirrored)
 const {view,m}=bout({rounds:2,roundSeconds:2,restSeconds:20});let t=toRest(view,m,0);while(view.corner.n<6)arena.update(t+=1/30,'fight','one_two');
 const pads=[];view.ring.traverse(o=>{if(o.isMesh&&o.geometry.type==='BoxGeometry'&&o.geometry.parameters.width===.13)pads.push(o);});
 for(const [actor,hex] of [['lion',0x973d38],['rabbit',0x315d91]]){const stool=view.corner.props[actor].stool.getWorldPosition(V()),near=pads.reduce((a,b)=>a.getWorldPosition(V()).distanceTo(stool)<b.getWorldPosition(V()).distanceTo(stool)?a:b);
  assert.equal(near.material.color.getHex(),hex,actor+' stool in the corner of its colour');assert.ok(near.getWorldPosition(V()).setY(0).distanceTo(stool.setY(0))<.7);}
 arena.setTarget('none');assert.equal(coach.root.parent,e.scene,'the rig goes back after the bout');
}
console.log('PASS corner break: order and timing, sitting on the stool, props cleared before the bell, seamless bell, short break, skip, one-round bouts, corner colours with the mirrored cast');
