/* Local training equipment and shared-clock partner choreography. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 const smooth=n=>{n=Math.max(0,Math.min(1,n));return Math.max(0,Math.min(1,n*n*n*(n*(n*6-15)+10)));};
 // Body-led acceleration, very brief extension, then a fast guard recovery.
 // The whole skeleton shares this clock; the hand is never sped up in isolation.
 // Continuous timing preserves the authored pelvis/shoulder/hand lag. The
 // previous per-segment easing repeatedly stopped and rushed the entire body.
 const powerPhase=p=>p+.025*(1-Math.cos(2*Math.PI*p));
 const strikingMass=move=>move==='jab'?5.25:move.includes('hook')?9:10;
 const punches=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
 const material=p=>{const m=new THREE.MeshStandardMaterial(p);m.color.convertSRGBToLinear();return m;};
 class TrainingArena {
  constructor(engine,data){
   this.engine=engine;this.data=data;this.mode='none';this.group=new THREE.Group();this.group.name='Training pair';
   this.models={};this.previousTime=0;this.metrics={};
   this.springs={heavy:new HangingBag(),dummy:new ContactSpring(6.5,.55),speed:new SpeedBagPendulum()};
   this.recoil={lion:new ContactSpring(10,1),rabbit:new ContactSpring(10,1)};
   this.pushback={heavy:new ContactSpring(7,.48),dummy:new ContactSpring(9,.65),rabbit:new ContactSpring(9,.7)};
   this.pressures={lion:{L:0,R:0},rabbit:{L:0,R:0}};this.rabbitHit=null;this.previousFists={};this.seen=new Set();this.hasFrame=false;
   this.dark=material({color:0x1b2532,roughness:.64,metalness:.3});
   this.leather=material({color:0x813432,roughness:.57});
   this.heavyLeather=material({color:0x24313e,roughness:.57,bumpMap:engine.coach.leather.bumpMap,bumpScale:.0015});
   this.accent=material({color:0xe2bc76,roughness:.56,metalness:.15});
  }
  mesh(parent,geometry,material,p=V()){
   const m=new THREE.Mesh(geometry,material);m.position.copy(p);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  ellipsoid(parent,material,p,size){return this.mesh(parent,new THREE.SphereGeometry(1,28,20),material,p).scale.copy(size);}
  rod(parent,a,b,r=.018,material=this.dark){
   const d=b.clone().sub(a),m=this.mesh(parent,new THREE.CylinderGeometry(r,r,d.length(),16),material,a.clone().add(b).multiplyScalar(.5));
   m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return m;
  }
  heavy(){
   const root=new THREE.Group();root.name='Suspended heavy bag';
   // Independent floor stand, hanger and four suspension straps.
   for(const s of [-1,1]){
    this.rod(root,V(s*.48,.035,-.12),V(s*.48,2.55,-.12),.030);
    this.rod(root,V(s*.48,.035,-.45),V(s*.48,.035,.48),.035);
   }
   this.rod(root,V(-.48,2.55,-.12),V(.48,2.55,-.12),.030);
   // Triangulated overhead mount: both uprights connect directly to the
   // suspension point. No free-floating hanger, including in side views.
   const pivot=V(0,2.48,0);
   this.rod(root,V(-.48,2.55,-.12),pivot,.026);
   this.rod(root,V(.48,2.55,-.12),pivot,.026);
   this.rod(root,V(0,2.55,-.12),pivot,.035);
   this.mesh(root,new THREE.SphereGeometry(.045,20,12),this.dark,pivot);
   const swing=new THREE.Group();swing.position.y=2.48;root.add(swing);root.userData.swing=swing;
   const body=this.mesh(swing,new THREE.CylinderGeometry(.235,.235,1.15,64,32),this.heavyLeather,V(0,-.94,0));body.name='Heavy bag leather';root.userData.soft=body;
   this.mesh(swing,new THREE.SphereGeometry(.235,48,20),this.heavyLeather,V(0,-1.515,0)).scale.y=.24;
   this.mesh(swing,new THREE.CylinderGeometry(.239,.239,.10,64),this.dark,V(0,-.40,0));
   for(let i=0;i<4;i++){
    const a=i*Math.PI/2;this.rod(swing,V(0,-.06,0),V(Math.cos(a)*.16,-.36,Math.sin(a)*.16),.009,this.accent);
   }
   for(const y of [-.68,-1.10])this.mesh(swing,new THREE.TorusGeometry(.236,.004,6,64),this.accent,V(0,y,0)).rotation.x=Math.PI/2;
   return root;
  }
  dummy(){
   const root=new THREE.Group();root.name='Freestanding anatomical training dummy';
   const base=this.mesh(root,new THREE.CylinderGeometry(.31,.35,.22,64),this.dark,V(0,.11,0));base.name='Weighted base';
   for(const y of [.055,.11,.17])this.mesh(root,new THREE.TorusGeometry(.335,.007,6,64),this.dark,V(0,y,0)).rotation.x=Math.PI/2;
   this.mesh(root,new THREE.CylinderGeometry(.066,.078,.71,32),this.dark,V(0,.55,0));
   this.mesh(root,new THREE.CylinderGeometry(.083,.083,.06,32),this.accent,V(0,.64,0));
   for(let y=.35;y<.70;y+=.07)this.mesh(root,new THREE.SphereGeometry(.009,8,6),this.accent,V(0,y,.069));
   // Flexible captive joint: the torso rotates around the top of the post,
   // never around a point floating above the mount.
   const swing=new THREE.Group();swing.position.y=.74;root.add(swing);root.userData.swing=swing;
   const socket=this.mesh(root,new THREE.SphereGeometry(.092,24,16),this.dark,V(0,.74,0));
   socket.name='Dummy captive pivot';
   const collar=this.mesh(swing,new THREE.CylinderGeometry(.105,.095,.18,24),this.dark,V(0,.025,0));
   collar.name='Dummy joint collar';
   // A molded anatomical bust, built as a joined surface like the coach.
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
   const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=7621;
   for(let i=0;i<256*256;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=115+(seed>>>25);pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=v;pixels.data[i*4+3]=255;}
   ctx.putImageData(pixels,0,0);const pores=new THREE.CanvasTexture(canvas);pores.wrapS=pores.wrapT=THREE.RepeatWrapping;pores.repeat.set(8,8);
   const skin=material({color:0xb78360,roughness:.64,bumpMap:pores,bumpScale:.0009,vertexColors:true});
   const rubber=material({color:0x302b29,roughness:.73});
   const inset=material({color:0x594036,roughness:.87}),eye=material({color:0x342a24,roughness:.69}),lip=material({color:0x94684f,roughness:.72});
   const volumes=[
    [[0,.27,.015],[.155,.24,.115]],[[0,.45,.015],[.215,.26,.14]],
    [[0,.61,.015],[.265,.24,.155]],[[0,.73,.025],[.265,.11,.135]],
    [[-.14,.655,-.065],[.155,.125,.135]],[[.14,.655,-.065],[.155,.125,.135]],
    [[-.278,.665,.01],[.088,.13,.105]],[[.278,.665,.01],[.088,.13,.105]],
    [[-.13,.77,.025],[.13,.115,.105]],[[.13,.77,.025],[.13,.115,.105]],
    [[0,.86,.015],[.085,.12,.085]],[[0,1.073,.012],[.135,.181,.125]],
    [[0,.984,-.025],[.113,.092,.112]],[[0,.949,-.067],[.075,.038,.075]],
    [[-.076,1.052,-.077],[.06,.076,.071]],[[.076,1.052,-.077],[.06,.076,.071]],
    [[-.052,1.12,-.112],[.048,.022,.038]],[[.052,1.12,-.112],[.048,.022,.038]],
    [[0,1.076,-.118],[.025,.057,.048]],[[0,1.036,-.151],[.030,.026,.032]]
   ];
   for(const y of [.34,.435,.525])for(const side of [-1,1])volumes.push([[side*.065,y,-.111],[.064,.043,.034]]);
   const ell=(p,c,r)=>(Math.hypot((p.x-c[0])/r[0],(p.y-c[1])/r[1],(p.z-c[2])/r[2])-1)*Math.min(...r);
   const field=p=>{
    let d=10;
    for(const [c,r] of volumes){const b=ell(p,c,r),h=Math.max(.018-Math.abs(d-b),0)/.018;d=Math.min(d,b)-h*h*.018*.25;}
    for(const side of [-1,1]){
     d=Math.max(d,-ell(p,[side*.052,1.096,-.129],[.033,.016,.022]));
     d=Math.max(d,-ell(p,[side*.018,1.027,-.172],[.009,.006,.012]));
    }
    return Math.max(d,-ell(p,[0,.994,-.137],[.047,.007,.022]));
   };
   if(!TrainingArena.dummySculpt)TrainingArena.dummySculpt=window.EQUIPMENT_SURFACES?.dummy?CoachSurface.fromPacked(window.EQUIPMENT_SURFACES.dummy):CoachSurface(field,[-.38,.03,-.215],[.38,1.27,.19],.0115);
   const geometry=TrainingArena.dummySculpt.clone(),colour=[],pos=geometry.attributes.position;
   for(let i=0;i<pos.count;i++){
    const y=pos.getY(i),x=pos.getX(i),shade=.93+.035*Math.sin(y*8)+.025*Math.cos(x*13);
    colour.push(shade,shade*.985,shade*.97);
   }
   geometry.setAttribute('color',new THREE.Float32BufferAttribute(colour,3));
   const torso=this.mesh(swing,geometry,skin);torso.name='Sculpted anatomical rubber bust';root.userData.soft=torso;
   // Eyes sit inside carved orbits, with molded lids, nostrils, lips and ears.
   for(const side of [-1,1]){
    this.ellipsoid(swing,inset,V(side*.052,1.096,-.122),V(.029,.012,.012));
    this.ellipsoid(swing,eye,V(side*.052,1.096,-.134),V(.017,.007,.005));
    this.ellipsoid(swing,skin,V(side*.136,1.07,.007),V(.024,.043,.026));
    this.ellipsoid(swing,inset,V(side*.151,1.071,-.004),V(.007,.027,.015));
    this.ellipsoid(swing,inset,V(side*.018,1.027,-.172),V(.007,.004,.006));
    this.rod(swing,V(side*.095,.756,-.097),V(side*.20,.727,-.105),.004,skin);
   }
   this.ellipsoid(swing,lip,V(0,1.003,-.145),V(.045,.010,.009));
   this.ellipsoid(swing,lip,V(0,.984,-.14),V(.044,.010,.011));
   this.mesh(swing,new THREE.CylinderGeometry(.16,.115,.12,48),rubber,V(0,.13,0));
   for(const y of [.34,.49,.66]){
    this.mesh(swing,new THREE.TorusGeometry(.026,.0015,6,40),this.accent,V(0,y,y>.6?-.176:-.151)).name='Embossed precision target';
   }
   // Mold seams and recessed adjustment hardware read as actual equipment.
   const seam=material({color:0x8e6248,roughness:.8});
   for(const side of [-1,1])this.rod(swing,V(side*.225,.43,.09),V(side*.267,.66,.06),.0025,seam);
   this.mesh(root,new THREE.CylinderGeometry(.078,.078,.035,32),this.accent,V(0,.40,0));
   this.rod(root,V(-.055,.40,.04),V(-.12,.40,.04),.012,this.dark);
   root.userData.artRevision=75;
   return root;
  }
  speed(){
   const root=new THREE.Group();root.name='Speed bag and rebound platform';
   this.rod(root,V(.48,.04,.12),V(.48,2.37,.12),.036);
   this.rod(root,V(.48,2.37,.12),V(0,2.37,0),.025);
   this.rod(root,V(.20,.025,-.35),V(.70,.025,.40),.04);
   const wood=material({color:0x9a7450,roughness:.75});
   this.mesh(root,new THREE.CylinderGeometry(.38,.38,.055,64),wood,V(0,2.27,0));
   this.mesh(root,new THREE.SphereGeometry(.027,16,12),this.accent,V(0,2.205,0));
   const swing=new THREE.Group();swing.position.y=2.20;root.add(swing);root.userData.swing=swing;
   const bag=this.mesh(swing,CoachSurface([[[0,-.17,0],[.115,.14,.115]],[[0,-.055,0],[.047,.085,.047]]],[-.15,-.34,-.15],[.15,.04,.15],.013),this.leather);bag.name='Pear-shaped speed bag';root.userData.soft=bag;
   this.rod(swing,V(0,0,0),V(0,-.03,0),.011,this.accent);return root;
  }
  setTarget(mode){
   if(!['none','heavy','dummy','speed','rabbit'].includes(mode))mode='none';
   const e=this.engine;this.mode=mode;this.resetResponse(e.animTime);
   for(const child of [...this.group.children])if(child!==e.coach.root)this.group.remove(child);
   if(mode==='none'){
    e.scene.remove(this.group);e.scene.add(e.coach.root);e.coach.root.position.set(0,0,0);e.coach.root.rotation.y=0;
   }else{
    e.scene.add(this.group);this.group.add(e.coach.root);this.group.rotation.y=mode==='heavy'?1.88:1.02;
    e.coach.root.position.set(0,0,mode==='speed'?-.40:mode==='heavy'?-.675:-.61);e.coach.root.rotation.y=0;
    if(!this.models[mode]){
     if(mode==='rabbit'){
      this.rabbit=new LionCoach(this.data,{species:'rabbit'});this.models.rabbit=this.rabbit.root;this.rabbit.root.name='Rabbit sparring partner';
     }else this.models[mode]=this[mode]();
    }
    const target=this.models[mode];this.group.add(target);target.position.set(0,0,mode==='speed'?.27:mode==='dummy'?.70:mode==='rabbit'?.79:.82);
    if(mode==='rabbit')target.rotation.y=Math.PI;
   }
   this.group.updateMatrixWorld(true);e.lastRenderStamp=null;
   this.update(e.animTime,e.technique,e.currentAnim);this.fitCamera(e.camera);
  }
  fitCamera(camera){
   if(this.mode==='none'){this.engine.fitCameraToModel(this.engine.demoModel);return;}
   const height=this.mode==='rabbit'?2.65:this.mode==='heavy'?2.65:2.42;
   // Conservative swept envelope for both fighters, bag hardware and full reach.
   const width=1.9+Math.abs(Math.sin(this.group.rotation.y))*.45;
   const fov=THREE.MathUtils.degToRad(camera.fov);
   const nearDepth=.65*Math.abs(Math.cos(this.group.rotation.y))+.40;
   const distance=Math.max(height/(2*Math.tan(fov/2)),width/(2*Math.tan(fov/2)*Math.max(.2,camera.aspect)))*1.12+nearDepth;
   camera.position.set(0,1.78,distance);camera.lookAt(0,height*.49,0);
  }
  aim(move){
   if(!punches.includes(move))return null;
   const s=['cross','rear_hook','rear_uppercut'].includes(move)?1:-1;
   if(move.includes('uppercut'))return null;
   if(move.includes('hook'))return [s*.19,this.mode==='rabbit'?1.88:this.mode==='dummy'?1.76:1.80,this.mode==='dummy'?.90:.86];
   return null;
  }
  heavyTarget(move,coach,shoulder){
   const body=this.models.heavy.userData.soft,s=['cross','rear_hook','rear_uppercut'].includes(move)?1:-1;
   const matrix=this.committedAim?new THREE.Matrix4().multiplyMatrices(this.group.matrixWorld,this.committedAim):body.matrixWorld;
   const toLocal=p=>p.applyMatrix4(new THREE.Matrix4().copy(matrix).invert());
   let x=move.includes('hook')?s*.16:move.includes('uppercut')?s*.045:s*.025;
   const y=move.includes('uppercut')?.02:move.includes('hook')?-.025:.14;
   let z=-Math.sqrt(.235*.235-x*x);
   if(shoulder&&move.includes('hook')){
    // Intersect the upper-arm reach circle with the elbow positions that keep
    // the forearm normal to the cylindrical bag. Do not bend the wrist to aim.
    const side=s<0?'L':'R',p=toLocal(coach.root.localToWorld(shoulder.clone()));
    const upper=coach.joints['elbow'+side].position.length(),forearm=coach.joints['hand'+side].position.length();
    const radius=.235-.105+.204+forearm,dy=p.y-(y-.026),reach2=Math.max(.001,upper*upper-dy*dy);
    const v=V(-p.x,0,-p.z),distance=v.length();v.normalize();
    const cosine=Math.max(-.995,Math.min(.995,(distance*distance+radius*radius-reach2)/(2*radius*Math.max(.001,distance))));
    const direction=v.clone().multiplyScalar(cosine).addScaledVector(V(v.z,0,-v.x),-s*Math.sqrt(1-cosine*cosine));
    x=-.235*direction.x;z=-.235*direction.z;
   }
   const normal=V(x,0,z).normalize();
   // Commit beyond the resting leather so foam receives the follow-through.
   // Limb lengths stay fixed; the bag takes momentum after the glove releases.
   const through=move==='jab'||move==='cross'?.145:.105;
   const point=V(x,y,z).addScaledVector(normal,-through);
   const target=coach.root.worldToLocal(point.applyMatrix4(matrix));
   const outward=normal.transformDirection(matrix).applyQuaternion(coach.root.getWorldQuaternion(new THREE.Quaternion()).invert());
   return {point:target,direction:outward.negate()};
  }
  solveHeavyContact(previous,current,velocity,dt,event,move){
   const bag=this.springs.heavy,swing=this.models.heavy.userData.swing,loads=[];let entry=null;
   if(!(dt>0))return {loads};
   const count=Math.max(1,Math.ceil(dt*240-1e-7)),step=dt/count;
   for(let i=1;i<=count;i++){
    bag.step(step);this.applyDynamics();
    const centre=this.group.localToWorld(previous.clone().lerp(current,i/count)),contact=this.collision(centre,'heavy');
    if(contact.penetration<=0)continue;
    const inverse=swing.getWorldQuaternion(new THREE.Quaternion()).invert();
    const localPoint=swing.worldToLocal(contact.point.clone()),normal=contact.normal.clone().applyQuaternion(inverse),speed=velocity.clone().applyQuaternion(inverse);
    let impact={impulse:0,closing:0};
    const relative=speed.clone().sub(bag.velocity.clone().cross(localPoint));
    const rising=move.includes('uppercut')?Math.max(0,relative.y):0;
    if(!this.impacts.has(event)&&Math.max(-relative.dot(normal),rising*.70)>.1){
     impact=bag.impact(localPoint,normal,speed,strikingMass(move));
     // Tangential lift transfers only friction-limited momentum. Torque comes
     // from the contact lever arm and mass, never a second arbitrary kick.
     if(rising>.1){
      const lift=Math.min(impact.impulse*.30,rising*strikingMass(move)*.20);
      bag.velocity.add(localPoint.clone().cross(V(0,lift,0)).divide(bag.inertia));
      impact.closing=Math.max(impact.closing,rising*.30);
     }
     this.impacts.add(event);
     if(this.impacts.size>64)this.impacts.delete(this.impacts.values().next().value);
     entry=contact;
    }
    const load=bag.contact(localPoint,normal,speed,contact.penetration,step);
    load.impactImpulse=impact.impulse;load.incomingSpeed=impact.closing;
    if(load.normalForce>0)loads.push({...load,point:contact.point.toArray(),normal:contact.normal.toArray()});
   }
   this.applyDynamics();return {loads,entry};
  }
  resetResponse(time=0){
   this.previousTime=time;this.previousFists={};this.swingSeen=new Set();this.seen.clear();this.hasFrame=false;this.followBeat=-1;this.followAdvance=0;this.committedAim=null;this.aimBeat=-1;this.impacts=new Set();this.impactPulse={};this.rabbitHit=null;for(const spring of Object.values(this.pushback))spring.reset();
   for(const spring of [...Object.values(this.springs),...Object.values(this.recoil)])spring.reset();
   for(const [actor,coach] of [['lion',this.engine.coach],['rabbit',this.rabbit]]){
    this.pressures[actor]={L:0,R:0};if(coach){coach.aimWristGuide=null;for(const side of ['L','R'])coach.deformGlove(side,0);}
   }
   for(const model of Object.values(this.models)){
    const swing=model.userData.swing;if(swing){swing.rotation.set(0,0,0);if(model===this.models.heavy||model===this.models.dummy)swing.position.z=0;}
    const soft=model.userData.soft;if(soft?.userData.softRest)this.deformSurface(soft,null,0);
   }
  }
  applyDynamics(){
   const target=this.models[this.mode],swing=target?.userData.swing;
   if(swing){const p=this.springs[this.mode].position,limit=this.mode==='heavy'?.27:this.mode==='dummy'?.14:.90;
    if(this.mode==='heavy')swing.rotation.set(p.x,p.y,p.z);
    else if(this.mode==='dummy')swing.rotation.set(.24*Math.tanh(p.x/.24),.055*Math.tanh(p.y/.18),.17*Math.tanh(p.z/.17));
    else swing.rotation.set(p.x,.18*Math.tanh(p.y/.18),p.z);
    if(this.mode==='dummy')swing.position.z=0; // Keep torso connected to its fixed stand pivot.
    // Keep the heavy bag's suspension pivot attached to the frame. Punch
    // impulse is expressed by angular swing and soft-surface deformation;
    // translating the pivot detached the chains from the hanger.
    if(this.mode==='heavy')swing.position.z=0;
   }
   if(this.mode==='rabbit'&&this.rabbit)this.rabbit.root.position.z=.79+Math.min(.30,Math.max(0,this.pushback.rabbit.position.z));
   this.group.updateMatrixWorld(true);
  }
  closest(centre,object,shape,radius=.064){
   object.updateWorldMatrix(true,false);const p=object.worldToLocal(centre.clone());let point,normal,distance;
   if(shape.type==='cylinder'){
    const radial=Math.hypot(p.x,p.z)||1e-8,side=V(p.x/radial,0,p.z/radial);
    point=V(side.x*shape.radius,Math.max(-shape.halfHeight,Math.min(shape.halfHeight,p.y)),side.z*shape.radius);
    distance=p.distanceTo(point)*(radial<shape.radius&&Math.abs(p.y)<shape.halfHeight?-1:1);normal=side;
   }else{
    const c=V(...shape.centre),r=V(...shape.radius),q=p.clone().sub(c),unit=V(q.x/r.x,q.y/r.y,q.z/r.z),power=shape.power||2,length=Math.pow(Math.pow(Math.abs(unit.x),power)+Math.pow(Math.abs(unit.y),power)+Math.pow(Math.abs(unit.z),power),1/power)||1e-8;
    point=c.clone().add(V(unit.x/length*r.x,unit.y/length*r.y,unit.z/length*r.z));
    distance=p.distanceTo(point)*(length<1?-1:1);normal=V(Math.sign(unit.x)*Math.pow(Math.abs(unit.x),power-1)/r.x,Math.sign(unit.y)*Math.pow(Math.abs(unit.y),power-1)/r.y,Math.sign(unit.z)*Math.pow(Math.abs(unit.z),power-1)/r.z).normalize();
   }
   const worldPoint=object.localToWorld(point),worldNormal=normal.applyMatrix3(new THREE.Matrix3().getNormalMatrix(object.matrixWorld)).normalize();
   return {point:worldPoint,normal:worldNormal,distance,penetration:radius-distance};
  }
  collision(centre,receiver){
   if(receiver==='heavy')return {...this.closest(centre,this.models.heavy.userData.soft,{type:'cylinder',radius:.235,halfHeight:.575}),kind:'bag',receiver};
   if(receiver==='dummy'||receiver==='speed'){
    const soft=this.models[receiver].userData.soft,shapes=receiver==='speed'?[{centre:[0,-.17,0],radius:[.115,.14,.115]}]:[{centre:[0,1.06,0],radius:[.145,.18,.145]},{centre:[0,.52,0],radius:[.285,.37,.17]}];
    return {...shapes.map(shape=>this.closest(centre,soft,shape)).sort((a,b)=>a.distance-b.distance)[0],kind:'bag',receiver};
   }
   const coach=receiver==='lion'?this.engine.coach:this.rabbit,candidates=[];
   for(const side of ['L','R'])candidates.push({...this.closest(centre,coach.joints['hand'+side],{centre:[0,-.137,0],radius:[.091,.067,.068]}),kind:'glove',side,receiver});
   const guard=candidates.filter(c=>c.penetration>0).sort((a,b)=>a.distance-b.distance)[0];if(guard)return guard;
   candidates.push({...this.closest(centre,coach.joints.head,{centre:[0,.17,.08],radius:[.145,.18,.14]}),kind:'head',receiver});
   candidates.push({...this.closest(centre,coach.joints.chest,{centre:[0,.15,.05],radius:[.25,.28,.16]}),kind:'body',receiver});
   return candidates.sort((a,b)=>a.distance-b.distance)[0];
  }
  deformSurface(mesh,contact,amount){
   const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal;
   if(!mesh.userData.softRest){mesh.userData.softRest=new Float32Array(p.array);mesh.userData.normalRest=new Float32Array(n.array);}
   const rest=mesh.userData.softRest,norm=mesh.userData.normalRest;
   const depth=(this.mode==='heavy'?.060:this.mode==='dummy'?.030:.018)*amount;
   for(let i=0;i<p.count;i++){
    let x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2],nx=norm[i*3],ny=norm[i*3+1],nz=norm[i*3+2];
    if(contact&&amount>0){
     const dx=x-contact.point.x,dy=y-contact.point.y,dz=z-contact.point.z,radius2=this.mode==='speed'?.080*.080:.115*.115;
     const falloff=Math.exp(-(dx*dx+dy*dy+dz*dz)/radius2),dent=depth*falloff;
     x-=contact.normal.x*dent;y-=contact.normal.y*dent;z-=contact.normal.z*dent;
     const dot=dx*nx+dy*ny+dz*nz,k=2*dent/radius2;
     const tx=dx-nx*dot,ty=dy-ny*dot,tz=dz-nz*dot;
     nx-=k*tx;ny-=k*ty;nz-=k*tz;const length=Math.hypot(nx,ny,nz)||1;nx/=length;ny/=length;nz/=length;
    }
    p.setXYZ(i,x,y,z);n.setXYZ(i,nx,ny,nz);
   }
   p.needsUpdate=n.needsUpdate=true;mesh.userData.dentAmount=amount;
  }
  update(time,technique,combo){
   const context=[this.mode,technique,combo,this.engine.randomSeed,this.engine.practiceTiming,this.engine.practiceSeed].join('|');
   const equipment=['heavy','dummy','speed'].includes(this.mode);
   // Fixed pose/contact ticks make a 90/144 Hz display transfer the same
   // momentum as a 60 Hz display. At most 8.3 ms of display latency.
   const target=equipment?Math.floor((time+1e-9)*120)/120:time,elapsed=target-this.previousTime;
   if(equipment&&context===this.context&&elapsed>=-1e-8&&elapsed<=.25){
    const begin=this.previousTime,beginTick=Math.round(begin*120),count=Math.round(target*120)-beginTick,contacts=[],loads=[],swings=[],platformContacts=[];let result;
    if(count===0)return this.step(begin,technique,combo);
    for(let i=1;i<=count;i++){result=this.step((beginTick+i)/120,technique,combo);contacts.push(...result.contacts);loads.push(...result.loads);swings.push(...(result.swings||[]));platformContacts.push(...(result.platformContacts||[]));}
    result.contacts=contacts;result.loads=loads;result.swings=swings;result.platformContacts=platformContacts;return result;
   }
   return this.step(target,technique,combo);
  }
  step(time,technique,combo){
   const e=this.engine,mode=this.mode,context=[mode,technique,combo,e.randomSeed,e.practiceTiming,e.practiceSeed].join('|');
   if(context!==this.context||time<this.previousTime){this.resetResponse(time);this.context=context;}
   const dt=Math.max(0,time-this.previousTime);this.previousTime=time;
   for(const [key,spring] of Object.entries(this.springs))if(key!=='heavy'||mode!=='heavy')spring.step(dt);
   for(const spring of Object.values(this.recoil))spring.step(dt);
   for(const spring of Object.values(this.pushback))spring.step(dt);
   this.applyDynamics();
   let frame=BOXING_ROUTINES.frame(time,mode==='speed'?'speedbag':technique,combo),heroSpec={move:frame.move,phase:frame.phase,attack:punches.includes(frame.move)},counter=BOXING_ROUTINES.opponent(frame),random=null;
   const varied=e.practiceTiming==='random'&&technique!=='random';
   if(varied){
    const seed=e.practiceSeed??1;
    if(!this.practiceClock||this.practiceClock.seed!==seed)this.practiceClock=new BOXING_ROUTINES.PracticeTimeline(seed);
    frame=this.practiceClock.frame(time,mode==='speed'?'speedbag':technique,combo);
    heroSpec={move:frame.move,phase:frame.phase,attack:punches.includes(frame.move),rest:frame.rest};
    counter=frame.rest?{move:'guard',phase:0,attack:false}:BOXING_ROUTINES.opponent(frame);
   }
   if(technique==='random'&&mode==='rabbit'){
    const seed=e.randomSeed??1;if(!this.randomSession||this.randomSession.seed!==seed||this.randomSession.timing!==(e.practiceTiming||'sync'))this.randomSession=new BOXING_ROUTINES.RandomSparring(seed,e.practiceTiming||'sync');
    random=this.randomSession.frame(time);heroSpec=random.lion;counter=random.rabbit;
    frame={...frame,move:heroSpec.move,phase:heroSpec.phase,index:random.index,random:true};
   }
   if(mode==='heavy'&&!heroSpec.attack){this.springs.heavy.step(dt);this.applyDynamics();}
   if(mode==='heavy'&&this.followBeat!==frame.index){
    const centre=e.coach.root.worldToLocal(this.models.heavy.userData.soft.getWorldPosition(V()));
    const rest=this.models.heavy.position.z-e.coach.root.position.z;
    this.followAdvance=Math.max(0,Math.min(.16,centre.z-rest));this.followBeat=frame.index;
   }
   const powered=mode==='heavy'||mode==='dummy';
   const beatPhase=frame.phase/(technique==='combo'?.86:1);
   if(this.aimBeat!==frame.index){this.committedAim=null;this.aimBeat=frame.index;}
   if(mode==='heavy'&&heroSpec.attack&&beatPhase>=.18&&!this.committedAim){
    this.committedAim=new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(this.group.matrixWorld).invert(),this.models.heavy.userData.soft.matrixWorld);
   }
   const active=mode!=='none'&&mode!=='speed';
   const pose=(coach,spec,actor,isHero)=>{
    const advance=active&&spec.attack?(spec.move.includes('uppercut')?(mode==='heavy'?.28:.24):spec.move.includes('hook')?(mode==='heavy'?.22:.16):0)+(mode==='heavy'?this.followAdvance:0):0;
    const options={simulationTime:time,hitReaction:actor==='rabbit'&&this.rabbitHit?{part:this.rabbitHit.part,move:this.rabbitHit.move,direction:this.rabbitHit.direction,side:this.rabbitHit.side,amount:this.rabbitHit.strength*(1-Math.exp(-Math.max(0,time-this.rabbitHit.time)/.025))*Math.exp(-Math.max(0,time-this.rabbitHit.time)/.25)}:null,power:powered&&spec.attack?1.12:1,defenceSide:spec.defenceSide,brace:spec.brace,recoil:Math.min(.06,Math.max(0,this.recoil[actor].position.z)),advance,contactDrive:active&&spec.attack?(spec.move.includes('hook')?.05:spec.move.includes('uppercut')?.045:.028):0,duckDepth:spec.defend&&actor==='rabbit'?.32:undefined};
    if(mode==='heavy'){
     const straight=spec.move==='jab'||spec.move==='cross';
     options.guardTightness=1;options.stanceWidth=spec.move.includes('uppercut')?.48:.54;options.stanceDepth=spec.move.includes('uppercut')?.44:.55;options.stanceDrop=.015;
     options.power=spec.attack?(straight?1.16:1.12):1;options.shoulderCover=straight?.055:0;options.armReachMargin=straight?.001:.002;options.chinTuck=.035;
     options.planStraight=true;
     if(straight){options.contactDrive=.065;options.straightRecovery=.22;}
     if(spec.move.includes('uppercut')){options.loadDuration=.22;options.riseDuration=.27;}
    }
    if(mode==='speed'&&!frame.rest){
     // Closed wrist circles pass through the bag's lower striking lobe. Opposite
     // phases let one hand recover underneath while the other delivers.
     const speedTime=varied?(frame.index+frame.phase)*1.22:time*1.8;
     const angle=speedTime/1.22*Math.PI*2;
     if(varied)options.speedBagWeight=smooth(frame.phase/.12)*(1-smooth((frame.phase-.84)/.16));
     options.speedBagTargets={};
     for(const [side,offset] of [['L',0],['R',Math.PI]]){
      const q=angle+offset;
      options.speedBagTargets[side]=[side==='L'?-.10:.10,1.84+.035*Math.sin(q),.37-.15*Math.cos(q)];
     }
    }
    if(isHero){options.target=active?this.aim(spec.move):null;
     if(mode==='dummy'&&spec.attack){
      options.strikeHeight=1.76;options.levelChange=.025;options.upperWristHeight=1.64;
      if(spec.move.includes('uppercut')){
       options.loadDuration=.22;
       // Aim below the live chin instead of extending beside the head.
       const side=spec.move==='uppercut'?-1:1;
       const wrist=this.models.dummy.userData.swing.localToWorld(V(side*.035,.90,-.18));
       options.uppercutBagTarget=coach.root.worldToLocal(wrist).toArray();
      }
     }
     if(mode==='heavy'&&spec.attack){
      const target=this.heavyTarget(spec.move,coach);options.target=null;options.knuckleTarget=target.point.toArray();options.strikeDirection=target.direction.toArray();
      options.knucklePlanner=shoulder=>this.heavyTarget(spec.move,coach,shoulder);
      options.strikeHeight=target.point.y-.026;options.levelChange=spec.move==='jab'||spec.move==='cross'?.018:.065;options.upperLoadHeight=1.18;options.upperWristHeight=1.76;
      if(spec.move.includes('uppercut')){
       // Use the same moving physical bag target as the jab, but keep
       // the uppercut's rising wrist path and single IK solve.
       const wrist=target.point.clone().addScaledVector(target.direction,-.12);
       options.uppercutBagTarget=wrist.toArray();
      }
     }
    }
    else if(spec.attack){options.target=spec.move.includes('uppercut')?null:spec.move.includes('hook')?[-.02,1.86,.91]:[0,1.82,1.01];options.advance=spec.move.includes('hook')?.15:advance;}
    const motionTime=varied?(frame.rest?time:mode==='speed'?(frame.index+frame.phase)*1.22:powered&&spec.attack?powerPhase(beatPhase)*1.22:spec.phase*1.22):mode==='speed'?time*1.8:powered&&spec.attack?powerPhase(beatPhase)*1.22:random||!isHero?spec.phase*1.22:time;
    return coach.update(motionTime,varied?(frame.rest?'guard':mode==='speed'?'speedbag':spec.move):mode==='speed'?'speedbag':(powered&&spec.attack)||random||!isHero?spec.move:technique,combo,options);
   };
   const hero=pose(e.coach,heroSpec,'lion',true);let partner=mode==='rabbit'?pose(this.rabbit,counter,'rabbit',false):null;
   this.group.updateMatrixWorld(true);
   const desired={lion:{L:0,R:0},rabbit:{L:0,R:0}},contacts=[],loads=[],swings=[];let dent=null;
   const examine=(actor,coach,metrics,spec,receiver)=>{
    const swingKey=actor+':'+frame.index+':'+spec.move;
    if(mode!=='speed'&&spec.attack&&spec.phase>=.22&&spec.phase<.60&&dt>0&&dt<.1&&!this.swingSeen.has(swingKey)){
     this.swingSeen.add(swingKey);if(this.swingSeen.size>64)this.swingSeen.delete(this.swingSeen.values().next().value);
     swings.push({actor,move:spec.move});
    }
    // Only the fist rolling forward can initiate a speed-bag strike. The
    // recovering fist passes underneath while the swivel rebounds freely.
    const indices=frame.rest?[]:mode==='speed'?[Math.floor((varied?(frame.index+frame.phase)*1.22:time*1.8)/1.22*2)%2]:spec.attack?[['cross','rear_hook','rear_uppercut'].includes(spec.move)?1:0]:[];
    for(const index of [0,1]){
     const side=index?'R':'L',centre=coach.root.localToWorld(V(...metrics.gloves[index].knuckles));
     // Camera orbit rotates the whole scene; measure speed in the arena frame
     // so changing the view cannot add energy to a punch.
     const key=actor+side,localCentre=this.group.worldToLocal(centre.clone()),previous=this.previousFists[key];
     const velocity=previous&&dt>0?localCentre.clone().sub(previous).divideScalar(dt).applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion())):V(...metrics.gloves[index].distal).transformDirection(coach.root.matrixWorld).multiplyScalar(1.8);
     if(!indices.includes(index)||!previous||!(dt>0)){this.previousFists[key]=localCentre;continue;}
     const beat=mode==='speed'?Math.floor((varied?(frame.index+frame.phase)*1.22:time*1.8)/1.22*2):frame.index,event=actor+side+':'+beat;
     let heavyEntry=null;
     if(receiver==='heavy'){
      const result=this.solveHeavyContact(previous||localCentre,localCentre,velocity,dt,event,spec.move);loads.push(...result.loads);heavyEntry=result.entry;
     }
     let current=this.collision(centre,receiver),entry=heavyEntry||current;
     if(current.penetration<=0&&previous&&dt>0){const count=Math.min(16,Math.ceil(previous.distanceTo(localCentre)/.025));for(let i=1;i<count;i++){const c=this.collision(this.group.localToWorld(previous.clone().lerp(localCentre,i/count)),receiver);if(c.penetration>0){entry=c;break;}}}
     const pressure=receiver==='heavy'?Math.max(0,Math.min(1,current.penetration*.6/.03612)):smooth(Math.max(0,Math.min(1,current.penetration/.065)));
     desired[actor][side]=Math.max(desired[actor][side],pressure);
     if(current.kind==='glove'&&pressure>0)desired[receiver][current.side]=Math.max(desired[receiver][current.side],pressure*.85);
     if(current.kind==='bag'&&pressure>0&&(!dent||pressure>dent.pressure))dent={...current,pressure:receiver==='heavy'?Math.max(0,Math.min(1,current.penetration*.4/.060)):pressure};
     if(entry.penetration>0){
      const uppercut=spec.move.includes('uppercut');
      // A rising fist can enter under the chin while moving nearly tangent to
      // the front surface: normal-only closing speed misses that impact.
      const closing=Math.max(0,-velocity.dot(entry.normal),uppercut?Math.max(0,velocity.y)*.70:0);
      if(!this.seen.has(event)&&closing>.02){
       this.seen.add(event);if(this.seen.size>64)this.seen.delete(this.seen.values().next().value);const magnitude=Math.max(.30,Math.min(1.3,.30+closing*.16));
       const force=velocity.clone().normalize().multiplyScalar(.45).addScaledVector(entry.normal,-.55).normalize().multiplyScalar(magnitude);
       if(entry.kind==='bag'&&receiver!=='heavy'){
        const target=this.models[receiver],swing=target.userData.swing,localPoint=swing.worldToLocal(entry.point.clone()),localForce=force.clone().transformDirection(new THREE.Matrix4().copy(swing.matrixWorld).invert()).multiplyScalar(magnitude);
        if(receiver==='speed'){
         // Effective angular mass at the swivel: a shallow touch cannot send
         // the bag flying, and a separating fist cannot add energy.
         const normal=entry.normal.clone().transformDirection(new THREE.Matrix4().copy(swing.matrixWorld).invert());
         const fistVelocity=velocity.clone().applyQuaternion(swing.getWorldQuaternion(new THREE.Quaternion()).invert());
         this.springs.speed.impact(localPoint,normal,fistVelocity);

        }else {
         // Torque is computed about the captive joint. Upward force at the
         // front of the face naturally tips it away without lifting its base.
         const torque=localPoint.clone().cross(localForce).multiplyScalar(1.25);
         this.springs[receiver].impulse(torque);
         const drive=velocity.clone().applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()).invert());
         this.pushback[receiver].impulse(V(0,0,Math.min(4.5,Math.max(0,drive.z)*.9)));}
       }else if(entry.kind!=='bag'){
        this.recoil[receiver].impulse(V(0,0,magnitude*.45));
        if(receiver==='rabbit'){
         this.rabbitHit={time,part:entry.kind==='head'?'head':entry.kind==='body'?'body':'shoulder',move:spec.move,direction:velocity.clone().applyQuaternion(this.rabbit.root.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize().toArray(),side:side==='L'?-1:1,strength:Math.min(1.3,(uppercut?.70:.45)+closing*(uppercut?.20:.16))};
         const drive=velocity.clone().applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()).invert());
         this.pushback.rabbit.impulse(V(0,0,Math.min(4,Math.max(0,drive.z)*.95+(uppercut?Math.max(0,velocity.y)*.32:0))));
        }
       }
       const transferred=receiver==='heavy'?loads.reduce((sum,l)=>sum+(l.impactImpulse||0),0):magnitude;
       if(entry.kind==='bag'){
        this.impactPulse[key]={time,amount:pressure,contact:entry};
        if(receiver!=='speed')this.recoil[actor].impulse(V(0,0,Math.min(.7,closing*.065)));
       }
       contacts.push({actor,side,receiver,move:spec.move,direction:velocity.clone().normalize().toArray(),kind:entry.kind,closingSpeed:closing,impulse:transferred,point:entry.point.toArray(),normal:entry.normal.toArray(),penetration:Math.max(0,current.penetration)});
      }
     }
     const pulse=this.impactPulse[key];
     if(pulse&&current.penetration>0){pulse.amount=Math.max(pulse.amount,pressure);pulse.contact=current;}
     if(pulse){
      const amount=pulse.amount*Math.exp(-(time-pulse.time)/.055);
      if(amount<.001)delete this.impactPulse[key];
      else {desired[actor][side]=Math.max(desired[actor][side],amount);if(!dent||amount*.55>dent.pressure)dent={...pulse.contact,pressure:amount*.55};}
     }
     this.previousFists[key]=localCentre;
    }
   };
   if(mode!=='none')examine('lion',e.coach,hero,heroSpec,mode);
   else if(heroSpec.attack&&heroSpec.phase>=.22&&heroSpec.phase<.60&&dt>0&&dt<.1){
    const key='solo:'+frame.index;if(!this.swingSeen.has(key)){this.swingSeen.add(key);if(this.swingSeen.size>64)this.swingSeen.delete(this.swingSeen.values().next().value);swings.push({actor:'lion',move:heroSpec.move});}
   }
   if(mode==='rabbit')examine('rabbit',this.rabbit,partner,counter,'lion');
   for(const [actor,coach] of [['lion',e.coach],['rabbit',this.rabbit]])if(coach)for(const side of ['L','R']){
    const old=this.pressures[actor][side],goal=desired[actor][side],rate=goal>old?100:23;
    const amount=!this.hasFrame?goal:old+(goal-old)*(1-Math.exp(-rate*dt));
    this.pressures[actor][side]=amount<.0001?0:amount;coach.deformGlove(side,this.pressures[actor][side]);
   }
   const soft=this.models[mode]?.userData.soft;
   if(soft){
    if(dent){soft.userData.dent={point:soft.worldToLocal(dent.point.clone()),normal:dent.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(soft.matrixWorld).invert()).normalize()};}
    const old=soft.userData.dentAmount||0,goal=dent?.pressure||0,amount=!this.hasFrame?goal:old+(goal-old)*(1-Math.exp(-28*dt));
    if(amount>.0001||old>.0001)this.deformSurface(soft,soft.userData.dent,amount>.0001?amount:0);
   }
   this.hasFrame=true;this.group.updateMatrixWorld(true);
   const platformContacts=mode==='speed'?this.springs.speed.takeBounces().map(b=>({receiver:'platform',kind:'platform',closingSpeed:b.angularSpeed*.17,impulse:b.angularSpeed*.0085})):[];
   this.metrics={frame,counter,hero,partner,random,swings,platformContacts,practice:varied?frame:null,contacts,loads,hit:desired.lion.L>0||desired.lion.R>0,mode,
    compression:{lion:{...this.pressures.lion},rabbit:{...this.pressures.rabbit}},reaction:mode in this.springs?this.springs[mode].position.toArray():null};return this.metrics;
  }
 }
 TrainingArena.powerPhase=powerPhase;
 window.TrainingArena=TrainingArena;
})();
