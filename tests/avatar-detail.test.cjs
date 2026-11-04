// Validate the actual CPU equivalent of the GPU shoulder/coat deformation.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','avatar-detail.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));
for(const species of ['lion','rabbit']){
 const c=new LionCoach(data,{species}),g=c.skin.geometry,mask=g.attributes.avatarAxilla,tri=g.index.array,selected=[];
 for(let i=0;i<tri.length;i+=3)if([0,1,2].some(k=>mask.getX(tri[i+k])>.90)&&selected.length<140)selected.push(i);
 assert.ok(selected.length>80,'connected axillary surface must have actual coverage');
 let maxEdge=0;
 for(const move of ['jab','cross','hook','rear_hook','uppercut','rear_uppercut'])for(const phase of [.18,.33,.46,.60,.78]){
  c.update(phase*1.22,move,'one_two',{simulationTime:phase*1.22});
  for(const i of selected){const p=[0,1,2].map(k=>c.skinPoint(c.skin,tri[i+k]));for(let k=0;k<3;k++){const edge=p[k].distanceTo(p[(k+1)%3]);maxEdge=Math.max(maxEdge,edge);assert.ok(edge<.11,'pit triangles must not become long disconnected skin webs');assert.ok(p[k].toArray().every(Number.isFinite));}}
 }
 const fur=c.bodyFur.geometry,rest=new Float32Array(fur.attributes.position.array),roots=fur.attributes.avatarFurFlex,weights=fur.attributes.skinWeight;
 assert.ok(roots.count>18000,'short coat must cover more than just the mane');
 for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-5);
 c.update(0,'jab','one_two',{simulationTime:0});let lag=0;
 for(let i=1;i<=80;i++){c.update(i/100,'jab','one_two',{simulationTime:i/100});for(const v of c.surfaceUniforms.fur.value){assert.ok(v.toArray().every(Number.isFinite));lag=Math.max(lag,v.length());}}
 assert.ok(lag>.0001&&lag<=.010001,'coat tips need bounded motion lag attached to moving bones');
 const paused=c.surfaceUniforms.fur.value.map(v=>v.toArray());c.update(.8,'jab','one_two',{simulationTime:.8});assert.deepEqual(c.surfaceUniforms.fur.value.map(v=>v.toArray()),paused,'pause cannot advance hair inertia');
 assert.deepEqual(fur.attributes.position.array,rest,'fur motion must not rewrite or detach roots each frame');
 c.update(0,'guard','one_two');let nearest=0,distance=Infinity;const target=new THREE.Vector3(.14,1.54,.23),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const d=new THREE.Vector3().fromBufferAttribute(p,i).distanceTo(target);if(d<distance){distance=d;nearest=i;}}
 const point=new THREE.Vector3().fromBufferAttribute(p,nearest).toArray();
 c.update(0,'guard','one_two',{hitReaction:{amount:1,part:'body',move:'cross',surfacePoint:point,surfaceNormal:[0,0,1]}});
 const dent=c.skinPoint(c.skin,nearest);c.surfaceUniforms.dent.value.w=0;const undeformed=c.skinPoint(c.skin,nearest);
 assert.ok(undeformed.distanceTo(dent)>.02&&undeformed.distanceTo(dent)<.027,'actual hit skin must compress locally by a small padding-scale amount');
 c.update(0,'guard','one_two');assert.equal(c.surfaceUniforms.dent.value.w,0,'skin compression must clear with the impact');
 console.log('avatar',species,{maxEdge,lag,hairs:roots.count/3});
}
console.log('PASS connected shoulder triangles, bone-attached dense short coat, bounded inertia/pause, and local impact skin deformation for both avatars');
