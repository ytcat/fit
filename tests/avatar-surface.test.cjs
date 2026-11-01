// Regress visible anatomy defects, not merely reachable joint targets.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};for(const f of ['boxing-routines.js','boxing-coach.js','contact-response.js','training-arena.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface.json')),coach=new LionCoach(data),g=coach.shorts.geometry;
let centre=0;
for(let i=0;i<g.attributes.position.count;i++){
 const p=g.attributes.position,w=g.attributes.skinWeight,ids=g.attributes.skinIndex;
 for(let k=0;k<4;k++)if(w.array[i*4+k]>0)assert.ok(['hips','thighL','thighR'].includes(coach.bones[ids.array[i*4+k]].name),'shorts must never bind to the spine or arms at wide outer panels');
 if(Math.abs(p.getX(i))<.025&&p.getY(i)>.80&&p.getY(i)<.91){let pelvis=0;for(let k=0;k<4;k++)if(coach.bones[ids.array[i*4+k]].name==='hips')pelvis+=w.array[i*4+k];assert.ok(pelvis>.65,'the crotch seam must remain supported by the pelvis');centre++;}
}
// Every garment boundary must be one of its three intended openings.
const edgeCounts=new Map(),coordinates=new Map(),position=g.attributes.position;
const key=i=>[position.getX(i),position.getY(i),position.getZ(i)].map(n=>Math.round(n*1e5)).join(',');
for(let i=0;i<position.count;i+=3)for(let k=0;k<3;k++){
 const a=key(i+k),b=key(i+(k+1)%3);if(a===b)continue;coordinates.set(a,new THREE.Vector3().fromBufferAttribute(position,i+k));coordinates.set(b,new THREE.Vector3().fromBufferAttribute(position,i+(k+1)%3));
 const edge=[a,b].sort().join('|');edgeCounts.set(edge,(edgeCounts.get(edge)||0)+1);
}
const graph=new Map();for(const [edge,count] of edgeCounts)if(count===1){const [a,b]=edge.split('|');for(const id of [a,b]){const y=coordinates.get(id).y;assert.ok(Math.abs(y-.735)<.0001||Math.abs(y-1.085)<.0001,'unexpected hole in the garment surface');}if(!graph.has(a))graph.set(a,[]);if(!graph.has(b))graph.set(b,[]);graph.get(a).push(b);graph.get(b).push(a);}
let openings=0;const visited=new Set();for(const id of graph.keys())if(!visited.has(id)){openings++;const pending=[id];while(pending.length){const v=pending.pop();if(visited.has(v))continue;visited.add(v);pending.push(...graph.get(v));}}
assert.equal(openings,3,'shorts need exactly one waist and two leg openings');
assert.ok(centre>20);assert.equal(coach.shorts.material.side,THREE.DoubleSide,'the inside of the garment must remain visible through its leg openings');
for(const side of ['L','R']){
 const glove=coach.gloveMeshes[side],p=glove.geometry.attributes.position,rest=new Float32Array(p.array);let thumb=0,face=0;
 for(let i=0;i<p.count;i++){if(p.getX(i)<-.075&&p.getZ(i)>.045&&p.getY(i)<-.06&&p.getY(i)>-.17)thumb++;if(p.getY(i)<-.198){face++;assert.ok(p.getZ(i)<.035,'thumb/finger pocket must stay behind the knuckle crown');}}
 assert.ok(thumb>50&&face>50,'a tucked curved thumb and separate rounded crown are required');assert.equal(glove.scale.x,side==='L'?1:-1,'thumbs must be mirrored');
 coach.deformGlove(side,1);let shortening=0;for(let i=0;i<p.count;i++){shortening=Math.max(shortening,p.getY(i)-rest[i*3+1]);if(rest[i*3+1]>-.06)assert.equal(p.getY(i),rest[i*3+1],'the wrist must remain fixed while foam compresses');}
 assert.ok(shortening>.03&&shortening<.04,'impact should flatten the foam rather than shorten the entire hand');coach.deformGlove(side,0);assert.deepEqual(p.array,rest);
}
// Shoulder correction is the same in the normal/depth shaders and CPU QA.
const shader={uniforms:{},vertexShader:'#include <common>\n#include <skinbase_vertex>\n#include <skinnormal_vertex>\n#include <skinning_vertex>'};coach.skin.material.onBeforeCompile(shader);
assert.ok(shader.vertexShader.includes('coachLP,coachLinear)')&&shader.vertexShader.includes('coachLN,coachLinear)'));
for(const move of ['hook','rear_hook','uppercut','rear_uppercut','step'])for(const phase of [.22,.46,.62]){
 coach.update(phase*1.22,move,'one_two');const mesh=coach.skin,p=mesh.geometry.attributes.position;
 for(let i=0;i<p.count;i+=5){const v=coach.skinPoint(mesh,i);assert.ok(v.toArray().every(Number.isFinite),'posed body must have finite surface vertices');}
}
const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(38,.5,.1,100),coach,animTime:0,fitCameraToModel(){}};e.demoModel=coach.root;e.scene.add(coach.root);const arena=new TrainingArena(e,data);arena.setTarget('heavy');let contacts=0;
// R19 becomes NaN at 2.841666... seconds, on the third uppercut.
for(let i=0;i<=120*8;i++){
 const m=arena.update(i/120,'uppercut','one_two');assert.ok(m.hero.hands.flat().every(Number.isFinite)&&m.hero.handErrors.every(Number.isFinite),'repeated uppercuts must not poison skinning');
 assert.ok(arena.springs.heavy.position.toArray().every(Number.isFinite),'the bag must remain on its suspension through repeated hits');contacts+=m.contacts.length;
}
assert.ok(contacts>=4,'the repeated-strike test must actually make contact');
for(let i=0;i<=1000;i++){
 const p=i/1000,h=.00001,speed=(TrainingArena.powerPhase(Math.min(1,p+h))-TrainingArena.powerPhase(Math.max(0,p-h)))/(Math.min(1,p+h)-Math.max(0,p-h));
 assert.ok(speed>.8&&speed<1.2,'body timing must not stop or rush between phase knots');
}
console.log('PASS mirrored closed-fist gloves, foam compression, pelvis-supported shorts, finite raised-arm skinning, repeated uppercuts and continuous natural timing');
