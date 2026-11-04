const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach-v2.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json')),coach=new LionCoach(data),e={coach,scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.6,.1,100),animTime:0,fitCameraToModel(){}};e.demoModel=coach.root;const a=new TrainingArena(e,data);
for(const drill of BOXING_ROUTINES.speedDrills){
 e.speedDrill=drill.id;a.setTarget('speed');let contacts=0,left=0,right=0;
 for(let i=0;i<=720;i++){
  const m=a.update(i/120,'speedbag','one_two');assert.ok(m.hero.handErrors.every(n=>n<.002),drill.id+' wrists must stay reachable');
  for(const c of m.contacts){contacts++;if(c.side==='L')left++;else right++;assert.ok(c.closingSpeed>.02);}
 }
 assert.ok(contacts>=3,drill.id+' must produce repeated real bag contacts');
 if(drill.id==='lead')assert.equal(right,0);if(drill.id==='rear')assert.equal(left,0);
 if(!['lead','rear'].includes(drill.id))assert.ok(left>0&&right>0,drill.id+' must use both hands');
 console.log('speed drill',drill.id,{contacts,left,right});
}
const interval=new Set();for(let t=0;t<8;t+=.02)interval.add(BOXING_ROUTINES.speedFrame(t,'intervals').tempo.toFixed(1));assert.ok(interval.size>=5,'intervals must actually change stroke tempo');
for(const routine of Object.keys(BOXING_ROUTINES.timings)){
 const durations=BOXING_ROUTINES.timings[routine],moves=BOXING_ROUTINES.sequences[routine];let at=0;
 for(let i=0;i<moves.length;i++){const f=BOXING_ROUTINES.frame(at+durations[i]*.5,'combo',routine);assert.equal(f.move,moves[i]);assert.ok(Math.abs(f.phase-.43)<1e-8);at+=durations[i];}
 assert.equal(BOXING_ROUTINES.frame(at+.01,'combo',routine).move,moves[0]);
}
const durations=BOXING_ROUTINES.timings.fast_jabs_upper;assert.ok(durations[0]<durations[2]*.5&&durations[1]<durations[2]*.5,'double jabs must be substantially faster than the following uppercut');
console.log('PASS six contact-driven speed-bag drills, both/single hand patterns, interval pacing and authored mixed-speed boxing combinations');
