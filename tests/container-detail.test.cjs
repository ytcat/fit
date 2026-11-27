const assert = require('node:assert/strict');
global.window = global;
global.THREE = require('../assets/vendor/three.min.js');
require('../adventure/free-walk/container-detail.js');
const list = [-3,-2,-1,0,1].map(x=>({x,y:.4,z:41,ry:Math.PI/2}));
list.push({x:-2,y:1.06,z:41,ry:Math.PI/2});
const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),list.length);
list.forEach((o,i)=>mesh.setMatrixAt(i,new THREE.Matrix4().makeTranslation(o.x,o.y,o.z)));
const group=new THREE.Group();
const liveries=['h','t','n','s'].map(slug=>({slug,id:slug+'01',paint:'#224466'}));
const map={group,layout:{landY:.4,inst:{containers:{list,mesh}}}};
assert.equal(FreeWalkContainerDetail.mount(map,3,null),null);
const rig=FreeWalkContainerDetail.mount(map,3,{liveries,create:slug=>Object.assign(new THREE.Group(),{name:slug})});
const near=()=>rig.snapshot().filter(e=>e.near);
assert.equal(group.children.length,4);
assert.equal(new Set(rig.snapshot().map(e=>e.id)).size,4);
assert(!rig.snapshot().some(e=>e.index===1),'skip stacked box');
function move(x,z,n){
 rig.update({x,z});assert.equal(near().length,n);
 for(const e of rig.snapshot()){
  const m=new THREE.Matrix4();mesh.getMatrixAt(e.index,m);
  assert.equal(m.determinant(),e.near?0:1);
  assert.equal(group.getObjectByName(e.slug).visible,e.near);
 }
}
move(0,123,2);move(0,140,2);move(0,160,0);move(0,140,0);move(0,123,2);
rig.dispose();assert.equal(group.children.length,0);
for(const e of rig.snapshot()){const m=new THREE.Matrix4();mesh.getMatrixAt(e.index,m);assert.equal(m.determinant(),1);}
console.log('PASS cap, unique IDs, stacked exclusion, hysteresis, mutually exclusive geometry, stock restore');
