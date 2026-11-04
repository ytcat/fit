// Inspect the visible padded crown, not just the glove bone's declared axis.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const file of ['boxing-routines.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'));
const coach=new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')));
const crowns={};
for(const side of ['L','R']){
 const mesh=coach.gloveMeshes[side],p=mesh.geometry.attributes.position;
 crowns[side]=Array.from({length:p.count},(_,i)=>i).filter(i=>p.getY(i)<-.198);
 assert.ok(crowns[side].length>100,'sample the actual leading padded surface');
}
const crown=side=>{
 const mesh=coach.gloveMeshes[side],p=mesh.geometry.attributes.position,centre=new THREE.Vector3();
 for(const i of crowns[side])centre.add(new THREE.Vector3().fromBufferAttribute(p,i));
 return coach.root.worldToLocal(mesh.localToWorld(centre.divideScalar(crowns[side].length)));
};
for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut']){
 for(const phase of [.32,.40,.47,.55,.65]){
  coach.update(phase*1.22,move,'one_two');
  for(const side of ['L','R']){
   const wrist=coach.point(coach.joints['hand'+side]);
   const forearm=wrist.clone().sub(coach.point(coach.joints['elbow'+side])).normalize();
   for(const pressure of [0,.75]){
    coach.deformGlove(side,pressure);
    assert.ok(crown(side).sub(wrist).normalize().dot(forearm)>.9998,move+' visible knuckle pad must continue the forearm without a cocked wrist');
   }
   coach.deformGlove(side,0);
  }
 }
}
for(const [move,side] of [['uppercut','L'],['rear_uppercut','R']]){
 for(const phase of [.43,.47,.52,.55]){
  const m=coach.update(phase*1.22,move,'one_two');
  assert.ok(Math.abs(crown(side).x)<.06,move+' padded impact must finish on the target centreline');
  const forearm=coach.point(coach.joints['hand'+side]).sub(coach.point(coach.joints['elbow'+side])).normalize();
  assert.ok(forearm.y>.80,move+' knuckle pad must lead upward above the elbow');
  assert.ok(Math.abs(m.gloves[side==='L'?0:1].strikePoint[0])<.06,'contact solver must use the same central padded surface');
 }
}
console.log('PASS central uppercut impact and visible forearm-to-knuckle alignment for all six punches, including compressed padding');
