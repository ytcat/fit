/* Hand-mounted training equipment. Every visible attachment shares a wrist transform. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 let grain;
 function leatherGrain(){if(grain)return grain;const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');if(!ctx?.createImageData)return null;const pixels=ctx.createImageData(128,128);if(!pixels?.data)return null;let seed=519;
  for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=155+(seed>>>27);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);grain=new THREE.CanvasTexture(c);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(3,3);return grain;}
 const material=(color,roughness=.72)=>new THREE.MeshStandardMaterial({color,roughness,bumpMap:leatherGrain(),bumpScale:.00075});
 function mesh(parent,g,m,name){const n=new THREE.Mesh(g,m);n.name=name;n.castShadow=n.receiveShadow=true;parent.add(n);return n;}
 function seam(parent,points,m,r=.0018,closed=false){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed),Math.max(16,points.length*2),r,5,closed),m,'Raised leather binding');}
 function combine(parts,parent,mat,name){const attributes={position:[],normal:[],uv:[]};for(const part of parts){part.updateMatrix();const g=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();g.applyMatrix4(part.matrix);for(const key of Object.keys(attributes))attributes[key].push(...g.attributes[key].array);g.dispose();part.geometry.dispose();part.parent.remove(part);}const g=new THREE.BufferGeometry();for(const [key,values] of Object.entries(attributes))g.setAttribute(key,new THREE.Float32BufferAttribute(values,key==='uv'?2:3));return mesh(parent,g,mat,name);}
 function mount(coach,side,root){const hand=coach.joints['hand'+side],hidden=hand.children.filter(n=>!n.isBone).map(n=>[n,n.visible]);for(const [n] of hidden)n.visible=false;hand.add(root);root.userData.restore=()=>{for(const [n,visible] of hidden)n.visible=visible;};root.userData.hand=hand;return root;}
 function mitt(coach,side){
  const root=new THREE.Group();root.name='Professional focus mitt '+side;
  const leather=material(0x202a31,.65),edge=material(0x121b22,.86),face=material(0x947246,.84),thread=material(0xd6c3a2,.95),target=material(0xe3d4b5,.87);
  const cushion=new THREE.Group();cushion.name='Compressible mitt padding';root.add(cushion);root.userData.cushion=cushion;root.userData.face=V(0,-.120,.066);
  // A cupped pear-shaped striking surface: broad fingers, fitted heel and wrist.
  const steps=48,rings=14,p=[],uv=[],index=[];
  for(let r=0;r<=rings;r++)for(let i=0;i<=steps;i++){
   const a=i/steps*Math.PI*2,radius=r/rings,cy=Math.sin(a),width=.131*(1-.15*Math.max(0,cy));
   p.push(Math.cos(a)*width*radius,-.12+cy*.155*radius,.066+.019*radius*radius);uv.push(.5+Math.cos(a)*radius*.5,.5+cy*radius*.5);
   if(r<rings&&i<steps){const n=r*(steps+1)+i;index.push(n,n+steps+1,n+1,n+1,n+steps+1,n+steps+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();mesh(cushion,g,face,'Concave leather catching face');
  const back=mesh(cushion,new THREE.SphereGeometry(1,32,20),leather,'Padded anatomical mitt body');back.position.set(0,-.12,-.025);back.scale.set(.132,.157,.070);
  const rim=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2,cy=Math.sin(a);rim.push(V(Math.cos(a)*.131*(1-.15*Math.max(0,cy)),-.12+cy*.155,.083));}seam(cushion,rim,edge,.006,true);
  const wall=[],wi=[];for(let layer=0;layer<2;layer++)for(const v of rim)wall.push(v.x,v.y,layer?-.025:v.z);for(let i=0;i<48;i++){const j=(i+1)%48;wi.push(i,48+i,j,j,48+i,48+j);}const sidewall=new THREE.BufferGeometry();sidewall.setAttribute('position',new THREE.Float32BufferAttribute(wall,3));sidewall.setIndex(wi);sidewall.computeVertexNormals();mesh(cushion,sidewall,leather,'Continuous padded sidewall');
  const stitches=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2,b=a+.033;stitches.push(seam(cushion,[V(.121*Math.cos(a),-.12+.145*Math.sin(a),.081),V(.121*Math.cos(b),-.12+.145*Math.sin(b),.081)],thread,.00085));}combine(stitches,cushion,thread,'Double-stitched perimeter');
  const ring=mesh(cushion,new THREE.TorusGeometry(.046,.0035,6,48),target,'Embroidered strike target');ring.position.set(0,-.12,.070);const dot=mesh(cushion,new THREE.CircleGeometry(.009,24),target,'Target centre');dot.position.set(0,-.12,.071);
  const pocket=mesh(root,new THREE.SphereGeometry(1,24,16),leather,'Fitted hand pocket');pocket.position.set(0,-.082,-.035);pocket.scale.set(.076,.105,.053);
  const cuff=mesh(root,new THREE.CylinderGeometry(.060,.056,.079,32,1,true),edge,'Wide adjustable wrist strap');cuff.position.y=.008;cuff.scale.z=.9;
  const tab=mesh(root,new THREE.BoxGeometry(.068,.036,.014),leather,'Hook-and-loop closure');tab.position.set(0,.012,-.055);
  for(const y of [-.024,.040]){const points=[];for(let i=0;i<32;i++){const a=i/32*Math.PI*2;points.push(V(.059*Math.cos(a),y,.054*Math.sin(a)));}seam(root,points,thread,.0011,true);}
  const sign=side==='L'?-1:1,thumb=mesh(root,new THREE.SphereGeometry(1,20,12),leather,'Protected thumb pocket');thumb.position.set(sign*.081,-.058,-.016);thumb.scale.set(.039,.060,.045);thumb.rotation.z=-sign*.3;
  return mount(coach,side,root);
 }
 function ropeGrip(coach,side){
  const root=new THREE.Group();root.name='Wrapped rope grip '+side;const wrap=material(0xd7c9ad,.98),skin=material(coach.species==='rabbit'?0x9da6ab:0xb78b49,.95),rubber=material(0x18232a,.76),metal=new THREE.MeshStandardMaterial({color:0xa7afae,metalness:.72,roughness:.36});
  const palm=mesh(root,new THREE.SphereGeometry(1,24,16),wrap,'Wrapped palm');palm.position.set(0,-.075,0);palm.scale.set(.052,.066,.042);
  const wrist=mesh(root,new THREE.CylinderGeometry(.048,.043,.062,24),wrap,'Training hand wrap');wrist.position.y=.007;wrist.scale.z=.83;
  for(let i=0;i<4;i++){const finger=mesh(root,new THREE.SphereGeometry(1,16,12),skin,'Curled finger');finger.position.set((i-1.5)*.022,-.110,.027);finger.scale.set(.014,.034,.018);}
  const sign=side==='L'?-1:1,thumb=mesh(root,new THREE.SphereGeometry(1,16,12),skin,'Wrapped grip thumb');thumb.position.set(sign*.045,-.071,.034);thumb.scale.set(.020,.037,.020);thumb.rotation.z=-sign*.35;
  const handle=new THREE.Group();handle.name='Knurled skipping handle';handle.position.set(0,-.091,.025);handle.rotation.z=Math.PI/2;root.add(handle);
  mesh(handle,new THREE.CylinderGeometry(.016,.018,.155,20),rubber,'Rubber rope handle');
  for(const y of [-.064,-.039,-.014,.011,.036,.061]){const band=mesh(handle,new THREE.TorusGeometry(.017,.0012,5,20),metal,'Handle grip ring');band.rotation.x=Math.PI/2;band.position.y=y;}
  const swivel=mesh(handle,new THREE.SphereGeometry(.018,16,12),metal,'Ball-bearing rope swivel');swivel.position.y=side==='L'?.084:-.084;
  root.userData.exit=swivel;return mount(coach,side,root);
 }
 function dispose(root){root.userData.restore?.();root.parent?.remove(root);const materials=new Set();root.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)materials.add(n.material);});for(const m of materials)m.dispose();}
 window.TrainingGear={mitt,ropeGrip,dispose};
})();
