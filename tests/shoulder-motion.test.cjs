// Regress the reported arm twisting and skin pulled across the armpit.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));
assert.throws(()=>new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface.json'))),/version mismatch/,'an old model must not silently bind to the new arm rig');
// A cached R24 page can still request the original controller URL. Query-string
// bumps alone cannot protect it if that script was evicted from the cache.
const html=fs.readFileSync('index.html','utf8');
assert.ok(/\.\/boxing-coach-v2\.js\?v=\d+/.test(html),'the new page must use the versioned rig controller');
assert.ok(html.includes('./assets/models/coach-surface-v2.json?v=1'),'the new page must load the matching model');
const legacyContext={THREE,document};legacyContext.window=legacyContext;
vm.runInNewContext(fs.readFileSync('boxing-coach.js','utf8'),legacyContext);
const legacy=new legacyContext.LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface.json')));
for(const move of ['jab','hook','uppercut'])assert.ok(legacy.update(.47*1.22,move,'one_two').hands.flat().every(Number.isFinite),'cached pages must retain a working legacy rig/model pair');
console.log('PASS new and cached pages load compatible controller/model pairs');
const c=new LionCoach(data),body=data.body;
for(let i=0;i<body.armBlend.length;i++){
 const x=Math.abs(body.position[i*3]),y=body.position[i*3+1],w=body.armBlend[i];
 assert.ok(Number.isFinite(w)&&w>=0&&w<=1);
 if(x<.22&&y>1.35&&y<1.72)assert.equal(w,0,'medial chest must not attach to an arm');
 if(x>.53&&y>1.4&&y<1.75)assert.equal(w,1,'upper-arm surface must follow its own limb');
}
for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut']){
 let previous;
 for(let i=0;i<=200;i++){
  const m=c.update(i/200*1.22,move,'one_two');
  const current=['L','R'].map(side=>{
   const shoulder=c.point(c.joints['arm'+side]),elbow=c.point(c.joints['elbow'+side]),wrist=c.point(c.joints['hand'+side]);
   assert.ok(Math.abs(shoulder.distanceTo(elbow)-Math.hypot(.24,.26))<1e-6,'upper arm cannot stretch');
   assert.ok(Math.abs(elbow.distanceTo(wrist)-Math.hypot(.11,.29))<1e-6,'forearm cannot stretch');
   // During a loaded uppercut the shoulder coils behind the root plane.
   // Judge a tucked elbow against that live shoulder, not a fixed world plane.
   assert.ok(elbow.z>Math.min(.05,shoulder.z)&&elbow.y<m.head[1]+.01,'elbow must stay in front of the loading shoulder and below the head joint');
   return {elbow,q:c.joints['arm'+side].getWorldQuaternion(new THREE.Quaternion())};
  });
  if(previous)for(let k=0;k<2;k++){
   assert.ok(current[k].elbow.distanceTo(previous[k].elbow)<.035,move+' elbow jumps between adjacent poses');
   assert.ok(current[k].q.angleTo(previous[k].q)<.10,move+' humerus rolls abruptly');
  }
  previous=current;
 }
}
console.log('PASS compatible rig/model pair, anatomical surface attachment, constant arm lengths and continuous elbow/shoulder paths');

for(const f of ['contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const engine={coach:c,demoModel:c.root,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,fitCameraToModel(){}};
const arena=new TrainingArena(engine,data);
for(const mode of ['heavy','dummy'])for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut']){
 arena.setTarget(mode);let previous;
 for(let i=0;i<=144;i++){
  arena.update(i/120,move,'one_two');
  // Closing steps translate the torso. Measure the elbow relative to its
  // live shoulder so this detects an IK jump, not intended whole-body travel.
  const current=['L','R'].map(side=>({p:c.point(c.joints['elbow'+side]).sub(c.point(c.joints['arm'+side])),q:c.joints['arm'+side].quaternion.clone()}));
  if(previous)for(let k=0;k<2;k++){
   // Target practice now runs 12% faster: keep the same angular/spatial
   // velocity envelope per authored phase, with real 120 Hz sampling.
   assert.ok(current[k].q.angleTo(previous[k].q)<.20*1.12,mode+' '+move+' target correction flips the elbow plane');
   assert.ok(current[k].p.distanceTo(previous[k].p)<.055*1.12,mode+' '+move+' elbow teleports while aiming');
  }
  previous=current;
 }
}
console.log('PASS target-aiming continuity for all six punches on heavy bag and dummy');
