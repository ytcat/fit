/* Original rhino referee and ringside audience. All geometry stays in the app. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 class RhinoReferee {
  constructor(){
   this.root=new THREE.Group();this.root.name='Rhino referee';
   const mat=(c,r=.7)=>{const m=new THREE.MeshStandardMaterial({color:c,roughness:r});m.color.convertSRGBToLinear();return m;};
   this.grey=mat(0x7e8992);this.dark=mat(0x151b25);const ivory=mat(0xd4c6ab),white=mat(0xdce1e3),black=mat(0x121820);
   this.mesh=(g,m,p=V(),parent=this.root)=>{const x=new THREE.Mesh(g,m);x.position.copy(p);x.castShadow=x.receiveShadow=true;parent.add(x);return x;};
   this.ell=(p,r,m,parent=this.root)=>{const x=this.mesh(new THREE.SphereGeometry(1,24,16),m,p,parent);x.scale.copy(r);return x;};
   this.mesh(CoachSurface([[[0,1.22,0],[.30,.38,.18]],[[0,1.46,0],[.34,.18,.18]]],[-.38,.80,-.24],[.38,1.68,.24],.025),white);
   // Stripes follow the shirt's curved front and back instead of flat boards.
   for(const x of [-.23,-.115,0,.115,.23])for(const side of [-1,1]){
    const points=[];for(let i=0;i<=12;i++){const y=.97+i*.045,rx=.30*Math.sqrt(Math.max(.10,1-((y-1.22)/.43)**2));if(Math.abs(x)>rx)continue;points.push(V(x,y,side*.184*Math.sqrt(Math.max(.02,1-(x/rx)**2))));}
    if(points.length>1)this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,.013,5),black);
   }
   this.ell(V(0,.87,0),V(.25,.20,.16),black);
   for(const s of [-1,1]){this.ell(V(s*.14,.50,0),V(.105,.36,.11),black);this.ell(V(s*.15,.13,.065),V(.115,.11,.19),this.dark);}
   this.head=new THREE.Group();this.head.position.y=1.70;this.root.add(this.head);
   this.mesh(CoachSurface([[[0,.15,0],[.215,.24,.19]],[[0,.035,.15],[.21,.125,.18]],[[0,.03,.29],[.15,.085,.12]]],[-.26,-.12,-.23],[.26,.43,.44],.016),this.grey,V(),this.head);
   for(const s of [-1,1]){
    const ear=this.ell(V(s*.192,.32,-.025),V(.072,.11,.042),this.grey,this.head);ear.rotation.z=-s*.38;
    const ep=ear.geometry.attributes.position;for(let i=0;i<ep.count;i++){const taper=1-.65*Math.max(0,ep.getY(i));ep.setX(i,ep.getX(i)*taper);}ep.needsUpdate=true;ear.geometry.computeVertexNormals();
    this.ell(V(s*.169,.18,.12),V(.027,.020,.012),ivory,this.head);this.ell(V(s*.171,.18,.132),V(.011,.014,.007),black,this.head);
    this.ell(V(s*.088,.035,.382),V(.021,.012,.008),this.dark,this.head);
   }
   const horn=this.mesh(new THREE.ConeGeometry(.056,.28,24),ivory,V(0,.15,.37),this.head);horn.rotation.x=.42;
   this.mesh(new THREE.ConeGeometry(.033,.10,20),ivory,V(0,.17,.23),this.head).rotation.x=.18;
   // A continuous muzzle silhouette; remove the floating lips, cheeks and
   // protruding eye spheres from the previous version.
   const crease=mat(0x56616a),innerEar=mat(0x977b7c),eye=mat(0x15171c,.26),iris=mat(0x665c4d,.32);
   this.ell(V(0,.045,.275),V(.195,.132,.155),this.grey,this.head);
   this.ell(V(0,-.040,.305),V(.158,.067,.128),this.grey,this.head);
   for(const side of [-1,1]){
    const brow=this.ell(V(side*.129,.204,.172),V(.088,.034,.042),this.grey,this.head);
    brow.rotation.z=-side*.12;
    this.ell(V(side*.128,.165,.205),V(.031,.022,.012),eye,this.head);
    this.ell(V(side*.124,.169,.215),V(.011,.012,.004),iris,this.head);
    this.ell(V(side*.18,.310,.006),V(.036,.068,.014),innerEar,this.head).rotation.z=-side*.35;
    this.ell(V(side*.115,.014,.413),V(.030,.017,.007),crease,this.head);
   }
   this.ell(V(0,-.082,.392),V(.093,.008,.009),crease,this.head);
   // Collar, waistband, belt buckle, trouser seams and ankle details.
   this.ell(V(0,1.57,0),V(.17,.055,.145),white);
   this.ell(V(0,.83,-.162),V(.085,.047,.013),this.dark);
   const buckle=mat(0xb3a47f,.35);
   this.ell(V(0,.83,-.176),V(.043,.031,.011),buckle);
   for(const side of [-1,1]){
    this.ell(V(side*.14,.36,-.105),V(.012,.28,.008),crease);
    this.ell(V(side*.15,.14,-.08),V(.12,.05,.13),this.dark);
   }
   this.arms={};for(const side of [-1,1]){
    const upper=this.ell(V(),V(.075,.20,.075),white),fore=this.ell(V(),V(.065,.21,.065),this.grey),hand=this.ell(V(),V(.066,.075,.040),this.grey);
    // Shoulder cap and elbow joint stay attached to the moving arm.
    const shoulder=this.ell(V(side*.29,1.50,0),V(.092,.10,.088),white);
    const elbowJoint=this.ell(V(),V(.068,.075,.068),this.grey);
    // A separate palm and thumb group is oriented toward the grip target;
    // do not inherit the forearm quaternion, which turned the hands backward.
    const wrist=new THREE.Group();this.root.add(wrist);
    const palm=this.ell(V(0,0,.012),V(.070,.083,.038),this.grey,wrist);
    const thumb=this.ell(V(-side*.057,-.025,.035),V(.029,.049,.029),this.grey,wrist);
    thumb.rotation.z=side*.32;
    for(let finger=0;finger<3;finger++)this.ell(V((finger-1)*.032,-.073,.027),V(.019,.035,.026),this.grey,wrist);
    hand.visible=false;
    this.arms[side]={upper,fore,hand,wrist,elbowJoint};
   }
   this.update(0);
  }
  update(time,grip=null,side=1){
   this.head.rotation.y=Math.sin(time*.7)*.10;
   for(const s of [-1,1]){
    const held=grip?.isVector3?(s===side?grip:null):grip?.[s];
    const a=V(s*.29,1.50,0),target=held?this.root.worldToLocal(held.clone()):V(s*.36,1.08,.08);
    const delta=target.clone().sub(a),distance=Math.min(.805,Math.max(.05,delta.length())),dir=delta.normalize(),l1=.40,l2=.42,along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    const pole=V(s*.55,-.12,.22).addScaledVector(dir,-V(s*.9,-.06,.34).dot(dir)).normalize(),elbow=a.clone().addScaledVector(dir,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along))),end=a.clone().addScaledVector(dir,distance);
    const arm=this.arms[s];for(const [mesh,p,q,width] of [[arm.upper,a,elbow,.075],[arm.fore,elbow,end,.065]]){mesh.position.copy(p).add(q).multiplyScalar(.5);mesh.scale.set(width,p.distanceTo(q)/2,width);mesh.quaternion.setFromUnitVectors(V(0,1,0),q.clone().sub(p).normalize());}arm.hand.position.copy(end);arm.elbowJoint.position.copy(elbow);
    // Palm faces toward the referee's forward direction (-Z); the fingers
    // point toward the grip rather than following the forearm's Y axis.
    arm.wrist.position.copy(end);
    const wristForward=V(0,0,1),wristUp=V(0,1,0);
    if(held){const reach=target.clone().sub(elbow).normalize();wristUp.copy(reach);if(Math.abs(wristUp.dot(wristForward))>.92)wristUp.set(0,1,0);}
    const wristRight=new THREE.Vector3().crossVectors(wristUp,wristForward).normalize();
    const correctedUp=new THREE.Vector3().crossVectors(wristForward,wristRight).normalize();
    arm.wrist.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(wristRight,correctedUp,wristForward));
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
