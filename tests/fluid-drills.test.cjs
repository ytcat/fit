const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};global.localStorage={getItem:()=>null,setItem(){}};global.CustomEvent=class{};global.dispatchEvent=()=>{};
for(const f of ['boxing-routines.js','boxing-pose.js','boxing-input.js','boxing-footwear.js','avatar-anatomy.js','avatar-detail.js','avatar-shoulder.js','boxing-coach-v2.js','contact-response.js','training-arena.js','boxing-fight.js','fight-referee.js','fight-arena.js','character-roster.js','training-gear.js','career-drills.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
data.shoulderCorrectives=JSON.parse(fs.readFileSync('assets/models/shoulder-correctives-v2.json'));
const c=new LionCoach(data),e={coach:c,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),targetMode:'none',animTime:0,isPlaying:true,technique:'guard',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=e.activeModel=c.root;e.scene.add(c.root);e.player=new BoxingInput(e);e.roster=new CoachRoster(e,data);e.arena=new TrainingArena(e,data);
const V=(...v)=>new THREE.Vector3(...v);

for(const species of ['lion','rabbit']){
 e.targetMode='none';e.roster.select(species);e.animTime=0;e.ropeDrill='two_feet';e.arena.setTarget('rope');const d=e.arena.careerDrill,values={back:[],chest:[],hips:[],ankle:[]};let nonplanar=0;
 for(let i=0;i<32;i++){
  const f=e.arena.update(i/16/1.72),j=e.coach.joints;
  values.back.push(e.coach.anatomy.value[11]);values.chest.push(j.chest.rotation.x);values.hips.push(e.coach.point(j.hips).x);values.ankle.push(j.footL.quaternion.x);
  const p=d.ropePoints,normal=p[96].clone().sub(p[0]).cross(p[48].clone().sub(p[0])).normalize();nonplanar=Math.max(nonplanar,Math.abs(p[24].clone().sub(p[0]).dot(normal)));
  assert.ok(f.rope.lowest>=.004,'the traveling cable cannot cross the floor');
 }
 const ranges=Object.fromEntries(Object.entries(values).map(([key,a])=>[key,Math.max(...a)-Math.min(...a)]));
 assert.ok(ranges.back>.05&&ranges.chest>.025&&ranges.hips>.025&&ranges.ankle>.04,'back recruitment, chest, lateral balance and ankles must visibly articulate');
 assert.ok(nonplanar>.01,'the cable must have a traveling bend, rather than rotate as a rigid plane');
 e.animTime=0;e.arena.setTarget('pads');const trainer=e.arena.careerDrill.trainer;let palmDown=1,maxError=0,minFloor=Infinity;const roots=[];
 for(const base of [2.4,7.2]){
  const arc=[];for(let i=0;i<=12;i++){
   const phase=i/12,f=e.arena.update(base+phase*1.2),drill=e.arena.careerDrill;
   const side=base<3?'L':'R',pad=drill.mitts[side==='L'?0:1],p=drill.face(pad);arc.push(p);
   roots.push(trainer.root.position.toArray());assert.ok(e.coach.root.position.distanceTo(trainer.root.position)>=1.15,'partners need room for full punches without standing chest to chest');
   if(phase>=.35&&phase<=.65){
    const normal=V(0,0,1).applyQuaternion(pad.getWorldQuaternion(new THREE.Quaternion()));palmDown=Math.min(palmDown,-normal.y);
    maxError=Math.max(maxError,...trainer.metrics.handErrors);
    const j=trainer.joints,distal=j['hand'+side].getWorldPosition(V()).sub(j['elbow'+side].getWorldPosition(V())).normalize(),long=V(0,-1,0).applyQuaternion(pad.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(distal.dot(long)>.999999,'a flat mitt is achieved by arm positioning and forearm roll, never a broken wrist');
   }
   for(const boxer of [e.coach,trainer])for(const foot of [boxer.joints.footL,boxer.joints.footR]){const sole=foot.children.find(n=>n.name==='Boxing boot sole'),p=sole.geometry.attributes.position;for(let v=0;v<p.count;v++)minFloor=Math.min(minFloor,sole.localToWorld(V().fromBufferAttribute(p,v)).y);}
  }
  const xs=arc.map(p=>p.x),ys=arc.map(p=>p.y);assert.ok(Math.max(...xs)-Math.min(...xs)>.28&&Math.max(...ys)-Math.min(...ys)>.10,'the mitt sweeps in a round arc and returns, rather than teleporting sideways');
 }
 console.log('sweep diagnostics',species,{palmDown,maxError,minFloor});assert.ok(palmDown>.8,'the catching palm faces down during the overhead pass');assert.ok(maxError<.03,'the sweep stays within real arm reach');assert.ok(minFloor>=.004,'both partners keep their soles above the floor');
 for(const p of roots)assert.deepEqual(p,[0,0,.60],'trainer weight shifts must not slide the complete character across the floor');
 for(const [t,index] of [[.35,0],[1.55,1]]){const f=e.arena.update(t);assert.equal(f.padPhase.targetIndex,index,'left/right fists meet the trainer’s anatomical left/right mitt as requested');}
 console.log(species,{ranges,nonplanar,palmDown,maxError,minFloor});
}
console.log('PASS coupled rope anatomy, traveling cable, anatomical same-hand mitt mapping, bilateral palm-down arcs, straight wrists, arm reach and grounded partners');
