/* Local training equipment and shared-clock partner choreography. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 const smooth=n=>{n=Math.max(0,Math.min(1,n));return n*n*n*(n*(n*6-15)+10);};
 const punches=['jab','cross','hook','rear_hook','uppercut','rear_uppercut'];
 const material=p=>{const m=new THREE.MeshStandardMaterial(p);m.color.convertSRGBToLinear();return m;};
 class TrainingArena {
  constructor(engine,data){
   this.engine=engine;this.data=data;this.mode='none';this.group=new THREE.Group();this.group.name='Training pair';
   this.models={};this.lastHit=-1;this.impactAt=-100;this.previousTime=0;this.metrics={};
   this.dark=material({color:0x1b2532,roughness:.64,metalness:.3});
   this.leather=material({color:0x813432,roughness:.57});
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
   const swing=new THREE.Group();swing.position.y=2.48;root.add(swing);root.userData.swing=swing;
   const body=this.mesh(swing,new THREE.CylinderGeometry(.235,.235,1.15,64),this.leather,V(0,-.94,0));body.name='Heavy bag leather';
   this.mesh(swing,new THREE.SphereGeometry(.235,48,20),this.leather,V(0,-1.515,0)).scale.y=.24;
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
   const torso=this.mesh(swing,CoachSurface(volumes,[-.36,.03,-.20],[.36,1.27,.20],.020),skin);torso.name='Joined head and torso';
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
   const bag=this.mesh(swing,CoachSurface([[[0,-.17,0],[.115,.14,.115]],[[0,-.055,0],[.047,.085,.047]]],[-.15,-.34,-.15],[.15,.04,.15],.013),this.leather);bag.name='Pear-shaped speed bag';
   this.rod(swing,V(0,0,0),V(0,-.03,0),.011,this.accent);return root;
  }
  setTarget(mode){
   if(!['none','heavy','dummy','speed','rabbit'].includes(mode))mode='none';
   const e=this.engine;this.mode=mode;this.lastHit=-1;this.impactAt=-100;
   for(const child of [...this.group.children])if(child!==e.coach.root)this.group.remove(child);
   if(mode==='none'){
    e.scene.remove(this.group);e.scene.add(e.coach.root);e.coach.root.position.set(0,0,0);e.coach.root.rotation.y=-.32;
   }else{
    e.scene.add(this.group);this.group.add(e.coach.root);this.group.rotation.y=1.02;
    e.coach.root.position.set(0,0,mode==='speed'?-.40:-.61);e.coach.root.rotation.y=0;
    if(!this.models[mode]){
     if(mode==='rabbit'){
      this.rabbit=new LionCoach(this.data,{species:'rabbit'});this.models.rabbit=this.rabbit.root;this.rabbit.root.name='Rabbit sparring partner';
     }else this.models[mode]=this[mode]();
    }
    const target=this.models[mode];this.group.add(target);target.position.set(0,0,mode==='speed'?.40:mode==='dummy'?.73:mode==='rabbit'?.79:.82);
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
   if(move.includes('hook'))return [s*.19,1.80,.86];
   return null;
  }
  update(time,technique,combo){
   const e=this.engine,mode=this.mode;
   if(time<this.previousTime){this.lastHit=-1;this.impactAt=-100;}this.previousTime=time;
   const frame=BOXING_ROUTINES.frame(time,mode==='speed'?'speedbag':technique,combo);
   const active=mode!=='none'&&mode!=='speed';
   const advance=active?(frame.move.includes('uppercut')?.38:frame.move.includes('hook')?.16:0):0;
   const hero=e.coach.update(mode==='speed'?time*1.8:time,mode==='speed'?'speedbag':technique,combo,{target:active?this.aim(frame.move):null,advance});
   const counter=BOXING_ROUTINES.opponent(frame);let partner=null;
   if(mode==='rabbit'){
    partner=this.rabbit.update(counter.phase*1.22,counter.move,combo,counter.attack?{target:counter.move==='hook'?[-.02,1.86,.91]:[0,1.82,1.01],advance:counter.move==='hook'?.15:0}:{});
   }
   let hit=false;
   if(mode!=='none'&&mode!=='rabbit'){
    const index=['cross','rear_hook','rear_uppercut'].includes(frame.move)?1:0;
    const fist=V(...hero.hands[index]).addScaledVector(V(...hero.gloves[index].distal),.20);
    e.coach.root.updateWorldMatrix(true,true);e.coach.root.localToWorld(fist);this.group.worldToLocal(fist);
    const target=this.models[mode];
    if(mode==='speed')hit=true;
    else if(punches.includes(frame.move)){
     const radial=Math.hypot(fist.x,fist.z-target.position.z);
     hit=radial<(mode==='heavy'?.235:.19)+.11&&fist.y>1.1&&fist.y<2.07;
    }
    if(hit&&(frame.index!==this.lastHit||mode==='speed'&&time-this.impactAt>.24)){
     this.lastHit=frame.index;this.impactAt=time;
    }
    const elapsed=Math.max(0,time-this.impactAt),swing=target.userData.swing;
    if(mode==='speed'){
     const rhythm=time*1.8/1.22*Math.PI*2;
     swing.rotation.x=.54*Math.sin((rhythm-Math.PI/2)*3);swing.rotation.z=.10*Math.sin(rhythm*3+1.2);
    }else{
     swing.rotation.x=-(mode==='heavy'?.12:.055)*Math.exp(-elapsed*4.5)*Math.sin(elapsed*11);
     swing.rotation.z=frame.move.includes('hook')?.035*Math.exp(-elapsed*5)*Math.sin(elapsed*11):0;
    }
   }
   this.group.updateMatrixWorld(true);
   this.metrics={frame,counter,hero,partner,hit,mode};return this.metrics;
  }
 }
 window.TrainingArena=TrainingArena;
})();
