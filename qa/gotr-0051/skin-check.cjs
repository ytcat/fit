/* GOTR-0051: is the skinned surface intact under the mirrored fighter root? For a punch pose, compares each
   skinned vertex (CPU replica of the shader, in world space) with the bone it is most weighted to: the distance
   must be the same as in the bind pose within a few centimetres. Also prints bone-matrix determinants.
   Usage: node qa/gotr-0051/skin-check.cjs */
const path=require('path');const {engine}=require(path.join(__dirname,'..','gotr-0024','measure.cjs'));
for(const species of ['lion','rabbit']){
 const e=engine(species),c=e.coach,mesh=c.skin,g=mesh.geometry,ids=g.attributes.skinIndex,w=g.attributes.skinWeight,V=()=>new THREE.Vector3();
 const sample=()=>{const out=[];for(let i=0;i<g.attributes.position.count;i+=97){let k=0;for(let j=1;j<4;j++)if(w.array[i*4+j]>w.array[i*4+k])k=j;const bone=c.bones[ids.array[i*4+k]],p=mesh.localToWorld(c.skinPoint(mesh,i,V()));out.push(p.distanceTo(bone.getWorldPosition(V())));}return out;};
 c.update(0,'guard','one_two',{});c.syncSkin();const rest=sample();
 c.update(.45*1.22,'cross','one_two',{});c.syncSkin();const posed=sample();
 let worst=0;for(let i=0;i<rest.length;i++)worst=Math.max(worst,Math.abs(posed[i]-rest[i]));
 const m=new THREE.Matrix4().fromArray(c.skeleton.boneMatrices,16*5);
 console.log(species,'root det',c.root.matrixWorld.determinant().toFixed(2),'bone matrix det',m.determinant().toFixed(3),'samples',rest.length,'worst change of vertex-to-bone distance',worst.toFixed(3),'m');
}
