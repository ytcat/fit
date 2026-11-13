/* Locker previews: material changes plus the Shop studio shot (GOTR-0090). No rig, geometry or combat changes. */
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
  const bm=[...slots.belt][0],value={slots,base,band:bm&&{color:bm.color.clone(),metalness:bm.metalness,roughness:bm.roughness}};
  // The designed waistband is a fitted band over the top of the shorts (when the accessory fitter is
  // loaded); the plain trim cylinder and its printed label are kept and shown again without equipment.
  const fit=(typeof GameAccessories!=='undefined'?GameAccessories:globalThis.window?.GameAccessories)?.fit?.waistband;
  if(band&&fit&&coach.joints?.hips){const trunk=waistbandMesh(coach,fit(coach),band.material,slots,base);
   value.trunk={mesh:trunk,plain:[band,...coach.joints.hips.children.filter(n=>n.isMesh&&n.geometry?.type==='PlaneGeometry'&&Math.abs(n.position.y-band.position.y)<.02)]};coach.trunkWaistband=trunk;}cached.set(coach,value);return value;
 }
 // The waistband rides the shorts: built around the pelvis bone, moved into the shorts' bind space and given the
 // skin weights of the nearest shorts vertex, so it bends with the trunks in hooks, uppercuts and rolls (a rigid
 // band let the shorts push through it by up to 7 cm). It uses the shorts' own skinning shader and shadow materials.
 function waistbandMesh(coach,geometry,material,slots,base){const sh=coach.shorts,hips=coach.joints.hips;let mesh;
  if(sh?.isSkinnedMesh&&sh.geometry.attributes.skinIndex){const g=geometry.clone(),bi=coach.bones.indexOf(hips),/* GOTR-0079: the inverse of the shorts' BIND matrix. bindMatrixInverse is rewritten every frame from the mesh's current world matrix, so a band first built while the Fighter stood at a station was baked that far from the pelvis. */toBind=sh.bindMatrix.clone().invert().multiply(coach.skeleton.boneInverses[bi].clone().invert());g.applyMatrix4(toBind);
   const P=g.attributes.position,S=sh.geometry.attributes.position,SI=sh.geometry.attributes.skinIndex,SW=sh.geometry.attributes.skinWeight,b=new THREE.Box3().setFromBufferAttribute(P),near=[],v=new THREE.Vector3(),q=new THREE.Vector3();
   for(let j=0;j<S.count;j++){q.fromBufferAttribute(S,j);if(q.y>b.min.y-.04&&q.y<b.max.y+.04)near.push(j);}
   const ids=new Uint16Array(P.count*4),weights=new Float32Array(P.count*4),source=new Int32Array(P.count);
   for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i);let best=near[0],d=Infinity;for(const j of near){q.fromBufferAttribute(S,j);const e=q.distanceToSquared(v);if(e<d){d=e;best=j;}}source[i]=best;for(let k=0;k<4;k++){ids[i*4+k]=SI.array[best*4+k];weights[i*4+k]=SW.array[best*4+k];}}
   g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));// Every other per-vertex input of the shorts' shader chain (linear blend, anatomy, shoulder and surface corrections)
   // is copied from the source vertex: a missing vec4 input reads (0,0,0,1) on the GPU and threw parts of the band sideways.
   for(const [name,attr] of Object.entries(sh.geometry.attributes)){if(['position','normal','uv','uv2','color','tangent','skinIndex','skinWeight'].includes(name))continue;const n=attr.itemSize,out=new Float32Array(P.count*n);for(let i=0;i<P.count;i++)for(let k=0;k<n;k++)out[i*n+k]=attr.array[source[i]*n+k];g.setAttribute(name,new THREE.BufferAttribute(out,n));}
   g.userData.source=source;
   const m=material.clone();m.skinning=true;m.onBeforeCompile=sh.material.onBeforeCompile;m.customProgramCacheKey=sh.material.customProgramCacheKey;slots.belt.add(m);base.set(m,m.color.clone());
   mesh=new THREE.SkinnedMesh(g,m);mesh.position.copy(sh.position);mesh.quaternion.copy(sh.quaternion);mesh.scale.copy(sh.scale);sh.parent.add(mesh);mesh.bind(coach.skeleton,sh.bindMatrix);mesh.frustumCulled=false;
   if(sh.customDepthMaterial)mesh.customDepthMaterial=sh.customDepthMaterial;if(sh.customDistanceMaterial)mesh.customDistanceMaterial=sh.customDistanceMaterial;}
  else{mesh=new THREE.Mesh(geometry,material);hips.add(mesh);}
  mesh.name='Trunk waistband';mesh.castShadow=true;mesh.visible=false;return mesh;
 }
 // GOTR-0030: the four belt-slot items are boxing-trunk waistbands, each a distinct woven design
 // (pinstripes, racing stripe, chevrons, repeated wordmark) with piping and a small woven label on the
 // left hip. One canvas texture per design, drawn on first use; the band geometry is unchanged.
 const WAISTBANDS={
  default:{base:'#d3ad57',ink:'#17191d',edge:'#17191d',tag:'#17191d',tagInk:'#e3bb5c',draw:'pinstripes'},
  midnight:{base:'#1b2742',ink:'#f2efe6',edge:'#f2efe6',stripe:'#c8283a',tag:'#f2efe6',tagInk:'#1b2742',draw:'racing'},
  jade:{base:'#1f7d6c',ink:'#e3bb5c',edge:'#101417',tag:'#101417',tagInk:'#58c7ad',draw:'chevrons'},
  sunrise:{base:'#e9792f',base2:'#f2b544',ink:'#5a1d12',edge:'#f6d27a',tag:'#f6d27a',tagInk:'#5a1d12',draw:'wordmark'}};
 const bandTextures=new Map();
 function canvas(w,h){const c=(globalThis.document||{}).createElement?.('canvas');if(!c)return null;c.width=w;c.height=h;return c;}
 function waistbandTexture(variant){if(bandTextures.has(variant))return bandTextures.get(variant);const d=WAISTBANDS[variant]||WAISTBANDS.default,W=2048,H=96,c=canvas(W,H),x=c?.getContext?.('2d');let map=null,bump=null;
  if(x){const fill=(color,y,h,x0=0,w=W)=>{x.fillStyle=color;x.fillRect(x0,y,w,h);};
   const grad=x.createLinearGradient?.(0,0,W,0);if(grad&&d.base2){for(let i=0;i<=8;i++)grad.addColorStop(i/8,i%2?d.base2:d.base);fill(grad,0,H);}else fill(d.base,0,H);
   // Fine knit ribs across the elastic, then the design.
   x.globalAlpha=.08;for(let i=0;i<W;i+=4)fill('#000',0,H,i,1);x.globalAlpha=1;
   fill(d.edge,0,7);fill(d.edge,H-7,7);
   if(d.draw==='pinstripes'){fill(d.ink,15,3);fill(d.ink,H-18,3);}
   if(d.draw==='racing'){fill(d.ink,30,36);fill(d.stripe,40,16);}
   if(d.draw==='chevrons'){fill(d.ink,12,3);fill(d.ink,H-15,3);x.strokeStyle=d.ink;x.lineWidth=5;x.beginPath?.();for(let i=-40;i<W+40;i+=40){x.moveTo?.(i,66);x.lineTo?.(i+20,30);x.lineTo?.(i+40,66);}x.stroke?.();}
   // GOTR-0074: fighters are mirrored at their root (orthodox stance), so words are drawn mirrored to read correctly.
   const word=(text,cx,cy)=>{x.save?.();x.translate?.(cx,cy);x.scale?.(-1,1);x.fillText?.(text,0,0);x.restore?.();};
   if(d.draw==='wordmark'){fill(d.ink,11,2);fill(d.ink,H-13,2);x.fillStyle=d.ink;x.font='800 40px system-ui,Arial,sans-serif';x.textBaseline='middle';x.textAlign='center';for(let i=170;i<W-120;i+=230)if(Math.abs(i-W*.25)>120)word('GLORY \u2605',i,H/2+2);}
   // Woven label on the left hip (u = 0.25), stitched border and a crown-and-ring monogram.
   const lx=W*.25-46,ly=18;fill(d.tag,ly,H-36,lx,92);x.strokeStyle=d.tagInk;x.lineWidth=2;x.setLineDash?.([4,3]);x.strokeRect?.(lx+5,ly+5,82,H-46);x.setLineDash?.([]);
   x.fillStyle=d.tagInk;x.font='900 26px system-ui,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';word('GR',W*.25,H/2+1);
   map=new THREE.CanvasTexture(c);map.encoding=THREE.sRGBEncoding;map.wrapS=THREE.RepeatWrapping;map.anisotropy=4;
   const b=canvas(W,H),y=b.getContext('2d');y.fillStyle='#808080';y.fillRect(0,0,W,H);y.fillStyle='#6a6a6a';for(let i=0;i<W;i+=4)y.fillRect(i,0,2,H);y.fillStyle='#b0b0b0';y.fillRect(0,0,W,6);y.fillRect(0,H-6,W,6);y.fillRect(lx,ly,92,H-36);
   bump=new THREE.CanvasTexture(b);bump.wrapS=THREE.RepeatWrapping;}
  const value={map,bump};bandTextures.set(variant,value);return value;}
 function dressBand(mat,variant,base){const t=variant?waistbandTexture(variant):{map:null,bump:null},had=!!mat.map;
  mat.map=t.map;mat.bumpMap=t.bump;mat.bumpScale=.0006;if(t.map){mat.color.set(0xffffff);mat.metalness=.04;mat.roughness=.58;}else{mat.color.copy(base.color);mat.metalness=base.metalness;mat.roughness=base.roughness;}if(had!==!!t.map)mat.needsUpdate=true;}
 function apply(coach,equipment,catalog){if(!coach)return;const data=materials(coach);
  for(const [slot,list] of Object.entries(data.slots)){
   const item=catalog.find(c=>c.id===equipment?.[slot]);
   if(slot==='belt'&&data.trunk){data.trunk.mesh.visible=!!item;for(const n of data.trunk.plain)n.visible=!item;}
   for(const mat of list){if(slot==='belt'){dressBand(mat,item?.variant,data.band);continue;}if(item&&item.variant!=='default')mat.color.set(item.color).convertSRGBToLinear();else mat.color.copy(data.base.get(mat));}
  }
  // Boot variants are also distinct constructions (high-top, mid-top, panelled), not only colours.
  const boots=catalog.find(c=>c.id===equipment?.boots);(typeof BoxingFootwear!=='undefined'?BoxingFootwear:globalThis.window?.BoxingFootwear)?.style?.(coach,boots?.variant||'default');
 }
 // GOTR-0090: the Shop preview is its own studio shot, never "whatever the game camera sees". While it is open the Fighter's rig
 // stands alone in a small studio scene (backdrop, floor, three lights) with its own camera, whole body, centred, three-quarter to
 // the camera, whatever runs underneath: the Adventure map, a story film (paused: it held the render hook and the rig, so the
 // preview showed the map and no Fighter), training or a bout. On close the rig, scene, camera, render hook, stage and mode return
 // exactly as they were.
 const STUDIO_TURN=-.42; // the Fighter's yaw in the studio: lead shoulder toward the camera (three-quarter view)
 function studioTexture(draw,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
 function buildStudio(source){
  const scene=new THREE.Scene();scene.name='Shop preview studio';scene.background=new THREE.Color(0x1d2229);scene.fog=new THREE.Fog(0x1d2229,40,60);scene.environment=source?.environment||null;
  const back=new THREE.Mesh(new THREE.PlaneGeometry(26,14),new THREE.MeshBasicMaterial({fog:false,map:studioTexture((g,w,h)=>{const r=g.createRadialGradient(w/2,h*.62,8,w/2,h*.62,w*.55);r.addColorStop(0,'#4a525e');r.addColorStop(.55,'#2b313a');r.addColorStop(1,'#1d2229');g.fillStyle=r;g.fillRect(0,0,w,h);},256,128)}));
  back.position.set(0,5,-6);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(9,48),new THREE.MeshBasicMaterial({fog:false,transparent:true,depthWrite:false,map:studioTexture((g,w,h)=>{const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(.035,'rgba(0,0,0,.35)');r.addColorStop(.07,'rgba(96,104,116,.9)');r.addColorStop(.22,'rgba(66,73,83,.85)');r.addColorStop(1,'rgba(29,34,41,0)');g.fillStyle=r;g.fillRect(0,0,w,h);},256,256)}));
  floor.rotation.x=-Math.PI/2;floor.position.y=.002;floor.renderOrder=-1;
  const key=new THREE.DirectionalLight(0xfff4e6,2.6);key.position.set(2.2,4,3.4);const fill=new THREE.DirectionalLight(0xb9d2ff,.8);fill.position.set(-3,2,2.4);
  const rim=new THREE.DirectionalLight(0xdfe8ff,1.6);rim.position.set(-1.5,3.5,-4);
  scene.add(back,floor,key,fill,rim,new THREE.HemisphereLight(0xdbeaff,0x3a3631,.55));
  const camera=new THREE.PerspectiveCamera(30,1,.05,80);camera.name='Shop preview camera';
  return {scene,camera,dispose(){for(const m of [back,floor]){m.geometry.dispose();m.material.map.dispose();m.material.dispose();}}};
 }
 // The posed body as drawn, as points: skinned meshes sampled through their bones (the bind-pose box of a skinned mesh is the
 // T-pose), rigid parts (mane, gloves, boots) by their vertices. Hidden parts are ignored. Projecting the points (not a box,
 // which grows with the gloves held forward and the round mane) gives the true outline on screen.
 function posedPoints(root){
  const pts=[];root.updateMatrixWorld(true);
  const shown=o=>{for(let q=o;q&&q!==root.parent;q=q.parent)if(!q.visible)return false;return true;};
  root.traverse(o=>{if(!o.isMesh||!shown(o)||o.material?.visible===false)return;const pos=o.geometry?.attributes?.position;if(!pos)return;
   if(o.isSkinnedMesh&&o.skeleton){o.skeleton.update();const step=Math.max(1,Math.floor(pos.count/500));for(let i=0;i<pos.count;i+=step){const v=new THREE.Vector3().fromBufferAttribute(pos,i);o.boneTransform(i,v);v.applyMatrix4(o.matrixWorld);if(Number.isFinite(v.x+v.y+v.z))pts.push(v);}}
   else{const step=Math.max(1,Math.floor(pos.count/150));for(let i=0;i<pos.count;i+=step){const v=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);if(Math.abs(v.y)<50)pts.push(v);}}});
  return pts;
 }
 class Preview {
  constructor(engine,container){
   this.e=engine;this.token=engine.gamePreviewToken=(engine.gamePreviewToken||0)+1;this.stage=document.getElementById('stageContainer');this.playing=engine.isPlaying;this.placeholder=document.createComment('locker stage');this.stage.before(this.placeholder);this.visibility=new Map();
   const c=engine.camera,v=engine.viewControls;this.camera={position:c.position.clone(),quaternion:c.quaternion.clone(),zoom:c.zoom,orbit:c.userData.orbitTarget?.clone(),yaw:v?.yaw,target:v?.target?.clone(),offset:v?.offset?.clone(),userView:engine.arena?.fightView?.userView};
   this.oldMode=engine.targetMode;this.oldFight=engine.arena?.fightView;this.oldFit=engine.fitCameraToModel;engine.isPlaying=false;v?.reset();engine.fitCameraToModel=()=>this.frame();
   this.hadLive=this.stage.classList.contains('game-preview-live');
   // A story film (or any demo) holds the render hook and may hold the rig: it is paused while the Shop is open.
   this.hook=engine.fightIQDemo||null;engine.fightIQDemo=null;
   for(const side of ['L','R'])for(const n of engine.coach.joints['hand'+side].children){if(n.isBone)continue;this.visibility.set(n,n.visible);n.visible=!/^Wrapped rope grip|^Professional focus mitt/.test(n.name);}
   // A paused film may have the Fighter in street clothes with a duffel bag: the Shop shows the kit (both come back on close).
   const cast=window.StoryCast,st=engine.coach.storyCast;if(st?.bag){this.visibility.set(st.bag,st.bag.visible);st.bag.visible=false;}
   if(cast?.outfit&&st?.outfit&&st.outfit!=='kit'){this.dress={name:st.outfit,tint:String(st.key||'').split('|')[1]||''};cast.outfit(engine.coach,'kit');}
   // GOTR-0072: the preview shows the Fighter as the game poses it now, never a pose (or a skin position) left by a story scene.
   if(engine.arena?.repose)engine.arena.repose();else{engine.lastPoseStamp=null;engine.lastRenderStamp=null;}
   const root=engine.coach.root;this.rig={root,parent:root.parent,index:root.parent?root.parent.children.indexOf(root):-1,position:root.position.clone(),quaternion:root.quaternion.clone(),scale:root.scale.clone(),visible:root.visible};
   const e0=engine;this.studio=buildStudio(engine.scene);this.scene=engine.scene;this.gameCamera=engine.camera;this.studio.camera.aspect=c.aspect;
   this.studio.scene.add(root);this.place();this.studio.scene.onBeforeRender=()=>{if(this.closed)return;this.place();const k=[e0.lastPoseStamp,this.studio.camera.aspect.toFixed(3)].join('|');if(k!==this.fitKey)this.frame();};
   engine.scene=this.studio.scene;engine.camera=this.studio.camera;engine.coach.maneInitialized=false;
   container.append(this.stage);this.stage.classList.add('game-preview-live');this.frame();requestAnimationFrame(()=>{if(this.closed)return;window.dispatchEvent(new Event('resize'));this.frame();});
  }
  // The rig stands on the studio floor, mirrored root (GOTR-0074/0085), turned three-quarter to the camera. A bout may try to move it.
  place(){const r=this.rig.root;if(r.parent!==this.studio.scene)this.studio.scene.add(r);r.position.set(0,0,0);r.rotation.set(0,STUDIO_TURN,0);r.scale.set(-1,1,1);r.visible=true;r.updateMatrixWorld(true);}
  frame(){if(this.closed)return;const e=this.e,c=this.studio.camera,root=this.rig.root;this.place();e.coach.syncSkin?.();/* GOTR-0072: the body is drawn where the rig stands */
   const fov=THREE.MathUtils.degToRad(c.fov),aspect=Math.max(.2,c.aspect||1),dir=new THREE.Vector3(0,.06,1).applyAxisAngle(new THREE.Vector3(0,1,0),this.focus?.yaw||0).normalize();c.zoom=1;
   {// GOTR-0090: always the whole body, head to feet, centred (an item only turns the camera, e.g. to the arm): fitted to the posed body's points
    let corners=posedPoints(root);if(corners.length<8)corners=[new THREE.Vector3(-.5,0,0),new THREE.Vector3(.5,2.3,0)];
    const box=new THREE.Box3().setFromPoints(corners),size=box.getSize(new THREE.Vector3()),target=box.getCenter(new THREE.Vector3());
    const fill=.84,t=Math.tan(fov/2);let distance=Math.max(size.y/(2*t*fill),Math.max(size.x,size.z)/(2*t*aspect*fill))+Math.max(size.x,size.z)/2;
    for(let i=0;i<4;i++){c.position.copy(target).addScaledVector(dir,distance);c.lookAt(target);c.updateMatrixWorld(true);c.updateProjectionMatrix();
     let x0=1,x1=-1,y0=1,y1=-1;const q=new THREE.Vector3();for(const p of corners){q.copy(p).project(c);x0=Math.min(x0,q.x);x1=Math.max(x1,q.x);y0=Math.min(y0,q.y);y1=Math.max(y1,q.y);}
     const right=new THREE.Vector3().setFromMatrixColumn(c.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(c.matrixWorld,1),k=distance*t;
     target.addScaledVector(right,(x0+x1)/2*k*aspect).addScaledVector(up,(y0+y1)/2*k);distance*=Math.max((x1-x0)/2,(y1-y0)/2)/fill;}
    c.position.copy(target).addScaledVector(dir,distance);c.lookAt(target);c.updateProjectionMatrix();
   }
   c.updateMatrixWorld(true);this.fitKey=[e.lastPoseStamp,c.aspect.toFixed(3)].join('|');e.lastRenderStamp=null;
  }
  close(){if(this.closed)return;this.closed=true;const e=this.e,c=this.gameCamera,v=e.viewControls,s=this.camera,g=this.rig;
   // a demo started in the Shop ends with it; a paused film gets the render hook back
   if(e.fightIQDemo&&e.fightIQDemo!==this.hook)e.fightIQDemo.close?.();if(!e.fightIQDemo)e.fightIQDemo=this.hook;
   if(this.dress)window.StoryCast?.outfit(e.coach,this.dress.name,this.dress.tint?{tint:this.dress.tint}:{});
   this.studio.scene.onBeforeRender=()=>{};this.studio.scene.remove(g.root);if(g.parent){g.parent.add(g.root);const list=g.parent.children,at=list.indexOf(g.root);if(g.index>=0&&at!==g.index){list.splice(at,1);list.splice(Math.min(g.index,list.length),0,g.root);}}
   g.root.position.copy(g.position);g.root.quaternion.copy(g.quaternion);g.root.scale.copy(g.scale);g.root.visible=g.visible;g.root.updateMatrixWorld(true);e.coach.maneInitialized=false;
   e.scene=this.scene;e.camera=c;c.aspect=this.studio.camera.aspect;this.studio.dispose();e.lastPoseStamp=null;
   this.placeholder.replaceWith(this.stage);if(!this.hadLive)this.stage.classList.remove('game-preview-live');for(const [node,visible] of this.visibility)node.visible=visible;e.fitCameraToModel=this.oldFit;
   window.dispatchEvent(new Event('resize'));requestAnimationFrame(()=>requestAnimationFrame(()=>{if(e.gamePreviewToken!==this.token||e.targetMode!==this.oldMode||e.arena?.fightView!==this.oldFight)return;v?.reset();c.position.copy(s.position);c.quaternion.copy(s.quaternion);c.zoom=s.zoom;c.userData.orbitTarget=s.orbit;if(v){v.yaw=s.yaw;v.target=s.target;v.offset=s.offset;}if(e.arena?.fightView)e.arena.fightView.userView=s.userView;c.updateProjectionMatrix();e.lastRenderStamp=null;}));
  }
 }
 function labels(view,profile,lang='en'){
  const species={en:{lion:'Lion',rabbit:'Rabbit'},he:{lion:'אריה',rabbit:'ארנב'},ru:{lion:'Лев',rabbit:'Кролик'}}[lang]||{lion:'Lion',rabbit:'Rabbit'},owner=view.careerEntry?.species||'lion',raw=view.careerEntry?.playerName||profile?.name||'Guest',name=/^Guest( \d+)?$/.test(raw)&&profile?.guest!==false?raw.replace('Guest',{he:'אורח',ru:'Гость'}[lang]||'Guest'):raw,opp=view.careerEntry?.opponentName||'Shadow',rival=typeof window!=='undefined'?[...(window.GameWorld?.rivals||[]),...Object.values(window.GameTournament?.rosters||{}).flat()].find(r=>r.names?.en===opp):null;
  return Object.fromEntries(['lion','rabbit'].map(actor=>[actor,(actor===owner?name:(rival?.names?.[lang]||opp))]));
 }
 const api={apply,materials,Preview,posedPoints,labels,waistbands:WAISTBANDS};if(typeof module!=='undefined')module.exports=api;else{
  window.GamePresentation=api;window.GameIdentity={labels:view=>labels(view,window.app?.engine?.career?.store.current(),window.app?.lang||'en')};
 }
})();
