/* Earned cosmetic accessories. These never change scoring, reach or damage. */
(() => {
 // `kind` groups mutually exclusive items (one belt, one headband); `design` picks the
 // modelled construction. Old saves only contain the first three ids and stay valid.
 const catalog=[{id:'headband',kind:'headband',design:'tied',price:20,names:{en:'Head ribbon',he:'סרט ראש',ru:'Повязка'}},{id:'bandana',kind:'headband',design:'side',price:30,names:{en:'Side-knot bandana',he:'בנדנה עם קשר צד',ru:'Бандана с боковым узлом'}},{id:'armbands',kind:'armbands',design:'tied',price:20,names:{en:'Arm ribbons',he:'סרטי זרוע',ru:'Ленты на руки'}},{id:'champion_belt',kind:'belt',design:'crest',price:40,names:{en:'Champion-style belt',he:'חגורה בסגנון אלוף',ru:'Пояс в стиле чемпиона'}},{id:'heritage_belt',kind:'belt',design:'medallion',price:60,names:{en:'Heritage medallion belt',he:'חגורת מדליון',ru:'Пояс с медальоном'}}];
 const fresh=()=>({owned:[],equipped:[]}),kindOf=id=>catalog.find(c=>c.id===id)?.kind;
 function validate(a,ledger){const kinds=Array.isArray(a?.equipped)?a.equipped.map(kindOf):[];if(!a||!Array.isArray(a.owned)||!Array.isArray(a.equipped)||a.owned.length>catalog.length||a.equipped.length>catalog.length||new Set(a.owned).size!==a.owned.length||new Set(a.equipped).size!==a.equipped.length||a.owned.some(id=>!catalog.some(c=>c.id===id))||a.equipped.some(id=>!a.owned.includes(id))||new Set(kinds).size!==kinds.length)throw Error('Invalid cosmetic accessories.');for(const id of a.owned){const item=catalog.find(c=>c.id===id);if(!ledger.some(t=>t.id==='accessory:'+id&&t.type==='spend'&&t.coins===-item.price&&t.xp===0))throw Error('Missing accessory purchase.');}}
 function action(g,a){g.accessories=g.accessories||fresh();const item=catalog.find(c=>c.id===a.itemId);if(!item)throw Error('Unknown accessory.');const state=g.accessories;if(a.action==='buy'){if(state.owned.includes(item.id))throw Error('Already owned.');if(g.ledger.reduce((n,t)=>n+t.coins,0)<item.price)throw Error('Earn more coins through training.');g.ledger.push({id:'accessory:'+item.id,type:'spend',coins:-item.price,xp:0,rule:'cosmetic-accessory-v1'});state.owned.push(item.id);}else if(a.action==='equip'){if(!state.owned.includes(item.id))throw Error('Own this accessory first.');state.equipped=state.equipped.includes(item.id)?state.equipped.filter(id=>id!==item.id):[...state.equipped.filter(id=>kindOf(id)!==item.kind),item.id];}else throw Error('Unknown accessory action.');return {itemId:item.id};}
 const TAU=Math.PI*2,STRAP=.011;let shared=null;
 // One material set for every boxer: accessories add geometry, never shader programs per item.
 function materials(){if(shared)return shared;const m=(color,roughness,metalness=0)=>{const x=new THREE.MeshStandardMaterial({color,roughness,metalness});x.color.convertSRGBToLinear();return x;};
  return shared={gold:m(0xe3bb5c,.3,.6),silver:m(0xdfe3e8,.28,.62),black:m(0x17191d,.5),oxblood:m(0x641820,.44),enamel:m(0xb3192c,.2,.1),ribbon:m(0x9c2c22,.86),navy:m(0x1c2b4b,.8),cream:m(0xe9dfc6,.82)};}
 // Bake parts ({g,m?,w?}: geometry, local matrix, warp to the wearer) into one draw call.
 function merge(parts){let count=0;const list=parts.map(p=>{const g=p.g.index?p.g.toNonIndexed():p.g;count+=g.attributes.position.count;return [g,p];});
  const pos=new Float32Array(count*3),nor=new Float32Array(count*3),v=new THREE.Vector3(),n=new THREE.Vector3(),nm=new THREE.Matrix3();let o=0;
  for(const [g,p] of list){const P=g.attributes.position,N=g.attributes.normal;if(p.m)nm.getNormalMatrix(p.m);
   for(let i=0;i<P.count;i++,o+=3){v.fromBufferAttribute(P,i);n.fromBufferAttribute(N,i);if(p.m){v.applyMatrix4(p.m);n.applyMatrix3(nm);}if(p.w)p.w(v,n);n.normalize();pos[o]=v.x;pos[o+1]=v.y;pos[o+2]=v.z;nor[o]=n.x;nor[o+1]=n.y;nor[o+2]=n.z;}
   if(g!==p.g)g.dispose();p.g.dispose();}
  const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(pos,3));out.setAttribute('normal',new THREE.BufferAttribute(nor,3));out.computeBoundingSphere();return out;}
 const shape=(pts,holes=[])=>{const s=new THREE.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();for(const h of holes){const p=new THREE.Path();h.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();s.holes.push(p);}return s;};
 const oval=(a,b,e=2,k=40,cx=0,cy=0)=>Array.from({length:k},(_,i)=>{const t=i/k*TAU,c=Math.cos(t),s=Math.sin(t);return [cx+a*Math.sign(c)*Math.abs(c)**(2/e),cy+b*Math.sign(s)*Math.abs(s)**(2/e)];});
 const star=(R,r,n=5,cx=0,cy=0,rot=Math.PI/2)=>Array.from({length:n*2},(_,i)=>{const a=rot+i*Math.PI/n,q=i%2?r:R;return [cx+Math.cos(a)*q,cy+Math.sin(a)*q];});
 const roundRect=(w,h,r,k=4)=>{const pts=[];for(const [cx,cy,a0] of [[w/2-r,h/2-r,0],[-w/2+r,h/2-r,Math.PI/2],[-w/2+r,-h/2+r,Math.PI],[w/2-r,-h/2+r,Math.PI*1.5]])for(let i=0;i<=k;i++){const a=a0+i/k*Math.PI/2;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return pts;};
 // Extruded relief whose back face sits at z0; returns geometry (front face at z0+depth+2*bevel).
 const ext=(s,depth,bevel,z0=0)=>{const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:6});g.translate(0,0,z0+bevel);return g;};
 const M=(x=0,y=0,z=0,rz=0,sx=1,sy=1,sz=1,rx=0)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,rz)),new THREE.Vector3(sx,sy,sz));
 // Convex hull of a body slice, sampled as a radius per direction: a strap under
 // tension bridges every concavity (spine groove, navel) instead of sinking into it.
 function hullRadii(xz,bins){const pts=[];for(let i=0;i<xz.length;i+=2)pts.push([xz[i],xz[i+1]]);pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const p of pts){while(lo.length>1&&cross(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>1&&cross(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  const hull=lo.slice(0,-1).concat(up.slice(0,-1)),r=new Float32Array(bins);
  for(let i=0;i<bins;i++){const t=i/bins*TAU,dx=Math.sin(t),dz=Math.cos(t);for(let k=0;k<hull.length;k++){const a=hull[k],b=hull[(k+1)%hull.length],ex=b[0]-a[0],ez=b[1]-a[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;const s=(a[0]*ez-a[1]*ex)/den,u=(a[0]*dz-a[1]*dx)/den;if(s>0&&u>=-1e-6&&u<=1+1e-6)r[i]=Math.max(r[i],s);}}
  return r;}
 // Bind-pose points of the wearer around one bone, as [x,z] pairs per y window, in that bone's frame.
 function slices(coach,bone,meshes,windows){const bi=coach.bones.indexOf(bone),inv=coach.skeleton.boneInverses[bi],out=windows.map(()=>[]),v=new THREE.Vector3(),m=new THREE.Matrix4();
  for(const mesh of meshes){if(!mesh?.geometry?.attributes?.position)continue;if(mesh.isSkinnedMesh)m.multiplyMatrices(inv,mesh.bindMatrix);else{mesh.updateMatrix();m.copy(mesh.matrix);}const P=mesh.geometry.attributes.position;
   for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(m);for(let k=0;k<windows.length;k++)if(v.y>=windows[k][0]&&v.y<=windows[k][1])out[k].push(v.x,v.z);}}
  return out;}
 // A closed, tapered band around a bone: rings[k] = radius per direction at heights ys[k].
 function band(ys,rings,bins){const radius=(t,y)=>{const f=((t/TAU)%1+1)%1*bins,i=Math.floor(f)%bins,j=(i+1)%bins,a=f-Math.floor(f);let k=0;while(k<ys.length-2&&y>ys[k+1])k++;const s=THREE.MathUtils.clamp((y-ys[k])/(ys[k+1]-ys[k]),0,1),r0=rings[k][i]*(1-a)+rings[k][j]*a,r1=rings[k+1][i]*(1-a)+rings[k+1][j]*a;return r0*(1-s)+r1*s;};
  const point=(t,y,out=new THREE.Vector3())=>{const r=radius(t,y);return out.set(Math.sin(t)*r,y,Math.cos(t)*r);};
  // Frame on the band surface: tangent (increasing t), slanted up, outward normal.
  const frame=(t,y,lift=0)=>{const e=.002,a=point(t-e,y),b=point(t+e,y),tan=b.sub(a).normalize(),upS=point(t,ys[ys.length-1]).sub(point(t,ys[0])).normalize(),n=new THREE.Vector3().crossVectors(tan,upS).normalize();upS.crossVectors(n,tan).normalize();return {o:point(t,y).addScaledVector(n,lift),t:tan,u:upS,n};};
  const table=[0];let prev=point(0,(ys[0]+ys[ys.length-1])/2);for(let i=1;i<=720;i++){const p=point(i/720*TAU,(ys[0]+ys[ys.length-1])/2);table.push(table[i-1]+p.distanceTo(prev));prev=p;}
  const thetaAt=s=>{const L=table[720];s=((s%L)+L)%L;let i=1;while(i<720&&table[i]<s)i++;return (i-1+(s-table[i-1])/(table[i]-table[i-1]||1))/720*TAU;};
  return {radius,point,frame,thetaAt,length:table[720],ys};}
 // Thick strap: bottom face, bevel, outer face, bevel, top face, swept around the band.
 function strap(B,yb,yt,T,bevel=.003,segments=96){const prof=[[0,yb,0,-1],[T-bevel,yb,0,-1],[T-bevel,yb,.7,-.7],[T,yb+bevel,.7,-.7],[T,yb+bevel,1,0],[T,yt-bevel,1,0],[T,yt-bevel,.7,.7],[T-bevel,yt,.7,.7],[T-bevel,yt,0,1],[0,yt,0,1]],pos=[],nor=[],idx=[];
  for(let s=0;s<prof.length;s+=2){const base=pos.length/3;for(let i=0;i<=segments;i++){const t=i/segments*TAU;for(const [u,y,nu,ny] of [prof[s],prof[s+1]]){const f=B.frame(t,y);const p=B.point(t,y).addScaledVector(f.n,u),n=f.n.clone().multiplyScalar(nu).addScaledVector(f.u,ny).normalize();pos.push(p.x,p.y,p.z);nor.push(n.x,n.y,n.z);}}
   for(let i=0;i<segments;i++){const a=base+i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setIndex(idx);return g;}
 // Thin closed piping/stitch line running on the strap's outer face at height y.
 const piping=(B,y,lift,r,segments=72)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length:segments},(_,i)=>{const t=i/segments*TAU,f=B.frame(t,y,lift);return f.o;}),true),segments,r,3,true);
 // Warps that seat flat relief (x along the strap, y up, z out of its back face) on the band.
 const seat=(B,t,y,lift)=>{const f=B.frame(t,y,lift);return (v,n)=>{const x=v.x,yy=v.y,z=v.z;v.copy(f.o).addScaledVector(f.t,x).addScaledVector(f.u,yy).addScaledVector(f.n,z);const nx=n.x,ny=n.y,nz=n.z;n.copy(f.t).multiplyScalar(nx).addScaledVector(f.u,ny).addScaledVector(f.n,nz);};};
 // Large plates are rigid but gently curved: bend radius chosen to meet the strap at both edges.
 function curvedSeat(B,y,half,lift){const f=B.frame(0,y,0),edge=B.frame(B.thetaAt(half),y,0),local=edge.o.clone().sub(f.o),dx=local.dot(f.t),d=Math.max(.002,-local.dot(f.n)),R=THREE.MathUtils.clamp((dx*dx+d*d)/(2*d),.16,4);let gap=lift;
  for(let k=1;k<8;k++){const s=half*k/8,p=B.frame(B.thetaAt(s),y,0).o.sub(f.o),x=p.dot(f.t),z=p.dot(f.n),c=R-Math.sqrt(Math.max(0,R*R-x*x));gap=Math.max(gap,z+c+lift);}
  return (v,n)=>{const a=v.x/R,r=R+v.z+gap,x=Math.sin(a)*r,z=Math.cos(a)*r-R,yy=v.y;v.copy(f.o).addScaledVector(f.t,x).addScaledVector(f.u,yy).addScaledVector(f.n,z);const nx=n.x*Math.cos(a)+n.z*Math.sin(a),nz=-n.x*Math.sin(a)+n.z*Math.cos(a),ny=n.y;n.copy(f.t).multiplyScalar(nx).addScaledVector(f.u,ny).addScaledVector(f.n,nz);};}
 const fits=new WeakMap();
 function beltBand(coach){if(fits.has(coach))return fits.get(coach);const hips=coach.joints.hips,ys=[.116,.16,.204],bins=96,meshes=[coach.skin,coach.bodyFur,coach.shorts,...hips.children.filter(n=>n.isMesh)];
  const s=slices(coach,hips,meshes,[[ys[0]-.012,ys[1]],[ys[0],ys[2]],[ys[1],ys[2]+.012]]),rings=s.map(xz=>hullRadii(xz,bins).map(r=>r+.007));
  // A real strap is never narrower at the bottom than at the top on a fighter's hips.
  for(let i=0;i<bins;i++){rings[1][i]=Math.max(rings[1][i],rings[2][i]);rings[0][i]=Math.max(rings[0][i],rings[1][i]);}
  const value=band(ys,rings,bins);fits.set(coach,value);return value;}
 function belt(coach,design){const k=materials(),B=beltBand(coach),[yb,ym,yt]=B.ys,T=STRAP,metal=[],accent=[],leather=[];const crest=design==='crest';
  leather.push({g:strap(B,yb,yt,T)});
  // Stitched edges (crest) or raised gold piping (medallion).
  for(const y of [yb+.008,yt-.008])(crest?metal:accent).push({g:piping(B,y,T+.0006,crest?.0013:.0021)});
  const plate=[];
  if(crest){
   const out=oval(.13,.088,3.2,40);plate.push([metal,ext(shape(out),.007,.003)]);
   plate.push([metal,ext(shape(oval(.126,.084,3.2,40),[oval(.112,.071,3.2,40)]),.003,.0012,.013)]);
   plate.push([accent,ext(shape(oval(.111,.070,3.2,40)),.0015,0,.0125)]);
   plate.push([metal,ext(shape(oval(.05,.05,2,32)),.004,.002,.014)]);
   plate.push([metal,ext(shape(oval(.041,.041,2,28),[oval(.036,.036,2,28)]),.0025,0,.022)]);
   plate.push([metal,ext(shape(star(.03,.0125)),.003,.0015,.022)]);
   // Laurel wreath: tilted leaves along two arcs around the medallion.
   const leaf=()=>new THREE.SphereGeometry(1,6,4);for(const side of [-1,1])for(let i=0;i<8;i++){const a=-1.25+i*.33,x=side*Math.cos(a)*.074,y=Math.sin(a)*.056;plate.push([metal,leaf(),M(x,y,.016,side*(a+Math.PI/2)+side*.55,.0125,.0048,.0035)]);}
   // Crown crest above the plate and a name banner below: the classic title-belt silhouette.
   plate.push([metal,ext(shape([[-.046,.078],[.046,.078],[.052,.104],[.03,.092],[.017,.11],[0,.094],[-.017,.11],[-.03,.092],[-.052,.104]]),.006,.002)]);
   for(const x of [-.052,-.017,.017,.052])plate.push([accent,new THREE.SphereGeometry(.0055,8,6),M(x,x===-.052||x===.052?.104:.11,.008)]);
   plate.push([accent,ext(shape([[-.07,-.084],[.07,-.084],[.084,-.097],[.07,-.11],[-.07,-.11],[-.084,-.097]]),.003,.0015,.003)]);
   plate.push([metal,ext(shape([[-.074,-.081],[.074,-.081],[.09,-.097],[.074,-.113],[-.074,-.113],[-.09,-.097]],[[[-.068,-.086],[.068,-.086],[.08,-.097],[.068,-.108],[-.068,-.108],[-.08,-.097]]]),.004,.0012,.004)]);
   for(const x of [-.094,.094])plate.push([accent,new THREE.SphereGeometry(.0095,10,7),M(x,0,.012,0,1,1,.55)]);
  }else{
   plate.push([metal,ext(shape(oval(.09,.09,2,48)),.007,.003)]);
   plate.push([accent,ext(shape(oval(.088,.088,2,48),[oval(.075,.075,2,48)]),.003,.0012,.013)]);
   for(let i=0;i<20;i++){const a=i/20*TAU;plate.push([accent,new THREE.SphereGeometry(.0048,6,4),M(Math.cos(a)*.082,Math.sin(a)*.082,.0185)]);}
   for(let i=0;i<16;i++){const a=i/16*TAU,w=i%2?.007:.011,L=i%2?.06:.07;plate.push([accent,ext(shape([[.028,-w],[L,0],[.028,w]]),.002,.0008,.013),M(0,0,0,a)]);}
   plate.push([accent,new THREE.SphereGeometry(.03,20,10,0,TAU,0,Math.PI/2),M(0,0,.013,0,1,.5,1,Math.PI/2)]);
   plate.push([metal,ext(shape(star(.017,.007,8)),.002,.001,.027)]);
  }
  const half=crest?.13:.09,bend=curvedSeat(B,ym,half+.01,.0015);for(const [list,g,m] of plate)list.push({g,m,w:bend});
  // Side plates: two large engraved panels (crest) or three small diamond-set panels (medallion).
  const sides=crest?[[.185,.072,.08],[.27,.072,.08]]:[[.128,.052,.066],[.188,.052,.066],[.248,.052,.066]];
  for(const side of [-1,1])for(const [s,w,h] of sides){const w2=seat(B,B.thetaAt(side*s),ym,T+.001);
   metal.push({g:ext(shape(roundRect(w,h,.012)),.005,.0018),w:w2});
   if(crest){metal.push({g:ext(shape(roundRect(w-.014,h-.014,.008),[roundRect(w-.02,h-.02,.006)]),.0025,0,.0085),w:w2});accent.push({g:ext(shape(oval(.018,.018,2,24)),.002,.001,.0085),w:w2});metal.push({g:ext(shape(star(.014,.006)),.002,.0008,.0125),w:w2});}
   else{accent.push({g:ext(shape([[0,.022],[.016,0],[0,-.022],[-.016,0]]),.003,.0012,.0085),w:w2});for(const x of [-.019,.019])for(const y of [-.026,.026])accent.push({g:new THREE.SphereGeometry(.0028,6,4),m:M(x,y,.009),w:w2});}}
  // Rear fastening: overlapping tongue with snaps (crest) or a framed buckle and prong (medallion).
  const back=seat(B,Math.PI,ym,T+.0005);
  if(crest){leather.push({g:ext(shape(roundRect(.15,yt-yb-.016,.03)),.004,.0015),w:back});for(const x of [-.05,0,.05])metal.push({g:new THREE.CylinderGeometry(.0085,.0085,.004,16),m:M(x,0,.008,0,1,1,1,Math.PI/2),w:back},{g:new THREE.SphereGeometry(.006,10,6,0,TAU,0,Math.PI/2),m:M(x,0,.01,0,1,.6,1,Math.PI/2),w:back});}
  else{leather.push({g:ext(shape(roundRect(.13,yt-yb-.02,.025)),.004,.0015),m:M(-.02),w:back});accent.push({g:ext(shape(roundRect(.05,yt-yb+.004,.008),[roundRect(.034,yt-yb-.012,.004)]),.005,.0015,.004),m:M(.045),w:back});accent.push({g:new THREE.BoxGeometry(.036,.004,.004),m:M(.045,0,.011),w:back});}
  const group=new THREE.Group(),meshes=[[leather,crest?k.black:k.oxblood,'leather strap'],[metal,crest?k.gold:k.silver,'plates'],[accent,crest?k.enamel:k.gold,'relief']];
  for(const [parts,mat,name] of meshes){const mesh=new THREE.Mesh(merge(parts),mat);mesh.name='Championship belt '+name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
  return group;}
 const looks=new WeakMap();
 function fittedBands(coach,material){
  const source=coach.skin.geometry,position=source.attributes.position,indices=source.index?.array||Array.from({length:position.count},(_,i)=>i),selected=[],vertices=[],remap=new Map();
  for(let i=0;i<indices.length;i+=3){const face=[indices[i],indices[i+1],indices[i+2]],xs=face.map(j=>Math.abs(position.getX(j))),ys=face.map(j=>position.getY(j));if(Math.max(...xs)<.442||Math.min(...xs)>.478||Math.max(...ys)<1.44||Math.min(...ys)>1.8)continue;for(const index of face){if(!remap.has(index)){remap.set(index,vertices.length);vertices.push(index);}selected.push(remap.get(index));}}
  const geometry=new THREE.BufferGeometry();for(const [name,attribute]of Object.entries(source.attributes)){const values=new attribute.array.constructor(vertices.length*attribute.itemSize);for(let i=0;i<vertices.length;i++)for(let k=0;k<attribute.itemSize;k++)values[i*attribute.itemSize+k]=attribute.array[vertices[i]*attribute.itemSize+k];geometry.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize,attribute.normalized));}
  geometry.setIndex(selected);geometry.setAttribute('ribbonRestX',new THREE.Float32BufferAttribute(vertices.map(i=>Math.abs(position.getX(i))),1));
  const ribbon=material.clone();ribbon.skinning=true;ribbon.vertexColors=false;
  const mesh=new THREE.SkinnedMesh(geometry,ribbon);mesh.name='Surface-fitted arm ribbons';coach.root.add(mesh);mesh.bind(coach.skeleton,coach.skin.bindMatrix);mesh.bindMode=coach.skin.bindMode;mesh.frustumCulled=false;mesh.castShadow=true;mesh.userData.surfaceVertices=vertices;
  mesh.customDepthMaterial=coach.skin.customDepthMaterial.clone();mesh.customDistanceMaterial=coach.skin.customDistanceMaterial.clone();
  for(const [target,original]of [[ribbon,coach.skin.material],[mesh.customDepthMaterial,coach.skin.customDepthMaterial],[mesh.customDistanceMaterial,coach.skin.customDistanceMaterial]]){target.onBeforeCompile=shader=>{original.onBeforeCompile(shader);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float ribbonRestX; varying float vRibbonX;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRibbonX=ribbonRestX;').replace('#include <project_vertex>','transformed+=normalize((bindMatrixInverse*vec4(qrotate(coachQ,(bindMatrix*vec4(normal,0.0)).xyz),0.0)).xyz)*.006;\n#include <project_vertex>');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vRibbonX;').replace(/void main\s*\(\s*\)\s*\{/,'void main(){if(vRibbonX<.442||vRibbonX>.478)discard;');};target.customProgramCacheKey=()=>original.customProgramCacheKey()+'-fitted-ribbon-v1';}
  return mesh;
 }
 const headFits=new WeakMap();
 // Flat cloth ribbon with real thickness along a path; width runs along `side`, ends cut in a swallowtail.
 function ribbon(points,side,w0,w1,thick,notch=.6){const curve=new THREE.CatmullRomCurve3(points),n=18,pos=[],nor=[],idx=[],ring=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
  for(let i=0;i<=n;i++){const s=i/n,p=curve.getPoint(s),t=curve.getTangent(s),w=w0+(w1-w0)*s,across=side.clone().addScaledVector(t,-side.dot(t)).normalize(),out=new THREE.Vector3().crossVectors(t,across).normalize();
   for(const [a,b] of ring){const q=p.clone().addScaledVector(across,a*w).addScaledVector(out,b*thick).addScaledVector(t,i===n?a*notch*w:0);pos.push(q.x,q.y,q.z);const nn=out.clone().multiplyScalar(b).addScaledVector(across,a*.35).normalize();nor.push(nn.x,nn.y,nn.z);}}
  for(let i=0;i<n;i++)for(let k=0;k<4;k++){const a=i*4+k,b=i*4+(k+1)%4;idx.push(a,a+4,b,b,a+4,b+4);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setIndex(idx);return g;}
 // Head bands are fitted to the convex hull of the forehead slice (bind pose, head bone).
 function headFit(coach,ys){const key='head'+ys.join();let cache=headFits.get(coach);if(!cache)headFits.set(coach,cache={});if(cache[key])return cache[key];const bins=72,head=coach.joints.head;
  const s=slices(coach,head,[coach.skin],[[ys[0]-.006,ys[1]],[ys[0],ys[2]],[ys[1],ys[2]+.006]]),rings=s.map(xz=>hullRadii(xz,bins).map(r=>r+.0045));
  return cache[key]=band(ys,rings,bins);}
 // Outer surface of the lion's mane at rest along a direction (plus the guides' sway margin).
 function maneRadius(coach,theta,y0,y1){const rest=coach.maneRest;if(!rest)return 0;let r=0;const dx=Math.sin(theta),dz=Math.cos(theta);for(let i=0;i<rest.length;i+=3){const x=rest[i],y=rest[i+1],z=rest[i+2];if(y<y0||y>y1)continue;const along=x*dx+z*dz,off=Math.abs(x*dz-z*dx);if(off<.035)r=Math.max(r,along);}return r?r-.045:0;}
 function headband(coach,design){const k=materials(),rabbit=coach.species==='rabbit',side=design==='side',h=side?(rabbit?.044:.054):(rabbit?.034:.04),yc=rabbit?.186:.2,ys=[yc-h/2,yc,yc+h/2],B=headFit(coach,ys),T=side?.0065:.005,cloth=[],trim=[];
  cloth.push({g:strap(B,ys[0],ys[2],T,.002,72)});
  if(side){for(const y of [ys[0]+.005,ys[2]-.005])trim.push({g:piping(B,y,T+.0004,.0018,72)});cloth.push({g:piping(B,yc,T+.0002,.0022,72)});}
  // Knot: at the back (ribbon) or over the left temple (bandana); on a lion it sits on the mane surface.
  const theta=side?-2.05:Math.PI,f=B.frame(theta,yc,T),mane=maneRadius(coach,theta,yc-.04,yc+.04),o=f.o.clone();if(mane){const r=Math.hypot(o.x,o.z);o.multiplyScalar(Math.max(1,mane/r));o.y=yc;}
  const knot=new THREE.Matrix4().makeBasis(f.t,f.u,f.n).setPosition(o),place=m=>new THREE.Matrix4().multiplyMatrices(knot,m);
  cloth.push({g:new THREE.SphereGeometry(1,12,8),m:place(M(0,0,.006,.5,side?.022:.017,side?.017:.014,.011))});
  for(const s of [-1,1])cloth.push({g:new THREE.TorusGeometry(side?.011:.009,.0045,6,12,Math.PI*1.3),m:place(M(s*.016,.002,.004,s>0?-.6:Math.PI-.6+1.3,1,1,.6))});
  // Two tails: long and hanging (ribbon) or short and splayed (bandana); swallowtail ends.
  const down=new THREE.Vector3(0,-1,0),back=f.n.clone(),across=f.t.clone(),start=o.clone().addScaledVector(back,.008);
  for(const [s,len] of side?[[-1,.11],[1,.085]]:[[-1,.2],[1,.17]]){const pts=[];for(let i=0;i<=4;i++){const a=i/4;pts.push(start.clone().addScaledVector(across,s*(.008+a*(side?.05:.03))).addScaledVector(down,a*len).addScaledVector(back,.012*Math.sin(a*Math.PI)+a*(side?.03:.012)));}
   cloth.push({g:ribbon(pts,across,side?.03:.026,side?.034:.03,T*.8)});}
  const group=new THREE.Group();for(const [parts,mat,name] of [[cloth,side?k.navy:k.ribbon,'cloth'],[trim,k.cream,'trim']]){if(!parts.length)continue;const mesh=new THREE.Mesh(merge(parts),mat);mesh.name='Head band '+name;mesh.castShadow=true;group.add(mesh);}
  return group;}
 // Knot and two short tails on each fitted arm ribbon, carried by the upper-arm bone at the
 // ribbon's lateral (rest-pose top) edge, so they lie along the arm toward the elbow.
 function armKnots(coach,mesh){const k=materials(),P=mesh.geometry.attributes.position,N=mesh.geometry.attributes.normal,knots=[];
  for(const [side,s] of [['L',-1],['R',1]]){let best=-1;for(let i=0;i<P.count;i++)if(Math.sign(P.getX(i))===s&&(best<0||P.getY(i)>P.getY(best)))best=i;if(best<0)continue;
   const bone=coach.joints['arm'+side],inv=coach.skeleton.boneInverses[coach.bones.indexOf(bone)],p=new THREE.Vector3().fromBufferAttribute(P,best).applyMatrix4(mesh.bindMatrix).applyMatrix4(inv),n=new THREE.Vector3().fromBufferAttribute(N,best).transformDirection(inv),o=p.addScaledVector(n,.02);
   const along=new THREE.Vector3(s,0,0),across=new THREE.Vector3(0,0,1),parts=[{g:new THREE.SphereGeometry(1,10,7),m:M(o.x,o.y,o.z,0,.017,.013,.019)}];
   for(const t of [-1,1]){const pts=[];for(let i=0;i<=3;i++){const a=i/3;pts.push(o.clone().addScaledVector(along,.006+a*.075).addScaledVector(across,t*(.006+a*.012)).addScaledVector(n,.003+.006*a));}parts.push({g:ribbon(pts,across,.018,.021,.005)});}
   const knot=new THREE.Mesh(merge(parts),k.ribbon);knot.name='Arm ribbon knot '+side;knot.castShadow=true;bone.add(knot);knots.push(knot);}
  mesh.userData.knots=knots;return knots;}
 function build(coach,item){const g=new THREE.Group();g.name='Cosmetic '+item.id;
  if(item.kind==='armbands'){const mesh=fittedBands(coach,materials().ribbon);armKnots(coach,mesh);return mesh;}
  if(item.kind==='belt'){coach.joints.hips.add(g);g.add(belt(coach,item.design));}else{coach.joints.head.add(g);g.add(headband(coach,item.design));}
  return g;}
 function look(coach,ids=[]){if(!coach)return;let groups=looks.get(coach);if(!groups&&!ids.length)return;if(!groups){groups={};looks.set(coach,groups);}
  // One item per kind: the last id wins, so a Shop preview replaces the equipped belt or headband.
  const shown=new Map();for(const id of ids){const item=catalog.find(c=>c.id===id);if(item)shown.set(item.kind,item.id);}
  const visible=new Set(shown.values());for(const id of visible)if(!groups[id])groups[id]=build(coach,catalog.find(c=>c.id===id));
  for(const [id,g]of Object.entries(groups)){g.visible=visible.has(id);for(const knot of g.userData.knots||[])knot.visible=g.visible;}
 }
 const api={catalog,fresh,validate,action,look,fit:{belt:c=>beltBand(c),strapThickness:STRAP}};if(typeof module!=='undefined')module.exports=api;else window.GameAccessories=api;
})();
