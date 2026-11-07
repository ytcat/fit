// Differential geometry gate for the cached contact transforms.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
vm.runInThisContext(fs.readFileSync('training-arena.js','utf8'));
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),arena=Object.create(TrainingArena.prototype);
// Frozen pre-optimization implementation, using Three's normal world/local API.
// The comparison specifically checks invalidation after parent/child/scale edits.
function reference(centre,object,shape,radius=.064){
   object.updateWorldMatrix(true,false);const p=object.worldToLocal(centre.clone());let point,normal,distance;
   if(shape.type==='cylinder'){
    const radial=Math.hypot(p.x,p.z)||1e-8,side=V(p.x/radial,0,p.z/radial);
    point=V(side.x*shape.radius,Math.max(-shape.halfHeight,Math.min(shape.halfHeight,p.y)),side.z*shape.radius);
    distance=p.distanceTo(point)*(radial<shape.radius&&Math.abs(p.y)<shape.halfHeight?-1:1);normal=side;
   }else{
    const c=V(...shape.centre),r=V(...shape.radius),q=p.clone().sub(c),unit=V(q.x/r.x,q.y/r.y,q.z/r.z),power=shape.power||2,length=Math.pow(Math.pow(Math.abs(unit.x),power)+Math.pow(Math.abs(unit.y),power)+Math.pow(Math.abs(unit.z),power),1/power)||1e-8;
    point=c.clone().add(V(unit.x/length*r.x,unit.y/length*r.y,unit.z/length*r.z));
    distance=p.distanceTo(point)*(length<1?-1:1);normal=V(Math.sign(unit.x)*Math.pow(Math.abs(unit.x),power-1)/r.x,Math.sign(unit.y)*Math.pow(Math.abs(unit.y),power-1)/r.y,Math.sign(unit.z)*Math.pow(Math.abs(unit.z),power-1)/r.z).normalize();
   }
   const worldPoint=object.localToWorld(point),worldNormal=normal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(object.matrixWorld)).normalize();
   return {point:worldPoint,normal:worldNormal,distance,penetration:radius-distance};
}
const parent=new THREE.Object3D(),bone=new THREE.Object3D();parent.add(bone);
const shapes=[{centre:[0,0,0],radius:[1,1,1]},{centre:[.05,.12,.04],radius:[.17,.20,.135]},{centre:[0,.1,0],radius:[.3,.22,.24],power:4},{type:'cylinder',radius:.235,halfHeight:.575}];
const known=arena.closest(V(2,0,0),bone,shapes[0]);assert.ok(known.point.distanceTo(V(1,0,0))<1e-12);assert.equal(known.distance,1);assert.equal(known.penetration,.064-1);
let seed=87;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
for(let pose=0;pose<90;pose++){
 parent.position.set(rand()-.5,rand(),rand()-.5);parent.rotation.set(rand(),rand(),rand());parent.scale.set(.8+rand(),.8+rand(),.8+rand());bone.position.set(rand(),rand(),rand());bone.rotation.set(rand(),rand(),rand());
 for(const shape of shapes)for(let sample=0;sample<4;sample++){
  const p=V(rand()*2-1,rand()*2,rand()*2-1),a=arena.closest(p,bone,shape),b=reference(p,bone,shape);
  assert.ok(a.point.distanceTo(b.point)<1e-12);assert.ok(a.normal.distanceTo(b.normal)<1e-12);assert.ok(Math.abs(a.distance-b.distance)<1e-12);assert.ok(Math.abs(a.penetration-b.penetration)<1e-12);
 }
 // Same-tick arm edits must also refresh the cached transform.
 bone.position.x+=.13;const p=V(.2,.8,.4),a=arena.closest(p,bone,shapes[1]),b=reference(p,bone,shapes[1]);assert.ok(a.point.distanceTo(b.point)<1e-12&&a.normal.distanceTo(b.normal)<1e-12);
}
console.log('PASS cached contact surfaces match the original geometry under parent/child motion, scale, repeated queries and same-tick edits');
