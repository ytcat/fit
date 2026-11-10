/* Original venue surface treatments. Existing geometry, lights and fight state stay authoritative. */
(() => {
 const localized=(en,he,ru)=>Object.freeze({en,he,ru});
 const catalog=Object.freeze([
  Object.freeze({id:'default',names:localized('Neighborhood Hall','אולם השכונה','Районный зал'),description:localized('The original ring and arena.','הזירה והאולם המקוריים.','Оригинальные ринг и арена.')}),
  Object.freeze({id:'neon_strip',names:localized('Neon Strip','שדרת הניאון','Неоновый бульвар'),description:localized('Midnight indigo, cyan ropes and electric rose signage.','אינדיגו לילי, חבלים בגוון ציאן ושילוט ורוד זוהר.','Ночной индиго, голубые канаты и ярко-розовые вывески.')}),
  Object.freeze({id:'harbor_dome',names:localized('Harbor Dome','כיפת הנמל','Купол гавани'),description:localized('Marine blue, sea-glass canvas and warm brass details.','כחול ימי, משטח בגוון זכוכית ים ופרטי פליז חמים.','Морской синий, бирюзовый настил и тёплые латунные детали.')}),
  // Built sets (arena-sets.js): their own architecture, baked light and crowd around the same ring.
  Object.freeze({id:'street',names:localized('Street Fight','קרב רחוב','Уличный бой'),description:localized('A roped square on the asphalt at dusk: street lamps, shopfronts, headlights and onlookers pressed close.','ריבוע חבלים על האספלט בשעת דמדומים: פנסי רחוב, חזיתות חנויות, פנסי מכוניות וקהל קרוב.','Квадрат из канатов на асфальте в сумерках: фонари, витрины, свет фар и зеваки вплотную.')}),
  Object.freeze({id:'boxing_club',names:localized('Boxing Club','מועדון האגרוף','Боксёрский клуб'),description:localized('A working local club: brick walls, heavy bags, speed-bag platforms, posters and a few members at the apron.','מועדון שכונתי פעיל: קירות לבנים, שקי אגרוף, אגסי מהירות, פוסטרים וכמה חברי מועדון ליד הזירה.','Рабочий районный клуб: кирпичные стены, мешки, платформы для пневмогруш, афиши и несколько своих у ринга.')}),
  Object.freeze({id:'underground',names:localized('The Basement','המרתף','Подвал'),description:localized('An unlicensed fight night: low concrete ceiling, one harsh lamp, chain-link and a tight standing crowd.','ערב קרבות לא רשמי: תקרת בטון נמוכה, מנורה אחת חזקה, גדר רשת וקהל צפוף בעמידה.','Неофициальный бойцовский вечер: низкий бетонный потолок, одна резкая лампа, сетка и плотная толпа.')}),
  Object.freeze({id:'docks',names:localized('Dockside Hangar','האנגר הנמל','Портовый ангар'),description:localized('A port hangar under sodium lamps: open doors to cranes and containers, with the dock crew watching from the stacks.','האנגר בנמל באור נתרן: שערים פתוחים אל מנופים ומכולות, וצוות הרציף צופה מעל הערימות.','Портовый ангар под натриевыми лампами: открытые ворота на краны и контейнеры, докеры смотрят со штабелей.')}),
  Object.freeze({id:'regional',names:localized('City Sports Hall','אולם הספורט העירוני','Городской спортзал'),description:localized('A modest regional card: court lines, pull-out bleachers, a wall scoreboard and tripod floodlights.','ערב קרבות אזורי צנוע: קווי מגרש, טריבונות נשלפות, לוח תוצאות על הקיר ופנסי חצובה.','Скромный региональный вечер: разметка площадки, выдвижные трибуны, табло на стене и прожекторы на штативах.')}),
  Object.freeze({id:'championship',names:localized('Championship Arena','ארנת האליפות','Чемпионская арена'),description:localized('The big night: tiered stands, lighting truss, giant screen, entrance ramp and corner-coloured light.','הערב הגדול: יציעים מדורגים, מסבך תאורה, מסך ענק, רמפת כניסה ותאורה בצבעי הפינות.','Главный вечер: ярусы трибун, световая ферма, огромный экран, выход бойцов и свет в цветах углов.')})
 ]);
 const palettes={
  neon_strip:{wall:'#191c36',floor:'#151b30',stand:'#26324a',seat:'#353c60',metal:'#60748b',canvas:'#35415c',apron:'#201d39',post:'#4b5274',cornerA:'#ba427b',cornerB:'#40a3be',ropeA:'#5dc9d4',ropeB:'#e6e8ed',ink:'#effaff',accent:'#ef79b9',paper:'#14203c'},
  underground:{canvas:'#4f5357',apron:'#2a2b2d',post:'#3b3b3d',cornerA:'#8f2f2a',cornerB:'#2c4f80',ropeA:'#b8b0a0',ropeB:'#7d2a26',ink:'#d8d2c4',accent:'#c9a23a',paper:'#2a2b2d'},
  street:{canvas:'#474a50',apron:'#2b2d31',post:'#b89b2c',cornerA:'#a8362f',cornerB:'#2f5a9a',ropeA:'#d8c9a0',ropeB:'#c0503c',ink:'#f1eee4',accent:'#e0c060',paper:'#2b2d31'},
  championship:{canvas:'#2b4a86',apron:'#0d1220',post:'#d9b860',cornerA:'#b8322e',cornerB:'#2b57b0',ropeA:'#f2f2f2',ropeB:'#c22f2f',ink:'#f6e7b0',accent:'#e0b84a',paper:'#0d1220'},
  boxing_club:{canvas:'#b9b3a4',apron:'#7a1f1c',post:'#2b2b2e',cornerA:'#a8302a',cornerB:'#2c4f8a',ropeA:'#d6cfbe',ropeB:'#9a2b26',ink:'#4a1512',accent:'#7a1f1c',paper:'#b9b3a4'},
  docks:{canvas:'#5a6a78',apron:'#1e2a33',post:'#c9b020',cornerA:'#a8362f',cornerB:'#2f5a9a',ropeA:'#e8e2d0',ropeB:'#e07a20',ink:'#f1efe8',accent:'#e0b81e',paper:'#1e2a33'},
  regional:{canvas:'#3a6a9a',apron:'#e3e0d8',post:'#c8ccd2',cornerA:'#b8322e',cornerB:'#2b57b0',ropeA:'#d92b2b',ropeB:'#f0f0f0',ink:'#ffffff',accent:'#f1c75a',paper:'#e3e0d8'},
  harbor_dome:{wall:'#19313b',floor:'#142a33',stand:'#2c444b',seat:'#3c5861',metal:'#a08b65',canvas:'#4c6b6c',apron:'#1c3845',post:'#8d8167',cornerA:'#c18b58',cornerB:'#498ea4',ropeA:'#d3ae78',ropeB:'#e3eeeb',ink:'#ecf1df',accent:'#d7af72',paper:'#173946'}
 };
 const engines=new WeakMap();
 const rgb=hex=>new THREE.Color(hex).convertSRGBToLinear();
 function role(node,world,kind){
  const g=node.geometry,p=g?.parameters||{},n=node.name;
  if(kind==='ring'){
   if(n==='Printed canvas mark')return 'print';
   if(g?.type==='BoxGeometry'&&p.width===3.48)return 'canvas';
   if(g?.type==='BoxGeometry'&&p.width===3.65)return 'apron';
   if(g?.type==='CylinderGeometry'&&Math.abs(p.radiusTop-.012)<1e-6)return node.position.y>.8?'ropeA':'ropeB';
   if(node.userData.ringPost)return 'post';
   if(g?.type==='BoxGeometry'&&p.width===.13)return node.position.z<0?'cornerA':'cornerB';
   return null;
  }
  if(n==='Arena scoreboard')return 'sign';
  if(n==='Championship banner')return 'banner';
  if(n==='Ringside sponsor board')return 'sponsor';
  // ClubWorld batches fixtures by material; these references remain stable after batching.
  if(!node.material?.isMeshStandardMaterial)return null;
  if(n==='Arena floor')return 'floor';
  if(n.includes('wall'))return 'wall';
  if(node.material===world.materials.steel)return 'metal';
  if(node.material===world.materials.dark)return 'stand';
  return 'seat';
 }
 // Arena-only ownership deliberately excludes GameWorldArt's school surfaces in world.gym.
 function owner(root,world,kind){
  const entries=[];root.traverse(node=>{if(!node.isMesh||Array.isArray(node.material)||node.userData.arenaSet)return;const slot=role(node,world,kind);if(slot)entries.push({node,original:node.material,slot});});
  return {root,kind,entries,themes:new Map(),id:'default',lang:null};
 }
 function signage(entry,id,lang){
  const p=palettes[id],banner=entry.slot==='banner',print=entry.slot==='print',sponsor=entry.slot==='sponsor';
  const canvas=document.createElement('canvas'),shape=entry.node.geometry.parameters;
  canvas.width=banner?384:1024;canvas.height=Math.max(128,Math.round(canvas.width*shape.height/shape.width));
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  if(!print){c.fillStyle=p.paper;c.fillRect(0,0,w,h);}
  const margin=w*.04;
  c.strokeStyle=p.accent;c.lineWidth=Math.max(2,w*.003);c.strokeRect(margin,margin,w-margin*2,h-margin*2);
  // Fixed, original graphic motifs: no animated uploads or additional light sources.
  c.beginPath();if(id==='neon_strip'){
   for(let i=0;i<3;i++){const x=margin*(1+i*.65);c.moveTo(x,h*.15);c.lineTo(x,h*.85);c.moveTo(w-x,h*.15);c.lineTo(w-x,h*.85);}
  }else{
   for(let i=0;i<3;i++){const y=h*(.77+i*.055);c.moveTo(w*.12,y);c.bezierCurveTo(w*.34,y-h*.08,w*.65,y+h*.08,w*.88,y);}
  }c.stroke();
  c.direction=lang==='he'?'rtl':'ltr';c.textAlign='center';c.textBaseline='middle';c.fillStyle=p.ink;
  const title=catalog.find(v=>v.id===id).names[lang],lines=banner&&lang!=='he'?title.split(' '):[title];
  let size=Math.min(banner?w*.14:w*.075,h*.24);c.font=`800 ${size}px sans-serif`;
  while(lines.some(line=>c.measureText(line).width>w*.77)&&size>14)c.font=`800 ${--size}px sans-serif`;
  lines.forEach((line,i)=>c.fillText(line,w/2,h*.43+(i-(lines.length-1)/2)*size*1.25,w*.8));
  c.font=`600 ${Math.max(12,Math.min(w*.025,h*.10))}px sans-serif`;
  c.fillText(sponsor?'GLORY OF THE RING':({en:'GLORY OF THE RING • BOXING',he:'GLORY OF THE RING • אגרוף',ru:'GLORY OF THE RING • БОКС'})[lang],w/2,h*.66,w*.77);
  const map=new THREE.CanvasTexture(canvas);map.encoding=THREE.sRGBEncoding;map.anisotropy=2;return map;
 }
 function theme(o,id,lang){
  let state=o.themes.get(id);
  if(!state){state={materials:new Map(),textures:new Map(),lang:null};o.themes.set(id,state);}
  const localeChanged=state.lang!==lang;
  for(const entry of o.entries){
   const key=entry.original.uuid+':'+entry.slot;let material=state.materials.get(key);
   if(!material){material=entry.original.clone();state.materials.set(key,material);const color=palettes[id][entry.slot];if(color&&material.color)material.color.copy(rgb(color));}
   if(['sign','banner','sponsor','print'].includes(entry.slot)&&(!material.map||localeChanged)){
    // A material shared by banners receives just one texture per locale.
    if(!state.textures.has(key)||localeChanged&&state.textures.get(key).lang!==lang){
     const old=state.textures.get(key),map=signage(entry,id,lang);state.textures.set(key,{map,lang});material.map=map;material.needsUpdate=true;old?.map.dispose();
    }
   }
   entry.node.material=material;
  }
  state.lang=lang;
 }
 function restore(o){for(const e of o.entries)e.node.material=e.original;o.id='default';o.lang=null;}
 function release(o){if(!o)return;restore(o);for(const state of o.themes.values()){for(const m of state.materials.values())m.dispose();for(const t of state.textures.values())t.map.dispose();}o.themes.clear();if(o.unhook)o.unhook();}
 // Legacy controls can replace a fight without changing target mode. Reapply before
 // setTarget returns so its newly constructed ring never renders with stale styling.
 function hookTarget(engine,state){
  const arena=engine.arena;if(state.arena===arena)return;
  state.unhookTarget?.();state.arena=arena;state.unhookTarget=null;
  if(typeof arena?.setTarget!=='function')return;
  const original=arena.setTarget,descriptor=Object.getOwnPropertyDescriptor(arena,'setTarget');
  const wrapped=function(...args){
   const result=original.apply(this,args);
   // An outer extension may retain this wrapper after disposal; leave it inert.
   if(this===arena&&engine.arena===arena&&engines.get(engine)===state)apply(engine,state.id,state.lang);
   return result;
  };
  arena.setTarget=wrapped;
  state.unhookTarget=()=>{if(arena.setTarget===wrapped){if(descriptor)Object.defineProperty(arena,'setTarget',descriptor);else delete arena.setTarget;}};
 }
 function apply(engine,id='default',lang='en'){
  if(!catalog.some(v=>v.id===id))return {id,applied:false,reason:'unknown_venue'};
  lang=['en','he','ru'].includes(lang)?lang:'en';
  const world=engine?.world;if(!world?.arena)return {id,applied:false,reason:'arena_not_ready'};
  let state=engines.get(engine);if(!state){state={world:null,ring:null};engines.set(engine,state);}
  state.id=id;state.lang=lang;hookTarget(engine,state);
  if(state.world?.root!==world.arena){release(state.world);state.world=owner(world.arena,world,'world');}
  const view=engine.arena?.fightView,ring=view?.ring;
  if(state.ring?.root!==ring){release(state.ring);state.ring=ring?owner(ring,world,'ring'):null;
   if(state.ring){const current=state.ring,original=view.dispose;const wrapped=function(...args){release(current);if(state.ring===current)state.ring=null;return original.apply(this,args);};view.dispose=wrapped;current.unhook=()=>{if(view.dispose===wrapped)view.dispose=original;};}
  }
  let changed=false;const built=!!sets()?.has(id);
  // A built set replaces the stock hall, so only the ring takes that venue's colours.
  for(const o of [state.world,state.ring]){if(!o)continue;const target=built&&o===state.world?'default':id;if(o.id===target&&(target==='default'||o.lang===lang))continue;if(target==='default')restore(o);else theme(o,target,lang);o.id=target;o.lang=lang;changed=true;}
  if(built)changed=attach(engine,state,id,lang)||changed;else if(state.set){detach(engine,state);changed=true;}
  if(changed)engine.lastRenderStamp=null;
  return {id,applied:true,changed};
 }
 // ---- Built sets. The stock hall stays in the scene graph untouched and is only
 // masked from the camera; lights keep their count and type so no shader recompiles.
 const sets=()=>typeof window!=='undefined'&&window.ArenaSets||null;
 function lightSlots(engine){const top=engine.scene?.children||[],dirs=top.filter(n=>n.isDirectionalLight),points=top.filter(n=>n.isPointLight),own=(engine.world?.arena?.children||[]).filter(n=>n.isPointLight);return {hemi:top.find(n=>n.isHemisphereLight),key:dirs.find(n=>n.castShadow)||dirs[0],fill:dirs.find(n=>!n.castShadow),rimA:points[0],rimB:points[1],a:own[0],b:own[1]};}
 function moodOn(engine,state){
  const mood=state.set.mood,scene=engine.scene,slots=lightSlots(engine),saved={fog:scene?.fog?[scene.fog.near,scene.fog.far]:null,lights:[]};
  for(const [name,v] of Object.entries(mood.lights||{})){const l=slots[name];if(!l)continue;saved.lights.push({l,color:l.color.getHex(),ground:l.groundColor?.getHex(),intensity:l.intensity});l.color.setHex(v[0]);l.intensity=v[1];if(l.groundColor&&v[2]!==undefined)l.groundColor.setHex(v[2]);}
  if(scene?.fog&&mood.fog){scene.fog.near=mood.fog[0];scene.fog.far=mood.fog[1];}
  state.mood=saved;
 }
 function moodOff(engine,state){
  const saved=state.mood;if(!saved)return;state.mood=null;
  for(const s of saved.lights){s.l.color.setHex(s.color);s.l.intensity=s.intensity;if(s.ground!==undefined)s.l.groundColor.setHex(s.ground);}
  const scene=engine.scene,world=engine.world;if(scene?.fog&&saved.fog){scene.fog.near=saved.fog[0];scene.fog.far=saved.fog[1];}
  // The hall's own mode switch owns the stock backdrop colour; let it repaint.
  if(world?.update&&world.mode!==undefined){const mode=world.mode;world.mode=null;world.update(engine.animTime||0,mode);}
 }
 // Runs once per rendered frame, before the render list is built.
 function frame(engine,state,camera){
  const set=state.set,arena=engine.world?.arena,on=!!(set&&arena&&arena.visible&&set.group.parent===arena);
  if(on!==!!state.mood){if(on)moodOn(engine,state);else moodOff(engine,state);}
  if(!on)return;
  const scene=engine.scene,bg=set.mood.background;
  if(scene.background?.isColor&&scene.background.getHex()!==bg){scene.background.setHex(bg);scene.fog?.color.setHex(bg);}
  const e=camera.matrixWorld.elements,yaw=arena.rotation.y,c=Math.cos(yaw),s=Math.sin(yaw),x=e[12]*c-e[14]*s,z=e[12]*s+e[14]*c,d=Math.hypot(x,z)||1;
  set.tick(x/d,z/d,engine.animTime||0);
 }
 function hookScene(engine,state){
  const scene=engine.scene;if(state.unhookScene||!scene)return;
  const had=Object.prototype.hasOwnProperty.call(scene,'onBeforeRender'),previous=scene.onBeforeRender;
  const hook=function(renderer,sc,camera,...rest){if(had)previous.call(this,renderer,sc,camera,...rest);if(engines.get(engine)===state&&camera)frame(engine,state,camera);};
  scene.onBeforeRender=hook;
  state.unhookScene=()=>{state.unhookScene=null;if(scene.onBeforeRender!==hook)return;if(had)scene.onBeforeRender=previous;else delete scene.onBeforeRender;};
 }
 function attach(engine,state,id,lang){
  const arena=engine.world.arena;let changed=false;
  if(state.set&&state.set.id!==id)detach(engine,state);
  if(!state.set){
   state.set=sets().build(id,lang,catalog.find(v=>v.id===id).names);state.masked=[];
   arena.traverse(n=>{if(n===arena||n.isLight||n.userData.arenaSet)return;state.masked.push([n,n.layers.mask]);n.layers.mask=0;});
   arena.add(state.set.group);changed=true;
  }else if(state.set.lang!==lang){state.set.setLang(lang);changed=true;}
  // The set brings its own crowd; the stock ringside audience belongs to each fight view.
  const audience=engine.arena?.fightView?.audience?.root;
  if(audience&&state.audience!==audience){state.audience=audience;changed=true;}
  if(audience)audience.visible=false;
  hookScene(engine,state);
  return changed;
 }
 function detach(engine,state){
  const set=state.set;if(!set)return;state.set=null;
  for(const [node,mask] of state.masked||[])node.layers.mask=mask;state.masked=null;
  if(state.audience){state.audience.visible=true;state.audience=null;}
  set.dispose();moodOff(engine,state);
 }
 function dispose(engine){const state=engines.get(engine);if(!state)return;engines.delete(engine);state.unhookTarget?.();detach(engine,state);state.unhookScene?.();release(state.world);release(state.ring);engine.lastRenderStamp=null;}
 const api=Object.freeze({catalog,apply,dispose});if(typeof module!=='undefined')module.exports=api;else window.GameVenues=api;
})();
