/* Rope rhythm and reactive focus mitts, sharing the articulated boxer rigs. */
(() => {
 const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),Q=()=>new THREE.Quaternion();
 const clamp=n=>Math.max(0,Math.min(1,n)),rear=m=>['cross','rear_hook','rear_uppercut'].includes(m);
 class CareerDrill {
  constructor(arena,mode){this.arena=arena;this.engine=arena.engine;this.mode=mode;this.start=this.engine.animTime;this.last=-1;this.seen=new Set();this.root=new THREE.Group();this.root.name=mode==='rope'?'Jump rope station':'Focus mitt station';arena.group.add(this.root);
   if(mode==='rope'){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(99*3),3));this.rope=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xdfbb78}));this.rope.name='Continuous skipping rope';this.root.add(this.rope);this.rope.frustumCulled=false;
    this.handles=['L','R'].map(()=>{const h=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.11,12),new THREE.MeshStandardMaterial({color:0x151e29,roughness:.65}));this.root.add(h);return h;});
   }else{
    // A dedicated trainer avoids altering the cached opponent's glove visibility.
    const species=this.engine.coach.species==='lion'?'rabbit':'lion';arena.padTrainers=arena.padTrainers||{};this.trainer=arena.padTrainers[species]||(arena.padTrainers[species]=new LionCoach(arena.data,{species}));this.root.add(this.trainer.root);this.trainer.root.position.set(0,0,.62);this.trainer.root.rotation.set(0,Math.PI,0);this.mitts=[];
    for(const side of ['L','R']){
     this.trainer.gloveMeshes[side].visible=false;const pad=new THREE.Group();pad.name='Coach target mitt '+side;
     const leather=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshStandardMaterial({color:0x202e3b,roughness:.76}));leather.scale.set(.106,.138,.054);pad.add(leather);
     const face=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshStandardMaterial({color:0xc8aa70,roughness:.82}));face.scale.set(.087,.116,.012);face.position.z=.048;pad.add(face);
     const target=new THREE.Mesh(new THREE.TorusGeometry(.041,.006,6,32),new THREE.MeshStandardMaterial({color:0x263141,roughness:.8}));target.position.z=.061;pad.add(target);this.trainer.root.add(pad);this.mitts.push(pad);
    }
   }
  }
  dispose(){this.engine.coach.root.position.y=0;if(this.trainer){this.trainer.root.parent?.remove(this.trainer.root);for(const pad of this.mitts){pad.parent.remove(pad);pad.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});}}
   this.root.traverse(n=>{if(n.isMesh||n.isLine){n.geometry.dispose();n.material.dispose();}});this.root.parent?.remove(this.root);
  }
  once(key){if(this.seen.has(key))return false;this.seen.add(key);if(this.seen.size>80)this.seen.delete(this.seen.values().next().value);return true;}
  update(time){const t=Math.max(0,time-this.start),hero=this.engine.coach,contacts=[],swings=[],frame={mode:this.mode,contacts,swings,loads:[],jumps:0,defences:0};this.arena.previousTime=time;
   if(this.mode==='rope'){
    const phase=(t*1.72)%1,cycle=Math.floor(t*1.72),jump=.19*Math.sin(phase*Math.PI)**2,handY=hero.species==='rabbit'?1.30:1.08,radius=handY+.12;
    hero.root.position.set(0,jump,0);hero.root.rotation.set(0,0,0);hero.update(0,'guard','one_two',{simulationTime:time});hero.joints.hips.position.y-=.05*(1-jump/.19);
    for(const [i,side] of ['L','R'].entries()){
     const sign=i?1:-1,foot=hero.joints['foot'+side];hero.solve(hero.joints['thigh'+side],hero.joints['knee'+side],foot,V(sign*.12,.117,.015),V(sign*.1,.1,1));hero.orient(foot,Q());const shin=hero.point(hero.joints['knee'+side]).sub(hero.point(foot)).normalize();foot.userData.bootAnkle.quaternion.setFromUnitVectors(V(0,1,0),shin);
     hero.solve(hero.joints['arm'+side],hero.joints['elbow'+side],hero.joints['hand'+side],V(sign*.37,handY,.10),V(sign*.6,-.6,-.2));hero.orientGlove(side,0,V(0,-1,0));this.handles[i].position.copy(hero.point(hero.joints['hand'+side])).add(V(0,jump,0));this.handles[i].rotation.x=Math.PI/2;
    }
    hero.syncSkin();const p=this.rope.geometry.attributes.position,angle=2*Math.PI*(phase-.5);
    for(let i=0;i<p.count;i++){const a=i/(p.count-1)*Math.PI,rad=radius*Math.pow(Math.sin(a),.18);p.setXYZ(i,-.37*Math.cos(a),handY+jump-rad*Math.cos(angle),.10+rad*Math.sin(angle));}p.needsUpdate=true;
    if(phase>.52&&this.once('jump'+cycle))frame.jumps=1;
    frame.cue='Light feet · turn the rope from the wrists';frame.hero=hero.metrics;frame.rope={phase,jump,lowest:handY+jump-radius*Math.cos(angle)};
   }else{
    const trainer=this.trainer,beat=Math.floor(t/1.12),part=beat%4,phase=(t/1.12)%1,hook=part===2;
    const manual=this.engine.player?.frame(time),spec=manual||{move:hook?'roll':part===1?'cross':'jab',phase,attack:!hook,index:beat};hero.root.position.set(0,0,-.60);hero.root.rotation.set(0,0,0);
    trainer.update(0,'guard','one_two',{simulationTime:time});
    for(const [i,side] of ['L','R'].entries()){
     let centre=V(i?.19:-.19,1.78,.39);
     if(hook&&i===0){const sweep=Math.sin(Math.PI*phase);centre=V(-.34+.65*phase,1.91,.39+.51*sweep);}
     const pad=this.mitts[i];pad.position.copy(centre);pad.rotation.set(0,hook&&i===0?-.6+1.2*phase:0,i?.10:-.10);
     trainer.solve(trainer.joints['arm'+side],trainer.joints['elbow'+side],trainer.joints['hand'+side],centre.clone().add(V(0,0,-.045)),V(i?.6:-.6,-.45,-.15));trainer.orientGlove(side,0,V(0,0,1));
    }
    trainer.syncSkin();this.arena.group.updateMatrixWorld(true);
    const targetIndex=rear(spec.move)?0:1,pad=this.mitts[targetIndex],target=hero.root.worldToLocal(pad.localToWorld(V(0,0,.062)));
    const options={simulationTime:time,duckDepth:.36,guardElbowBack:.5,keepFaceClear:true,knuckleTarget:target.toArray(),strikeHeight:target.y,planStraight:true,advance:.025,power:1.05};
    hero.update(spec.phase*1.22,spec.move,'one_two',options);this.arena.group.updateMatrixWorld(true);
    if(spec.attack){
     if(spec.phase>.2&&this.once('swing'+spec.index))swings.push({actor:'lion',move:spec.move});
     const glove=hero.metrics.gloves[rear(spec.move)?1:0],world=hero.root.localToWorld(V(...glove.strikePoint)),local=pad.worldToLocal(world.clone());
     if(!hook&&spec.phase>.25&&spec.phase<.78&&Math.abs(local.x)<.13&&Math.abs(local.y)<.16&&Math.abs(local.z-.062)<.13&&this.once('hit'+spec.index)){
      contacts.push({actor:'lion',receiver:'pads',part:'glove',kind:'pad',move:spec.move,blocked:false,closingSpeed:2.6,impulse:.10,point:world.toArray()});pad.userData.hitAt=t;
     }
    }
    if(hook&&phase>.48&&phase<.85){const head=hero.root.localToWorld(V(...hero.metrics.head)),mitt=this.mitts[0].getWorldPosition(V());if(spec.move==='roll'&&head.y+.32<mitt.y&&this.once('defence'+beat))frame.defences=1;}
    for(const pad of this.mitts){const recoil=Math.exp(-(t-(pad.userData.hitAt??-100))/.14);pad.position.z-=recoil*.035;pad.scale.z=1-recoil*.13;}
    frame.cue=hook?'ROLL · bend your knees under the hook':part===1?'CROSS · rear hand to the target':'JAB · meet the target and recover';frame.hero=hero.metrics;frame.partner=trainer.metrics;frame.padPhase={hook,phase};
   }
   this.last=t;this.arena.metrics=frame;return frame;
  }
 }
 const set=TrainingArena.prototype.setTarget,update=TrainingArena.prototype.update,fit=TrainingArena.prototype.fitCamera;
 TrainingArena.prototype.setTarget=function(mode){this.careerDrill?.dispose();this.careerDrill=null;if(!['rope','pads'].includes(mode))return set.call(this,mode);set.call(this,'none');this.mode=mode;this.engine.targetMode=mode;this.engine.scene.add(this.group);this.group.add(this.engine.coach.root);this.group.rotation.y=mode==='pads'?.95:.25;this.careerDrill=new CareerDrill(this,mode);this.update(this.engine.animTime);this.fitCamera(this.engine.camera);};
 TrainingArena.prototype.update=function(time,technique,combo){return this.careerDrill?this.careerDrill.update(time):update.call(this,time,technique,combo);};
 TrainingArena.prototype.fitCamera=function(camera){if(!this.careerDrill)return fit.call(this,camera);const height=this.mode==='rope'?3.25:2.75,width=this.mode==='rope'?2.3:2.9,fov=THREE.MathUtils.degToRad(camera.fov);camera.position.set(0,1.8,Math.max(height/(2*Math.tan(fov/2)),width/(2*Math.tan(fov/2)*Math.max(.2,camera.aspect)))+.7);camera.lookAt(0,1.4,0);this.engine.viewControls?.refit(V(0,1.4,0));};
 window.CareerDrill=CareerDrill;
})();
