/* Articulated mitt work and forward skipping. Gear is always attached to the rig. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),Q=()=>new THREE.Quaternion();
 const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);},rear=m=>['cross','rear_hook','rear_uppercut'].includes(m);
 const ropeDrills={two_feet:{name:'Two feet',height:.15,cadence:1.72},alternating:{name:'Alternating feet',height:.135,cadence:1.90},left_leg:{name:'Left leg',height:.15,cadence:1.60},right_leg:{name:'Right leg',height:.15,cadence:1.60}};
 class CareerDrill {
  constructor(arena,mode){this.arena=arena;this.engine=arena.engine;this.mode=mode;this.start=this.engine.animTime;this.last=-1;this.seen=new Set();this.root=new THREE.Group();this.root.name=mode==='rope'?'Jump rope station':'Focus mitt station';arena.group.add(this.root);
   if(mode==='rope'){
    this.exercise=ropeDrills[this.engine.ropeDrill]?this.engine.ropeDrill:'two_feet';this.grips=['L','R'].map(side=>TrainingGear.ropeGrip(this.engine.coach,side));
    const segments=96,sides=6,p=new Float32Array((segments+1)*sides*3),index=[];for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;index.push(a,b,a+sides,b,b+sides,a+sides);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setIndex(index);this.rope=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xdba85b,roughness:.63,metalness:.08}));this.rope.name='Round woven skipping cable';this.rope.frustumCulled=false;this.rope.castShadow=true;this.root.add(this.rope);this.ropePoints=[];
   }else{
    const species=this.engine.coach.species==='lion'?'rabbit':'lion';arena.padTrainers=arena.padTrainers||{};this.trainer=arena.padTrainers[species]||(arena.padTrainers[species]=new LionCoach(arena.data,{species}));this.root.add(this.trainer.root);this.trainer.root.position.set(0,0,.60);this.trainer.root.rotation.set(0,Math.PI,0);this.mitts=['L','R'].map(side=>TrainingGear.mitt(this.trainer,side));this.previousFist={};
   }
  }
  dispose(){this.engine.coach.root.position.y=0;for(const prop of this.grips||this.mitts||[])TrainingGear.dispose(prop);if(this.trainer)this.trainer.root.parent?.remove(this.trainer.root);this.root.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)n.material.dispose();});this.root.parent?.remove(this.root);}
  once(key){if(this.seen.has(key))return false;this.seen.add(key);if(this.seen.size>80)this.seen.delete(this.seen.values().next().value);return true;}
  face(pad){return this.trainer.root.worldToLocal(pad.localToWorld(pad.userData.face.clone()));}
  placeMitt(side,goal,weight=1){const coach=this.trainer,j=coach.joints,pad=this.mitts[side==='L'?0:1],pole=V(side==='L'?-.7:.7,-.65,-.12);let error=0;
   for(let i=0;i<3;i++){const delta=goal.clone().sub(this.face(pad)).multiplyScalar(weight),wrist=coach.point(j['hand'+side]).add(delta);error=coach.solve(j['arm'+side],j['elbow'+side],j['hand'+side],wrist,pole);coach.orientGlove(side,1,V(0,0,1));}
   return error;
  }
  updateRope(t,time,frame){
   const hero=this.engine.coach,j=hero.joints,exercise=ropeDrills[this.exercise],clock=t*exercise.cadence,phase=clock%1,cycle=Math.floor(clock),jump=exercise.height*Math.sin(phase*Math.PI)**2;
   const alternating=this.exercise==='alternating',single=this.exercise.endsWith('_leg'),support=this.exercise==='left_leg'?-1:1,transfer=alternating?Math.sin(Math.PI*(clock-.5)):single?support:0;
   hero.root.position.set(0,jump,0);hero.root.rotation.set(0,0,0);hero.update(0,'guard','one_two',{simulationTime:time});j.hips.position.y-=.045*(1-jump/exercise.height);j.hips.position.x+=transfer*.038;j.hips.rotation.z=-transfer*.018;j.chest.rotation.z+=transfer*.012;
   const handY=hero.species==='rabbit'?1.29:1.13,footLifts=[];
   for(const [i,side] of ['L','R'].entries()){
    const sign=i?1:-1,lift=single?(sign===support?0:.21):alternating?.18*Math.max(0,-sign*transfer)**2:0,foot=j['foot'+side];footLifts.push(lift);
    hero.solve(j['thigh'+side],j['knee'+side],foot,V(sign*.115,.117+lift,-.025-lift*.55),V(sign*.08,.1,1));const q=Q().setFromEuler(new THREE.Euler(-lift*.6,0,0));hero.orient(foot,q);const shin=hero.point(j['knee'+side]).sub(hero.point(foot)).normalize().applyQuaternion(q.clone().invert());foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),shin);
    const wristOrbit=.018,angle=2*Math.PI*(phase-.5);hero.solve(j['arm'+side],j['elbow'+side],j['hand'+side],V(sign*.37,handY+wristOrbit*Math.cos(angle),.16-wristOrbit*Math.sin(angle)),V(sign*.65,-.7,-.15));hero.orientGlove(side,.25,V(0,-1,0));
   }
   hero.syncSkin();this.arena.group.updateMatrixWorld(true);
   const ends=this.grips.map(g=>this.root.worldToLocal(g.userData.exit.getWorldPosition(V()))),height=(ends[0].y+ends[1].y)/2-jump,radius=height+.055,angle=2*Math.PI*(phase-.5),points=[];
   for(let i=0;i<=96;i++){const u=i/96,a=u*Math.PI,rad=radius*Math.pow(Math.sin(a),.55),point=ends[0].clone().lerp(ends[1],u);point.y-=rad*Math.cos(angle);point.z-=rad*Math.sin(angle);points.push(point);}
   const p=this.rope.geometry.attributes.position;for(let i=0;i<points.length;i++){const tangent=points[Math.min(96,i+1)].clone().sub(points[Math.max(0,i-1)]).normalize(),normal=V(0,1,0).cross(tangent).normalize();if(normal.lengthSq()<.01)normal.set(0,0,1);const binormal=tangent.clone().cross(normal).normalize();for(let k=0;k<6;k++){const a=k/6*Math.PI*2,q=points[i].clone().addScaledVector(normal,.0038*Math.cos(a)).addScaledVector(binormal,.0038*Math.sin(a));p.setXYZ(i*6+k,q.x,q.y,q.z);}}p.needsUpdate=true;this.rope.geometry.computeVertexNormals();this.ropePoints=points;
   if(phase>.54&&this.once('jump'+cycle))frame.jumps=1;
   frame.cue=exercise.name+' · soft landings, small wrist turns';frame.hero=hero.metrics;frame.rope={exercise:this.exercise,phase,jump,footLifts,ends:ends.map(v=>v.toArray()),lowest:Math.min(...points.map(v=>v.y)),centre:points[48].toArray()};
  }
  updatePads(t,time,frame){
   const hero=this.engine.coach,trainer=this.trainer,beat=Math.floor(t/1.20),part=beat%4,phase=(t/1.20)%1,hook=part===2,manual=this.engine.player?.frame(time),spec=manual||{move:hook?'roll':part===1?'cross':'jab',phase,attack:!hook,index:beat};
   hero.root.position.set(0,0,-.60);hero.root.rotation.set(0,0,0);
   // Full kinetic chain for the trainer's hook: load, hip turn, shoulder, arm, return.
   trainer.update(hook?phase*1.22:0,hook?'hook':'guard','one_two',{simulationTime:time,guardElbowBack:.5,guardWidth:.22,keepFaceClear:true,knuckleTarget:[.03,1.88,.74],planStraight:true,advance:.015,power:.75});
   const hookWeight=hook?smooth((phase-.10)/.24)*(1-smooth((phase-.66)/.26)):0;
   for(const [i,side] of ['L','R'].entries()){
    trainer.orientGlove(side,1,V(0,0,1));const authored=this.face(this.mitts[i]),hitAt=this.mitts[i].userData.hitAt??-100,age=t-hitAt,recoil=age>=0?.027*(1-Math.exp(-age/.025))*Math.exp(-age/.16):0;
    const goal=V(i?.20:-.20,1.82+.008*Math.sin(t*2.3+i),.43-recoil);if(hook&&i===0)goal.lerp(authored,hookWeight);this.placeMitt(side,goal);
    this.mitts[i].userData.cushion.scale.z=1-recoil*3;
   }
   trainer.syncSkin();this.arena.group.updateMatrixWorld(true);
   const targetIndex=rear(spec.move)?0:1,pad=this.mitts[targetIndex],worldTarget=pad.localToWorld(pad.userData.face.clone()),target=hero.root.worldToLocal(worldTarget.clone());
   hero.update(spec.phase*1.22,spec.move,'one_two',{simulationTime:time,duckDepth:.30,guardElbowBack:.5,keepFaceClear:true,guardCover:manual?1:0,guardHeight:manual?1.72:undefined,guardStyle:spec.guardStyle,brace:spec.brace,defenceSide:spec.defenceSide,stepDirection:spec.stepDirection,stepAdvance:spec.stepAdvance,knuckleTarget:target.toArray(),strikeHeight:target.y,planStraight:true,advance:.025,power:.90,straightRecovery:.31});this.arena.group.updateMatrixWorld(true);
   const dt=this.last<0?0:t-this.last;
   if(spec.attack){
    if(spec.phase>.2&&this.once('swing'+spec.index))frame.swings.push({actor:'lion',move:spec.move});
    const fist=hero.root.localToWorld(V(...hero.metrics.gloves[rear(spec.move)?1:0].strikePoint)),local=pad.worldToLocal(fist.clone()),before=this.previousFist[targetIndex],speed=before&&dt>0?Math.min(5,fist.distanceTo(before)/dt):0;
    if(!hook&&spec.phase>.25&&spec.phase<.80&&Math.abs(local.x)<.125&&Math.abs(local.y+.12)<.145&&Math.abs(local.z-.07)<.09&&speed>.12&&this.once('hit'+spec.index)){
     frame.contacts.push({actor:'lion',receiver:'pads',part:'glove',kind:'pad',move:spec.move,blocked:false,closingSpeed:speed,impulse:.10,point:fist.toArray()});pad.userData.hitAt=t;
    }this.previousFist[targetIndex]=fist;
   }
   if(hook&&phase>.40&&phase<.72){const head=hero.root.localToWorld(V(...hero.metrics.head)),mitt=this.mitts[0].localToWorld(this.mitts[0].userData.face.clone());if(spec.move==='roll'&&head.y+.29<mitt.y&&this.once('defence'+beat))frame.defences=1;}
   frame.cue=hook?'Roll under the hook':part===1?'Cross · turn the hip, then recover':'Jab · meet the mitt and return to guard';frame.hero=hero.metrics;frame.partner=trainer.metrics;frame.padPhase={hook,phase};
  }
  update(time){const t=Math.max(0,time-this.start),frame={mode:this.mode,contacts:[],swings:[],loads:[],jumps:0,defences:0};this.arena.previousTime=time;if(this.mode==='rope')this.updateRope(t,time,frame);else this.updatePads(t,time,frame);this.last=t;this.arena.metrics=frame;return frame;}
 }
 const set=TrainingArena.prototype.setTarget,update=TrainingArena.prototype.update,fit=TrainingArena.prototype.fitCamera;
 TrainingArena.prototype.setTarget=function(mode){this.careerDrill?.dispose();this.careerDrill=null;if(!['rope','pads'].includes(mode))return set.call(this,mode);set.call(this,'none');this.mode=mode;this.engine.targetMode=mode;this.engine.scene.add(this.group);this.group.add(this.engine.coach.root);this.group.rotation.y=mode==='pads'?.95:.38;this.careerDrill=new CareerDrill(this,mode);this.update(this.engine.animTime);this.fitCamera(this.engine.camera);};
 TrainingArena.prototype.update=function(time,technique,combo){return this.careerDrill?this.careerDrill.update(time):update.call(this,time,technique,combo);};
 TrainingArena.prototype.fitCamera=function(camera){if(!this.careerDrill)return fit.call(this,camera);const height=this.mode==='rope'?(this.engine.coach.species==='rabbit'?3.12:2.86):2.55,width=this.mode==='rope'?1.8:2.35,fov=THREE.MathUtils.degToRad(camera.fov);camera.position.set(0,1.70,Math.max(height/(2*Math.tan(fov/2)),width/(2*Math.tan(fov/2)*Math.max(.2,camera.aspect)))+.35);camera.lookAt(0,height*.48,0);this.engine.viewControls?.refit(V(0,height*.48,0));};
 CareerDrill.ropeDrills=ropeDrills;window.CareerDrill=CareerDrill;
})();
