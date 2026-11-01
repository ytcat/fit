// Physical scene, target reach and shared-clock partner regressions.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface.json'));
const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,320/640,.1,100),coach:new LionCoach(data),animTime:0,technique:'combo',currentAnim:'sparring_flow',fitCameraToModel(){}};
e.demoModel=e.coach.root;e.scene.add(e.demoModel);const arena=e.arena=new TrainingArena(e,data);
assert.equal(BOXING_ROUTINES.list.length,12);assert.equal(new Set(BOXING_ROUTINES.list.map(r=>r.id)).size,12);
for(const r of BOXING_ROUTINES.list)for(const m of r.moves)assert.ok(COACH_TECHNIQUES[m],r.id+' unknown move '+m);
const attack=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
for(const mode of ['heavy','dummy']){
 arena.setTarget(mode);
 for(const move of attack){
  e.animTime=0;arena.update(0,move,'one_two');let hits=0;
  for(let p=.25;p<.65;p+=.02){const m=arena.update(p*1.22,move,'one_two');if(m.hit)hits++;assert.ok(m.hero.handErrors.every(n=>n<.001),mode+' unreachable '+move);assert.ok(m.hero.footTargets.every(f=>f.error<.001),mode+' foot placement out of reach: '+move);}
  assert.ok(hits>0,mode+' fist must reach target for '+move);
  for(let p=0;p<1;p+=.03){const m=arena.update(p*1.22,move,'one_two');assert.ok(m.hero.footTargets.every(f=>f.error<.001),mode+' stepping must keep feet reachable: '+move);}
 }
 const m=arena.models[mode],pivot=m.userData.swing;arena.update(.50*1.22,'cross','one_two');
 assert.ok(Number.isFinite(pivot.rotation.x));
 assert.equal(arena.group.children.length,2,'one selected target at a time');
 console.log('PASS',mode,'all six punches reach the target');
}
arena.setTarget('rabbit');assert.ok(arena.rabbit.rabbitEars.length===2);assert.equal(arena.rabbit.mane.geometry.attributes.position.count,0,'rabbit must have rabbit anatomy, no lion mane');
function fist(coach,m){return coach.root.localToWorld(new THREE.Vector3(...m.hands[0]).addScaledVector(new THREE.Vector3(...m.gloves[0].distal),.20));}
for(const [move,p] of [['slip',.40],['roll',.48]]){
 const guard=arena.update(0,move,'one_two');const guardHead=e.coach.joints.head.localToWorld(new THREE.Vector3(0,.17,.04));
 const m=arena.update(p*1.22,move,'one_two');assert.equal(m.counter.move,move==='slip'?'jab':'hook');assert.ok(m.counter.attack);
 const head=e.coach.joints.head.localToWorld(new THREE.Vector3(0,.17,.04)),incoming=fist(arena.rabbit,m.partner);
 console.log(move,'head/fist separation',head.distanceTo(incoming).toFixed(3),'head',head.toArray(),'fist',incoming.toArray());
 assert.ok(guardHead.distanceTo(incoming)<.25,move+' partner punch must threaten the original head position');
 assert.ok(head.distanceTo(incoming)>.22,move+' incoming glove must clear the defending head');
 assert.ok(m.hero.gloves.every(g=>g.palm.every(Number.isFinite)));
}
for(const r of BOXING_ROUTINES.list){
 for(let t=0;t<r.moves.length;t+=.11){const m=arena.update(t,'combo',r.id);assert.equal(m.counter.attack,['slip','roll'].includes(m.frame.move));assert.ok(m.hero.handErrors.every(n=>n<.001));}
}
console.log('PASS all combinations share one clock, with punches only on defensive beats');
// Frames remain identical at an equal animation time regardless of playback speed.
for(const speed of [.5,1,1.5,2,3]){const f=BOXING_ROUTINES.frame((.4/speed)*speed,'slip','one_two');assert.equal(f.move,'slip');assert.ok(Math.abs(f.phase-.4/1.22)<1e-8);}
for(const mode of ['heavy','dummy','speed','rabbit']){
 arena.setTarget(mode);arena.update(.48*1.22,'cross','one_two');
 for(const aspect of [320/640,768/640])for(const view of [1.02,2.6,Math.PI/2]){
  arena.group.rotation.y=view;arena.update(.48*1.22,'cross','one_two');
  e.camera.aspect=aspect;e.camera.updateProjectionMatrix();arena.fitCamera(e.camera);e.camera.updateMatrixWorld(true);
  for(const coach of [e.coach,...(mode==='rabbit'?[arena.rabbit]:[])]){
   for(const name of ['head','handL','handR','footL','footR']){
    const p=coach.joints[name].getWorldPosition(new THREE.Vector3()).project(e.camera);
    assert.ok(Math.abs(p.x)<.98&&Math.abs(p.y)<.98,mode+' full body must fit: '+name);
   }
   for(const local of [new THREE.Vector3(0,coach.species==='rabbit'?.66:.36,0)]){
    const p=coach.joints.head.localToWorld(local).project(e.camera);assert.ok(Math.abs(p.x)<.98&&Math.abs(p.y)<.98,mode+' ears/mane must fit');
   }
   for(const side of ['L','R'])for(const z of [-.12,.22]){
    const p=coach.joints['foot'+side].localToWorld(new THREE.Vector3(0,-.105,z)).project(e.camera);assert.ok(Math.abs(p.x)<.98&&Math.abs(p.y)<.98,mode+' entire boot must fit');
   }
  }
 }
}
arena.setTarget('speed');const m=arena.update(.4,'combo','sparring_flow');assert.equal(m.hero.move,'speedbag');assert.equal(m.counter.attack,false);
const a=arena.update(.10,'combo','one_two').hero.hands,b=arena.update(.35,'combo','one_two').hero.hands;
assert.ok(new THREE.Vector3(...a[0]).distanceTo(new THREE.Vector3(...b[0]))>.09,'speed-bag hands must circle, not stay in guard');
arena.setTarget('none');assert.equal(e.coach.root.parent,e.scene);assert.equal(arena.group.parent,null);
console.log('PASS full-body framing, speed-bag mode and clean target removal');
