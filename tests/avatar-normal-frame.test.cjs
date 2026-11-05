const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.THREE=require('../assets/vendor/three.min.js');global.window=global;
global.document={createElement:()=>({getContext:()=>new Proxy({},{get:(_,k)=>k==='createImageData'?((w,h)=>({data:new Uint8ClampedArray(w*h*4)})):()=>{}})})};
for(const f of ['boxing-routines.js','avatar-anatomy.js','avatar-detail.js','boxing-coach-v2.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const data=JSON.parse(fs.readFileSync('assets/models/coach-surface-v2.json'));data.rabbitBody=JSON.parse(fs.readFileSync('assets/models/rabbit-surface-r78.json')).body;
function localNormals(c,indices){
 const g=c.skin.geometry,ids=g.attributes.skinIndex,w=g.attributes.skinWeight;
 return indices.map(i=>{const q=new THREE.Vector4(0,0,0,0),q0=c.dqReal[ids.getX(i)];for(let k=0;k<4;k++){const value=c.dqReal[ids.array[i*4+k]],weight=w.array[i*4+k]*(q0.dot(value)<0?-1:1);q.addScaledVector(value,weight);}q.divideScalar(q.length());const n=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i).transformDirection(c.skin.bindMatrix).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));return {old:n.clone(),correct:n.clone().transformDirection(c.skin.bindMatrixInverse)};});
}
for(const species of ['lion','rabbit']){
 const c=new LionCoach(data,{species}),g=c.skin.geometry,indices=[];for(let i=0;i<g.attributes.position.count&&indices.length<128;i++)if(g.attributes.avatarAxilla.getX(i)>.4&&new THREE.Vector3().fromBufferAttribute(g.attributes.normal,i).length()>.99)indices.push(i);assert.ok(indices.length>40);
 c.root.rotation.y=0;c.update(.47*1.22,'cross','one_two',{simulationTime:.47*1.22});let reference=localNormals(c,indices),error=0,oldError=0;
 for(const angle of [.7,Math.PI,4.3]){c.root.rotation.y=angle;c.syncSkin();const actual=localNormals(c,indices);for(let i=0;i<actual.length;i++){error=Math.max(error,actual[i].correct.distanceTo(reference[i].correct));oldError=Math.max(oldError,actual[i].old.distanceTo(reference[i].old));}}
 assert.ok(error<2e-6,'orbiting/turning must preserve the local underarm normal');assert.ok(oldError>.5,'regression must expose the old normal-space error');
 for(const material of [c.skin.material,c.skin.customDepthMaterial,c.skin.customDistanceMaterial]){const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>\n#include <project_vertex>'};material.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('vec3 avatarN=normalize('+AvatarSurface.normalFrameShader+');'));assert.ok(material.customProgramCacheKey().includes('r79-frame'));}
 console.log(species,{vertices:indices.length,correctedMaxError:error,oldMaxError:oldError});
}
console.log('PASS consistent local-space underarm normals under fighter/root rotation for both species');
