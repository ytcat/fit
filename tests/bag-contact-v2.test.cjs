// Regress phantom first-frame impulses, speed-bag energy and visible padding.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface.json'));
const coach=new LionCoach(data),e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.5,.1,100),animTime:0,fitCameraToModel(){}};
e.demoModel=coach.root;const arena=new TrainingArena(e,data);
arena.setTarget('speed');
assert.equal(arena.metrics.contacts.length,0,'setting a target without elapsed motion must not create an impact');
assert.equal(arena.springs.speed.velocity.length(),0,'the idle bag must start without invented momentum');
let contacts=0,peakSwing=0,dent=0,left=0,right=0;
for(let i=1;i<=360;i++){
 const m=arena.update(i/120,'speedbag','one_two');
 peakSwing=Math.max(peakSwing,arena.springs.speed.position.length());
 dent=Math.max(dent,arena.models.speed.userData.soft.userData.dentAmount||0);
 assert.ok(m.hero.handErrors.every(x=>x<.001),'speed-bag circles must stay in arm reach');
 for(const hit of m.contacts){
  contacts++;if(hit.side==='L')left++;else right++;
  assert.ok(hit.closingSpeed>.02,'events must correspond to an approaching fist');
  assert.ok(hit.penetration>=0,'contact event records padding penetration');
 }
}
assert.ok(contacts>=6&&contacts<=14&&left>=2&&right>=2,'both circling fists must strike repeatedly');
assert.ok(peakSwing>.01&&peakSwing<.20,'speed bag must rebound visibly without a grazing touch launching it');
assert.ok(dent>.1,'speed-bag padding must visibly compress under the knuckles');
arena.setTarget('speed');arena.models.speed.position.z+=2;
for(let i=0;i<=180;i++)assert.equal(arena.update(i/120,'speedbag','one_two').contacts.length,0,'an unreachable speed bag cannot receive fake hits');
assert.equal(arena.springs.speed.position.length(),0,'speed-bag movement must require contact');
arena.setTarget('heavy');const mesh=arena.models.heavy.userData.soft,p=mesh.geometry.attributes.position;
const ys=new Set();for(let i=0;i<p.count;i++)ys.add(p.getY(i).toFixed(5));
assert.ok(ys.size>=30,'heavy-bag leather needs vertices through its height so a body-height dent can exist');
const rest=new Float32Array(p.array),point=new THREE.Vector3(0,0,-.235),normal=new THREE.Vector3(0,0,-1);
arena.deformSurface(mesh,{point,normal},1);let maximum=0,centre=0,end=0;
for(let i=0;i<p.count;i++){
 const d=Math.hypot(p.getX(i)-rest[i*3],p.getY(i)-rest[i*3+1],p.getZ(i)-rest[i*3+2]);
 maximum=Math.max(maximum,d);if(Math.abs(rest[i*3+1])<.02)centre=Math.max(centre,d);if(Math.abs(rest[i*3+1])>.5)end=Math.max(end,d);
}
assert.ok(maximum>.035&&maximum<.041&&centre>.035&&end<.001,'padding dents locally at body height rather than moving the whole cylinder');
arena.deformSurface(mesh,null,0);assert.deepEqual(p.array,rest,'the fabric must recover its exact rest shape');
console.log('PASS contact-only speed-bag momentum, alternating reachable fists, bounded rebound and localized heavy-bag indentation', {contacts,left,right,peakSwing:peakSwing.toFixed(3),dent:dent.toFixed(3)});
