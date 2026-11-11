/* Material-only locker previews. No rig, geometry or combat changes. */
(() => {
 const cached=new WeakMap();
 function materials(coach){
  if(cached.has(coach))return cached.get(coach);
  const slots={gloves:new Set(),shorts:new Set(),boots:new Set(),belt:new Set()},base=new Map();
  for(const side of ['L','R']){const g=coach.gloveMeshes?.[side];if(g?.material)slots.gloves.add(g.material);
   coach.joints?.['foot'+side]?.traverse(n=>{if(!n.isMesh||!['Sculpted boxing boot upper','Boxing boot upper','Boxing boot ankle','Boot tongue'].includes(n.name))return;
    if(n.material===coach.black){n.material=n.material.clone();}slots.boots.add(n.material);
   });}
  if(coach.shorts?.material)slots.shorts.add(coach.shorts.material);
  let band=coach.waistband||coach.joints?.hips?.children.find(n=>n.isMesh&&n.geometry?.type==='CylinderGeometry'&&n.geometry.parameters?.height===.061);
  if(band){if(band.material===coach.gold)band.material=band.material.clone();band.name='Cosmetic waistband';coach.waistband=band;slots.belt.add(band.material);}
  for(const group of Object.values(slots))for(const m of group)base.set(m,m.color.clone());
  const value={slots,base};cached.set(coach,value);return value;
 }
 function apply(coach,equipment,catalog){if(!coach)return;const data=materials(coach);
  for(const [slot,list] of Object.entries(data.slots)){
   const item=catalog.find(c=>c.id===equipment?.[slot]);
   for(const mat of list){if(item&&item.variant!=='default')mat.color.set(item.color).convertSRGBToLinear();else mat.color.copy(data.base.get(mat));}
  }
  // Boot variants are also distinct constructions (high-top, mid-top, panelled), not only colours.
  const boots=catalog.find(c=>c.id===equipment?.boots);(typeof BoxingFootwear!=='undefined'?BoxingFootwear:globalThis.window?.BoxingFootwear)?.style?.(coach,boots?.variant||'default');
 }
 class Preview {
  constructor(engine,container){
   this.e=engine;this.token=engine.gamePreviewToken=(engine.gamePreviewToken||0)+1;this.stage=document.getElementById('stageContainer');this.playing=engine.isPlaying;this.placeholder=document.createComment('locker stage');this.stage.before(this.placeholder);this.visibility=new Map();
   const c=engine.camera,v=engine.viewControls;this.camera={position:c.position.clone(),quaternion:c.quaternion.clone(),zoom:c.zoom,orbit:c.userData.orbitTarget?.clone(),yaw:v?.yaw,target:v?.target?.clone(),offset:v?.offset?.clone(),userView:engine.arena?.fightView?.userView};
   this.oldMode=engine.targetMode;this.oldFight=engine.arena?.fightView;this.oldFit=engine.fitCameraToModel;engine.isPlaying=false;v?.reset();engine.fitCameraToModel=()=>this.frame();
   for(const n of engine.arena?.group?.children||[]){this.visibility.set(n,n.visible);if(n!==engine.coach.root)n.visible=false;}
   for(const side of ['L','R'])for(const n of engine.coach.joints['hand'+side].children){if(n.isBone)continue;this.visibility.set(n,n.visible);n.visible=!/^Wrapped rope grip|^Professional focus mitt/.test(n.name);}
   container.append(this.stage);this.stage.classList.add('game-preview-live');requestAnimationFrame(()=>{if(this.closed)return;window.dispatchEvent(new Event('resize'));this.frame();});
  }
  frame(){if(this.closed)return;const e=this.e,c=e.camera,root=e.coach.root,focus=this.focus||{y:1.15,height:2.8,width:1.7},target=root.localToWorld(new THREE.Vector3(0,focus.y,focus.z||0)),height=focus.height,width=focus.width,fov=THREE.MathUtils.degToRad(c.fov),distance=Math.max(height/(2*Math.tan(fov/2)),width/(2*Math.tan(fov/2)*Math.max(.3,c.aspect)))+.2;
   c.zoom=1;c.position.copy(target).add(new THREE.Vector3(0,.15,distance).applyAxisAngle(new THREE.Vector3(0,1,0),focus.yaw||0).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())));c.lookAt(target);c.updateProjectionMatrix();if(e.viewControls){e.viewControls.yaw=0;e.viewControls.refit(target);}e.lastRenderStamp=null;
  }
  close(){if(this.closed)return;this.closed=true;const e=this.e,c=e.camera,v=e.viewControls,s=this.camera;
   this.placeholder.replaceWith(this.stage);this.stage.classList.remove('game-preview-live');for(const [node,visible] of this.visibility)node.visible=visible;e.fitCameraToModel=this.oldFit;
   window.dispatchEvent(new Event('resize'));requestAnimationFrame(()=>requestAnimationFrame(()=>{if(e.gamePreviewToken!==this.token||e.targetMode!==this.oldMode||e.arena?.fightView!==this.oldFight)return;v?.reset();c.position.copy(s.position);c.quaternion.copy(s.quaternion);c.zoom=s.zoom;c.userData.orbitTarget=s.orbit;if(v){v.yaw=s.yaw;v.target=s.target;v.offset=s.offset;}if(e.arena?.fightView)e.arena.fightView.userView=s.userView;c.updateProjectionMatrix();e.lastRenderStamp=null;}));
  }
 }
 function labels(view,profile,lang='en'){
  const species={en:{lion:'Lion',rabbit:'Rabbit'},he:{lion:'אריה',rabbit:'ארנב'},ru:{lion:'Лев',rabbit:'Кролик'}}[lang]||{lion:'Lion',rabbit:'Rabbit'},owner=view.careerEntry?.species||'lion',raw=view.careerEntry?.playerName||profile?.name||'Guest',name=/^Guest( \d+)?$/.test(raw)&&profile?.guest!==false?raw.replace('Guest',{he:'אורח',ru:'Гость'}[lang]||'Guest'):raw,opp=view.careerEntry?.opponentName||'Shadow',rival=typeof window!=='undefined'?[...(window.GameWorld?.rivals||[]),...Object.values(window.GameTournament?.rosters||{}).flat()].find(r=>r.names?.en===opp):null;
  return Object.fromEntries(['lion','rabbit'].map(actor=>[actor,(actor===owner?name:(rival?.names?.[lang]||opp))]));
 }
 const api={apply,materials,Preview,labels};if(typeof module!=='undefined')module.exports=api;else{
  window.GamePresentation=api;window.GameIdentity={labels:view=>labels(view,window.app?.engine?.career?.store.current(),window.app?.lang||'en')};
 }
})();
