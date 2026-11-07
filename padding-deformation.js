/* Exact existing padding formulas in r128 vertex/depth shaders; CPU fallback retained. */
(() => {
 let enabled=false;const installed=new WeakMap();
 const common=`
 uniform float paddingAmount;
 uniform float paddingKind;
 uniform float paddingHand;
 uniform float paddingDepth;
 uniform float paddingRadius2;
 uniform vec3 paddingPoint;
 uniform vec3 paddingNormal;
 float paddingSmooth(float x){x=clamp(x,0.0,1.0);return x*x*x*(x*(x*6.0-15.0)+10.0);}
 vec3 paddingScale(vec3 p){float thumb=p.x*paddingHand<-.060&&p.z>.025?.35:1.0;float s=paddingAmount*paddingSmooth((-p.y-.065)/.075)*thumb;return vec3(1.0+.10*s,1.0-.28*s,1.0+.085*s);}
 vec3 paddingPosition(vec3 p){if(paddingKind<.5){vec3 s=paddingScale(p);return vec3(p.x*s.x,p.y+(-.075-p.y)*(1.0-s.y),p.z*s.z);}vec3 d=p-paddingPoint;float dent=paddingDepth*paddingAmount*exp(-dot(d,d)/paddingRadius2);return p-paddingNormal*dent;}
 vec3 paddingSurfaceNormal(vec3 p,vec3 n){if(paddingKind<.5)return normalize(n/paddingScale(p));vec3 d=p-paddingPoint;float dent=paddingDepth*paddingAmount*exp(-dot(d,d)/paddingRadius2);return normalize(n-(2.0*dent/paddingRadius2)*(d-n*dot(d,n)));}
 `;
 function attach(mesh,uniforms,materials){
  if(installed.has(mesh))return;
  const patch=source=>{let material=materials.get(source);if(material)return material;material=source.clone();const prior=source.onBeforeCompile;material.onBeforeCompile=shader=>{prior?.call(source,shader);Object.assign(shader.uniforms,uniforms);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+common).replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=paddingSurfaceNormal(position,objectNormal);').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=paddingPosition(transformed);');};material.customProgramCacheKey=()=>source.customProgramCacheKey()+'-padding-r90';materials.set(source,material);return material;};
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(patch):patch(mesh.material);
  mesh.customDepthMaterial=patch(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}));mesh.customDistanceMaterial=patch(new THREE.MeshDistanceMaterial());installed.set(mesh,uniforms);
 }
 function uniforms(kind){return {paddingAmount:{value:0},paddingKind:{value:kind},paddingHand:{value:1},paddingDepth:{value:0},paddingRadius2:{value:.0064},paddingPoint:{value:new THREE.Vector3()},paddingNormal:{value:new THREE.Vector3(0,0,1)}};}
 window.BoxingPadding={
  enable(){enabled=typeof location==='undefined'||new URLSearchParams(location.search).get('padding')!=='cpu';},
  glove(coach,side,amount){if(!enabled)return false;const mesh=coach.gloveMeshes[side];let u=installed.get(mesh);if(!u){u=uniforms(0);u.paddingHand.value=side==='L'?1:-1;const materials=new Map();for(const part of mesh.userData.deformParts||[mesh])attach(part,u,materials);}u.paddingAmount.value=amount;mesh.userData.pressure=amount;return true;},
  surface(mesh,contact,amount,mode){if(!enabled)return false;let u=installed.get(mesh);if(!u){u=uniforms(1);attach(mesh,u,new Map());}u.paddingAmount.value=contact?amount:0;u.paddingDepth.value=mode==='heavy'?.060:mode==='dummy'?.030:.018;u.paddingRadius2.value=mode==='speed'?.080*.080:.115*.115;if(contact){u.paddingPoint.value.copy(contact.point);u.paddingNormal.value.copy(contact.normal);}mesh.userData.dentAmount=amount;return true;},
  state(mesh){return installed.get(mesh)||null;}
 };
})();
