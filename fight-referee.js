/* Rhinoceros referee v71. Continuous-surface geometry with articulated arms.
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
   const boot=mat(0x161a21,.62,{metalness:.045});
   const seam=mat(0x495257,.94);
   // Sculpt head as one joined surface. The cheek, brows, nasal bridge, muzzle
   // and lower jaw blend together without visible primitive intersections.
   this.head=new THREE.Group();this.head.position.set(0,1.735,.015);this.root.add(this.head);
   const skull=CoachSurface([
     [[0,.115,-.035],[.227,.245,.205]],
     [[0,.055,.112],[.210,.173,.211]],
     [[0,-.004,.239],[.176,.131,.204]],
     [[0,-.064,.302],[.173,.081,.148]],
     [[0,.096,.243],[.120,.123,.130]],
     [[-.162,.047,.130],[.087,.105,.120]],
     [[.162,.047,.130],[.087,.105,.120]],
     [[0,-.100,.214],[.139,.058,.151]]
   ],[-.28,-.15,-.26],[.28,.39,.48],.023);
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
   const torso=CoachSurface([
     [[0,1.26,0],[.303,.342,.209]],
     [[0,1.46,0],[.320,.215,.215]],
     [[-.249,1.49,0],[.147,.128,.141]],
     [[.249,1.49,0],[.147,.128,.141]],
     [[0,1.62,0],[.147,.104,.145]],
     [[0,1.035,0],[.258,.153,.184]]
   ],[-.435,.84,-.245],[.435,1.72,.245],.029);
   make(this.root,torso,jersey).name='Continuous referee jersey and shoulders';
   // Black stripes are printed IN the jersey material. Earlier floating
   // tube stripes looked detached from the referee's curved chest.
   const clothCanvas=document.createElement('canvas');clothCanvas.width=clothCanvas.height=512;
   const clothCtx=clothCanvas.getContext('2d');
   clothCtx.fillStyle='#f4f3ee';clothCtx.fillRect(0,0,512,512);
   clothCtx.fillStyle='#202329';
   for(let i=0;i<3;i++)clothCtx.fillRect(Math.floor((i+.34)*512/3),0,Math.floor(512*.085),512);
   const clothTexture=new THREE.CanvasTexture(clothCanvas);
   clothTexture.wrapS=clothTexture.wrapT=THREE.RepeatWrapping;clothTexture.anisotropy=4;
   const stripedJersey=jersey.clone();stripedJersey.map=clothTexture;
   stripedJersey.color.set(0xffffff);stripedJersey.needsUpdate=true;
   // Jersey surface is constructed above. Apply the printed pattern without
   // affecting the untextured sleeves' separate UV requirements.
   const shirtMesh=this.root.children.find(n=>n.name==='Continuous referee jersey and shoulders');
   if(shirtMesh)shirtMesh.material=stripedJersey;
   // Tailored chest pocket, stitched edge, buttons and a brass official badge.
   const pocket=make(this.root,new THREE.BoxGeometry(.10,.105,.008),jersey,V(-.13,1.37,.183));
   pocket.name='Tailored referee pocket';
   curve(this.root,[V(-.18,1.42,.190),V(-.18,1.32,.190),V(-.08,1.32,.190),V(-.08,1.42,.190)],seam,.0015);
   for(const y of [1.19,1.29,1.39,1.49])ell(this.root,V(0,y,.204),V(.006,.006,.004),black);
   ell(this.root,V(-.13,1.39,.198),V(.023,.027,.004),ivory);
   ell(this.root,V(0,1.62,.058),V(.15,.047,.105),trim);
   ell(this.root,V(0,.93,0),V(.263,.055,.184),black);
   const buckle=mat(0xb29d76,.38,{metalness:.45});
   ell(this.root,V(0,.94,.197),V(.040,.027,.012),buckle);
   // Side belt, trouser details and broad grounded shoes.
   const lower=CoachSurface([
     [[0,.805,0],[.248,.170,.178]],
     [[-.145,.565,0],[.116,.313,.125]],
     [[.145,.565,0],[.116,.313,.125]],
     [[-.145,.295,0],[.11,.190,.118]],
     [[.145,.295,0],[.11,.190,.118]]
   ],[-.30,.11,-.20],[.30,.98,.20],.035);
   make(this.root,lower,pants).name='Continuous trouser silhouette';
   for(const side of [-1,1]){
     const shoe=ell(this.root,V(side*.148,.135,.072),V(.128,.104,.194),boot);
     curve(this.root,[V(side*.142,.40,.124),V(side*.150,.31,.124),V(side*.150,.21,.120)],trim,.0027);
     ell(this.root,V(side*.15,.143,.225),V(.092,.018,.025),trim);
   }
   // Referee equipment: dark collar, whistle and embroidered badge.
   const whistle=mat(0x33383c,.32,{metalness:.45});
   curve(this.root,[V(-.04,1.591,.165),V(0,1.49,.230),V(.038,1.59,.165)],black,.0045);
   ell(this.root,V(0,1.47,.234),V(.026,.033,.018),whistle);
   const patch=make(this.root,new THREE.PlaneGeometry(.112,.105),black,V(.181,1.405,.217));
   patch.rotation.y=.14;patch.material.side=THREE.DoubleSide;
   const line=mat(0xa99261,.5);
   curve(this.root,[V(.13,1.365,.229),V(.181,1.350,.236),V(.233,1.365,.222)],line,.0028);
   // One deformation surface per arm. The sleeve and bare forearm are
   // sections of the SAME mesh; no ball elbows or disconnected cylinders.
   const buildArm=()=>{
     const rings=28,radial=20,vertices=new Float32Array((rings+1)*(radial+1)*3),indices=[];
     for(let i=0;i<rings;i++)for(let j=0;j<radial;j++){
       const k=i*(radial+1)+j;indices.push(k,k+radial+1,k+1,k+1,k+radial+1,k+radial+2);
     }
     const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(vertices,3));
     g.setIndex(indices);
     const cut=12*radial*6;g.addGroup(0,cut,0);g.addGroup(cut,indices.length-cut,1);
     const mesh=make(this.root,g,[jersey,skin]);
     const rest=new Float32Array(vertices.length);
     mesh.userData.pose=(start,mid,end)=>{
       const d1=mid.clone().sub(start),d2=end.clone().sub(mid);
       const tan=d1.clone().add(d2).normalize();
       const across=new THREE.Vector3().crossVectors(tan,V(0,0,1)).normalize();
       if(across.lengthSq()<.0001)across.set(1,0,0);
       const forward=new THREE.Vector3().crossVectors(across,tan).normalize();
       for(let i=0;i<=rings;i++){
         const t=i/rings,pre=t<=.5,w=pre?t*2:(t-.5)*2;
         const center=pre?start.clone().lerp(mid,w):mid.clone().lerp(end,w);
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
   const gloveGeometry=CoachSurface([
     [[0,0,.008],[.070,.080,.049]],
     [[0,-.055,.028],[.070,.042,.054]],
     [[-.054,-.019,.048],[.030,.055,.030]],
     [[0,-.078,.030],[.067,.025,.042]]
   ],[-.105,-.112,-.06],[.105,.10,.11],.011);
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
