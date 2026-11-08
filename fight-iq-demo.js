/* Isolated illustrated examples: existing rigs, one existing renderer, no combat events. */
(() => {
 const caches=new WeakMap(),V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 const sequences={
  'IQ-C01':[['guard',1],['jab',2],['guard',1]],
  'IQ-C02':[['jab',2],['guard',.5],['step',2,{stepAdvance:.6}],['jab',2],['guard',.5]],
  'IQ-C03':[['guard',1],['cross',3],['guard',1]],
  'IQ-C04':[['guard',1],['slip',2,{defenceSide:1}],['guard',.5],['slip',2,{defenceSide:-1}],['guard',.5]],
  'IQ-C05':[['guard',1.5],['slip',2,{defenceSide:1}],['cross',2],['guard',1.5]],
  'IQ-C06':[['cross',2],['guard',1],['step',3,{stepAdvance:-.6}],['guard',1]]
 };
 function sequence(id,state={},command){
  if(id==='IQ-C02'){if(state.inRange)return [['guard',1],['jab',3],['guard',1]];if(state.clearStep===false)return [['guard',8]];}
  if(id==='IQ-C03'&&state.footFree===false)return [['guard',8]];
  if(id==='IQ-C04'&&(state.target==='body'||state.balanced===false||command==='guard'))return [['guard',1],['guard',5,{guardStyle:state.target==='body'?'body':'high',brace:1}],['guard',1]];
  if(id==='IQ-C05'){if(state.opening===false)return [['guard',8]];if(state.inRange===false)return [['guard',3.5],['step',2,{stepAdvance:.6}],['guard',1.5]];}
  if(id==='IQ-C06'&&state.exitLane){if(state.exitLane==='none')return [['cross',2],['guard',5]];return [['cross',2],['guard',1],['step',3,{stepDirection:state.exitLane==='left'?-1:1}],['guard',1]];}
  return sequences[id]||sequences['IQ-C01'];
 }
 function sample(id,seconds,state,command){const seq=sequence(id,state,command),duration=seq.reduce((s,x)=>s+x[1],0);let t=Math.max(0,Math.min(seconds/8*duration,duration-.000001));for(const [move,length,options={}]of seq){if(t<=length){const blend=Math.max(0,Math.min(1,t/.3,(length-t)/.3));return {move,phase:move==='guard'?(options.guardStyle?Math.min(.4,t/.5,(length-t)/.5):0):t/length,options:{...options,...(options.brace?{brace:options.brace*blend*blend*(3-2*blend)}:{})}};}t-=length;}return {move:'guard',phase:0,options:{}};}
 function cache(e){let c=caches.get(e);if(c)return c;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#192326');scene.add(new THREE.HemisphereLight(0xe9f3ff,0x635541,.9));const key=new THREE.DirectionalLight(0xfff2d9,1.1);key.position.set(-2,4,4);scene.add(key);const fill=new THREE.DirectionalLight(0xc9d9f4,.5);fill.position.set(3,2,-2);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial({color:0x344347,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);
  const lines=new THREE.GridHelper(8,16,0x6c7c77,0x40504e);lines.position.y=-.018;scene.add(lines);
  // Bounded lazy cache: one demonstration rig per species, never allocated per frame/open.
  const points=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;points.push(V(Math.cos(a)*.11,1.7+Math.sin(a)*.11,1.35));}const marker=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x8ab9dc}));scene.add(marker);
  c={scene,marker,coaches:{},camera:new THREE.PerspectiveCamera(38,1,.05,30)};caches.set(e,c);return c;
 }
 class Demo {
  constructor(engine,host,id,{reducedMotion=false,onProgress=()=>{},scenarioState={}}={}){
   this.e=engine;this.id=id;this.host=host;this.seconds=0;this.running=!reducedMotion;this.reducedMotion=reducedMotion;this.onProgress=onProgress;this.angle='quarter';this.dirty=true;this.closed=false;this.state=scenarioState;
   // Build before taking ownership of the live canvas. A failed optional asset
   // cannot detach the game, leave a render hook, or replace its camera callback.
   this.c=cache(engine);const species=engine.coach.species;this.species=species;
   if(!this.c.coaches[species])this.c.coaches[species]=new LionCoach(engine.roster.data,{species});this.coach=this.c.coaches[species];
   if(id==='IQ-C05'){const other=species==='lion'?'rabbit':'lion';if(!this.c.coaches[other])this.c.coaches[other]=new LionCoach(engine.roster.data,{species:other});this.opponent=this.c.coaches[other];}
   this.token=engine.gamePreviewToken=(engine.gamePreviewToken||0)+1;const v=engine.viewControls,camera=engine.camera;this.saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),zoom:camera.zoom,orbit:camera.userData.orbitTarget?.clone(),yaw:v?.yaw,target:v?.target?.clone(),offset:v?.offset?.clone(),userView:engine.arena?.fightView?.userView};this.oldFit=engine.fitCameraToModel;this.oldMode=engine.targetMode;this.oldFight=engine.arena?.fightView;engine.fitCameraToModel=()=>{this.dirty=true;};
   this.stage=document.getElementById('stageContainer');this.placeholder=document.createComment('Fight IQ stage');this.stage.before(this.placeholder);this.pointerEvents=this.stage.style.pointerEvents;this.stage.style.pointerEvents='none';host.append(this.stage);this.stage.classList.add('game-preview-live');engine.fightIQDemo=this;
   this.c.marker.visible=id==='IQ-C02';this.c.marker.position.z=this.state.inRange?-.48:0;
   this.c.scene.add(this.coach.root);this.coach.root.visible=true;
   for(const [key,coach]of Object.entries(this.c.coaches))if(key!==species)coach.root.visible=false;
   if(this.opponent){this.c.scene.add(this.opponent.root);this.opponent.root.visible=true;}
   this.coach.root.position.set(this.opponent?-1:0,0,0);this.coach.root.rotation.set(0,this.opponent?Math.PI/2:0,0);if(this.opponent){this.opponent.root.position.set(1,0,0);this.opponent.root.rotation.set(0,-Math.PI/2,0);}
   GamePresentation.apply(this.coach,engine.career.store.game()?.equipment,GameDomain.catalog);
   window.dispatchEvent(new Event('resize'));this.seek(0);this.frame(0);
  }
  seek(seconds){this.seconds=Math.max(0,Math.min(8,seconds));this.dirty=true;this.coach.maneInitialized=false;this.opponent&&(this.opponent.maneInitialized=false);return this;}
  view(angle){this.angle=angle;this.dirty=true;}
  frame(delta){if(this.closed)return;if(this.running&&!document.hidden){this.seconds=Math.min(8,this.seconds+Math.min(delta,.05));this.dirty=true;if(this.seconds===8)this.running=false;}if(!this.dirty)return;this.dirty=false;
   const e=this.e,{scene,camera}=this.c,pose=sample(this.id,this.seconds,this.state,this.command);this.coach.update(pose.phase*1.22,pose.move,'one_two',{...pose.options,keepFaceClear:true,simulationTime:this.seconds});
   let opponentPhase=null;if(this.opponent){opponentPhase=this.state.opening===false?0:this.seconds<1.5?0:this.seconds<4?Math.min(.95,(this.seconds-1.5)/2.5):.95;this.opponent.update(opponentPhase*1.22,this.seconds<1.5||this.state.opening===false?'guard':'jab','one_two',{keepFaceClear:true,simulationTime:this.seconds});}
   const size=e.renderer.getSize(new THREE.Vector2());camera.aspect=Math.max(.1,size.x/size.y);const target=V(0,this.opponent?1.36:1.13,0),height=this.opponent?3.2:2.65,width=this.opponent?3.8:1.55,distance=Math.max(height/(2*Math.tan(camera.fov*Math.PI/360)),width/(2*Math.tan(camera.fov*Math.PI/360)*camera.aspect))+.3,angle=this.opponent?(this.angle==='quarter'?.35:0):(this.angle==='side'?Math.PI/2:this.angle==='front'?0:.55);
   camera.position.copy(target).add(V(Math.sin(angle)*distance,.12,Math.cos(angle)*distance));camera.lookAt(target);camera.updateProjectionMatrix();e.renderer.render(scene,camera);this.lastPose={...pose,opponentPhase};this.onProgress({seconds:this.seconds,playing:this.running,pose:this.lastPose});
  }
  close(){if(this.closed)return;this.closed=true;const e=this.e;if(e.fightIQDemo===this)e.fightIQDemo=null;this.placeholder.replaceWith(this.stage);this.stage.classList.remove('game-preview-live');this.stage.style.pointerEvents=this.pointerEvents;e.fitCameraToModel=this.oldFit;window.dispatchEvent(new Event('resize'));
   const restore=()=>{if(e.gamePreviewToken!==this.token||e.targetMode!==this.oldMode||e.arena?.fightView!==this.oldFight)return;const c=e.camera,v=e.viewControls,s=this.saved;c.position.copy(s.position);c.quaternion.copy(s.quaternion);c.zoom=s.zoom;c.userData.orbitTarget=s.orbit;if(v){v.yaw=s.yaw;v.target=s.target;v.offset=s.offset;}if(e.arena?.fightView)e.arena.fightView.userView=s.userView;c.updateProjectionMatrix();e.lastRenderStamp=null;};restore();requestAnimationFrame(()=>requestAnimationFrame(restore));
  }
 }
 window.FightIQDemo={Demo,sample,sequences};
})();
