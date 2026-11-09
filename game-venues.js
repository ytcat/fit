/* Original venue surface treatments. Existing geometry, lights and fight state stay authoritative. */
(() => {
 const localized=(en,he,ru)=>Object.freeze({en,he,ru});
 const catalog=Object.freeze([
  Object.freeze({id:'default',names:localized('Neighborhood Hall','אולם השכונה','Районный зал'),description:localized('The original ring and arena.','הזירה והאולם המקוריים.','Оригинальные ринг и арена.')}),
  Object.freeze({id:'neon_strip',names:localized('Neon Strip','שדרת הניאון','Неоновый бульвар'),description:localized('Midnight indigo, cyan ropes and electric rose signage.','אינדיגו לילי, חבלים בגוון ציאן ושילוט ורוד זוהר.','Ночной индиго, голубые канаты и ярко-розовые вывески.')}),
  Object.freeze({id:'harbor_dome',names:localized('Harbor Dome','כיפת הנמל','Купол гавани'),description:localized('Marine blue, sea-glass canvas and warm brass details.','כחול ימי, משטח בגוון זכוכית ים ופרטי פליז חמים.','Морской синий, бирюзовый настил и тёплые латунные детали.')})
 ]);
 const palettes={
  neon_strip:{wall:'#191c36',floor:'#151b30',stand:'#26324a',seat:'#353c60',metal:'#60748b',canvas:'#35415c',apron:'#201d39',post:'#4b5274',cornerA:'#ba427b',cornerB:'#40a3be',ropeA:'#5dc9d4',ropeB:'#e6e8ed',ink:'#effaff',accent:'#ef79b9',paper:'#14203c'},
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
  const entries=[];root.traverse(node=>{if(!node.isMesh||Array.isArray(node.material))return;const slot=role(node,world,kind);if(slot)entries.push({node,original:node.material,slot});});
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
  let changed=false;
  for(const o of [state.world,state.ring]){if(!o||o.id===id&&(id==='default'||o.lang===lang))continue;if(id==='default')restore(o);else theme(o,id,lang);o.id=id;o.lang=lang;changed=true;}
  if(changed)engine.lastRenderStamp=null;
  return {id,applied:true,changed};
 }
 function dispose(engine){const state=engines.get(engine);if(!state)return;engines.delete(engine);state.unhookTarget?.();release(state.world);release(state.ring);engine.lastRenderStamp=null;}
 const api=Object.freeze({catalog,apply,dispose});if(typeof module!=='undefined')module.exports=api;else window.GameVenues=api;
})();
