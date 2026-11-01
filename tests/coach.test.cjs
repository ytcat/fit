// node tests/coach.test.cjs — deterministic kinematic invariants, no browser required.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
process.chdir(path.join(__dirname,'..'));
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
vm.runInThisContext(fs.readFileSync('boxing-routines.js','utf8'));
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
      // Forward outsole contact is invariant as the heel lifts and turns.
      const bone=coach.joints['foot'+f.side];
      const ball=coach.root.worldToLocal(bone.localToWorld(new THREE.Vector3(0,-.102,.215)));
      nearly(ball.y,.015+f.lift);
      const sole=bone.children.find(m=>m.name==='Boxing boot sole');
      const p=sole.geometry.attributes.position;
      for(let v=0;v<p.count;v+=3){const point=coach.root.worldToLocal(sole.localToWorld(new THREE.Vector3().fromBufferAttribute(p,v)));assert.ok(point.y>=.005+f.lift,move+' boot sole must not pierce the floor during pivots');}
      const shin=bone.parent.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
      const collarUp=new THREE.Vector3(0,1,0).applyQuaternion(bone.userData.bootAnkle.getWorldQuaternion(new THREE.Quaternion()));
      assert.ok(collarUp.dot(shin)>.99999,move+' boot collar must follow the shin instead of cutting through the calf');
    }
    const guardHand=['cross','rear_hook','rear_uppercut'].includes(move)?m.hands[0]:m.hands[1];
    if(move!=='roll'&&move!=='slip'&&move!=='step')assert.ok(guardHand[1]>m.head[1]-.15,move+' opposite guard drops below moving cheek');
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

// Regress the actual glove frame, not only hand positions. A reachable wrist
// previously passed while the glove faced backwards or bent across the forearm.
coach.root.rotation.set(0,0,0);
const vec=a=>new THREE.Vector3(...a);
for(const move of moves) {
  let previous=null;
  for(let i=0;i<=610;i++) {
    const m=coach.update(i*1.22/610,move,'one_two');
    const orientations=[];
    for(const [index,side] of ['L','R'].entries()) {
      const hand=coach.joints['hand'+side],elbow=coach.joints['elbow'+side];
      const q=hand.getWorldQuaternion(new THREE.Quaternion());
      const distal=new THREE.Vector3(0,-1,0).applyQuaternion(q);
      const forearm=coach.point(hand).sub(coach.point(elbow)).normalize();
      assert.ok(distal.dot(forearm)>.99999,move+' bent wrist');
      const palm=new THREE.Vector3(0,0,1).applyQuaternion(q);
      assert.ok(palm.dot(vec(m.gloves[index].palm))>.99999,move+' incorrect mesh palm');
      assert.ok(Math.abs(palm.dot(distal))<1e-6,move+' nonorthogonal glove');
      orientations.push(q);
      if(previous)assert.ok(q.angleTo(previous[index])<.13,move+' glove flips between frames');
    }
    previous=orientations;
    const gaze=new THREE.Vector3(0,0,1).applyQuaternion(coach.joints.head.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(gaze.z>.97,move+' head turns away from opponent');
  }
}
for(const [move,index] of [['jab',0],['cross',1],['hook',0],['rear_hook',1]]) {
  const m=coach.update(.50*1.22,move,'one_two');
  assert.ok(vec(m.gloves[index].palm).y<-.85,move+' palm must face down at contact');
}
for(const [move,index] of [['uppercut',0],['rear_uppercut',1]]) {
  const m=coach.update(.47*1.22,move,'one_two');
  assert.ok(vec(m.gloves[index].palm).z<-.85,move+' palm must face boxer at contact');
  assert.ok(vec(m.gloves[index].distal).y>.75,move+' knuckles must strike upward');
  const low=coach.update(.18*1.22,move,'one_two');
  assert.ok(m.hips[1]>low.hips[1]+.025,move+' legs must rise out of loading dip');
}
const guard=coach.update(0,'jab','one_two');
assert.ok(guard.gloves[0].palm[0]>.7&&guard.gloves[1].palm[0]<-.7,'guard palms face inward');
console.log('PASS anatomical glove axes, straight wrists, contact palm orientation, continuous rotation and uppercut leg drive');

const elbowAngle=side=>{
  const e=coach.point(coach.joints['elbow'+side]);
  return coach.point(coach.joints['arm'+side]).sub(e).angleTo(coach.point(coach.joints['hand'+side]).sub(e))*180/Math.PI;
};
for(const [move,side] of [['jab','L'],['cross','R']]) {
  coach.update(.48*1.22,move,'one_two');
  const angle=elbowAngle(side);
  assert.ok(angle>170&&angle<179,move+' must visibly extend without a locked elbow: '+angle);
}
for(const [move,index] of [['uppercut',0],['rear_uppercut',1]]) {
  const low=coach.update(.22*1.22,move,'one_two');
  const high=coach.update(.47*1.22,move,'one_two');
  assert.ok(high.hips[1]-low.hips[1]>.075,move+' missing visible body dip');
  assert.ok(high.hands[index][1]-low.hands[index][1]>.38,move+' missing bottom-to-top stroke');
  assert.ok(high.hands[index][1]-low.hands[index][1]>.45,move+' longer uppercut stroke must be visible');
  const knuckles=vec(high.hands[index]).addScaledVector(vec(high.gloves[index].distal),.20);
  assert.ok(knuckles.y<high.head[1]+.16,move+' must finish at a face-height target, never overhead');
  assert.ok(high.hands[index][2]>low.hands[index][2]+.25,move+' fist must enter the target in front of the body');
  const contactElbow=elbowAngle(index===0?'L':'R');
  assert.ok(contactElbow>70&&contactElbow<145,move+' must strike with the fist on a bent arm');
  let prior=low;
  for(let p=.23;p<=.46;p+=.01) {
    const m=coach.update(p*1.22,move,'one_two');
    assert.ok(m.hips[1]>=prior.hips[1]-1e-5&&m.hands[index][1]>prior.hands[index][1],move+' rise must be coordinated');
    prior=m;
  }
  for(let p=.51;p<.82;p+=.01) {
    const m=coach.update(p*1.22,move,'one_two');
    assert.ok(m.hands[index][1]>=m.head[1]-.15,move+' recovery must return beside the moving cheek, not scoop down again');
  }
}
for(const [move,side,index] of [['hook','L',0],['rear_hook','R',1]]) {
  const start=coach.update(.23*1.22,move,'one_two');
  const end=coach.update(.48*1.22,move,'one_two');
  assert.ok(Math.abs(end.hands[index][0]-start.hands[index][0])>.35,move+' arc too small');
  assert.ok(Math.abs(end.hands[index][1]-start.hands[index][1])<.04,move+' must sweep horizontally');
  const angle=elbowAngle(side);
  assert.ok(angle>110&&angle<145,move+' long hook must open the elbow while remaining bent: '+angle);
  assert.ok(Math.abs(end.footTargets[index].pivot)>.65,move+' driving foot must pivot');
  assert.ok(Math.abs(coach.joints.spine.rotation.y+coach.joints.chest.rotation.y)>.25,move+' shoulders/back must drive the arc');
}
console.log('PASS full straight extension, distinct dip/rise/recovery and horizontal bent-arm hooks');

for(const [move,side,index] of [['jab','L',0],['cross','R',1]]) {
  const rest=coach.update(0,move,'one_two');
  const restShoulder=coach.point(coach.joints['arm'+side]);
  const early=coach.update(.21*1.22,move,'one_two');
  assert.ok(early.hips[2]>.001&&early.strike===0,move+' body must initiate before arm extension');
  const full=coach.update(.48*1.22,move,'one_two');
  assert.ok(full.hips[2]>.065&&full.hips[2]<.12,move+' controlled forward body transfer');
  assert.ok(coach.point(coach.joints['arm'+side]).z-restShoulder.z>.22,move+' shoulder must carry reach');
  assert.ok(full.hands[index][2]>(move==='jab'?.88:.97),move+' missing whole-body reach');
  assert.ok(Math.abs(coach.joints.spine.rotation.y)>.04,move+' back must contribute to rotation');
  assert.ok(full.footTargets[1].pivot<-.10,move+' rear foot must participate');
  const reset=coach.update(.94*1.22,move,'one_two');
  assert.equal(reset.strike,0,move+' hand must recoil before body settles');
  assert.ok(vec(reset.hands[index]).distanceTo(vec(rest.hands[index]))<.002,move+' exercise reset');
}
console.log('PASS body-led reach, back rotation, rear-foot drive and deliberate repetition reset');

for(const [move,side,index] of [['uppercut','L',0],['rear_uppercut','R',1]]) {
  const low=coach.update(.22*1.22,move,'one_two');
  const lowTorso=coach.joints.chest.getWorldQuaternion(new THREE.Quaternion());
  const shoulders=['L','R'].map(s=>coach.point(coach.joints['arm'+s]));
  assert.ok(Math.abs(shoulders[0].y-shoulders[1].y)>.045,move+' loading shoulders cannot remain level');
  assert.ok(shoulders[index].y<shoulders[1-index].y,move+' punching shoulder must lower into load');
  const high=coach.update(.47*1.22,move,'one_two');
  assert.ok(Math.abs(high.head[0]-low.head[0])>.07,move+' head path cannot be only vertical');
  assert.ok(lowTorso.angleTo(coach.joints.chest.getWorldQuaternion(new THREE.Quaternion()))>.4,move+' torso must unwind');
}
for(const move of moves) {
  const guardSides=['jab','hook','uppercut'].includes(move)?['R']:['cross','rear_hook','rear_uppercut'].includes(move)?['L']:['L','R'];
  const start=coach.update(0,move,'one_two');
  const offsets=guardSides.map(s=>coach.point(coach.joints['hand'+s]).sub(vec(start.head)));
  for(let i=0;i<120;i++) {
    const m=coach.update(i*.01,move,'one_two');
    guardSides.forEach((s,k)=>assert.ok(coach.point(coach.joints['hand'+s]).sub(vec(m.head)).distanceTo(offsets[k])<1e-5,move+' defending glove must follow cheek'));
  }
}
const manePositions=coach.mane.geometry.attributes.position;
let backHair=0;for(let i=0;i<manePositions.count;i++)if(Math.abs(manePositions.getX(i))<.12&&manePositions.getZ(i)<-.22)backHair++;
assert.ok(backHair>1000,'mane must cover central rear skull, not only perimeter');
console.log('PASS asymmetric uppercut load/unwind, nonvertical head travel, cheek-following guard and rear mane coverage');

const sourceSurface=JSON.parse(fs.readFileSync('assets/models/coach-surface.json'));
assert.equal(coach.skin.geometry.index.count,sourceSurface.body.index.length*4,'curved body refinement must be active');
// The rebuilt garment's waist/leg boundaries are checked in avatar-surface.test.cjs.
for(const g of [coach.skin.geometry,coach.shorts.geometry]) {
  for(const attr of ['position','normal'])assert.ok(g.attributes[attr].array.every(Number.isFinite),'refinement must not introduce invalid vertices');
}
console.log('PASS refined body/cloth geometry and finite smooth surface normals');

const stepRest=coach.update(0,'step','one_two');
const stepForward=coach.update(.46*1.22,'step','one_two');
assert.ok(stepForward.footTargets[0].ankle[2]-stepRest.footTargets[0].ankle[2]>.155,'longer footwork stride');
// Test take-off on both sides of the timing boundary, where the prior half-sine
// foot lift had nonzero velocity and visibly snapped off the ground.
const takeoffA=coach.update(.08*1.22,'step','one_two').footTargets[0].ankle[1];
const takeoffB=coach.update(.081*1.22,'step','one_two').footTargets[0].ankle[1];
assert.ok(Math.abs(takeoffB-takeoffA)/(.001*1.22)<.05,'foot take-off must begin smoothly');
console.log('PASS extended uppercut/stride and smooth foot take-off');

for(const combo of ['one_two','one_two_hook','slip_cross','uppercut_flow']) {
  const names=['hips','head','armL','armR','handL','handR','footL','footR'];
  for(const boundary of [1,2,3]) {
    coach.update(boundary-.0001,'combo',combo);
    const before=names.map(n=>coach.point(coach.joints[n]));
    coach.update(boundary+.0001,'combo',combo);
    names.forEach((n,i)=>assert.ok(before[i].distanceTo(coach.point(coach.joints[n]))<.001,combo+' jump at punch transition: '+n));
  }
}
console.log('PASS connected combination cadence without joint-position jumps');

for(const move of moves.filter(m=>m!=='step')) {
  const rest=coach.update(0,move,'one_two');
  const planted=coach.update(.38*1.22,move,'one_two');
  assert.ok(planted.footTargets.some((f,i)=>vec(f.contact).distanceTo(vec(rest.footTargets[i].contact))>.04),move+' needs actual foot placement change');
  for(let p=0;p<=1;p+=.01){const m=coach.update(p*1.22,move,'one_two');assert.ok(m.footTargets.some(f=>f.lift<1e-6),move+' must retain a supporting foot');}
}
for(const [move,index,side] of [['uppercut',0,'L'],['rear_uppercut',1,'R']]) {
  for(let p=.32;p<.48;p+=.01){const m=coach.update(p*1.22,move,'one_two');
    const knuckleY=m.hands[index][1]+m.gloves[index].distal[1]*.19;
    assert.ok(knuckleY-coach.point(coach.joints['elbow'+side]).y>.25,move+' glove must lead above elbow');
  }
}
console.log('PASS travelling footwork in each drill, support contact and fist-led uppercuts');
