/* Optional, baked guard-shoulder corrective. Original mesh topology and rig.
 * Positions/normals live in chest space; the field, fur and shadows stay shared.
 */
(()=>{
 'use strict';const V=()=>new THREE.Vector3();
 const api={
  install(mesh,c,body){
   const g=mesh.geometry,asset=c.shoulderData,fur=Boolean(g.attributes.avatarFurFlex);if(!body||!asset)return;
   const p=g.attributes.position;
   if(!c.shoulderBuffers){
    if(fur)return;
    let fnv=2166136261;for(const byte of new Uint8Array(p.array.buffer,p.array.byteOffset,p.array.byteLength))fnv=Math.imul(fnv^byte,16777619)>>>0;
    if(p.count!==asset.vertexCount||fnv!==asset.restFNV32||asset.encoding!=='u32-i16x6-u8-le'||asset.deltaScale!==1000000||asset.normalScale!==32767){c.shoulderData=null;console.warn('Shoulder asset/model mismatch; using original surface.');return;}
    const delta=new Float32Array(p.count*4),normal=new Float32Array(p.count*4);
    try{
     const bytes=Uint8Array.from(atob(asset.packed),s=>s.charCodeAt(0)),view=new DataView(bytes.buffer);if(bytes.length!==asset.rowCount*17)throw Error('Invalid shoulder data length');
     for(let offset=0;offset<bytes.length;offset+=17){const i=view.getUint32(offset,true),x=view.getInt16(offset+4,true)/1000000,y=view.getInt16(offset+6,true)/1000000,z=view.getInt16(offset+8,true)/1000000,nx=view.getInt16(offset+10,true)/32767,ny=view.getInt16(offset+12,true)/32767,nz=view.getInt16(offset+14,true)/32767,mask=view.getUint8(offset+16)/255;if(i>=p.count||Math.hypot(x,y,z)>.025002)throw Error('Invalid shoulder corrective');delta.set([x,y,z,p.getX(i)<0?0:1],i*4);normal.set([nx,ny,nz,mask],i*4);}
     if(!Array.isArray(asset.shoulderQuaternions)||asset.shoulderQuaternions.length!==2||asset.shoulderQuaternions.some(q=>q.length!==4||!q.every(Number.isFinite)||Math.abs(Math.hypot(...q)-1)>.00001))throw Error('Invalid shoulder pose');
    }catch(error){c.shoulderData=null;console.warn('Shoulder detail invalid; using original surface.');return;}
    c.shoulderBuffers={delta,normal};c.shoulderUniforms={frame:{value:new THREE.Matrix4()},weight:{value:new THREE.Vector2()}};
   }
   const source=c.shoulderBuffers;let delta=source.delta,normal=source.normal;
   if(fur){const roots=g.userData.shoulderRoots;if(!roots)return;delta=new Float32Array(p.count*4);normal=new Float32Array(p.count*4);for(let i=0;i<p.count;i++){const j=roots[i]*4;delta.set(source.delta.subarray(j,j+4),i*4);normal.set(source.normal.subarray(j,j+4),i*4);}delete g.userData.shoulderRoots;}
   else if(p.count!==asset.vertexCount)return;
   g.setAttribute('shoulderDelta',new THREE.BufferAttribute(delta,4));g.setAttribute('shoulderNormal',new THREE.BufferAttribute(normal,4));
   for(const material of [mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial]){
    const previous=material.onBeforeCompile,key=material.customProgramCacheKey;
    material.onBeforeCompile=shader=>{previous(shader);shader.uniforms.shoulderFrame=c.shoulderUniforms.frame;shader.uniforms.shoulderWeight=c.shoulderUniforms.weight;
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 shoulderDelta;attribute vec4 shoulderNormal;uniform mat4 shoulderFrame;uniform vec2 shoulderWeight;');
     shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`float shoulderAmount=shoulderDelta.w<.5?shoulderWeight.x:shoulderWeight.y;transformed+=(shoulderFrame*vec4(shoulderDelta.xyz,0.0)).xyz*shoulderAmount;\n${material===mesh.material?'#ifndef FLAT_SHADED\nvNormal=normalize(mix(vNormal,normalMatrix*(shoulderFrame*vec4(shoulderNormal.xyz,0.0)).xyz,shoulderAmount*shoulderNormal.w));\n#endif':''}\n#include <project_vertex>`);
    };material.customProgramCacheKey=()=>key.call(material)+'-guard-shoulder-v1';
   }
  },
  update(c){
   if(!c.shoulderUniforms)return;const u=c.shoulderUniforms,world=c.joints.chest.getWorldQuaternion(new THREE.Quaternion()),inverse=world.clone().invert();u.frame.value.multiplyMatrices(c.root.matrixWorld.clone().invert(),c.joints.chest.matrixWorld);
   for(const [i,side] of ['L','R'].entries()){const q=inverse.clone().multiply(c.joints['arm'+side].getWorldQuaternion(new THREE.Quaternion())),reference=new THREE.Quaternion().fromArray(c.shoulderData.shoulderQuaternions[i]),angle=q.angleTo(reference),t=Math.max(0,1-angle/.95);u.weight.value.setComponent(i,t*t*(3-2*t));}
  },
  correct(p,c,index,g){const d=g.attributes.shoulderDelta,u=c.shoulderUniforms;if(!d||!u)return p;const amount=u.weight.value.getComponent(d.getW(index)<.5?0:1),delta=V().fromBufferAttribute(d,index),m=u.frame.value.elements;return p.add(new THREE.Vector3(m[0]*delta.x+m[4]*delta.y+m[8]*delta.z,m[1]*delta.x+m[5]*delta.y+m[9]*delta.z,m[2]*delta.x+m[6]*delta.y+m[10]*delta.z).multiplyScalar(amount));}
 };
 window.ShoulderCorrective=api;
})();
