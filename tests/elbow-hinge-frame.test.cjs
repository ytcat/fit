const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const c=new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'))),V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),Q=()=>new THREE.Quaternion();let maximum=0;
for(const rootYaw of [0,1.4])for(const chestTurn of [0,.35])for(const side of ['L','R']){
 const sign=side==='L'?-1:1;for(const b of c.bones)b.quaternion.identity();c.root.rotation.set(0,rootYaw,0);c.joints.chest.rotation.set(.12,chestTurn,-.08);c.root.updateMatrixWorld(true);
 const a=c.joints['arm'+side],b=c.joints['elbow'+side],h=c.joints['hand'+side],parent=a.parent.getWorldQuaternion(Q()),frame=c.root.getWorldQuaternion(Q()).invert().multiply(parent),shoulder=c.point(a),upper=b.position.length(),lower=h.position.length();
 // Flex only the elbow from the model's T-pose: the humerus and its front
 // surface must stay still. The forearm folds toward anatomical +Z.
 const along=V(sign,0,0).applyQuaternion(frame),front=V(0,0,1).applyQuaternion(frame),target=shoulder.clone().addScaledVector(along,upper).addScaledVector(front,lower);
 const error=c.solve(a,b,h,target,along);assert.ok(error<1e-6);const roll=a.getWorldQuaternion(Q()).angleTo(parent);maximum=Math.max(maximum,roll);assert.ok(roll<1e-6,'isolated elbow flexion must not roll the humerus by 90 degrees');
 const facing=V(0,0,1).applyQuaternion(a.getWorldQuaternion(Q()));assert.ok(facing.distanceTo(V(0,0,1).applyQuaternion(parent))<1e-6,'the biceps front must keep facing forward');
 assert.ok(Math.abs(b.quaternion.x)<1e-6&&Math.abs(b.quaternion.z)<1e-6&&sign*b.quaternion.y<0,'left/right elbows hinge around mirrored local Y axes');
 assert.ok(Math.abs(c.point(a).distanceTo(c.point(b))-upper)<1e-6&&Math.abs(c.point(b).distanceTo(c.point(h))-lower)<1e-6);
}
// Check the visible glove's palm, not merely its declared distal axis.
for(const side of ['L','R']){
 for(const b of c.bones)b.quaternion.identity();c.root.quaternion.identity();c.root.updateMatrixWorld(true);
 const sign=side==='L'?-1:1,a=c.joints['arm'+side],b=c.joints['elbow'+side],h=c.joints['hand'+side],start=c.point(a);
 c.solve(a,b,h,start.add(V(sign*b.position.length(),0,h.position.length())),V(sign,0,0));c.orientGlove(side,0,V(0,-1,0));
 const front=V(0,0,1).applyQuaternion(b.getWorldQuaternion(Q())),mesh=c.gloveMeshes[side],palm=mesh.localToWorld(V(0,0,1)).sub(mesh.localToWorld(V())).normalize();
 assert.ok(front.dot(palm)>.999999,'neutral glove palm must agree with the forearm front instead of carrying a quarter-turn mismatch');
}
console.log('PASS isolated elbow flexion preserves humeral roll and biceps facing under torso/root rotation',{maximum});
