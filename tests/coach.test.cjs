// node tests/coach.test.cjs — deterministic kinematic invariants, no browser required.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
vm.runInThisContext(fs.readFileSync('boxing-coach.js','utf8'));
const coach=new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface.json')));
const moves=['jab','cross','hook','uppercut','slip','rear_hook','rear_uppercut','roll','step'];
const nearly=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
for(const move of moves) {
  let maxFoot=0;
  for(let i=0;i<=122;i++) {
    const m=coach.update(i*.01,move,'one_two');
    assert.ok(m.handErrors.every(x=>x<.001),move+' unreachable wrist');
    assert.ok(m.hands.every(p=>p.every(Number.isFinite)&&p[2]>.20),move+' hand behind body');
    for(const f of m.footTargets) {
      const actual=coach.point(coach.joints['foot'+f.side]);
      maxFoot=Math.max(maxFoot,actual.distanceTo(new THREE.Vector3(...f.ankle)));
      assert.ok(actual.distanceTo(new THREE.Vector3(...f.ankle))<.001,move+' unplanted ankle');
      // Ball contact is invariant even as the heel lifts and turns.
      const bone=coach.joints['foot'+f.side];
      const ball=coach.root.worldToLocal(bone.localToWorld(new THREE.Vector3(0,-.102,.12)));
      if(move!=='step')nearly(ball.y,.015);
    }
    const guardHand=['cross','rear_hook','rear_uppercut'].includes(move)?m.hands[0]:m.hands[1];
    if(move!=='roll'&&move!=='slip'&&move!=='step')assert.ok(guardHand[1]>1.58,move+' opposite guard drops');
  }
  const start=coach.update(0,move,'one_two');
  const end=coach.update(1.219999,move,'one_two');
  start.hands.flat().forEach((v,i)=>nearly(v,end.hands.flat()[i]));
  console.log('PASS',move,'ankle error',maxFoot.toFixed(6));
}
const jab=coach.update(.57,'jab','one_two');assert.ok(jab.hands[0][2]>.62);
const cross=coach.update(.57,'cross','one_two');assert.ok(cross.hands[1][2]>.62);
for(const [combo,expected] of Object.entries({one_two:['jab','cross'],one_two_hook:['jab','cross','hook'],
  slip_cross:['slip','cross'],uppercut_flow:['uppercut','hook','cross']})) {
  expected.forEach((move,i)=>assert.equal(coach.update((i+.4)*1.22,'combo',combo).move,move));
}
console.log('PASS all four combinations, forward punches and guard recovery');

// Single rigid influences must agree with bone matrices at every view angle.
for(const angle of [0,-.32,1.15,Math.PI]) {
  coach.root.rotation.y=angle;coach.update(.57,'cross','one_two');
  for(let i=0;i<coach.bones.length;i++) {
    const q=coach.dqReal[i],d=coach.dqDual[i];
    nearly(q.length(),1,1e-5);nearly(q.dot(d),0,1e-5);
    const real=new THREE.Quaternion(q.x,q.y,q.z,q.w);
    const tr=new THREE.Quaternion(d.x,d.y,d.z,d.w).multiply(real.clone().conjugate());
    const p=new THREE.Vector3(.3,1.4,.05);
    const actual=p.clone().applyQuaternion(real).add(new THREE.Vector3(tr.x*2,tr.y*2,tr.z*2));
    const expected=p.clone().applyMatrix4(new THREE.Matrix4().fromArray(coach.skeleton.boneMatrices,i*16));
    assert.ok(actual.distanceTo(expected)<1e-5,'skinning drift after camera rotation');
  }
}
for(const mesh of [coach.skin,coach.shorts]) {
  const g=mesh.geometry,w=g.attributes.skinWeight;
  for(let i=0;i<w.count;i++)nearly(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i),1,1e-5);
  for(const [name,material] of [['standard',mesh.material],['depth',mesh.customDepthMaterial],['distanceRGBA',mesh.customDistanceMaterial]]) {
    const shader={uniforms:{},vertexShader:THREE.ShaderLib[name].vertexShader};
    material.onBeforeCompile(shader);
    assert.ok(shader.vertexShader.includes('coachBlend();'));
    assert.ok(shader.vertexShader.includes('qrotate(coachQ,coachP)+coachT'));
    assert.equal(shader.uniforms.coachReal.value,coach.dqReal);
  }
}
const expectedGold=new THREE.Color(0xd8b56c).convertSRGBToLinear();
for(const key of ['r','g','b'])nearly(coach.gold.color[key],expectedGold[key],1e-7);
console.log('PASS skinning transforms, normalized weights, matching shadows and shared material colors');
