const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','avatar-anatomy.js','avatar-detail.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
for(const species of ['lion','rabbit']){
 const c=new LionCoach(data,{species});c.update(0,'guard','one_two',{simulationTime:0});const guard=Array.from(c.anatomy.value),bones=c.joints.elbowL.position.clone();
 c.update(.55,'jab','one_two',{simulationTime:.55});const extended=Array.from(c.anatomy.value);
 assert.ok(guard[0]>extended[0]+.12,'flexed guard must contract the biceps more than an extended jab');assert.ok(extended[4]>guard[4]+.12,'extension must recruit the triceps');assert.ok(extended[2]>guard[2]+.20,'striking-side chest must tense with the punch');assert.deepEqual(c.joints.elbowL.position,bones,'muscle deformation cannot stretch the arm bones');
 const g=c.skin.geometry,m=g.attributes.avatarMuscle,n=g.attributes.avatarMuscleNormal;let visible=0;
 for(let i=0;i<m.count;i++){const length=Math.hypot(m.getX(i),m.getY(i),m.getZ(i));if(length>.005)visible++;assert.ok(length<.025);assert.ok([n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite));}
 assert.ok(visible>1000,'muscle correctives must affect real continuous body vertices');
 let vertex=0;for(let i=1;i<m.count;i++)if(m.getW(i)===0&&Math.abs(m.getZ(i))>Math.abs(m.getZ(vertex)))vertex=i;
 const actual=c.skinPoint(c.skin,vertex),saved=c.anatomy.value[0];c.anatomy.value[0]=0;const relaxed=c.skinPoint(c.skin,vertex);c.anatomy.value[0]=saved;
 assert.ok(actual.distanceTo(relaxed)>.001,'actual skinned surface must change, not just an activation metric');
 c.update(0,'guard','one_two',{hitReaction:{amount:.8,part:'head',side:-1,move:'cross'},simulationTime:1});const head={...c.expression},left=c.faceActing.eyes.find(e=>e.part.position.x<0),right=c.faceActing.eyes.find(e=>e.part.position.x>0);
 assert.ok(left.part.scale.y/left.sy<right.part.scale.y/right.sy,'head flinch must squint the actual contact-side eyes more strongly');assert.ok(c.faceActing.inner.visible&&c.anatomy.value[12]>.4,'reaction must open mouth and lower jaw skin together');
 c.update(0,'guard','one_two',{hitReaction:{amount:.8,part:'body',side:-1,move:'cross'},simulationTime:1.1});assert.ok(c.expression.jaw>head.jaw&&c.expression.bodyFlinch>0,'body and head reactions need distinct acting');
 c.update(0,'guard','one_two',{simulationTime:2});assert.equal(c.expression.jaw,0);assert.equal(c.faceActing.inner.visible,false,'expression must recover completely');
 console.log('anatomy/face',species,{visible,guardBiceps:guard[0],extendedBiceps:extended[0]});
}
console.log('PASS bone-length-preserving muscle recruitment, real skin displacement, valid normals and coordinated side-specific face/jaw recovery');
