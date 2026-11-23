/* Opt-in Chapter 1 private preview traffic, native compact reused at runtime.
 * Metres, local district space; x increases with Old Town traffic, Otto's lane goes west.
 * Only these moving groups are owned by this module. Existing scenery stays untouched. */
(function(root) {
'use strict';
const LANES=Object.freeze({
 oldtown:Object.freeze({id:'oldtown',from:-4.90,to:24.75,z:1.65,y:-.15}),
 otto:Object.freeze({id:'otto',from:9.8,to:-9.8,z:5.7,y:-.15})
});
const LIMITS=Object.freeze({halfLen:2.18,halfWidth:1.06,radius:.32,safety:.54,anticipate:.21,release:.10,
 cruise:2.62,accel:.95,brake:2.70,maxDt:.10,substep:1/120});
const n=(a,lo,hi)=>Math.max(lo,Math.min(hi,a));
const is=Number.isFinite;
const dir=l=>Math.sign(l.to-l.from)||1;
const run=l=>Math.abs(l.to-l.from);
const xOf=(s,l)=>l.from+dir(l)*s.u;
const footprint=(x,z,l,s)=>Math.abs(x-xOf(s,l))<LIMITS.halfLen+LIMITS.radius&&Math.abs(z-l.z)<LIMITS.halfWidth+LIMITS.radius;
function initial(l,centerX=l.from){const u=n((centerX-l.from)*dir(l),0,run(l));return {u,speed:0,waiting:false,reset:0,active:true};}
function advanceCar(s,l,dt,p) {
 if(!is(dt)||dt<=0)return {...s};
 const L=LIMITS,D=dir(l),T=Math.min(dt,L.maxDt),steps=Math.ceil(T/L.substep),h=T/steps,len=run(l),r={...s};
 const valid=!!(p&&p.id===l.id&&is(p.x)&&is(p.z));
 for(let i=0;i<steps;i++){
  if(!r.active){
   r.reset=Math.max(0,r.reset-h);
   // Never spawn a new car in a capsule or immediately on top of a pedestrian.
   if(!r.reset&&(!valid||Math.abs(p.z-l.z)>L.halfWidth+L.radius+L.anticipate||Math.abs(p.x-l.from)>L.halfLen+L.radius+L.safety+.8)){
    r.u=0;r.speed=0;r.waiting=false;r.active=true;
   }
   continue;
  }
  const ahead=valid?(p.x-xOf(r,l))*D:Infinity;
  const side=valid?Math.abs(p.z-l.z):Infinity;
  const inPath=valid&&ahead>-(L.halfLen+L.radius)&&side<=L.halfWidth+L.radius+L.anticipate+(r.waiting?L.release:0);
  const gap=inPath?Math.max(0,ahead-L.halfLen-L.radius-L.safety):Infinity;
  const end=Math.max(0,len-r.u),room=Math.min(gap,end);
  // Lead braking begins at the continuous safe stopping envelope, with a
  // substep-size safety bound for sudden crossing or low frame rate.
  const stopVM=Math.sqrt(2*L.brake*Math.max(0,room-.06));
  const target=Math.min(L.cruise,stopVM);
  const v1=n(target,Math.max(0,r.speed-L.brake*h),r.speed+L.accel*h);
  const step=Math.min(room,(v1+r.speed)*h/2);
  r.u+=step;
  r.speed=(room<=step+1e-7||room<=.06&&v1<=.01)?0:v1;
  r.waiting=inPath&&gap<1.45;
  // Only when parked at
  // its end is it retired. The distant return is delayed to avoid a visible jump.
  if(end<=step+.061&&!r.waiting&&r.speed<=.011){r.active=false;r.reset=1.30;r.speed=0;}
 }
 return r;
}
function makeFactory(THREE) {
 const assets=new Map(), made=new Set();
 const V=new THREE.Vector3(),N=new THREE.Vector3(),M=new THREE.Matrix3();
 function stock(gltf) {
  if(assets.has(gltf))return assets.get(gltf);
  if(!gltf?.scene)return null;
  const by=new Map();gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{
   if(!o.isMesh||!o.geometry?.attributes?.position||Array.isArray(o.material))return;
   if(!by.has(o.material))by.set(o.material,[]);by.get(o.material).push(o);
  });
  const group=new THREE.Group();
  for(const [mat,items] of by){
   let nv=0,ni=0;
   for(const o of items){const g=o.geometry,P=g.attributes.position;nv+=P.count;ni+=g.index?.count??P.count;}
   const positions=new Float32Array(3*nv), normals=new Float32Array(3*nv),uv=new Float32Array(2*nv),
         ids=nv<=65535?new Uint16Array(ni):new Uint32Array(ni);
   let v0=0,i0=0, uvFound=false;
   for(const o of items){
    const g=o.geometry,{position:P,normal:NN,uv:UV}=g.attributes;M.getNormalMatrix(o.matrixWorld);
    for(let k=0;k<P.count;k++){
     V.fromBufferAttribute(P,k).applyMatrix4(o.matrixWorld);V.toArray(positions,3*(v0+k));
     if(NN)N.fromBufferAttribute(NN,k).applyMatrix3(M).normalize();else N.set(0,1,0);
     N.toArray(normals,3*(v0+k));
     if(UV){uvFound=true;uv[2*(v0+k)]=UV.getX(k);uv[2*(v0+k)+1]=UV.getY(k);}
    }
    const id=g.index,nn=id?.count??P.count;
    for(let k=0;k<nn;k++)ids[i0+k]=v0+(id?id.getX(k):k);
    v0+=P.count;i0+=nn;
   }
   const merged=new THREE.BufferGeometry();
   merged.setAttribute('position',new THREE.BufferAttribute(positions,3));merged.setAttribute('normal',new THREE.BufferAttribute(normals,3));
   if(uvFound)merged.setAttribute('uv',new THREE.BufferAttribute(uv,2));
   merged.setIndex(new THREE.BufferAttribute(ids,1));
   merged.computeBoundingSphere();made.add(merged);
   const m=new THREE.Mesh(merged,mat);m.renderOrder=mat?.transparent?2:0;group.add(m);
  }
  if(!group.children.length)return null;
  assets.set(gltf,group);return group;
 }
 function basic(color, rough=.71){const m=new THREE.MeshStandardMaterial({color,roughness:rough});made.add(m);return m;}
 function fallback(){
  // Transient compact proxy if the authentic CityAssets model is still loading.
  const g=new THREE.Group(),paint=basic(0x356079),glass=basic(0x263947,.36),tire=basic(0x232528),white=basic(0xecd09e),red=basic(0x802b29);
  function put(geo,mat,x,y,z,rot=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.x=rot;g.add(m);made.add(geo);}
  put(new THREE.BoxGeometry(3.96,.54,1.66),paint,0,.58,0);
  put(new THREE.BoxGeometry(1.92,.47,1.50),glass,-.18,1.06,0);
  for(const x of [-1.19,1.21])for(const z of [-.82,.82])put(new THREE.CylinderGeometry(.297,.297,.205,10),tire,x,.297,z,Math.PI/2);
  put(new THREE.BoxGeometry(.045,.19,1.35),white,1.99,.65,0);
  put(new THREE.BoxGeometry(.045,.18,1.35),red,-1.99,.65,0);
  return g;
 }
 return {stock,fallback,dispose:()=>{for(const x of made)x.dispose();made.clear();assets.clear();}};
}
function create({THREE,scene,id,cityAssets=root.CityAssets,carFactory}){
 const lane=LANES[id];if(!lane)return Object.freeze({update(){},blocks(){return false;},snapshot(){return [];},dispose(){}});
 const f=makeFactory(THREE),group=new THREE.Group();group.name='Chapter 1 moving compact';
 const placeholder=f.fallback();group.add(placeholder);scene.add(group);
 if(!cityAssets?.get?.('car'))cityAssets?.load?.('car')?.catch?.(()=>{});
 let shape=placeholder,stockAsset=null,state={...initial(lane,lane.from),active:false},dead=false;
 const draw=()=>{group.position.set(xOf(state,lane),lane.y,lane.z);group.rotation.y=dir(lane)>0?0:Math.PI;group.visible=state.active;};
 draw();
 function update(dt,p){if(dead)return;if(shape===placeholder){const assets=cityAssets||root.CityAssets,current=assets?.get?.('car')||null;
   if(current&&current!==stockAsset){stockAsset=current;const next=carFactory?.(current)||f.stock(current);if(next){group.remove(shape);group.add(next);shape=next;}}}
  state=advanceCar(state,lane,dt,p);draw();
 }
 function blocks(zone,x,z){return !dead&&zone===lane.id&&state.active&&footprint(x,z,lane,state);}
 function snapshot(){return dead?[]:[{id:lane.id,x:xOf(state,lane),z:lane.z,y:lane.y,speed:state.speed,active:state.active,waiting:state.waiting,draws:shape.children.length,source:shape===placeholder?'fallback':'stock'}];}
 function dispose(){if(dead)return;dead=true;scene.remove(group);f.dispose();}
 return {update,blocks,snapshot,dispose};
}
const api={LANES,LIMITS,initial,advanceCar,xOf,footprint,create};
if(typeof module==='object'&&module.exports)module.exports=api;else root.Chapter1Traffic=api;
})(globalThis);
