const fs=require('fs'),vm=require('vm');global.THREE=require('../assets/vendor/three.min.js');global.window=global;global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};vm.runInThisContext(fs.readFileSync('boxing-coach.js','utf8'));
const c=new LionCoach(JSON.parse(fs.readFileSync('assets/models/coach-surface.json')));
// CPU diagnostic: actual scene geometry and dual-quaternion skinning.
// Canvas textures, shadows and physically-based shading are not reproduced.
const frames=[];
const requested=process.argv[3];
const poses=requested?[0,.22,.47].map(p=>[requested,p,.65]): [['jab',0,0],['jab',0,Math.PI],['uppercut',.22,.65],['uppercut',.47,.65]];
for(const [move,phase,view] of poses){
c.root.rotation.y=view;c.update(phase*1.22,move,'one_two');const meshes=[];
c.root.traverse(m=>{if(!m.isMesh||m.material.map)return;const g=m.geometry,p=g.attributes.position,w=g.attributes.skinWeight,ids=g.attributes.skinIndex,col=g.attributes.color,positions=[],colors=[];
for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);
if(m.isSkinnedMesh){v.applyMatrix4(m.bindMatrix);const q=new THREE.Vector4(0,0,0,0),d=new THREE.Vector4(0,0,0,0),q0=c.dqReal[ids.getX(i)];for(let k=0;k<4;k++){const id=ids.array[i*4+k],weight=w.array[i*4+k],sign=q0.dot(c.dqReal[id])<0?-1:1;q.addScaledVector(c.dqReal[id],weight*sign);d.addScaledVector(c.dqDual[id],weight*sign);}const len=q.length();q.divideScalar(len);d.divideScalar(len);d.addScaledVector(q,-q.dot(d));const qr=new THREE.Quaternion(q.x,q.y,q.z,q.w),tr=new THREE.Quaternion(d.x,d.y,d.z,d.w).multiply(qr.clone().conjugate());v.applyQuaternion(qr).add(new THREE.Vector3(tr.x*2,tr.y*2,tr.z*2)).applyMatrix4(m.bindMatrixInverse);}
v.applyMatrix4(m.matrixWorld);positions.push(v.x,v.y,v.z);const color=m.material.color.clone();if(col)color.multiply(new THREE.Color(col.getX(i),col.getY(i),col.getZ(i)));colors.push(color.r,color.g,color.b);}
meshes.push({positions,colors,index:g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i)});});frames.push({name:move+' '+phase+' '+view,meshes});}
fs.writeFileSync(process.argv[2],JSON.stringify(frames));
