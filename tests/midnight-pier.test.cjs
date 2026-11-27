const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict'), path=require('node:path');
const vendor=process.env.VENDOR || path.join(__dirname,'../assets/vendor');
const THREE=require(path.join(vendor,'three.min.js')); global.THREE=THREE;global.window=global;global.self=global;
vm.runInThisContext(fs.readFileSync(path.join(vendor,'GLTFLoader.js'),'utf8'));
require('../adventure/free-walk/midnight-pier.js');
const b=fs.readFileSync(path.join(__dirname,'../assets/street/city-review/midnight-pier-wheel.glb'));
new THREE.GLTFLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',gltf=>{
 const pivot=new THREE.Group();pivot.rotation.y=.36;pivot.position.set(94,.15,-13);
 const out=MidnightPier.mount(gltf,pivot); assert.ok(out);assert.equal(out.cabins.length,16);
 const pos=(node)=>node.getWorldPosition(new THREE.Vector3());
 const before=pos(out.cabins[0]);
 let submissions=0, triangleInstances=0;
 out.group.traverseVisible(o=>{if(o.isMesh){submissions++;triangleInstances+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3 * (o.isInstancedMesh?o.count:1);}});
 assert.ok(submissions<=38);
 for(const t of [0,3,6,9,12,15,18,21,23.98]) {
   out.update(t);
   for(const n of out.cabins){
     const q=n.getWorldQuaternion(new THREE.Quaternion()), up=new THREE.Vector3(0,1,0).applyQuaternion(q);assert.ok(up.distanceTo(new THREE.Vector3(0,1,0))<1e-4, n.name+' tilt '+t);
   }
   if(t===12)assert.ok(pos(out.cabins[0]).distanceTo(before)>15);
 }
 out.dispose();assert.equal(pivot.children.length,0);
 console.log('PASS',submissions,'visible meshes',triangleInstances,'visible triangle instances',gltf.animations[0].tracks.length,'tracks');
}, e=>{throw e;});
