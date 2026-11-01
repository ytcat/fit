/* Local training equipment and shared-clock partner choreography. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 const smooth=n=>{n=Math.max(0,Math.min(1,n));return n*n*n*(n*(n*6-15)+10);};
 // Body-led acceleration, very brief extension, then a fast guard recovery.
 // The whole skeleton shares this clock; the hand is never sped up in isolation.
 const powerPhase=p=>{
  const knots=[[0,0],[.18,.22],[.33,.46],[.36,.52],[.52,.86],[1,1]];
  for(let i=1;i<knots.length;i++)if(p<=knots[i][0]){const [a,x]=knots[i-1],[b,y]=knots[i];return x+(y-x)*smooth((p-a)/(b-a));}
  return 1;
 };
 const strikingMass=move=>move==='jab'?2.5:move.includes('hook')?5:5.5;
 const punches=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
 const material=p=>{const m=new THREE.MeshStandardMaterial(p);m.color.convertSRGBToLinear();return m;};
 class TrainingArena {
  constructor(engine,data){
   this.engine=engine;this.data=data;this.mode='none';this.group=new THREE.Group();this.group.name='Training pair';
   this.models={};this.previousTime=0;this.metrics={};
   this.springs={heavy:new HangingBag(),dummy:new ContactSpring(7,.48),speed:new ContactSpring(28,.14)};
   this.recoil={lion:new ContactSpring(10,1),rabbit:new ContactSpring(10,1)};
   this.pressures={lion:{L:0,R:0},rabbit:{L:0,R:0}};this.previousFists={};this.seen=new Set();this.hasFrame=false;
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
   this.rod(root,V(0,2.55,-.12),V(0,2.48,0),.014,this.accent);
   const swing=new THREE.Group();swing.position.y=2.48;root.add(swing);root.userData.swing=swing;
   const body=this.mesh(swing,new THREE.CylinderGeometry(.235,.235,1.15,64),this.heavyLeather,V(0,-.94,0));body.name='Heavy bag leather';root.userData.soft=body;
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
   const swing=new THREE.Group();swing.position.y=.74;root.add(swing);root.userData.swing=swing;
   const skin=material({color:0xab7960,roughness:.90});
   const volumes=[[[0,.45,0],[.255,.39,.145]],[[0,.66,0],[.315,.17,.16]],[[0,.85,0],[.095,.14,.095]],[[0,1.06,0],[.14,.18,.135]],[[0,.96,.035],[.12,.10,.13]]];
   const torso=this.mesh(swing,CoachSurface(volumes,[-.36,.03,-.20],[.36,1.27,.20],.020),skin);torso.name='Joined head and torso';root.userData.soft=torso;
   for(const s of [-1,1]){
    this.ellipsoid(swing,skin,V(s*.12,.65,-.135),V(.12,.095,.035));
    this.ellipsoid(swing,material({color:0x704f44,roughness:1}),V(s*.050,1.095,-.126),V(.028,.010,.009));
    this.ellipsoid(swing,skin,V(s*.14,1.07,0),V(.025,.042,.027));
   }
   this.ellipsoid(swing,skin,V(0,1.045,-.14),V(.026,.037,.032));
   this.rod(swing,V(-.04,.995,-.135),V(.04,.995,-.135),.004,material({color:0x6b493e}));
   for(const y of [.27,.37,.47])for(const s of [-1,1])this.ellipsoid(swing,skin,V(s*.065,y,-.137),V(.056,.042,.015));
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
    e.scene.remove(this.group);e.scene.add(e.coach.root);e.coach.root.position.set(0,0,0);e.coach.root.rotation.y=-.32;
   }else{
    e.scene.add(this.group);this.group.add(e.coach.root);this.group.rotation.y=mode==='heavy'?1.88:1.02;
    e.coach.root.position.set(0,0,mode==='speed'?-.40:-.61);e.coach.root.rotation.y=0;
    if(!this.models[mode]){
     if(mode==='rabbit'){
      this.rabbit=new LionCoach(this.data,{species:'rabbit'});this.models.rabbit=this.rabbit.root;this.rabbit.root.name='Rabbit sparring partner';
     }else this.models[mode]=this[mode]();
    }
    const target=this.models[mode];this.group.add(target);target.position.set(0,0,mode==='speed'?.37:mode==='dummy'?.70:mode==='rabbit'?.79:.82);
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
   camera.position.set(0,height*.53,distance);camera.lookAt(0,height*.49,0);
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
   const y=move.includes('uppercut')?.02:move.includes('hook')?-.025:0;
   let z=-Math.sqrt(.235*.235-x*x);
   if(shoulder&&move.includes('hook')){
    // Intersect the upper-arm reach circle with the elbow positions that keep
    // the forearm normal to the cylindrical bag. Do not bend the wrist to aim.
    const side=s<0?'L':'R',p=toLocal(coach.root.localToWorld(shoulder.clone()));
    const upper=coach.joints['elbow'+side].position.length(),forearm=coach.joints['hand'+side].position.length();
    const radius=.235-.045+.204+forearm,dy=p.y-(y-.026),reach2=Math.max(.001,upper*upper-dy*dy);
    const v=V(-p.x,0,-p.z),distance=v.length();v.normalize();
    const cosine=Math.max(-1,Math.min(1,(distance*distance+radius*radius-reach2)/(2*radius*Math.max(.001,distance))));
    const direction=v.clone().multiplyScalar(cosine).addScaledVector(V(v.z,0,-v.x),-s*Math.sqrt(1-cosine*cosine));
    x=-.235*direction.x;z=-.235*direction.z;
   }
   const normal=V(x,0,z).normalize();
   // The leading knuckle face enters the foam by up to 45 mm at maximum drive; aim is committed before impact.
   const point=V(x,y,z).addScaledVector(normal,-.045);
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
    if(!this.impacts.has(event)&&-speed.clone().sub(bag.velocity.clone().cross(localPoint)).dot(normal)>.1){
     impact=bag.impact(localPoint,normal,speed,strikingMass(move));this.impacts.add(event);
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
   this.previousTime=time;this.previousFists={};this.seen.clear();this.hasFrame=false;this.followBeat=-1;this.followAdvance=0;this.committedAim=null;this.aimBeat=-1;this.impacts=new Set();this.impactPulse={};
   for(const spring of [...Object.values(this.springs),...Object.values(this.recoil)])spring.reset();
   for(const [actor,coach] of [['lion',this.engine.coach],['rabbit',this.rabbit]]){
    this.pressures[actor]={L:0,R:0};if(coach)for(const side of ['L','R'])coach.deformGlove(side,0);
   }
   for(const model of Object.values(this.models)){
    const swing=model.userData.swing;if(swing)swing.rotation.set(0,0,0);
    const soft=model.userData.soft;if(soft?.userData.softRest)this.deformSurface(soft,null,0);
   }
  }
  applyDynamics(){
   const target=this.models[this.mode],swing=target?.userData.swing;
   if(swing){const p=this.springs[this.mode].position,limit=this.mode==='heavy'?.27:this.mode==='dummy'?.14:.90;
    if(this.mode==='heavy')swing.rotation.set(p.x,p.y,p.z);
    else swing.rotation.set(limit*Math.tanh(p.x/limit),.18*Math.tanh(p.y/.18),limit*Math.tanh(p.z/limit));
   }
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
   for(const side of ['L','R'])candidates.push({...this.closest(centre,coach.joints['hand'+side],{centre:[side==='L'?-.008:.008,-.135,-.026],radius:[.094,.069,.074],power:3.2}),kind:'glove',side,receiver});
   const guard=candidates.filter(c=>c.penetration>0).sort((a,b)=>a.distance-b.distance)[0];if(guard)return guard;
   candidates.push({...this.closest(centre,coach.joints.head,{centre:[0,.17,.08],radius:[.145,.18,.14]}),kind:'head',receiver});
   candidates.push({...this.closest(centre,coach.joints.chest,{centre:[0,.15,.05],radius:[.25,.28,.16]}),kind:'body',receiver});
   return candidates.sort((a,b)=>a.distance-b.distance)[0];
  }
  deformSurface(mesh,contact,amount){
   const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal;
   if(!mesh.userData.softRest){mesh.userData.softRest=new Float32Array(p.array);mesh.userData.normalRest=new Float32Array(n.array);}
   const rest=mesh.userData.softRest,norm=mesh.userData.normalRest;
   const depth=(this.mode==='heavy'?.022:this.mode==='dummy'?.014:.009)*amount;
   for(let i=0;i<p.count;i++){
    let x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2],nx=norm[i*3],ny=norm[i*3+1],nz=norm[i*3+2];
    if(contact&&amount>0){
     const dx=x-contact.point.x,dy=y-contact.point.y,dz=z-contact.point.z,radius2=.115*.115;
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
   const context=[this.mode,technique,combo,this.engine.randomSeed].join('|');
   const equipment=['heavy','dummy','speed'].includes(this.mode);
   // Fixed pose/contact ticks make a 90/144 Hz display transfer the same
   // momentum as a 60 Hz display. At most 8.3 ms of display latency.
   const target=equipment?Math.floor((time+1e-9)*120)/120:time,elapsed=target-this.previousTime;
   if(equipment&&context===this.context&&elapsed>=-1e-8&&elapsed<=.25){
    const begin=this.previousTime,beginTick=Math.round(begin*120),count=Math.round(target*120)-beginTick,contacts=[],loads=[];let result;
    if(count===0)return this.step(begin,technique,combo);
    for(let i=1;i<=count;i++){result=this.step((beginTick+i)/120,technique,combo);contacts.push(...result.contacts);loads.push(...result.loads);}
    result.contacts=contacts;result.loads=loads;return result;
   }
   return this.step(target,technique,combo);
  }
  step(time,technique,combo){
   const e=this.engine,mode=this.mode,context=[mode,technique,combo,e.randomSeed].join('|');
   if(context!==this.context||time<this.previousTime){this.resetResponse(time);this.context=context;}
   const dt=Math.max(0,time-this.previousTime);this.previousTime=time;
   for(const [key,spring] of Object.entries(this.springs))if(key!=='heavy'||mode!=='heavy')spring.step(dt);
   for(const spring of Object.values(this.recoil))spring.step(dt);
   this.applyDynamics();
   let frame=BOXING_ROUTINES.frame(time,mode==='speed'?'speedbag':technique,combo),heroSpec={move:frame.move,phase:frame.phase,attack:punches.includes(frame.move)},counter=BOXING_ROUTINES.opponent(frame),random=null;
   if(technique==='random'&&mode==='rabbit'){
    const seed=e.randomSeed??1;if(!this.randomSession||this.randomSession.seed!==seed)this.randomSession=new BOXING_ROUTINES.RandomSparring(seed);
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
    const advance=active&&spec.attack?(spec.move.includes('uppercut')?.40:spec.move.includes('hook')?.16:0)+(mode==='heavy'?this.followAdvance:0):0;
    const options={power:powered&&spec.attack?1.12:1,defenceSide:spec.defenceSide,brace:spec.brace,recoil:Math.min(.06,Math.max(0,this.recoil[actor].position.z)),advance,contactDrive:active&&spec.attack?(spec.move.includes('hook')?.05:spec.move.includes('uppercut')?.045:.028):0,duckDepth:spec.defend&&actor==='rabbit'?.32:undefined};
    if(isHero){options.target=active?this.aim(spec.move):null;
     if(mode==='dummy'&&spec.attack){options.strikeHeight=1.76;options.levelChange=.025;options.upperWristHeight=1.64;}
     if(mode==='heavy'&&spec.attack){
      const target=this.heavyTarget(spec.move,coach);options.target=null;options.knuckleTarget=target.point.toArray();options.strikeDirection=target.direction.toArray();
      options.knucklePlanner=shoulder=>this.heavyTarget(spec.move,coach,shoulder);
      options.strikeHeight=target.point.y-.026;options.levelChange=.065;options.upperLoadHeight=1.18;options.upperWristHeight=1.41;
     }
    }
    else if(spec.attack){options.target=spec.move.includes('uppercut')?null:spec.move.includes('hook')?[-.02,1.86,.91]:[0,1.82,1.01];options.advance=spec.move.includes('hook')?.15:advance;}
    const motionTime=mode==='speed'?time*1.8:powered&&spec.attack?powerPhase(beatPhase)*1.22:random||!isHero?spec.phase*1.22:time;
    return coach.update(motionTime,mode==='speed'?'speedbag':(powered&&spec.attack)||random||!isHero?spec.move:technique,combo,options);
   };
   const hero=pose(e.coach,heroSpec,'lion',true);let partner=mode==='rabbit'?pose(this.rabbit,counter,'rabbit',false):null;
   this.group.updateMatrixWorld(true);
   const desired={lion:{L:0,R:0},rabbit:{L:0,R:0}},contacts=[],loads=[];let dent=null;
   const examine=(actor,coach,metrics,spec,receiver)=>{
    const indices=mode==='speed'?[0,1]:spec.attack?[['cross','rear_hook','rear_uppercut'].includes(spec.move)?1:0]:[];
    for(const index of [0,1]){
     const side=index?'R':'L',centre=coach.root.localToWorld(V(...metrics.gloves[index].knuckles));
     // Camera orbit rotates the whole scene; measure speed in the arena frame
     // so changing the view cannot add energy to a punch.
     const key=actor+side,localCentre=this.group.worldToLocal(centre.clone()),previous=this.previousFists[key];
     const velocity=previous&&dt>0?localCentre.clone().sub(previous).divideScalar(dt).applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion())):V(...metrics.gloves[index].distal).transformDirection(coach.root.matrixWorld).multiplyScalar(1.8);
     if(!indices.includes(index)){this.previousFists[key]=localCentre;continue;}
     const beat=mode==='speed'?Math.floor(time*1.8/1.22*2):frame.index,event=actor+side+':'+beat;
     let heavyEntry=null;
     if(receiver==='heavy'){
      const result=this.solveHeavyContact(previous||localCentre,localCentre,velocity,dt,event,spec.move);loads.push(...result.loads);heavyEntry=result.entry;
     }
     let current=this.collision(centre,receiver),entry=heavyEntry||current;
     if(current.penetration<=0&&previous&&dt>0){const count=Math.min(16,Math.ceil(previous.distanceTo(localCentre)/.025));for(let i=1;i<count;i++){const c=this.collision(this.group.localToWorld(previous.clone().lerp(localCentre,i/count)),receiver);if(c.penetration>0){entry=c;break;}}}
     const pressure=receiver==='heavy'?Math.max(0,Math.min(1,current.penetration*.6/.02856)):smooth(Math.max(0,Math.min(1,current.penetration/.065)));
     desired[actor][side]=Math.max(desired[actor][side],pressure);
     if(current.kind==='glove'&&pressure>0)desired[receiver][current.side]=Math.max(desired[receiver][current.side],pressure*.85);
     if(current.kind==='bag'&&pressure>0&&(!dent||pressure>dent.pressure))dent={...current,pressure:receiver==='heavy'?Math.max(0,Math.min(1,current.penetration*.4/.022)):pressure};
     if(entry.penetration>0){
      const closing=Math.max(0,-velocity.dot(entry.normal));
      if(!this.seen.has(event)&&closing>.02){
       this.seen.add(event);if(this.seen.size>64)this.seen.delete(this.seen.values().next().value);const magnitude=Math.max(.30,Math.min(1.3,.30+closing*.16));
       const force=velocity.clone().normalize().multiplyScalar(.45).addScaledVector(entry.normal,-.55).normalize().multiplyScalar(magnitude);
       if(entry.kind==='bag'&&receiver!=='heavy'){
        const target=this.models[receiver],swing=target.userData.swing,localPoint=swing.worldToLocal(entry.point.clone()),localForce=force.clone().transformDirection(new THREE.Matrix4().copy(swing.matrixWorld).invert()).multiplyScalar(magnitude);
        const torque=localPoint.cross(localForce).multiplyScalar(receiver==='dummy'?1.8:115);this.springs[receiver].impulse(torque);
       }else if(entry.kind!=='bag')this.recoil[receiver].impulse(V(0,0,magnitude*.45));
       const transferred=receiver==='heavy'?loads.reduce((sum,l)=>sum+(l.impactImpulse||0),0):magnitude;
       if(entry.kind==='bag'){
        this.impactPulse[key]={time,amount:Math.min(1,.25+closing*.12),contact:entry};
        if(receiver!=='speed')this.recoil[actor].impulse(V(0,0,Math.min(.7,closing*.065)));
       }
       contacts.push({actor,side,receiver,kind:entry.kind,closingSpeed:closing,impulse:transferred,point:entry.point.toArray(),normal:entry.normal.toArray(),penetration:Math.max(0,current.penetration)});
      }
     }
     const pulse=this.impactPulse[key];
     if(pulse){
      const amount=pulse.amount*Math.exp(-(time-pulse.time)/.055);
      if(amount<.001)delete this.impactPulse[key];
      else {desired[actor][side]=Math.max(desired[actor][side],amount);if(!dent||amount>dent.pressure)dent={...pulse.contact,pressure:amount};}
     }
     this.previousFists[key]=localCentre;
    }
   };
   if(mode!=='none')examine('lion',e.coach,hero,heroSpec,mode);
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
   this.metrics={frame,counter,hero,partner,random,contacts,loads,hit:desired.lion.L>0||desired.lion.R>0,mode,
    compression:{lion:{...this.pressures.lion},rabbit:{...this.pressures.rabbit}},reaction:mode in this.springs?this.springs[mode].position.toArray():null};return this.metrics;
  }
 }
 TrainingArena.powerPhase=powerPhase;
 window.TrainingArena=TrainingArena;
})();
