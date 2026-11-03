/* Rebuilt rhinoceros referee. All geometry and animation remain local. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 class RhinoReferee {
  constructor(){
   this.root=new THREE.Group();this.root.name='Rhino referee rebuilt';
   const mat=(color,roughness=.83)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness:0});m.color.convertSRGBToLinear();return m;};
   const skin=mat(0x828d91),shade=mat(0x657278),dark=mat(0x252c33),shirt=mat(0xe7e7e1),stripe=mat(0x202329),pants=mat(0x242a32),ivory=mat(0xe1d3b3,.56),earPink=mat(0x9d777b),eye=mat(0x171a1c,.27),shine=mat(0xece7da,.3);
   const add=(parent,geometry,material,p=V())=>{const m=new THREE.Mesh(geometry,material);m.position.copy(p);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
   const ell=(parent,p,r,m)=>{const mesh=add(parent,new THREE.SphereGeometry(1,32,20),m,p);mesh.scale.copy(r);return mesh;};
   const rod=(parent,a,b,r,m)=>{const d=b.clone().sub(a),mesh=add(parent,new THREE.CylinderGeometry(r,r,d.length(),14),m,a.clone().add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return mesh;};
   // Broad but anatomically continuous torso, neck, hips and legs.
   ell(this.root,V(0,1.24,0),V(.325,.405,.205),shirt);
   ell(this.root,V(0,.89,0),V(.265,.14,.185),pants);
   ell(this.root,V(0,1.59,0),V(.15,.135,.145),skin);
   for(const x of [-.225,-.112,0,.112,.225]){
    const points=[];
    for(let k=0;k<=18;k++){const y=.96+k*.029,dy=(y-1.24)/.405,rx=.325*Math.sqrt(Math.max(.03,1-dy*dy));if(Math.abs(x)>rx)continue;const z=.205*Math.sqrt(Math.max(.02,1-x*x/(rx*rx)));points.push(V(x,y,z+.005));}
    if(points.length>1)add(this.root,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),30,.010,6,false),stripe);
   }
   ell(this.root,V(0,.91,.18),V(.245,.035,.026),dark);
   ell(this.root,V(0,.92,.211),V(.055,.033,.012),ivory);
   for(const side of [-1,1]){
    ell(this.root,V(side*.14,.49,0),V(.118,.36,.126),pants);
    ell(this.root,V(side*.145,.16,.045),V(.13,.13,.19),dark);
    ell(this.root,V(side*.14,.20,-.005),V(.105,.07,.11),pants);
   }
   // The head is built from overlapping organic masses with one consistent
   // facial axis (+Z); no isolated eye stalks or floating mouth pieces.
   this.head=new THREE.Group();this.head.position.set(0,1.72,.025);this.root.add(this.head);
   ell(this.head,V(0,.125,-.035),V(.232,.245,.207),skin);
   ell(this.head,V(0,.025,.136),V(.208,.159,.215),skin);
   ell(this.head,V(0,-.060,.245),V(.187,.098,.17),skin);
   ell(this.head,V(0,-.108,.205),V(.148,.041,.12),shade);
   ell(this.head,V(0,.065,.267),V(.158,.078,.10),skin);
   for(const side of [-1,1]){
    const ear=ell(this.head,V(side*.202,.31,-.068),V(.076,.125,.053),skin);ear.rotation.z=-side*.26;
    const inner=ell(this.head,V(side*.205,.321,-.019),V(.043,.078,.013),earPink);inner.rotation.z=-side*.26;
    const brow=ell(this.head,V(side*.128,.207,.142),V(.091,.045,.068),skin);brow.rotation.z=-side*.12;
    ell(this.head,V(side*.128,.171,.196),V(.030,.027,.015),eye);
    ell(this.head,V(side*.123,.177,.210),V(.007,.008,.005),shine);
    ell(this.head,V(side*.123,-.012,.370),V(.034,.020,.011),shade);
    ell(this.head,V(side*.185,.005,.18),V(.038,.042,.039),skin);
   }
   const horn=add(this.head,new THREE.ConeGeometry(.075,.285,32),ivory,V(0,.112,.342));horn.rotation.x=.29;
   const second=add(this.head,new THREE.ConeGeometry(.038,.115,24),ivory,V(0,.205,.177));second.rotation.x=.17;
   // Skin-like lofted shoulder-to-wrist surfaces replace the exposed
   // spherical joints and separate cylinder/ellipsoid segments.
   const loft=(parent,material)=>{
    const geo=new THREE.BufferGeometry(),rings=20,sides=16;
    const vertices=new Float32Array((rings+1)*(sides+1)*3),indices=[];
    for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
     const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);
    }
    geo.setAttribute('position',new THREE.BufferAttribute(vertices,3));geo.setIndex(indices);
    const mesh=add(parent,geo,material);
    mesh.userData.rebuild=(shoulder,elbow,wrist,radius)=>{
     const axisA=elbow.clone().sub(shoulder),axisB=wrist.clone().sub(elbow);
     const along=axisA.clone().add(axisB).normalize(),normal=V(0,0,1);
     const side=new THREE.Vector3().crossVectors(along,normal).normalize();
     const back=new THREE.Vector3().crossVectors(side,along).normalize();
     for(let i=0;i<=rings;i++){
      const t=i/rings,first=t<.50,local=first?t*2:(t-.5)*2;
      const center=first?shoulder.clone().lerp(elbow,local):elbow.clone().lerp(wrist,local);
      const profile=first?(1.12-.16*local):(.96-.23*local);
      const r=radius*profile;
      for(let j=0;j<=sides;j++){
       const theta=j/sides*Math.PI*2,idx=(i*(sides+1)+j)*3;
       const p=center.clone().addScaledVector(side,Math.cos(theta)*r).addScaledVector(back,Math.sin(theta)*r);
       vertices[idx]=p.x;vertices[idx+1]=p.y;vertices[idx+2]=p.z;
      }
     }
     geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
    };
    return mesh;
   };
   // Shoulder sockets and sleeves are integrated into the arm chain.
   this.arms={};
   for(const side of [-1,1]){
    const shoulder=ell(this.root,V(side*.295,1.47,0),V(.10,.11,.105),shirt);
    const upper=loft(this.root,skin);
    const elbow=null;
    const fore=null;
    const wrist=new THREE.Group();this.root.add(wrist);
    ell(wrist,V(0,0,.015),V(.063,.075,.047),skin);
    ell(wrist,V(-side*.055,-.018,.034),V(.027,.046,.030),skin);
    for(let i=0;i<4;i++)ell(wrist,V((i-1.5)*.028,-.075,.032),V(.016,.029,.024),skin);
    this.arms[side]={upper,elbow,fore,wrist};
   }
   this.update(0);
  }
  update(time,grip=null,side=1){
   this.head.rotation.y=Math.sin(time*.65)*.075;
   this.root.updateMatrixWorld(true);
   const place=(mesh,a,b,width)=>{const d=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(width,d.length()*.5+width*.22,width);mesh.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());};
   for(const s of [-1,1]){
    const held=grip?.isVector3?(s===side?grip:null):grip?.[s];
    const shoulder=V(s*.315,1.47,0),goal=held?this.root.worldToLocal(held.clone()):V(s*.39,1.045,.13);
    const reach=goal.clone().sub(shoulder),len=Math.min(.76,Math.max(.12,reach.length())),dir=reach.normalize(),a=.385,b=.405;
    const along=(a*a-b*b+len*len)/(2*len);
    const pole=V(s*.78,-.12,.24);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
    const elbow=shoulder.clone().addScaledVector(dir,along).addScaledVector(pole,Math.sqrt(Math.max(0,a*a-along*along)));
    const wrist=shoulder.clone().addScaledVector(dir,len);
    const arm=this.arms[s];arm.upper.userData.rebuild(shoulder,elbow,wrist,.075);
    arm.wrist.position.copy(wrist);
    const up=held?wrist.clone().sub(elbow).normalize():V(0,1,0);
    const forward=V(0,0,1);if(Math.abs(up.dot(forward))>.94)up.set(0,1,0);
    const right=new THREE.Vector3().crossVectors(up,forward).normalize();
    arm.wrist.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,new THREE.Vector3().crossVectors(forward,right).normalize(),forward));
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
