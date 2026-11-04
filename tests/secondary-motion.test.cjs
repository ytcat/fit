const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const c=new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'))),arena=new THREE.Group();arena.add(c.root);c.update(0,'guard');
c.root.position.x=.04;c.update(1/60,'guard');
const max=()=>Math.max(...c.maneGuides.map(g=>g.offset.length()));
assert.ok(max()>.02,'mane tips must lag body acceleration with no artificial wind');
for(let i=2;i<=180;i++){c.update(i/60,'guard');assert.ok(max()<.08,'spring guides must remain bounded');}
assert.ok(max()<.001,'mane must settle after motion stops');
const before=c.mane.geometry.attributes.position.array.slice();arena.rotation.y=1.2;c.update(3,'guard');
assert.ok(before.every((v,i)=>Math.abs(v-c.mane.geometry.attributes.position.array[i])<1e-5),'orbit must not inject mane inertia');
c.root.position.x=1;c.update(8,'guard');assert.ok(max()<1e-6,'large time jumps reset stale spring state');
c.update(.1,'guard');assert.ok(max()<1e-6,'backward seek resets spring state');
c.update(.15,'guard','one_two',{hitReaction:{part:'head',amount:1,side:1},simulationTime:.15});
assert.ok(c.painMouth.visible);assert.ok(c.facialRest.filter(f=>f.eye).every(f=>f.part.scale.y<f.sy),'head contact produces a squint');
c.update(.2,'guard','one_two',{simulationTime:.2});assert.ok(!c.painMouth.visible);assert.ok(c.facialRest.every(f=>Math.abs(f.part.position.z-f.z)<1e-8),'facial compression recovers without accumulating');
console.log('PASS inertial mane, no-wind lag, settling, orbit isolation, bounded guides, seek reset and localized facial recovery');
