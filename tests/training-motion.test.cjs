const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
for(const f of ['boxing-routines.js','boxing-input.js','boxing-footwear.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','training-gear.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);
const V=(...v)=>new THREE.Vector3(...v);
for(const species of ['lion','rabbit']){
 e.targetMode='none';e.roster.select(species);e.targetMode='pads';e.animTime=0;e.arena.setTarget('pads');const d=e.arena.careerDrill;let previous=[],maxStep=0,maxTurn=0,hits=0,ducks=0;
 for(let tick=0;tick<=576;tick++){
  const f=e.arena.update(tick/120);hits+=f.contacts.length;ducks+=f.defences;
  for(const [i,pad] of d.mitts.entries()){
   assert.equal(pad.parent,d.trainer.joints[i?'handR':'handL'],'mitt must inherit its actual hand transform');assert.ok(pad.position.length()<1e-9,'no detached root-space placement');
   const wrist=pad.getWorldPosition(V()),hand=pad.parent.getWorldPosition(V());assert.ok(wrist.distanceTo(hand)<1e-9);
   const point=pad.localToWorld(pad.userData.face.clone()),rotation=pad.getWorldQuaternion(new THREE.Quaternion());if(previous[i]){maxStep=Math.max(maxStep,point.distanceTo(previous[i].point));maxTurn=Math.max(maxTurn,rotation.angleTo(previous[i].rotation));}previous[i]={point,rotation};
   assert.ok(point.distanceTo(wrist)<.20,'pad fits the hand instead of hovering ahead of it');
  }
 }
 console.log(species,'mitt motion',{maxStep,maxTurn,hits,ducks});assert.ok(maxStep<.065,'no teleport between mitt poses at 120 Hz');assert.ok(maxTurn<.25,'no wrist orientation flips');assert.ok(hits>=3&&ducks>=1);
 const face=d.mitts[0].getObjectByName('Concave leather catching face'),positions=face.geometry.attributes.position,normals=face.geometry.attributes.normal;face.geometry.computeBoundingBox();assert.ok(face.geometry.boundingBox.max.x-face.geometry.boundingBox.min.x>.23,'professional pad width');assert.ok(normals.getZ(250)>.8,'catch face must face the boxer');assert.ok(d.mitts[0].getObjectByName('Continuous padded sidewall').geometry.attributes.normal.getX(0)>.8,'closed padded sidewall must face outwards');
 for(const exercise of Object.keys(CareerDrill.ropeDrills)){
  e.ropeDrill=exercise;e.animTime=0;e.targetMode='rope';e.arena.setTarget('rope');const rope=e.arena.careerDrill,cadence=CareerDrill.ropeDrills[exercise].cadence;let before,after;const motion={hips:[],shoulder:[],elbow:[],wrist:[],head:[],toe:[],flex:[],handTuck:[],elbowTuck:[]};let points;
  for(let tick=0;tick<=80;tick++){
   const phase=tick/40,t=phase/cadence,f=e.arena.update(t),r=f.rope;const ends=rope.grips.map(g=>rope.root.worldToLocal(g.userData.exit.getWorldPosition(V())));
   const j=e.coach.joints,hips=e.coach.point(j.hips),shoulder=e.coach.point(j.armL),elbow=e.coach.point(j.elbowL),wrist=e.coach.point(j.handL);motion.handTuck.push(Math.abs(wrist.x-hips.x));motion.elbowTuck.push(Math.abs(elbow.x-hips.x));motion.hips.push(hips.y);motion.shoulder.push(shoulder.y-hips.y);motion.elbow.push(elbow.x);motion.wrist.push(wrist.z);motion.head.push(j.head.rotation.x);motion.toe.push(V(0,0,1).applyQuaternion(j[exercise==='right_leg'?'footR':'footL'].getWorldQuaternion(new THREE.Quaternion())).y);const distal=j.handL.getWorldPosition(V()).sub(j.elbowL.getWorldPosition(V())).normalize(),knuckle=V(0,-1,0).applyQuaternion(j.handL.getWorldQuaternion(new THREE.Quaternion()));motion.flex.push(distal.angleTo(knuckle));if(points)assert.equal(rope.ropePoints,points,'reuse the rope centreline buffer');points=rope.ropePoints;
   for(const [index,side] of ['L','R'].entries()){
    const hand=j['hand'+side],palm=V(0,0,1).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(palm.y>.65,'rope palms face up throughout the revolution');
    const origin=rope.root.worldToLocal(hand.getWorldPosition(V()));
    assert.ok((ends[index].x-origin.x)*(index?1:-1)>.03,'swivel exits outward after the palm-up grip rotation');
   }
   for(let k=1;k<rope.ropePoints.length;k++){const normals=rope.rope.geometry.attributes.normal,a=V().fromBufferAttribute(normals,(k-1)*6),b=V().fromBufferAttribute(normals,k*6);assert.ok(a.dot(b)>0,'transported cable frame must not flip as branches clear the body');}
   assert.ok(rope.ropePoints[0].distanceTo(ends[0])<1e-8&&rope.ropePoints[96].distanceTo(ends[1])<1e-8,'cable must meet both handle swivels');
   for(let side=0;side<2;side++){const foot=e.coach.joints[side?'footR':'footL'],sole=foot.children.find(n=>n.name==='Boxing boot sole'),p=sole.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=sole.localToWorld(V().fromBufferAttribute(p,i));assert.ok(v.y>=.004,'support boot cannot sink into the gym floor');}}
   if(tick===0){let headTop=-Infinity;e.coach.joints.head.traverse(n=>{if(n.isMesh){const p=n.geometry.attributes.position;for(let i=0;i<p.count;i+=4)headTop=Math.max(headTop,n.localToWorld(V().fromBufferAttribute(p,i)).y);}});console.log(species,exercise,{headTop,ropeTop:r.centre[1]});assert.ok(r.centre[1]>headTop+.01,'overhead rope must clear the mane and ears');const p=rope.rope.geometry.attributes.position,n=rope.rope.geometry.attributes.normal,radial=V().fromBufferAttribute(p,48*6).sub(rope.ropePoints[48]).normalize();assert.ok(radial.dot(V().fromBufferAttribute(n,48*6))>.85,'cable surface must face outward');}
   if(tick===19)before=r.centre;if(tick===21)after=r.centre;
   if(tick===20){assert.ok(r.lowest>.005&&r.lowest<r.jump+.015,'rope passes below the airborne soles and above the floor');if(exercise==='two_feet')assert.deepEqual(r.footLifts,[0,0]);if(exercise==='left_leg')assert.ok(r.footLifts[0]===0&&r.footLifts[1]>.19);if(exercise==='right_leg')assert.ok(r.footLifts[1]===0&&r.footLifts[0]>.19);}
   if(exercise==='alternating'&&[0,40].includes(tick)){assert.ok(r.footLifts[tick===0?1:0]>.17,'alternate the raised leg each revolution');}
  }
  assert.ok(Math.max(...motion.handTuck)<.37,'rope hands stay beside the hips instead of spreading wide');assert.ok(Math.max(...motion.elbowTuck)<.40,'rope elbows remain tucked beside the rib cage');console.log(species,exercise,'compact arms',{hand:Math.max(...motion.handTuck),elbow:Math.max(...motion.elbowTuck)});
  const range=key=>Math.max(...motion[key])-Math.min(...motion[key]);assert.ok(range('hips')>.025&&range('shoulder')>.01&&range('wrist')>.04&&range('head')>.015,'rope motion must articulate the torso, shoulders, hands and head, not just translate the root');assert.ok(range('toe')>.04,'ankles articulate through loading and landing');assert.ok(Math.max(...motion.flex)>.04&&Math.max(...motion.flex)<.18,'small rope-specific wrist flex stays bounded');
  assert.ok(after[2]<before[2],'forward skipping travels front to back under the feet');assert.ok(rope.rope.isMesh,'rope has a visible round cross-section');assert.equal(rope.grips[0].parent,e.coach.joints.handL);
 }
 e.targetMode='none';e.arena.setTarget('none');assert.ok(e.coach.gloveMeshes.L.visible&&e.coach.gloveMeshes.R.visible,'leaving rope restores boxing gloves');
}
console.log('PASS attached full-size mitts, continuous motion, live target contacts, forward rope, handle attachment, four footwork exercises and grounded boots');
