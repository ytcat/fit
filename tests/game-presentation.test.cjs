const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,key)=>key==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const file of ['boxing-routines.js','boxing-footwear.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const P=require('../game-presentation.js'),D=require('../game-domain.js'),data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
const equipment=variant=>Object.fromEntries(D.slots.map(slot=>[slot,slot+'_'+variant]));
const colors=material=>(Array.isArray(material)?material:[material]).map(m=>m.color?.toArray());
function geometryHash(geometry){const hash=crypto.createHash('sha256');for(const attribute of [...Object.values(geometry.attributes),geometry.index].filter(Boolean))hash.update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));return hash.digest('hex');}
const coaches=['lion','rabbit'].map(species=>new LionCoach(data,{species}));
for(const coach of coaches){
 const meshes=[],geometry=new Map(),nodes=[];coach.root.traverse(node=>{nodes.push([node,node.parent,node.position.clone(),node.quaternion.clone(),node.scale.clone()]);if(node.isMesh){meshes.push([node,colors(node.material),node.geometry]);if(!geometry.has(node.geometry))geometry.set(node.geometry,geometryHash(node.geometry));}});
 const originalBlack=coach.black.color.clone(),originalGold=coach.gold.color.clone(),originalSkin=coach.skin.material.color.clone();
 P.apply(coach,equipment('jade'),D.catalog);
 const targets=new Set(Object.values(P.materials(coach).slots).flatMap(set=>[...set]));assert.equal(Object.values(P.materials(coach).slots).every(set=>set.size>0),true,'all four actual rig slots are discoverable for '+coach.species);
 for(const material of targets)assert.ok(material.color.equals(new THREE.Color(0x208675).convertSRGBToLinear()),'paid variant is visible in each slot');
 assert.ok(coach.black.color.equals(originalBlack),'boot recolor preserves shared black straps/face material');assert.ok(coach.gold.color.equals(originalGold),'cosmetic band preserves shared gold trim');assert.ok(coach.skin.material.color.equals(originalSkin),'cosmetics preserve body material');
 for(const [mesh,baseline] of meshes)if(!(Array.isArray(mesh.material)?mesh.material:[mesh.material]).some(m=>targets.has(m)))assert.deepEqual(colors(mesh.material),baseline,'unrelated mesh color changed: '+mesh.name);
 P.apply(coach,equipment('default'),D.catalog);for(const [mesh,baseline] of meshes)assert.deepEqual(colors(mesh.material),baseline,'default restores original '+coach.species+' material: '+mesh.name);
 P.apply(coach,equipment('sunrise'),D.catalog);P.apply(coach,null,D.catalog);for(const [mesh,baseline] of meshes)assert.deepEqual(colors(mesh.material),baseline,'clearing equipment restores original species defaults');
 for(const [mesh,,originalGeometry] of meshes)assert.equal(mesh.geometry,originalGeometry,'cosmetics preserve mesh geometry references');
 for(const [g,hash] of geometry)assert.equal(geometryHash(g),hash,'cosmetics must not mutate render/hit geometry');for(const [node,parent,position,quaternion,scale] of nodes){assert.equal(node.parent,parent);assert.ok(node.position.equals(position));assert.ok(node.quaternion.equals(quaternion));assert.ok(node.scale.equals(scale));}
}
const rabbitColor=coaches[1].gloveMeshes.L.material.color.clone();P.apply(coaches[0],equipment('midnight'),D.catalog);assert.ok(coaches[1].gloveMeshes.L.material.color.equals(rabbitColor),'one fighter cosmetic cannot recolor another fighter');
assert.notDeepEqual(coaches[0].leather.color.toArray(),coaches[1].leather.color.toArray());
console.log('PASS actual lion/rabbit rigs: four material variants, exact species default restore, independent fighters, unchanged shared trim/body materials, geometry and transforms');
// GOTR-0003 boots: each variant shows one distinct construction on both feet; the sole (contact) is shared and unchanged.
for(const coach of coaches){const seen=new Set();for(const [variant,design] of [['default','classic'],['midnight','mid'],['jade','panel'],['sunrise','classic']]){P.apply(coach,{...equipment('default'),boots:'boots_'+variant},D.catalog);for(const side of ['L','R']){const s=coach.joints['foot'+side].userData.bootStyles;assert.deepEqual(Object.keys(s.styles).filter(n=>s.styles[n].visible),[design],variant+' shows '+design);assert.equal(s.feet[design].visible,true);}seen.add(design);}
 assert.equal(seen.size,3,'three boot constructions');const shaft=n=>{const box=new THREE.Box3();coach.joints.footL.userData.bootStyles.styles[n].traverse(m=>{if(m.isMesh&&m.name==='Boxing boot ankle'){m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix));}});return box.max.y;};assert.ok(shaft('mid')<shaft('classic')-.05,'mid-top shaft is clearly lower');
 const sole=coach.joints.footL.getObjectByName('Boxing boot sole');sole.geometry.computeBoundingBox();assert.ok(Math.abs(sole.geometry.boundingBox.min.y-(-.095))<1e-6,'sole contact height unchanged');}
console.log('PASS boots: classic high-top, mid-top and panelled constructions selected by variant on both feet, shared unchanged sole');
