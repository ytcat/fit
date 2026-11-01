// A committed strike must transfer momentum once, release quickly and leave
// a heavy target coasting. These are animation-model parameters, not force claims.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const V=(...x)=>new THREE.Vector3(...x),point=V(0,-.94,-.235),normal=V(0,0,-1),velocity=V(0,0,6);
const light=new HangingBag(),heavy=new HangingBag({mass:90});
const first=light.impact(point,normal,velocity,5.5),second=heavy.impact(point,normal,velocity,5.5);
const effective=1/(1/5.5+.94**2/light.inertia.x);
assert.ok(Math.abs(first.impulse-1.05*6*effective)<1e-10,'collision impulse must use effective mass at the contact point');
assert.ok(Math.abs(heavy.velocity.x)<Math.abs(light.velocity.x)&&second.impulse>first.impulse,'more mass must resist acceleration rather than fly farther');
const outgoing=new HangingBag();assert.equal(outgoing.impact(point,normal,V(0,0,-6),5.5).impulse,0,'a separating glove cannot inject an impact');
for(let i=0,last=0;i<=1000;i++){const phase=TrainingArena.powerPhase(i/1000);assert.ok(phase>=last&&phase<=1,'the body clock must advance without reversing');last=phase;}
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface.json')),coach=new LionCoach(data);
const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.5,.1,100),coach,animTime:0,fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);
const arena=e.arena=new TrainingArena(e,data);
for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut']){
 arena.setTarget('heavy');let impulses=0,totalImpulse=0,peakIncoming=0,contactFrames=0,maxSwing=0,committed=null,coast=0;
 for(let i=0;i<=144;i++){
  const time=i/120,m=arena.update(time,move,'one_two');
  for(const l of m.loads)if(l.impactImpulse>0){impulses++;totalImpulse+=l.impactImpulse;peakIncoming=Math.max(peakIncoming,l.incomingSpeed);}
  if(m.loads.length)contactFrames++;maxSwing=Math.max(maxSwing,arena.springs.heavy.position.length());
  if(arena.committedAim){if(!committed)committed=arena.committedAim.clone();else assert.ok(committed.equals(arena.committedAim),'aim must not chase the bag after commitment');}
  if(time>.85&&m.hero.strike<.01)coast=Math.max(coast,arena.springs.heavy.position.length());
 }
 console.log(move,{impulses,impulse:totalImpulse.toFixed(2),speed:peakIncoming.toFixed(2),contactFrames,swing:maxSwing.toFixed(2)});
 assert.equal(impulses,1,'one actual collision impulse per punch, independent of contact substeps');
 assert.ok(peakIncoming>1.2&&totalImpulse>3,'contact needs incoming momentum rather than a shallow resting touch');
 assert.ok(contactFrames<18,'the glove must recoil instead of pushing the target through the whole extension');
 assert.ok(maxSwing<.55&&coast>.03,'the heavy bag must coast after release without flying away');
}
arena.setTarget('heavy');arena.models.heavy.position.z+=3;let missed=0;
for(let i=0;i<=120;i++){const m=arena.update(i/120,'cross','one_two');missed+=m.contacts.length;assert.equal(m.loads.length,0);}
assert.equal(missed,0);assert.ok(arena.springs.heavy.position.length()<1e-12,'an out-of-range punch must not animate a fake impact');
console.log('PASS committed full-body timing, one-shot effective-mass impulse, quick release, heavy coasting and misses');
