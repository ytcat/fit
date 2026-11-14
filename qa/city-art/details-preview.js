/* Asset-review composition only. No production app script imports this file. */
(()=>{
 let group,car,templates,instances=[],mixers=[],low=false,windTime=0,frame=null,playing=false,loading=null;
 const button=id=>document.getElementById(id);
 function prepare(root){root.traverse(o=>{if(o.isMesh){const mm=Array.isArray(o.material)?o.material:[o.material];o.castShadow=!mm.every(m=>m.transparent||m.emissive?.getHex());o.receiveShadow=true;if(o.isSkinnedMesh)o.frustumCulled=false;}})}
 function cloneSkeleton(source){
  const clone=source.clone(true),map=new Map();
  function pair(a,b){map.set(a,b);for(let i=0;i<a.children.length;i++)pair(a.children[i],b.children[i])}pair(source,clone);
  source.traverse(o=>{if(!o.isSkinnedMesh)return;const c=map.get(o);c.skeleton=o.skeleton.clone();c.skeleton.bones=o.skeleton.bones.map(b=>map.get(b));if(c.skeleton.bones.some(b=>!b))throw Error('Tree clone has an external bone');c.bind(c.skeleton,o.bindMatrix)});
  return clone;
 }
 function pose(time){
  windTime=time;mixers.forEach((m,i)=>m.setTime(time+i*.83));
  asset.scene.updateMatrixWorld(true);for(const t of instances)t.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});
 }
 function setTreeLOD(value,redraw=true){
  if(!templates)return;low=value;for(const o of instances)group.remove(o);for(const m of mixers)m.stopAllAction();instances=[];mixers=[];
  const prototype=templates[value?1:0];
  for(const [i,p] of [[-8.6,0,-5.9],[8.3,0,-5.6]].entries()){
   const o=cloneSkeleton(prototype.scene);o.position.set(...p);o.rotation.y=i?.72:-.25;prepare(o);group.add(o);instances.push(o);
   const mixer=new THREE.AnimationMixer(o);for(const c of prototype.animations)mixer.clipAction(c).play();mixers.push(mixer);
  }
  asset.treeInstances=instances;asset.treeMixers=mixers;pose(windTime);button('tree-low').setAttribute('aria-pressed',String(value));if(redraw)asset.draw();
 }
 async function load(){
  const gltf=url=>new Promise((resolve,reject)=>new THREE.GLTFLoader().load(url,resolve,undefined,reject));
  const [high,small,vehicle]=await Promise.all([gltf('../../../assets/street/ch01-trees/street-tree.glb'),gltf('../../../assets/street/ch01-trees/street-tree-low.glb'),gltf('../../../assets/street/ch01-car/compact-car.glb')]);
  templates=[high,small];group=new THREE.Group();group.name='Old Town trees and parked car';asset.scene.add(group);car=vehicle.scene;car.position.set(-6.2,-.15,2.35);car.rotation.y=Math.PI;prepare(car);group.add(car);
  asset.details=group;asset.car=car;asset.treeTemplates=templates;setTreeLOD(false,false);
 }
 async function setDetails(on){
  if(on){await asset.setOldTown(true);if(!group){loading??=load();await loading;}}
  if(group)group.visible=on;if(!on)setBreeze(false);button('details').setAttribute('aria-pressed',String(on));asset.setView('town');asset.draw();return group;
 }
 function setBreeze(on){
  if(frame!==null)cancelAnimationFrame(frame);frame=null;playing=Boolean(on&&group?.visible);button('breeze').setAttribute('aria-pressed',String(playing));
  if(playing){const start=performance.now()-windTime*1000;const tick=()=>{if(!playing)return;pose((performance.now()-start)/1000);asset.draw();frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick)}
 }
 function ready(){
  asset.setDetails=setDetails;asset.setTreeLOD=setTreeLOD;asset.sampleWind=pose;asset.setWindTime=t=>{pose(t);asset.draw()};asset.setBreeze=setBreeze;asset.detailsReady=true;
  button('details').onclick=async()=>{button('details').disabled=true;try{await setDetails(!group?.visible)}catch(e){loading=null;console.error(e)}finally{button('details').disabled=false}};
  button('tree-low').onclick=()=>setTreeLOD(!low);button('breeze').onclick=()=>setBreeze(!playing);
 }
 if(window.asset?.ready)ready();else window.addEventListener('assetready',ready,{once:true});
 window.addEventListener('stationvisibility',e=>{if(!e.detail&&group){group.visible=false;setBreeze(false);button('details').setAttribute('aria-pressed','false')}});
 window.addEventListener('pagehide',()=>setBreeze(false));document.addEventListener('visibilitychange',()=>{if(document.hidden)setBreeze(false)});
})();
