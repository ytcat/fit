/* Rhinoceros referee v75. Continuous-surface geometry with articulated arms.
 * THREE r128, metres, positive Z is forward. No external models or services.
 */
(() => {
 'use strict';
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 class RhinoReferee {
  constructor(){
   this.root=new THREE.Group();
   this.root.name='Rhinoceros referee - sculpted';
   const mat=(color,roughness=.87,extra={})=>{
    const m=new THREE.MeshStandardMaterial({color,roughness,...extra});
    m.color.convertSRGBToLinear();return m;
   };
   const make=(parent,geometry,material,point=V())=>{
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.copy(point);mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.frustumCulled=false;parent.add(mesh);return mesh;
   };
   const ell=(parent,point,scale,material)=>{
    const mesh=make(parent,new THREE.SphereGeometry(1,32,24),material,point);
    mesh.scale.copy(scale);return mesh;
   };
   const curve=(parent,points,color,radius=.004)=>{
    return make(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(16,points.length*8),radius,6,false),color);
   };
   const sculpt=(key,volumes,lo,hi,step)=>{
    const cache=RhinoReferee.sculpts||(RhinoReferee.sculpts=new Map());
    if(!cache.has(key))cache.set(key,window.EQUIPMENT_SURFACES?.['referee-'+key]?CoachSurface.fromPacked(window.EQUIPMENT_SURFACES['referee-'+key]):CoachSurface(volumes,lo,hi,step));
    return cache.get(key).clone();
   };
   // Deterministic tileable grayscale bump map, shared between skin regions.
   const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=512;
   const ctx=texCanvas.getContext('2d');
   ctx.fillStyle='#818181';ctx.fillRect(0,0,512,512);
   let state=1841;const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
   for(let i=0;i<27000;i++){
    const n=98+Math.floor(rand()*81),x=rand()*512,y=rand()*512;
    ctx.fillStyle='rgb('+n+','+n+','+n+')';ctx.fillRect(x,y,1+rand()*2,1+rand()*2);
   }
   for(let i=0;i<950;i++){
    const x=rand()*512,y=rand()*512;
    ctx.strokeStyle=rand()>.5?'rgba(42,42,42,.18)':'rgba(210,210,210,.15)';
    ctx.lineWidth=.5+rand()*.7;ctx.beginPath();ctx.moveTo(x,y);
    ctx.bezierCurveTo(x+5,y-4,x+15,y+4,x+25,y-3);ctx.stroke();
   }
   const detail=new THREE.CanvasTexture(texCanvas);
   detail.wrapS=detail.wrapT=THREE.RepeatWrapping;detail.repeat.set(3,3);detail.anisotropy=4;
   const skin=mat(0x849197,.89,{bumpMap:detail,bumpScale:.0032});
   const shadowSkin=mat(0x58666c,.93,{bumpMap:detail,bumpScale:.0024});
   const innerEar=mat(0x9f8183,.93);
   const ivory=mat(0xe1d6bb,.59);
   const eyeWhite=mat(0x9e9d90,.48);
   const iris=mat(0x775a3d,.32);
   const pupil=mat(0x16181c,.25);
   const glint=mat(0xf7f2e9,.18);
   const jersey=mat(0xe3e2dc,.84,{bumpMap:detail,bumpScale:.00065});
   const black=mat(0x20252a,.75);
   const trim=mat(0x292d33,.87);
   const pants=mat(0x232731,.83,{bumpMap:detail,bumpScale:.0008});
   const gloves=mat(0x171b23,.55,{metalness:.04});
   const boot=mat(0x161a21,.42,{metalness:.045,bumpMap:detail,bumpScale:.0008});
   const seam=mat(0x495257,.94);
   // Sculpt head as one joined surface. The cheek, brows, nasal bridge, muzzle
   // and lower jaw blend together without visible primitive intersections.
   this.head=new THREE.Group();this.head.position.set(0,1.735,.015);this.root.add(this.head);
   const skull=sculpt('head',[
     [[0,.115,-.035],[.227,.245,.205]],
     [[0,.055,.112],[.210,.173,.211]],
     [[0,-.004,.239],[.176,.131,.204]],
     [[0,-.064,.302],[.173,.081,.148]],
     [[0,.096,.243],[.120,.123,.130]],
     [[-.162,.047,.130],[.087,.105,.120]],
     [[.162,.047,.130],[.087,.105,.120]],
     [[0,-.100,.214],[.139,.058,.151]]
   ],[-.28,-.15,-.26],[.28,.39,.48],.016);
   make(this.head,skull,skin).name='Connected rhino skull, jaw and muzzle';
   // Recessed expression, natural ears, nostrils and muscular facial folds.
   for(const side of [-1,1]){
     const ear=ell(this.head,V(side*.207,.31,-.050),V(.078,.122,.046),skin);
     ear.rotation.z=-side*.25;
     const cavity=ell(this.head,V(side*.205,.322,-.005),V(.044,.086,.011),innerEar);
     cavity.rotation.z=-side*.25;
     ell(this.head,V(side*.122,.181,.221),V(.032,.023,.016),eyeWhite);
     ell(this.head,V(side*.123,.182,.236),V(.019,.019,.008),iris);
     ell(this.head,V(side*.126,.182,.242),V(.010,.014,.005),pupil);
     ell(this.head,V(side*.120,.189,.247),V(.004,.004,.003),glint);
     const brow=ell(this.head,V(side*.126,.213,.199),V(.089,.034,.061),skin);
     brow.rotation.z=-side*.21;
     // Nostrils are inset into the broad distal muzzle.
     const nostril=ell(this.head,V(side*.112,-.023,.437),V(.035,.021,.007),shadowSkin);
     nostril.rotation.z=side*.18;
     curve(this.head,[V(side*.196,.065,.242),V(side*.194,.005,.277),V(side*.175,-.044,.299)],seam,.0029);
     curve(this.head,[V(side*.144,-.079,.404),V(side*.083,-.111,.422),V(0,-.118,.420)],shadowSkin,.0025);
     for(let fold=0;fold<3;fold++){
       const x=side*(.052+fold*.022);
       curve(this.head,[V(x,.185+fold*.007,.266-fold*.022),V(x+side*.014,.205+fold*.007,.265-fold*.023)],seam,.0014);
     }
   }
   for(const side of [-1,1]){
    for(let i=0;i<3;i++)curve(this.head,[V(side*(.172+i*.008),.11-i*.016,.19),V(side*(.19+i*.007),.085-i*.016,.215)],shadowSkin,.0014);
    curve(this.head,[V(side*.08,-.105,.388),V(side*.03,-.114,.418),V(0,-.113,.42)],skin,.0034);
   }
   this.root.userData.artRevision=75;
   // Two tapered curved horns, aligned along the upper bridge (not stuck
   // through the middle of the nose).
   const horn=(base,height,radius,lean)=>{
     const sections=18,radial=20,pos=[],index=[];
     for(let i=0;i<=sections;i++){
       const t=i/sections;
       const r=radius*Math.pow(1-t,1.18)+.001;
       const y=base.y+height*t,z=base.z-lean*t*t;
       for(let j=0;j<=radial;j++){
         const a=j/radial*Math.PI*2;pos.push(Math.cos(a)*r,y, z+Math.sin(a)*r);
         if(i<sections&&j<radial){const k=i*(radial+1)+j;index.push(k,k+radial+1,k+1,k+1,k+radial+1,k+radial+2);}
       }
     }
     const g=new THREE.BufferGeometry();
     g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(index);g.computeVertexNormals();
     return make(this.head,g,ivory);
   };
   horn(V(0,.105,.406),.285,.083,-.045);
   horn(V(0,.239,.249),.128,.044,-.015);
   curve(this.head,[V(-.136,-.099,.361),V(0,-.117,.431),V(.136,-.099,.361)],shadowSkin,.0028);
   // One continuous referee jersey from collar through shoulders and waist.
   const torso=sculpt('shirt',[
     [[0,1.26,0],[.303,.342,.209]],
     [[0,1.46,0],[.320,.215,.215]],
     [[-.249,1.49,0],[.147,.128,.141]],
     [[.249,1.49,0],[.147,.128,.141]],
     [[0,1.62,0],[.147,.104,.145]],
     [[0,1.035,0],[.258,.153,.184]]
   ],[-.435,.84,-.245],[.435,1.72,.245],.018);
   make(this.root,torso,jersey).name='Continuous referee jersey and shoulders';
   // Woven white boxing-official shirt, with a shaped collar and bow tie.
   // Texture and seams are attached to the curved surface, not floating bars.
   const clothCanvas=document.createElement('canvas');clothCanvas.width=clothCanvas.height=512;
   const clothCtx=clothCanvas.getContext('2d');clothCtx.fillStyle='#e9e9e2';clothCtx.fillRect(0,0,512,512);
   for(let i=0;i<512;i+=2){
    clothCtx.fillStyle=i%4?'rgba(90,105,115,.045)':'rgba(255,255,255,.12)';
    clothCtx.fillRect(i,0,1,512);clothCtx.fillRect(0,i,512,1);
   }
   const clothTexture=new THREE.CanvasTexture(clothCanvas);clothTexture.encoding=THREE.sRGBEncoding;
   clothTexture.wrapS=clothTexture.wrapT=THREE.RepeatWrapping;clothTexture.repeat.set(3,3);clothTexture.anisotropy=4;
   jersey.map=clothTexture;jersey.needsUpdate=true;
   const front=(x,y,offset=.002)=>{
    const p=torso.attributes.position;let best=Infinity,z=.15;
    for(let i=0;i<p.count;i++)if(p.getZ(i)>0){
     const d=(p.getX(i)-x)**2+(p.getY(i)-y)**2;
     if(d<best){best=d;z=p.getZ(i);}
    }
    return V(x,y,z+offset);
   };
   const panel=(x,y,width,height,material,offset=.003)=>{
    const g=new THREE.PlaneGeometry(width,height,8,8),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const v=front(x+p.getX(i),y+p.getY(i),offset);p.setXYZ(i,v.x,v.y,v.z);}
    g.computeVertexNormals();return make(this.root,g,material);
   };
   panel(-.13,1.37,.10,.105,jersey).name='Curved tailored shirt pocket';
   curve(this.root,[front(-.18,1.42),front(-.18,1.32),front(-.08,1.32),front(-.08,1.42)],seam,.0013);
   for(const y of [1.14,1.25,1.36,1.47])ell(this.root,front(0,y,.005),V(.005,.005,.003),ivory);
   curve(this.root,[front(.012,1.08),front(.012,1.30),front(.012,1.53)],jersey,.0015);
   for(const side of [-1,1]){
    const shape=new THREE.Shape();shape.moveTo(side*.025,1.64);shape.lineTo(side*.125,1.60);shape.lineTo(side*.06,1.53);shape.closePath();
    const fold=make(this.root,new THREE.ExtrudeGeometry(shape,{depth:.003,bevelEnabled:true,bevelSize:.0015,bevelThickness:.0015,bevelSegments:2,steps:1}),jersey,V(0,0,.155));fold.name='Folded shirt collar';
    const wing=ell(this.root,V(side*.037,1.575,.205),V(.035,.021,.013),black);wing.rotation.z=side*.17;
    curve(this.root,[front(side*.25,1.48),front(side*.22,1.41),front(side*.24,1.34)],jersey,.0014);
   }
   ell(this.root,V(0,1.575,.212),V(.014,.016,.016),black);
   ell(this.root,V(0,.93,0),V(.263,.055,.184),black);
   const buckle=mat(0xb29d76,.38,{metalness:.45});
   ell(this.root,V(0,.94,.197),V(.040,.027,.012),buckle);
   // Side belt, trouser details and broad grounded shoes.
   const lower=sculpt('trousers',[
     [[0,.805,0],[.248,.170,.178]],
     [[-.145,.565,0],[.116,.313,.125]],
     [[.145,.565,0],[.116,.313,.125]],
     [[-.145,.295,0],[.11,.190,.118]],
     [[.145,.295,0],[.11,.190,.118]]
   ],[-.30,.11,-.20],[.30,.98,.20],.022);
   make(this.root,lower,pants).name='Continuous trouser silhouette';
   for(const side of [-1,1]){
     const shoe=ell(this.root,V(side*.148,.135,.072),V(.128,.104,.194),boot);
     ell(this.root,V(side*.148,.026,.072),V(.131,.026,.20),black).name='Grounded rubber shoe sole';
     const upper=(x,z)=>V(side*.148+x,.135+.104*Math.sqrt(Math.max(0,1-(x/.128)**2-((z-.072)/.194)**2))+.002,z);
     for(let i=0;i<5;i++){const z=.035+i*.022;curve(this.root,[upper(-.038,z),upper(.038,z+.008)],seam,.0016);}
     curve(this.root,[upper(-.085,.165),upper(0,.195),upper(.085,.165)],trim,.0016);

     curve(this.root,[V(side*.142,.40,.124),V(side*.150,.31,.124),V(side*.150,.21,.120)],trim,.0027);
     ell(this.root,V(side*.15,.143,.225),V(.092,.018,.025),trim);
   }
   // Referee equipment: dark collar, whistle and embroidered badge.
   const whistle=mat(0x33383c,.32,{metalness:.45});
   curve(this.root,[V(-.04,1.591,.165),V(0,1.49,.230),V(.038,1.59,.165)],black,.0045);
   ell(this.root,V(0,1.47,.234),V(.026,.033,.018),whistle);
   const badgeCanvas=document.createElement('canvas');badgeCanvas.width=512;badgeCanvas.height=256;
   const badgeCtx=badgeCanvas.getContext('2d');badgeCtx.fillStyle='#19222b';badgeCtx.fillRect(0,0,512,256);
   badgeCtx.strokeStyle='#c7ab70';badgeCtx.lineWidth=10;badgeCtx.strokeRect(10,10,492,236);
   badgeCtx.fillStyle='#e4c98f';badgeCtx.font='bold 58px sans-serif';badgeCtx.textAlign='center';badgeCtx.fillText('OFFICIAL',256,150);
   const badgeMap=new THREE.CanvasTexture(badgeCanvas);badgeMap.encoding=THREE.sRGBEncoding;
   const badgeMaterial=mat(0xffffff,.8,{map:badgeMap,bumpMap:detail,bumpScale:.0004});
   panel(.17,1.40,.102,.058,badgeMaterial,.005).name='Embroidered official badge';
   // One deformation surface per arm. The sleeve and bare forearm are
   // sections of the SAME mesh; no ball elbows or disconnected cylinders.
   const buildArm=()=>{
     const rings=36,radial=28,vertices=new Float32Array((rings+1)*(radial+1)*3),indices=[];
     for(let i=0;i<rings;i++)for(let j=0;j<radial;j++){
       const k=i*(radial+1)+j;indices.push(k,k+radial+1,k+1,k+1,k+radial+1,k+radial+2);
     }
     const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(vertices,3));
     g.setIndex(indices);
     const uv=[];for(let i=0;i<=rings;i++)for(let j=0;j<=radial;j++)uv.push(j/radial,i/rings*2);
     g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
     const cut=14*radial*6;g.addGroup(0,cut,0);g.addGroup(cut,indices.length-cut,1);
     const mesh=make(this.root,g,[jersey,skin]);
     const rest=new Float32Array(vertices.length);
     mesh.userData.pose=(start,mid,end)=>{
       const path=new THREE.CatmullRomCurve3([start,mid,end]);let transported=V(1,0,0);
       for(let i=0;i<=rings;i++){
         const t=i/rings,center=path.getPoint(t),tan=path.getTangent(t).normalize();
         const across=transported.clone().addScaledVector(tan,-transported.dot(tan));
         if(across.lengthSq()<.0001)across.copy(V(0,0,1)).addScaledVector(tan,-tan.z);
         across.normalize();transported=across;const forward=new THREE.Vector3().crossVectors(across,tan).normalize();
         // Broad deltoid tapers through elbow into muscular forearm.
         const radius=t<.12?.101:t<.40?.101-(t-.12)*.08:t<.65?.078-(t-.40)*.046:.066-(t-.65)*.035;
         const blend=1+.035*Math.sin(Math.PI*t)*Math.sin(2*Math.PI*t);
         for(let j=0;j<=radial;j++){
           const angle=2*Math.PI*j/radial,r=radius*blend,idx=3*(i*(radial+1)+j);
           const p=center.clone().addScaledVector(across,Math.cos(angle)*r).addScaledVector(forward,Math.sin(angle)*r);
           vertices[idx]=p.x;vertices[idx+1]=p.y;vertices[idx+2]=p.z;
         }
       }
       g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
     };
     return mesh;
   };
   this.arms={};
   // Closed, joined glove shape has an integrated thumb and finger knuckles.
   const gloveGeometry=sculpt('hands',[
     [[0,0,.008],[.070,.080,.049]],
     [[0,-.055,.028],[.070,.042,.054]],
     [[-.054,-.019,.048],[.030,.055,.030]],
     [[0,-.078,.030],[.067,.025,.042]]
   ],[-.105,-.112,-.06],[.105,.10,.11],.009);
   for(const side of [-1,1]){
     const wrist=new THREE.Group();this.root.add(wrist);
     make(wrist,gloveGeometry.clone(),gloves);
     ell(wrist,V(0,.072,0),V(.062,.025,.052),trim);
     const arm=buildArm();
     this.arms[side]={wrist,arm};
   }
   // Save refs for automated geometry/pose assertions.
   this.validation={head:skull,torso,lower,gloveGeometry};
   this.update(0);
  }
  update(time,grip=null,side=1){
   this.head.rotation.y=Math.sin(time*.64)*.065;
   this.head.rotation.x=Math.sin(time*.47)*.015;
   this.root.updateMatrixWorld(true);
   for(const s of [-1,1]){
     const held=grip?.isVector3?(s===side?grip:null):grip?.[s];
     const shoulder=V(s*.315,1.49,0);
     const goal=held?this.root.worldToLocal(held.clone()):V(s*.365,1.04,.12);
     const v=goal.clone().sub(shoulder),dist=clamp(v.length(),.10,.79);
     const direction=v.normalize(),upper=.395,fore=.405;
     const along=(upper*upper-fore*fore+dist*dist)/(2*dist);
     const pole=V(s*.82,-.07,.29);
     pole.addScaledVector(direction,-pole.dot(direction)).normalize();
     const bend=Math.sqrt(Math.max(0,upper*upper-along*along));
     const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,bend);
     const wrist=shoulder.clone().addScaledVector(direction,dist);
     const mesh=this.arms[s];mesh.arm.userData.pose(shoulder,elbow,wrist);
     mesh.wrist.position.copy(wrist);
     const palmForward=V(0,0,1);
     const up=held?wrist.clone().sub(elbow).normalize():V(0,1,0);
     if(Math.abs(up.dot(palmForward))>.95)up.set(0,1,0);
     const right=new THREE.Vector3().crossVectors(up,palmForward).normalize();
     const corrected=new THREE.Vector3().crossVectors(palmForward,right).normalize();
     mesh.wrist.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,corrected,palmForward));
   }
   this.root.updateMatrixWorld(true);
  }
 }
 class FightAudience {
  constructor(parent){
   this.root=new THREE.Group();parent.add(this.root);this.hands=[];
   const material=new THREE.MeshStandardMaterial({color:0x57617a,roughness:.9});material.color.convertSRGBToLinear();
   const head=new THREE.SphereGeometry(.09,10,8),body=new THREE.SphereGeometry(1,10,8),palm=new THREE.SphereGeometry(.035,8,6);
   // Populate all four sides of the ring, not only the back bleachers.
   // Keep spectators outside the ropes so rotation never reveals an empty arena.
   for(let i=0;i<72;i++){
    const row=Math.floor((i%18)/9),slot=i%9,side=Math.floor(i/18);
    const lateral=(slot-4)*.39,depth=2.75+row*.38,y=row*.16;
    const x=side===0||side===2?lateral:(side===1?depth:-depth);
    const z=side===0?-depth:side===2?depth:lateral;
    const h=new THREE.Mesh(head,material);h.position.set(x,1.05+y,z);h.userData.audienceSide=side;this.root.add(h);
    const b=new THREE.Mesh(body,material);b.scale.set(.10,.19,.09);b.position.set(x,.76+y,z);b.userData.audienceSide=side;this.root.add(b);
    const pair=[];for(const s of [-1,1]){const p=new THREE.Mesh(palm,material);p.position.set(x+s*.1,.92+y,z+.15);p.userData.audienceSide=side;this.root.add(p);pair.push(p);}this.hands.push({pair,x,y,z});
   }
  }
  update(t,applaud){for(const [i,h] of this.hands.entries())for(const [j,p] of h.pair.entries()){const spread=applaud?.025+.055*(.5+.5*Math.sin(t*15+i)): .10;p.position.set(h.x+(j?1:-1)*spread,(applaud?1.08:.92)+h.y,h.z+.15);}}
 }
 window.RhinoReferee=RhinoReferee;window.FightAudience=FightAudience;
})();
