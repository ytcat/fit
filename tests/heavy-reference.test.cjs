// Match the supplied bag-punch references using posed geometry and contacts.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const V=(...a)=>new THREE.Vector3(...a),data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));
const coach=new LionCoach(data),engine={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.5,.1,100),animTime:0,fitCameraToModel(){}};engine.demoModel=coach.root;
const arena=new TrainingArena(engine,data);
assert.ok(arena.springs.heavy.mass>=100,'the default bag must resist like a substantially heavier target');
// Recorded from R25 at 120 Hz, with the same six-punch fixture and one cycle.
const baseline={jab:{impulse:10.691,force:335.003},cross:{impulse:22.236,force:338.484}};
for(const [move,side,index] of [['jab','L',0],['cross','R',1]]){
 arena.setTarget('heavy');const other=side==='L'?'R':'L',rest=arena.update(0,move,'one_two');
 assert.ok(Math.abs(rest.hero.footTargets[1].contact[0]-rest.hero.footTargets[0].contact[0])>=.53,'stance needs lateral spread');
 assert.ok(rest.hero.footTargets[0].contact[2]-rest.hero.footTargets[1].contact[2]>.54,'stance needs front-to-back spread');
 const shoulderGap=rest.hero.head[1]-coach.point(coach.joints['arm'+side]).y;
 let impulse=0,force=0,extension=0,visibleDepth=0,defendingDistance=0,cover=0,rearPivot=0,dent=0;
 for(let tick=1;tick<=144;tick++){
  const m=arena.update(tick/120,move,'one_two');
  impulse+=m.loads.reduce((sum,l)=>sum+(l.impactImpulse||0),0);
  force=Math.max(force,0,...m.loads.map(l=>l.normalForce));
  assert.ok(m.hero.handErrors.every(n=>n<.001)&&m.hero.footTargets.every(f=>f.error<.001),move+' at '+tick/120+' must preserve reachable limbs and support: '+JSON.stringify({hands:m.hero.handErrors,feet:m.hero.footTargets.map(f=>f.error)}));
  if(!m.loads.length)continue;
  const elbow=coach.point(coach.joints['elbow'+side]);
  extension=Math.max(extension,THREE.MathUtils.radToDeg(coach.point(coach.joints['arm'+side]).sub(elbow).angleTo(coach.point(coach.joints['hand'+side]).sub(elbow))));
  const cheek=coach.joints.head.localToWorld(V(other==='L'?-.10:.10,.13,.12));
  const guard=coach.root.localToWorld(V(...m.hero.gloves[1-index].knuckles));
  defendingDistance=Math.max(defendingDistance,guard.distanceTo(cheek));
  cover=Math.max(cover,shoulderGap-(m.hero.head[1]-coach.point(coach.joints['arm'+side]).y));
  rearPivot=Math.min(rearPivot,m.hero.footTargets[1].pivot);
  const forward=V(0,0,1).applyQuaternion(coach.joints.head.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(forward.y<0,'the chin must remain tucked while looking toward the target');
  const glove=coach.gloveMeshes[side],p=glove.geometry.attributes.position,bag=arena.models.heavy.userData.soft;
  for(let i=0;i<p.count;i+=37){
   if(p.getY(i)>-.16)continue;
   const point=bag.worldToLocal(glove.localToWorld(V().fromBufferAttribute(p,i)));
   if(Math.abs(point.y)<.55)visibleDepth=Math.max(visibleDepth,.235-Math.hypot(point.x,point.z));
  }
  const surface=bag.geometry.attributes.position,original=bag.userData.softRest;
  if(original)for(let i=0;i<surface.count;i++)dent=Math.max(dent,Math.hypot(surface.getX(i)-original[i*3],surface.getY(i)-original[i*3+1],surface.getZ(i)-original[i*3+2]));
 }
 assert.ok(extension>170&&extension<178,move+' must extend through the target without locking the elbow');
 assert.ok(defendingDistance<.20,move+' other glove must cover the cheek');
 assert.ok(cover>.045&&rearPivot<-.10,move+' shoulder protection and driving foot must join the strike');
 assert.ok(visibleDepth>.015&&visibleDepth<.12&&dent>.018,'the actual compressed glove and leather must show padded follow-through');
 assert.ok(impulse>baseline[move].impulse*1.5&&force>baseline[move].force*1.2,move+' must deliver more momentum and pad load than R25');
 console.log('PASS reference',move,{extension:extension.toFixed(1),impulse:impulse.toFixed(2),force:force.toFixed(1),visibleDepth:visibleDepth.toFixed(3),guard: defendingDistance.toFixed(3)});
}
// The platform rebound must not create a second hit from a retreating fist.
arena.setTarget('speed');for(let tick=1;tick<=360;tick++){
 const time=tick/120,m=arena.update(time,'speedbag','one_two');
 for(const hit of m.contacts)assert.equal(hit.side,Math.floor(time*1.8/1.22*2)%2?'R':'L','speed-bag impacts must alternate with the forward hand');
}
console.log('PASS heavier resistance, padded full extension, chin/shoulder/guard coordination, wider support and alternating speed-bag contacts');
