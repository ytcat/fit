/* Private standalone visual QA. Does not load career, fights, save migration or mission triggers. */
(async function(){
 'use strict';
 const W=window.Chapter1World,T=window.THREE,$=id=>document.getElementById(id);
 const names={oldtown:'העיר העתיקה',market:'שדרת השוק',otto:'החנות של אוטו',docks:'רציף הנמל'};
 const load=async p=>{const r=await fetch(p);if(!r.ok)throw Error('HTTP '+r.status+' for '+p);return r.json();};
 const reduced=!!window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
 let renderer, rig, zone=null, s=W.spawn(), busy=true, stopped=false, anim=0, poseTime=0, groundY=0, yaw=-1, activePointer=null;
 const cityNames={oldtown:['tree','car','bus','station','oldtown'],market:['hazelStall','tree']};
 const animDelay=ms=>new Promise(r=>setTimeout(r,ms)), get=(obj,k)=>obj?.[k], fade=$('fade'),
   view=new T.PerspectiveCamera(40,1,.05,125), center=new T.Vector3(), next=new T.Vector3(), analog=[0,0], key=new Set();
 let last=0,lastSave=0,zoom=1.12,zoomTarget=1.12,shoulder=0;
 const gateBtn=$('door'), stick=$('stick'), thumb=stick.querySelector('i');
 const navApi=window.Chapter1RoamNav, nav=navApi.create(W), select=$('destination'), arrow=$('waypoint-arrow'), distance=$('waypoint-distance'), storyReturn=$('story-return');
 const suggested=new URLSearchParams(window.location.search).get('destination'), nativeHandoff=document.documentElement?.dataset.nativeHandoff==='1';
 let chosen=Object.hasOwn(navApi.TARGETS,suggested)?suggested:(select.value||'bruno'), guided=null, lastRoute=null, routeAt=-Infinity;
 select.value=chosen;
 const foot=new T.Vector3(), ahead=new T.Vector3();
 function navRing(scene,t){
  const g=new T.Group();g.name='Optional exploration waypoint';g.position.set(t.x,W.height(t.zone,t.x,t.z)+.022,t.z);
  function mesh(geo,opacity){const mat=new T.MeshBasicMaterial({color:0x5ce6d8,opacity,transparent:true,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2});
   const m=new T.Mesh(geo,mat);m.rotation.x=-Math.PI/2;m.renderOrder=3;g.add(m);return m;}
  const disc=mesh(new T.CircleGeometry(.69,40),.14), rim=mesh(new T.RingGeometry(.65,.73,40),.95), pulse=mesh(new T.RingGeometry(.76,.79,40),.46);
  rim.position.y=.006;pulse.position.y=.012;scene.add(g);
  return {frame(t){const k=reduced?0:.5+.5*Math.sin(t*4.6);pulse.scale.setScalar(1+.24*k);pulse.material.opacity=.46-.35*k;disc.material.opacity=.12+.10*k;},dispose(){scene.remove(g);for(const m of g.children){m.geometry.dispose();m.material.dispose();}}};
 }
 function setWaypoint(){
  if(zone){zone.navRing?.dispose();zone.navRing=null;
   const t=navApi.TARGETS[chosen];if(t?.zone===zone.id)zone.navRing=navRing(zone.scene,t);}
  guided=null;lastRoute=null;routeAt=-Infinity;distance.textContent='';arrow.hidden=true;storyReturn.hidden=true;
 }
 select.addEventListener('change',()=>{chosen=Object.hasOwn(navApi.TARGETS,select.value)?select.value:'';setWaypoint();});
 function guide(ms){
  if(!chosen)return;
  if(!lastRoute||lastRoute.id!==s.id||Math.hypot(lastRoute.x-s.x,lastRoute.z-s.z)>.27||ms-routeAt>1000){
   if(ms-routeAt>130){guided=nav.plan(s,chosen);lastRoute={id:s.id,x:s.x,z:s.z};routeAt=ms;}
  }
  storyReturn.hidden=!(nativeHandoff&&guided?.arrived&&chosen===suggested);
  if(!guided){distance.textContent='אין מסלול ליעד';arrow.hidden=true;return;}
  if(guided.arrived){distance.textContent='הגעת ליעד';arrow.hidden=true;return;}
  distance.textContent='כ־'+Math.max(1,Math.round(guided.metres))+' מ׳';
  const dx=guided.next.x-s.x,dz=guided.next.z-s.z,len=Math.hypot(dx,dz);
  if(len<.025){arrow.hidden=true;return;}
  const y=W.height(s.id,s.x,s.z);view.updateMatrixWorld(true);
  foot.set(s.x,y,s.z).project(view);ahead.set(s.x+dx/len,y,s.z+dz/len).project(view);
  arrow.style.transform='rotate('+Math.atan2(foot.y-ahead.y,(ahead.x-foot.x)*view.aspect)+'rad)';arrow.hidden=false;
 }
 function save(){if(!zone||busy)return;try{localStorage.setItem(W.SAVE,W.serialize(s));}catch{}}
 function down(ev){
  if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','KeyD','KeyA','KeyW','KeyS'].includes(ev.code)){ev.preventDefault();if(!busy)key.add(ev.code);}
  else if(ev.code==='KeyE'&&!ev.repeat&&!gateBtn.hidden){ev.preventDefault();gateBtn.click();}
  else if(ev.code==='Equal'||ev.code==='Minus'){ev.preventDefault();if(!ev.repeat)byZoom(ev.code==='Equal'?-.14:.14);}
 }
 function release(ev){if(ev&&ev.pointerId!==activePointer)return;activePointer=null;analog[0]=0;analog[1]=0;thumb.style.transform='translate(-50%,-50%)';}
 function point(ev){if(ev.pointerId!==activePointer)return;const b=stick.getBoundingClientRect(),r=b.width*.32,dx=ev.clientX-b.left-b.width*.5,dy=ev.clientY-b.top-b.height*.5,
  v=window.StreetWalkPrototype.stickInput(dx,dy,r),l=Math.max(1,Math.hypot(dx,dy)/r);
  [analog[0],analog[1]]=v;thumb.style.transform='translate(calc(-50% + '+ dx/l+'px),calc(-50% + '+dy/l+'px))';}
 function clear(){key.clear();release();}
 window.addEventListener('keydown',down);
 window.addEventListener('keyup',ev=>key.delete(ev.code));
 window.addEventListener('blur',clear);
 window.addEventListener('pagehide',()=>{save();clear();});
 document.addEventListener('visibilitychange',()=>{clear();last=0;if(document.hidden)save();});
 stick.addEventListener('pointerdown',ev=>{if(activePointer!==null||busy)return;ev.preventDefault();activePointer=ev.pointerId;stick.setPointerCapture?.(ev.pointerId);point(ev);});
 stick.addEventListener('pointermove',point);
 for(const e of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(e,release);
 function byZoom(amount){zoomTarget=Math.max(.77,Math.min(1.45,Math.round((zoomTarget+amount)*100)/100));
   $('plus').disabled=zoomTarget<=.77;$('minus').disabled=zoomTarget>=1.45;}
 $('plus').onclick=()=>byZoom(-.14);$('minus').onclick=()=>byZoom(.14);
 function paintSign(text){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=100;
  const g=canvas.getContext('2d');g.fillStyle='#162f38';g.fillRect(4,4,504,92);g.strokeStyle='#92d3cb';g.lineWidth=7;g.strokeRect(5,5,502,90);
  g.font='bold 41px system-ui, sans-serif';g.textAlign='center';g.textBaseline='middle';g.direction='rtl';g.fillStyle='#f4f1e0';g.fillText(text,256,50,466);
  const tex=new T.CanvasTexture(canvas);tex.encoding=T.sRGBEncoding;return tex;
 }
 function districtMarkers(id,scene){
  const group=new T.Group(), recycled=[], iron=new T.MeshStandardMaterial({color:'#354a4f',roughness:.82}), stripe=new T.MeshStandardMaterial({color:'#d79a74',roughness:.84}), edge=new T.MeshStandardMaterial({color:'#94a5a1',roughness:.93});
  const mesh=(geo,mat,x,y,z,rotation=0)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.y=rotation;group.add(m);return m;};
  const cube=new T.BoxGeometry(1,1,1);recycled.push(cube,iron,stripe,edge);
  const crate=(mat,x,y,z,w,h,d,r=0)=>{const m=mesh(cube,mat,x,y,z,r);m.scale.set(w,h,d);return m;};
  // The district perimeter is visibly marked at the true union edges. No authored objects move.
  // Batch all boundary boxes into one draw. Their inset is on the blocked side of the seam.
  const p=[],norm=[],colors=[],v=new T.Vector3(),n=new T.Vector3();
  const geometry=cube.toNonIndexed(), points=geometry.attributes.position, ns=geometry.attributes.normal;
  const bake=(x,y,z,w,h,d,r,c)=>{const a=Math.cos(r),b=Math.sin(r);
    for(let i=0;i<points.count;i++){v.fromBufferAttribute(points,i);n.fromBufferAttribute(ns,i);p.push(x+a*v.x*w+b*v.z*d,y+v.y*h,z-b*v.x*w+a*v.z*d);norm.push(a*n.x+b*n.z,n.y,-b*n.x+a*n.z);colors.push(c.r,c.g,c.b);}};
  const red=new T.Color('#a25749').convertSRGBToLinear(), pale=new T.Color('#e7dfcc').convertSRGBToLinear(),
    dark=new T.Color('#354a4f').convertSRGBToLinear();
  for(const a of W.exposed(id)){
    const len=Math.hypot(a.x1-a.x0,a.z1-a.z0);if(len<.09)continue;
    const yaw=a.dx?Math.PI*.5:0, x=(a.x0+a.x1)*.5+a.dx*.065, z=(a.z0+a.z1)*.5+a.dz*.065;
    const y=W.height(id,(a.x0+a.x1)*.5-a.dx*.015,(a.z0+a.z1)*.5-a.dz*.015);
    bake(x,y+.63,z,len,.13,.085,yaw,red);
    for(let d=-len/2+.22;d<len/2;d+=1.25)bake(x+Math.cos(yaw)*d+a.dx*-.047,y+.63,z-Math.sin(yaw)*d+a.dz*-.047,.37,.111,.012,yaw,pale);
    for(let d=-len/2+.055;d<len/2;d+=Math.min(len*.83,2.4))bake(x+Math.cos(yaw)*d,y+.32,z-Math.sin(yaw)*d,.078,.64,.105,yaw,dark);
  }
  geometry.dispose();
  const gb=new T.BufferGeometry();for(const [k,a] of Object.entries({position:p,normal:norm,color:colors}))gb.setAttribute(k,new T.Float32BufferAttribute(a,3));gb.computeBoundingSphere();
  const bm=new T.MeshStandardMaterial({vertexColors:true,roughness:.86});mesh(gb,bm,0,0,0);recycled.push(gb,bm);
  for(const g of W.ZONES[id].gates){
    const a=id==='docks'?0:Math.PI/2,h=W.height(id,g.x,g.z),D=[Math.cos(a),-Math.sin(a)];
    for(const sign of [-1,1]){const x=g.x+D[0]*.76*sign,z=g.z+D[1]*.76*sign;
      crate(iron,x,h+.57,z,.084,1.14,.14,a);crate(stripe,x,h+1.15,z,.1,.055,.16,a);}
    crate(iron,g.x,h+1.13,g.z,1.6,.072,.105,a);
    const tex=paintSign(names[g.to]),mat=new T.SpriteMaterial({map:tex,depthTest:true,toneMapped:false});
    const spr=new T.Sprite(mat);spr.scale.set(2.48,.485,1);spr.position.set(g.x,h+1.67,g.z);group.add(spr);recycled.push(tex,mat);
  }
  scene.add(group);
  return {group,dispose:()=>{scene.remove(group);for(const x of recycled)x.dispose();}};
 }
 async function build(id){
  const def=W.ZONES[id],scene=new T.Scene();
  const keys=cityNames[id]||[];
  const city=keys.length?await CityAssets.ready(undefined,keys).catch(()=>null):null;
  const set=StorySets.build(def.set,scene,{renderer,shadows:false,city});
  // The native opening bus is already gone when exploration starts; only pedestrian layout remains.
  if(id==='oldtown'&&set.objects.bus)set.objects.bus.visible=false;
  if(id==='docks')set.objects.tune?.(scene,set);
  const markers=districtMarkers(id,scene);
  const traffic=window.Chapter1Traffic?.create?.({THREE:T,scene,id,cityAssets:window.CityAssets})||null;
  return {id,scene,set,markers,traffic,close(){this.navRing?.dispose();traffic?.dispose?.();markers.dispose();set.dispose();}};
 }
 // The stage can change size before/without a window resize (browser chrome, orientation or embedding).
 let sizing=null;
 function startSizing(){
  if(sizing||!renderer)return;
  const stage=$('stage'), viewport=window.visualViewport, listeners=[[window,'resize'],[window,'orientationchange']];
  if(viewport)listeners.push([viewport,'resize']);
  let job=null, lastW=-1,lastH=-1,active=true;
  const measure=()=>{
   job=null;
   if(!active)return;
   const {width,height}=stage.getBoundingClientRect();
   if(!(width>0&&height>0)||(width===lastW&&height===lastH))return;
   lastW=width;lastH=height;view.aspect=width/height;view.updateProjectionMatrix();
   renderer.setSize(width,height,false);
  };
  function queue(){if(active&&job===null)job=requestAnimationFrame(measure);}
  const observer=typeof window.ResizeObserver==='function'?new window.ResizeObserver(queue):null;
  observer?.observe(stage);
  for(const [target,event] of listeners)target.addEventListener(event,queue);
  sizing=()=>{
   active=false;observer?.disconnect();
   for(const [target,event] of listeners)target.removeEventListener(event,queue);
   if(job!==null)cancelAnimationFrame(job);
   job=null;sizing=null;
  };
  measure();
 }
 window.addEventListener('pagehide',()=>sizing?.());
 window.addEventListener('pageshow',startSizing);
 function pose(snap=false){
  yaw=s.id==='docks'?-2.65:W.YAW;
  const d=(s.id==='docks'?8.7:9.95)*zoom,drop=Math.sin(.96)*d, flat=Math.cos(.96)*d,h=W.height(s.id,s.x,s.z);
  next.set(s.x,.70+h,s.z); if(snap||reduced)center.copy(next);
  view.position.set(center.x+Math.sin(yaw)*flat,center.y+drop,center.z+Math.cos(yaw)*flat);
  view.lookAt(center);
 }
 function mount(nextZone,nextState){
  const previous=zone;zone=nextZone;s=nextState;zone.scene.add(rig.root);
  rig.root.position.set(s.x,W.height(s.id,s.x,s.z),s.z);rig.root.rotation.y=s.ry;
  groundY=rig.root.position.y;shoulder=s.ry;
  DreamPose.reset(rig);poseTime=0;pose(true);
  $('zone').textContent=names[s.id];gateBtn.hidden=true;
  previous?.close();setWaypoint();
 }
 async function enter(){
  if(busy||!zone)return;
  const g=W.nearby(s);if(!g)return;const at=W.transfer(s,g.id);if(!at)return;
  save();busy=true;clear();gateBtn.hidden=true;fade.classList.add('active');
  try{const newZone=await build(at.id);if(!reduced)await animDelay(180);mount(newZone,at);$('notice').hidden=true;}
  catch(error){console.error(error);$('notice').textContent='לא הצלחנו לטעון את האזור. אפשר לנסות שוב.';$('notice').hidden=false;}
  finally{busy=false;fade.classList.remove('active');save();}
 }
 gateBtn.onclick=enter;
 function frame(ms){
  if(stopped)return;anim=requestAnimationFrame(frame);
  const dt=last?Math.min((ms-last)/1000,.075):0;last=ms;if(!zone)return;
  if(!busy&&dt>0){
   const lr=Number(key.has('ArrowRight')||key.has('KeyD'))-Number(key.has('ArrowLeft')||key.has('KeyA')),
    ud=Number(key.has('ArrowUp')||key.has('KeyW'))-Number(key.has('ArrowDown')||key.has('KeyS'));
   const h=lr||ud?lr:analog[0], v=lr||ud?ud:analog[1], delta=yaw-W.YAW;
   const x=h*Math.cos(delta)-v*Math.sin(delta),q=v*Math.cos(delta)+h*Math.sin(delta);
   W.move(s,x,q,dt,(id,x,z)=>zone.traffic?.blocks?.(id,x,z)||false);
   zone.traffic?.update?.(dt,s);
   poseTime+=dt;zoom+=(zoomTarget-zoom)*(reduced?1:1-Math.exp(-dt*11));
   const floor=W.height(s.id,s.x,s.z),u=reduced?1:1-Math.exp(-dt*13);
   groundY+=(floor-groundY)*u;
   shoulder+=Math.atan2(Math.sin(s.ry-shoulder),Math.cos(s.ry-shoulder))*u;
   rig.root.position.set(s.x,groundY,s.z);rig.root.rotation.y=shoulder;
   DreamPose.civil(rig,{t:poseTime,dt,dist:s.dist,walk:+s.walking,ground:(x,z)=>W.height(s.id,x,z),arms:{},look:{yaw:0,pitch:0}});
   next.set(s.x,.70+groundY,s.z);center.lerp(next,reduced?1:1-Math.exp(-dt*10));pose();guide(ms);zone.navRing?.frame(poseTime);
   const gate=W.nearby(s);gateBtn.hidden=!gate;
   if(gate)gateBtn.textContent='מעבר אל '+names[gate.to];
   if(ms-lastSave>650){lastSave=ms;save();}
  }
  renderer.render(zone.scene,view);
 }
 try{
  renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  $('stage').append(renderer.domElement);startSizing();
  renderer.domElement.addEventListener('webglcontextlost',ev=>{ev.preventDefault();clear();busy=true;$('notice').textContent='הדפדפן עצר את התצוגה. יש לרענן כדי להמשיך.';$('notice').hidden=false;});
  DreamSets.register();MarketSets.register();DocksSets.register();
  const [data,correct,surfaces]=await Promise.all([load('./assets/models/coach-surface-v2.json'),load('./assets/models/shoulder-correctives-v2.json'),load('./assets/models/equipment-surfaces-r76.json'),StorySets.ready()]);
  data.shoulderCorrectives=correct;window.EQUIPMENT_SURFACES=surfaces;
  rig=new LionCoach(data,{species:'lion'});rig.root.scale.set(-1,1,1);StoryCast.outfit(rig,'street');
  try{s=W.restore(localStorage.getItem(W.SAVE));}catch{}
  const born=await build(s.id);mount(born,s);
  busy=false;$('notice').hidden=true;fade.classList.remove('active');
  anim=requestAnimationFrame(frame);
 }catch(error){
  console.error(error);$('notice').textContent='תצוגת הבדיקה אינה זמינה במכשיר הזה (WebGL או נתוני המשחק).';
 }
 window.Chapter1Review={snapshot:()=>({s:{...s},zone:zone?.id,busy,zoom,traffic:zone?.traffic?.snapshot?.()||null,waypoint:{chosen,metres:guided?.metres??null,arrived:!!guided?.arrived,visibleRing:!!zone?.navRing},gate:W.nearby(s)?.id||null})};
})();
