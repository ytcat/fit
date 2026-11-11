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
  if(sh?.isSkinnedMesh&&sh.geometry.attributes.skinIndex){const g=geometry.clone(),bi=coach.bones.indexOf(hips),toBind=sh.bindMatrixInverse.clone().multiply(coach.skeleton.boneInverses[bi].clone().invert());g.applyMatrix4(toBind);
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
   if(d.draw==='wordmark'){fill(d.ink,11,2);fill(d.ink,H-13,2);x.fillStyle=d.ink;x.font='800 40px system-ui,Arial,sans-serif';x.textBaseline='middle';x.textAlign='center';for(let i=170;i<W-120;i+=230)if(Math.abs(i-W*.25)>120)x.fillText?.('GLORY \u2605',i,H/2+2);}
   // Woven label on the left hip (u = 0.25), stitched border and a crown-and-ring monogram.
   const lx=W*.25-46,ly=18;fill(d.tag,ly,H-36,lx,92);x.strokeStyle=d.tagInk;x.lineWidth=2;x.setLineDash?.([4,3]);x.strokeRect?.(lx+5,ly+5,82,H-46);x.setLineDash?.([]);
   x.fillStyle=d.tagInk;x.font='900 26px system-ui,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText?.('GR',W*.25,H/2+1);
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
   c.zoom=1;c.position.copy(target).add(new THREE.Vector3(0,.15,distance).applyAxisAngle(new THREE.Vector3(0,1,0),focus.yaw||0).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())));c.lookAt(target);c.updateProjectionMatrix();if(e.viewControls){e.viewControls.yaw=0;e.viewControls.refit(target);}this.clearLine();e.lastRenderStamp=null;
  }
  // GOTR-0039: a narrow phone preview backs the camera 5-6 m away to fit the whole fighter, which put it behind venue
  // set pieces (e.g. the championship hall) that then filled the frame. Anything between the camera and the fighter's
  // head, hands, hips or feet is hidden while the preview is open (restored on close); the backdrop stays.
  clearLine(){const e=this.e,c=e.camera,coach=e.coach,own=o=>{for(let q=o;q;q=q.parent)if(q===coach.root)return true;return false;},list=[];c.updateMatrixWorld(true);coach.root.updateMatrixWorld(true);const rc=new THREE.Raycaster(),shown=o=>{for(let q=o;q;q=q.parent)if(!q.visible)return false;return true;};rc.camera=c;
   // Only scenery is ray-cast (never the skinned fighter, which is costly on phones).
   e.scene.traverse(o=>{if((o.isMesh||o.isLine||o.isPoints)&&!o.isSkinnedMesh&&shown(o)&&!own(o))list.push(o);});
   for(const j of ['head','handL','handR','hips','footL','footR']){const node=coach.joints?.[j];if(!node)continue;const w=node.getWorldPosition(new THREE.Vector3()),dir=w.clone().sub(c.position),far=dir.length();rc.set(c.position,dir.normalize());rc.far=Math.max(0,far-.05);
    for(const hit of rc.intersectObjects(list,false)){const o=hit.object;if(!o.visible||o.material?.visible===false)continue;if(!this.visibility.has(o))this.visibility.set(o,o.visible);o.visible=false;}}}
  close(){if(this.closed)return;this.closed=true;const e=this.e,c=e.camera,v=e.viewControls,s=this.camera;
   this.placeholder.replaceWith(this.stage);this.stage.classList.remove('game-preview-live');for(const [node,visible] of this.visibility)node.visible=visible;e.fitCameraToModel=this.oldFit;
   window.dispatchEvent(new Event('resize'));requestAnimationFrame(()=>requestAnimationFrame(()=>{if(e.gamePreviewToken!==this.token||e.targetMode!==this.oldMode||e.arena?.fightView!==this.oldFight)return;v?.reset();c.position.copy(s.position);c.quaternion.copy(s.quaternion);c.zoom=s.zoom;c.userData.orbitTarget=s.orbit;if(v){v.yaw=s.yaw;v.target=s.target;v.offset=s.offset;}if(e.arena?.fightView)e.arena.fightView.userView=s.userView;c.updateProjectionMatrix();e.lastRenderStamp=null;}));
  }
 }
 function labels(view,profile,lang='en'){
  const species={en:{lion:'Lion',rabbit:'Rabbit'},he:{lion:'אריה',rabbit:'ארנב'},ru:{lion:'Лев',rabbit:'Кролик'}}[lang]||{lion:'Lion',rabbit:'Rabbit'},owner=view.careerEntry?.species||'lion',raw=view.careerEntry?.playerName||profile?.name||'Guest',name=/^Guest( \d+)?$/.test(raw)&&profile?.guest!==false?raw.replace('Guest',{he:'אורח',ru:'Гость'}[lang]||'Guest'):raw,opp=view.careerEntry?.opponentName||'Shadow',rival=typeof window!=='undefined'?[...(window.GameWorld?.rivals||[]),...Object.values(window.GameTournament?.rosters||{}).flat()].find(r=>r.names?.en===opp):null;
  return Object.fromEntries(['lion','rabbit'].map(actor=>[actor,(actor===owner?name:(rival?.names?.[lang]||opp))]));
 }
 const api={apply,materials,Preview,labels,waistbands:WAISTBANDS};if(typeof module!=='undefined')module.exports=api;else{
  window.GamePresentation=api;window.GameIdentity={labels:view=>labels(view,window.app?.engine?.career?.store.current(),window.app?.lang||'en')};
 }
})();
