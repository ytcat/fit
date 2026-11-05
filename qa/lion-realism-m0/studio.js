/* Reversible browser-only diagnostic scene; does not change application sources. */
(() => {
 const qa=window.M0,V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
 qa.studio=()=>{
  const e=qa.engine,c=e.coach;e.arena.setTarget('none');e.isPlaying=false;
  qa.observers.forEach(o=>o.disconnect());const canvas=e.renderer.domElement;document.body.className='';canvas.className='';document.body.append(canvas);for(const child of document.body.children)if(child!==canvas)child.style.display='none';canvas.style.cssText='position:fixed;left:0;top:0;z-index:99999;width:720px!important;height:900px!important';
  e.renderer.setPixelRatio(1);e.renderer.setSize(720,900,false);e.camera=new THREE.PerspectiveCamera(38,720/900,.05,100);e.renderer.shadowMap.enabled=true;e.renderer.info.autoReset=false;
  qa.originalNodes=e.scene.children.map(node=>({node,visible:node.visible}));qa.studioGroup=new THREE.Group();e.scene.add(qa.studioGroup);
  const hemi=new THREE.HemisphereLight(0xffffff,0x606060,.6);qa.studioGroup.add(hemi);
  const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(2.3,3.8,4.2);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=3;key.shadow.camera.bottom=-1;key.shadow.normalBias=.018;key.shadow.bias=-.0003;qa.studioGroup.add(key);
  const fill=new THREE.DirectionalLight(0xffffff,.4);fill.position.set(-3,2,2);qa.studioGroup.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,.35);rim.position.set(-2,2.5,-3);qa.studioGroup.add(rim);
  const gray=new THREE.MeshStandardMaterial({color:0x808080,roughness:.9});gray.color.convertSRGBToLinear();const floor=new THREE.Mesh(new THREE.PlaneGeometry(8,8),gray);floor.rotation.x=-Math.PI/2;floor.position.y=-.002;floor.receiveShadow=true;qa.studioGroup.add(floor);
  for(const [i,hex] of [0x202020,0x404040,0x808080,0xb0b0b0,0xe0e0e0,0xffffff].entries()){const m=new THREE.MeshStandardMaterial({color:hex,roughness:1});m.color.convertSRGBToLinear();const chip=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.007),m);chip.position.set(-.61+i*.075,.055,.15);qa.studioGroup.add(chip);}
  qa.preview=true;const preview=()=>{if(qa.preview)e.renderer.render(e.scene,e.camera);qa.nativeRAF(preview);};qa.nativeRAF(preview);
  qa.materials=new Map();qa.meshVisibility=new Map();c.root.traverse(node=>{if(!node.isMesh)return;qa.meshVisibility.set(node,node.visible);for(const m of (Array.isArray(node.material)?node.material:[node.material]))if(!qa.materials.has(m))qa.materials.set(m,{color:m.color?.clone(),vertexColors:m.vertexColors,map:m.map,bumpMap:m.bumpMap,normalMap:m.normalMap,roughness:m.roughness,metalness:m.metalness,clearcoat:m.clearcoat,transparent:m.transparent,opacity:m.opacity});});
  qa.undercoat=c.joints.head.children.find(n=>n.isMesh&&n.geometry.type==='SphereGeometry'&&Math.abs(n.scale.x-.2655)<.005&&Math.abs(n.scale.y-.3195)<.01);
  qa.style=(style='textured',lighting='neutral')=>{
   for(const {node,visible} of qa.originalNodes)node.visible=node===c.root?true:lighting==='production'?visible:false;
   qa.studioGroup.visible=lighting==='neutral';e.scene.background=lighting==='neutral'?new THREE.Color(0x25282e):null;
   for(const [m,save] of qa.materials){for(const [key,value] of Object.entries(save)){if(key==='color'&&m.color)m.color.copy(value);else m[key]=value;}if(style==='clay'){if(m.color)m.color.setHex(0x808080).convertSRGBToLinear();m.vertexColors=false;m.map=m.bumpMap=m.normalMap=null;m.roughness=.8;m.metalness=0;if('clearcoat' in m)m.clearcoat=0;}m.needsUpdate=true;}
   for(const [node,visible] of qa.meshVisibility)node.visible=visible;
   if(style==='clay'){c.bodyFur.visible=false;c.mane.visible=false;if(qa.undercoat)qa.undercoat.visible=false;}
  };
  qa.pose=(spec,reset=true)=>{
   const {move='guard',phase=0,yaw=0,crop='body',hit=null,presentation=null,simulationTime}=spec;const time=simulationTime??phase*1.22;
   c.root.position.set(0,0,0);c.root.rotation.set(0,yaw,0);
   if(reset){c.maneInitialized=false;c.maneTime=undefined;c.furTime=undefined;c.furPrevious=null;c.aimWristGuide=null;}
   c.update(phase*1.22,move,'one_two',{simulationTime:time,hitReaction:hit,presentation});
   e.scene.updateMatrixWorld(true);e.camera.fov=crop==='body'?38:32;e.camera.up.set(0,1,0);
   let target=V(0,1.25,0),position=V(0,1.35,4.35);
   if(crop==='face'){target=c.joints.head.getWorldPosition(V()).add(V(0,.11,.025));position=target.clone().add(V(0,0,1.5));e.camera.fov=36;}
   if(crop==='axilla'){target=V(0,1.48,.02);position=V(0,1.57,2.45);}
   if(crop.startsWith('glove')){
    const side=spec.side||'L',hand=c.joints['hand'+side];target=hand.localToWorld(V(0,-.12,0));
    const direction=V(...(crop==='glove-palm'?[0,0,1]:crop==='glove-back'?[0,0,-1]:[0,-1,0])).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));position=target.clone().addScaledVector(direction,.80);if(Math.abs(direction.y)>.95)e.camera.up.set(0,0,1);
   }
   if(crop==='boot'){target=c.joints['foot'+(spec.side||'L')].getWorldPosition(V()).add(V(0,-.035,.08));position=target.clone().add(V(.35,.20,.85));}
   e.camera.position.copy(position);e.camera.lookAt(target);e.camera.updateProjectionMatrix();e.renderer.info.reset();e.renderer.render(e.scene,e.camera);
   return {move,phase,time,yaw,crop,hit,presentation,style:spec.style,lighting:spec.lighting,camera:{position:position.toArray(),target:target.toArray(),up:e.camera.up.toArray(),fov:e.camera.fov,aspect:e.camera.aspect},canvas:e.renderer.getDrawingBufferSize(new THREE.Vector2()).toArray(),counts:{...e.renderer.info.render},maneOffsetMax:c.maneGuides?Math.max(...c.maneGuides.map(g=>g.offset.length())):0};
  };
 };
})();
