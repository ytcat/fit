const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.window=global;global.THREE=require('../assets/vendor/three.min.js');
for(const f of ['boxing-routines.js','boxing-fight.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
// Load the controller without building a scene; exercise its production walker.
global.TrainingArena=function(){};TrainingArena.prototype={setTarget(){},update(){},fitCamera(){}};
vm.runInThisContext(fs.readFileSync('fight-arena.js','utf8'));
const match=new BoxingFight({seed:72});match.phase='round';const view={match,travelLast:null,travelTime:0};
const walk=()=>FightArena.prototype.ringTravel.call(view);
let previous=walk(),different=0,maxStep=0;
for(let i=0;i<600;i++){
 match.time+=1/60;const now=walk();
 if(Math.abs(now.lion.phase-now.rabbit.phase)>.12)different++;
 for(const actor of ['lion','rabbit']){
  const p=now[actor].from.clone().lerp(now[actor].to,now[actor].ease),old=previous[actor].from.clone().lerp(previous[actor].to,previous[actor].ease);
  maxStep=Math.max(maxStep,p.distanceTo(old));assert.ok(Math.abs(p.x)<1&&Math.abs(p.z)<1.1);assert.ok(p.x-p.z<=.780001,'official corner remains clear');
 }
 previous=now;
}
assert.ok(different>300,'stride clocks must differ throughout a bout');assert.ok(maxStep<.025,'roots must follow continuous bounded steps');
const paused=JSON.stringify(walk());assert.equal(JSON.stringify(walk()),paused,'repeated pose must not advance walkers');
match.attack('lion','jab','head');for(let i=0;i<40;i++){match.time+=1/60;walk();}
const planted=view.walkers.lion.time,moving=view.walkers.rabbit.time;match.time+=.05;walk();assert.equal(view.walkers.lion.time,planted,'striking fighter plants');assert.ok(view.walkers.rabbit.time>moving,'opponent retains independent movement');
function bout(seed){const m=new BoxingFight({seed,rounds:1,roundSeconds:70});m.phase='round';for(let i=0;i<3600;i++)m.advance(1/60);return m;}
const a=bout(8),b=bout(8);assert.deepEqual(a.events,b.events,'same seed and time reproduce tactical choices');
const combos=a.events.filter(e=>e.type==='combination');assert.ok(new Set(combos.map(e=>e.tactic)).size>=3,'multiple tactical families');assert.ok(combos.some(e=>e.length>=4));
for(const actor of ['lion','rabbit']){assert.ok(a.totals[actor].thrown>8);assert.equal(a.totals[actor].landed,0,'tactical intent never fabricates contact');}
a.setPlayer('lion');assert.deepEqual(a.fighters.lion.plan,[],'manual takeover clears AI queue');
console.log('PASS independent planted walkers, bounded paths, reproducible tactical combinations and contact-only scoring',{different,maxStep,tactics:[...new Set(combos.map(e=>e.tactic))]});
global.document={createElement:()=>({getContext:()=>({})})};vm.runInThisContext(fs.readFileSync('training-gear.js','utf8'));
for(const species of ['lion','rabbit'])for(const side of ['L','R']){
 const hand=new THREE.Bone(),glove=new THREE.Group();hand.add(glove);const coach={species,joints:{['hand'+side]:hand}},grip=TrainingGear.ropeGrip(coach,side),paw=grip.getObjectByName('Connected '+species+' gripping paw');
 assert.ok(paw,'species-specific continuous paw mesh');paw.geometry.computeBoundingBox();const box=paw.geometry.boundingBox,width=box.max.x-box.min.x;
 assert.ok(width>(species==='lion'?.155:.125),'paw must match forearm scale');assert.ok([...paw.geometry.attributes.normal.array].every(Number.isFinite));
 hand.updateMatrixWorld(true);const exit=grip.worldToLocal(grip.userData.exit.getWorldPosition(new THREE.Vector3()));assert.ok(Math.abs(exit.x)>Math.max(Math.abs(box.min.x),Math.abs(box.max.x))+.015,'cable outlet clears the broader paw');
 assert.equal(glove.visible,false);TrainingGear.dispose(grip);assert.equal(glove.visible,true,'leaving skipping restores boxing gloves');
}
console.log('PASS proportionate species paws, finite normals, clear cable outlets and glove restoration');
