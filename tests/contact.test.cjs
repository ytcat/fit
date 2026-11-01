const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const a=new ContactSpring(4.2,.3),b=new ContactSpring(4.2,.3);a.impulse(new THREE.Vector3(1,.5,-.3));b.impulse(new THREE.Vector3(1,.5,-.3));a.step(.75);for(let i=0;i<75;i++)b.step(.01);assert.ok(a.position.distanceTo(b.position)<1e-12&&a.velocity.distanceTo(b.velocity)<1e-12,'spring response must not depend on frame rate');
const position=a.position.clone();a.impulse(new THREE.Vector3(.5,0,0));assert.ok(a.position.equals(position),'a new hit must add momentum without resetting position');a.step(12);assert.ok(a.position.length()<1e-5&&a.velocity.length()<1e-5,'motion must decay to rest');
const critical=new ContactSpring(10,1);critical.impulse(new THREE.Vector3(0,0,1));for(let i=0;i<100;i++){critical.step(.02);assert.ok(critical.position.z>=0,'body recovery must not overshoot backwards');}
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface.json')),coach=new LionCoach(data);
const left=coach.gloveMeshes.L,right=coach.gloveMeshes.R,rest=new Float32Array(left.geometry.attributes.position.array);
assert.notEqual(left.geometry,right.geometry,'each glove needs independent deformation');coach.deformGlove('L',1);
const p=left.geometry.attributes.position,n=left.geometry.attributes.normal;let shortening=0,bulge=0;
for(let i=0;i<p.count;i++){shortening=Math.max(shortening,p.getY(i)-rest[i*3+1]);bulge=Math.max(bulge,Math.abs(p.getX(i))-Math.abs(rest[i*3]));assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5);if(rest[i*3+1]>=0)assert.equal(p.getY(i),rest[i*3+1],'cuff must stay stable');}
assert.ok(shortening>.02&&shortening<.04&&bulge>.002,'padding must shorten and spread modestly');assert.equal(right.userData.pressure,0);coach.deformGlove('L',0);assert.deepEqual(left.geometry.attributes.position.array,rest,'padding must recover exactly');
const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.5,.1,100),coach,animTime:0,technique:'cross',currentAnim:'one_two',fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);const arena=e.arena=new TrainingArena(e,data);
for(const mode of ['heavy','dummy','speed']){
 arena.setTarget(mode);let impulses=0,peak=0,dent=0,travel=0,firstHit=null;
 const duration=mode==='speed'?3:1.18;
 for(let t=0;t<duration;t+=1/90){const m=arena.update(t,mode==='speed'?'speedbag':'cross','one_two');impulses+=m.contacts.length;peak=Math.max(peak,m.compression.lion.L,m.compression.lion.R);dent=Math.max(dent,arena.models[mode].userData.soft.userData.dentAmount||0);travel=Math.max(travel,arena.springs[mode].position.length());if(m.contacts.length&&!firstHit)firstHit=t;}
 console.log(mode,{impulses,peak:peak.toFixed(3),dent:dent.toFixed(3),travel:travel.toFixed(3)});
 assert.ok(impulses>0&&peak>.02&&dent>.01&&travel>.005,mode+' needs contact-driven compression, indentation and motion');if(mode!=='speed')assert.equal(impulses,1,mode+' one impulse per punch');
 const now=arena.previousTime;
 const before=arena.springs[mode].position.clone(),v=arena.springs[mode].velocity.clone();arena.update(now,mode==='speed'?'speedbag':'cross','one_two');assert.ok(arena.springs[mode].position.equals(before)&&arena.springs[mode].velocity.equals(v),'pause must freeze response without repeated impulses');
}
arena.setTarget('rabbit');let maxDuck=0,blocked=0,headHits=0,airPressure=0;
for(let t=0;t<2.4;t+=.012){const m=arena.update(t,'hook','one_two');if(m.counter.move==='roll')maxDuck=Math.max(maxDuck,1.77-m.partner.head[1]);blocked+=m.contacts.filter(c=>c.receiver==='rabbit'&&c.kind==='glove').length;headHits+=m.contacts.filter(c=>c.receiver==='rabbit'&&c.kind==='head').length;assert.ok(m.partner.footTargets.every(f=>f.error<.001));}
assert.ok(maxDuck>.25,'rabbit must bend through the legs under hooks');assert.ok(blocked>0,'rabbit must also brace and absorb guarded shots');assert.equal(headHits,0,'rolling must clear the head rather than send the fist through it');
for(let t=0;t<.85;t+=.015){const m=arena.update(t,'jab','one_two');airPressure=Math.max(airPressure,m.compression.lion.L);}
assert.ok(airPressure<.03,'a clean missed jab must not squash the glove');
console.log('PASS independent padded gloves, local dents, directional momentum, guarded blocks and opponent ducking');

function responseWhileOrbiting(orbit){arena.setTarget('heavy');let impulse=0;for(let t=0;t<1.1;t+=.02){arena.group.rotation.y=orbit?t*.9:.4;const m=arena.update(t,'cross','one_two');impulse+=m.contacts.reduce((sum,c)=>sum+c.impulse,0);}return {position:arena.springs.heavy.position.clone(),impulse};}
const still=responseWhileOrbiting(false),orbit=responseWhileOrbiting(true);assert.ok(still.position.distanceTo(orbit.position)<1e-7&&Math.abs(still.impulse-orbit.impulse)<1e-7,'orbiting the view must not add impact energy');
