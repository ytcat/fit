/* GOTR-0035 Fighter pad: a game-pad controller wherever the player boxes (fight, sparring, mitts, bag,
   dummy, speed bag, shadow boxing). Left: a round D-pad (steps relative to the screen, slip, duck).
   Right: Straight / Hook / Uppercut with automatic hands, Guard, Burst and the equipped combos.
   Orders go through the same BoxingInput.press the old buttons use. The old paged panel stays in the DOM,
   hidden by the body class `fighter-pad-on`, and returns for rope, Watch mode and Fight Academy lessons
   (a lesson teaches which hand throws which punch, so it keeps its own exact move buttons). */
(() => {
 /* ---------- pure rules (also loaded by tests/fighter-pad.test.cjs) ---------- */
 const RESET_MS=800,SLIP_RESET_MS=1200;
 const PUNCHES={straight:['jab','cross'],hook:['hook','rear_hook'],uppercut:['uppercut','rear_uppercut']};
 const SPEED={straight:['tap_lead','tap_rear'],hook:['double_lead','double_rear'],uppercut:['triple_lead','triple_rear']};
 // Hands: the first punch is the lead hand, then lead and rear alternate; ~0.8 s without a punch starts again from the lead.
 function createHands(options={}){
  const resetMs=options.resetMs??RESET_MS;let last=null,lastAt=-Infinity;
  const hand=now=>last===null||now-lastAt>resetMs?'lead':last==='lead'?'rear':'lead';
  return {
   hand,
   next(kind,now,speed=false){const ids=(speed?SPEED:PUNCHES)[kind];if(!ids)return null;const h=hand(now);return {id:ids[h==='lead'?0:1],hand:h};},
   commit(h,now){if(h==='lead'||h==='rear'){last=h;lastAt=now;}},
   // While a punch is still in the air the run stays alive: the 0.8 s count from when the fighter is free again.
   hold(now){if(last!==null&&now>lastAt)lastAt=now;},
   reset(){last=null;lastAt=-Infinity;},
   get last(){return last;}
  };
 }
 // Slips alternate right, left, right…; after a pause the next slip is a right slip again.
 function createSlips(options={}){
  const resetMs=options.resetMs??SLIP_RESET_MS;let last=null,lastAt=-Infinity;
  return {next(now){return last===null||now-lastAt>resetMs||last==='slip_left'?'slip_right':'slip_left';},commit(id,now){last=id;lastAt=now;},reset(){last=null;lastAt=-Infinity;}};
 }
 // facing: +1 when the fighter faces the right of the screen, -1 when it faces the left.
 // The arrow pointing where the fighter faces steps in; the other one steps out.
 function stepFor(arrow,facing){if(arrow!=='left'&&arrow!=='right')return null;return (arrow==='right')===!(facing<0)?'step_forward':'step_back';}
 function direction(arrow,facing,slip='slip_right'){return arrow==='up'?slip:arrow==='down'?'roll':stepFor(arrow,facing);}
 // Which way the fighter faces on screen, from the projected x of the fighter and of what it faces.
 // Inside the dead zone (camera behind or in front of the fighter) the previous facing is kept.
 function facingFrom(selfX,targetX,previous=1,dead=.015){const d=targetX-selfX;if(!Number.isFinite(d)||Math.abs(d)<dead)return previous<0?-1:1;return d>0?1:-1;}
 // D-pad sector from a pointer offset to the pad centre (screen pixels, y down); null in the hub.
 function sector(dx,dy,radius,hub=.2){const r=Math.hypot(dx,dy);if(!(radius>0)||!(r>=radius*hub))return null;return Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');}
 // A held arrow or Guard repeats when the fighter is about to be free, so holding keeps moving / covering.
 function repeatDue({left=0,queued=0,sinceMs=Infinity,minMs=200,lead=.12}={}){return queued===0&&left<=lead&&sinceMs>=minMs;}
 // Portrait screens: keep the side view's fighters between the top HUD and the pad. Returns the lens
 // scale k (>=1 zooms out) and the upward shift d in pixels; head/feet are the side view's own fractions.
 function safeFrame({height,bandTop,topReserve=0,head=.235,feet=.815,margin=6,maxScale=1.3}={}){
  const H=height,top=topReserve+margin,bottom=bandTop-margin,avail=bottom-top,span=(feet-head)*H;
  if(!(H>0)||!(avail>0)||bottom>=feet*H)return {k:1,d:0};
  const k=Math.max(1,Math.min(maxScale,span/avail)),c=H/2,feetY=c+(feet*H-c)/k,headY=c+(head*H-c)/k;
  return {k,d:Math.max(0,Math.min(feetY-bottom,headY-top))};
 }
 const api={RESET_MS,SLIP_RESET_MS,PUNCHES,SPEED,createHands,createSlips,stepFor,direction,facingFrom,sector,repeatDue,safeFrame};
 if(typeof module!=='undefined')module.exports=api;
 if(typeof window==='undefined'||typeof document==='undefined')return;
 window.FighterPadRules=api;

 /* ---------- controller ---------- */
 const WORDS={
  en:{pad:'Fighter controls',move:'Footwork and defence',punch:'Punches',straight:'Straight',hook:'Hook',uppercut:'Uppercut',guard:'Guard',tap:'Tap',double:'Double',triple:'Triple',forward:'In',back:'Out',slip:'Slip',roll:'Duck',stepIn:'Step in',stepOut:'Step out',slipFull:'Slip (alternates sides)',rollFull:'Duck under (roll)',lead:'lead hand',rear:'rear hand',hold:'hold to keep covering',combos:'Combos',hands:'Hands switch by themselves: lead, rear, lead…'},
  he:{pad:'שליטה במתאגרף',move:'תנועה והגנה',punch:'מכות',straight:'ישרה',hook:'הוק',uppercut:'אפרקאט',guard:'הגנה',tap:'מכה',double:'כפול',triple:'שלישייה',forward:'פנימה',back:'החוצה',slip:'התחמקות',roll:'התכופפות',stepIn:'צעד פנימה',stepOut:'צעד החוצה',slipFull:'התחמקות (לסירוגין)',rollFull:'התכופפות מתחת למכה',lead:'יד קדמית',rear:'יד אחורית',hold:'החזיקו כדי להמשיך להגן',combos:'שילובים',hands:'הידיים מתחלפות לבד: קדמית, אחורית, קדמית…'},
  ru:{pad:'Управление боксёром',move:'Передвижение и защита',punch:'Удары',straight:'Прямой',hook:'Хук',uppercut:'Апперкот',guard:'Защита',tap:'Удар',double:'Двойка',triple:'Тройка',forward:'Вперёд',back:'Назад',slip:'Уклон',roll:'Нырок',stepIn:'Шаг вперёд',stepOut:'Шаг назад',slipFull:'Уклон (поочерёдно)',rollFull:'Нырок под удар',lead:'передняя рука',rear:'задняя рука',hold:'держите, чтобы защищаться',combos:'Серии',hands:'Руки чередуются сами: передняя, задняя, передняя…'}
 };
 const CHEVRON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.5 15.5 12 9l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const SHIELD='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.8 4.8 5.6v5.6c0 4.6 3 8.6 7.2 10 4.2-1.4 7.2-5.4 7.2-10V5.6z" fill="currentColor" opacity=".9"/><path d="M12 6.2v12" stroke="rgb(0 0 0/.35)" stroke-width="1.6"/></svg>';
 const KEYS={straight:'J',hook:'K',uppercut:'L',guard:'↑'};
 const make=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n;};
 // Write only what changed: the pad repaints ten times a second on phones.
 const put=(n,attr,value)=>{if(n.getAttribute(attr)!==value)n.setAttribute(attr,value);},text=(n,value)=>{if(n.textContent!==value)n.textContent=value;},off=(n,value)=>{if(n.disabled!==!!value)n.disabled=!!value;};
 const familyOf=id=>!id?null:/^(jab|cross|tap_)/.test(id)?'straight':/^(hook|rear_hook|double_)/.test(id)?'hook':/^(uppercut|rear_uppercut|triple_)/.test(id)?'uppercut':id==='guard'?'guard':/^slip/.test(id)?'up':id==='roll'?'down':id==='step_forward'?'forward':id==='step_back'?'back':null;

 function boot(){
  const app=window.app,e=app?.engine,stage=document.getElementById('stageContainer');if(!app||!e||!stage)return;
  if(!e.player||!window.manualControls){if((boot.tries=(boot.tries||0)+1)<150)setTimeout(boot,100);return;}
  if(document.getElementById('fighterPad'))return;
  const body=document.body,hands=createHands(),slips=createSlips(),w=()=>WORDS[app.lang]||WORDS.en;
  let facing=1,shown=false,lang='',chipKey='',frame={k:1,d:0},ownView=false,lastFlash=null;
  const log=[];

  /* DOM: one overlay with a move zone (left) and a punch zone (right); the layout never mirrors. */
  const pad=make('div','fighter-pad');pad.id='fighterPad';pad.dir='ltr';pad.hidden=true;pad.setAttribute('role','group');
  const left=make('div','fp-zone fp-left'),right=make('div','fp-zone fp-right');left.setAttribute('role','group');right.setAttribute('role','group');
  const dpad=make('div','fp-dpad'),face=make('div','fp-face'),hub=make('span','fp-hub'),arrows={};
  for(const dir of ['up','right','left','down']){
   const b=make('button','fp-arrow');b.type='button';b.dataset.dir=dir;b.tabIndex=0;const ink=make('span','fp-ink'),cap=make('span','fp-cap');ink.innerHTML=CHEVRON;cap.dir='auto';ink.append(cap);b.append(ink);face.append(b);arrows[dir]={b,cap};
  }
  dpad.append(face,hub);left.append(dpad);
  const skills=make('div','fp-skills'),burstSlot=make('div','fp-burst-slot'),chips=make('div','fp-chips');skills.append(burstSlot,chips);
  const arc=make('div','fp-arc'),buttons={};
  for(const id of ['uppercut','guard','hook','straight']){
   const b=make('button','fp-btn');b.type='button';b.dataset.pad=id;const label=make('span','fp-label');label.dir='auto';
   if(id==='guard'){const icon=make('span','fp-icon');icon.innerHTML=SHIELD;b.append(icon,label);}
   else{const handsRow=make('span','fp-hands');handsRow.setAttribute('aria-hidden','true');for(const h of ['lead','rear']){const dot=make('i');dot.dataset.hand=h;handsRow.append(dot);}b.append(label,handsRow);}
   const key=make('kbd','fp-key');key.textContent=KEYS[id];key.setAttribute('aria-hidden','true');b.append(key);
   arc.append(b);buttons[id]={b,label};
  }
  right.append(skills,arc);pad.append(left,right);stage.append(pad);

  /* Orders */
  const player=()=>e.player;
  function busy(){
   const m=e.arena?.fightView?.match,p=player();
   if(m){const f=m.fighters?.[p.actor()],a=f?.action;return {left:a?Math.max(0,a.start+a.duration-m.time):0,queued:(m.playerQueue?.length||0)+(m.pendingPlayerCombo?1:0),attack:!!a?.attack,input:a?.input||a?.move};}
   const c=p.current;return {left:c?Math.max(0,c.start+c.duration-p.now()):0,queued:p.queue?.length||0,attack:!!c?.attack,input:c?.input||c?.move};
  }
  function resolve(control,now){
   const speed=e.targetMode==='speed';
   if(control==='guard')return {id:'guard'};
   if(PUNCHES[control]){const n=hands.next(control,now,speed);return n&&{id:n.id,hand:n.hand};}
   if(control==='up')return {id:slips.next(now),slip:true};
   return {id:direction(control,facing)};
  }
  function act(control,source='pad'){
   const p=player();if(!p?.enabled||!shown)return false;
   const now=performance.now(),order=resolve(control,now);if(!order?.id)return false;
   const ok=!!p.press(order.id);
   if(ok){if(order.hand)hands.commit(order.hand,now);if(order.slip)slips.commit(order.id,now);app.updatePlayBtnText?.();window.clubInterface?.paint?.();}
   log.push({control,id:order.id,ok,source,t:Math.round(now)});if(log.length>200)log.shift();
   lastFlash={control,ok,until:now+180};paint(true);return ok;
  }
  function chip(id){if(!shown)return;hands.reset();window.manualControls?.press?.(id);paint(true);}

  /* Pointer input: every control tracks its own pointer, so moving and punching work together. */
  const held=new Map();let holdTimer=null;
  function setPressed(node,on){node.dataset.pressed=String(!!on);}
  function hold(control,node,pointerId){held.set(control,{node,pointerId,at:performance.now()});if(!holdTimer)holdTimer=setInterval(repeat,50);}
  function release(control){const h=held.get(control);if(!h)return;held.delete(control);setPressed(h.node,false);if(!held.size&&holdTimer){clearInterval(holdTimer);holdTimer=null;}}
  function repeat(){
   if(!shown){for(const c of [...held.keys()])release(c);return;}
   const b=busy(),now=performance.now();
   for(const [control,h] of held){
    // Steps and Guard repeat while held; slips and ducks are one per press.
    if(!['left','right','guard'].includes(control))continue;
    if(repeatDue({left:b.left,queued:b.queued,sinceMs:now-h.at})){h.at=now;act(control,'hold');}
   }
  }
  const stop=ev=>{ev.stopPropagation();};
  for(const [id,{b}] of Object.entries(buttons)){
   b.addEventListener('pointerdown',ev=>{if(ev.button>0)return;ev.preventDefault();stop(ev);try{b.setPointerCapture(ev.pointerId);}catch{/* capture is optional */}setPressed(b,true);act(id);if(id==='guard')hold(id,b,ev.pointerId);else held.set('btn:'+id,{node:b,pointerId:ev.pointerId,at:0});});
   const up=ev=>{for(const [c,h] of held)if(h.node===b&&h.pointerId===ev.pointerId)release(c);setPressed(b,false);};
   for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,up);
   b.addEventListener('click',ev=>{if(ev.detail===0)act(id,'key');});// keyboard activation of a focused button
   b.addEventListener('contextmenu',ev=>ev.preventDefault());
  }
  let dpadPointer=null,dpadDir=null;
  function dpadAt(ev){const r=dpad.getBoundingClientRect();return sector(ev.clientX-(r.left+r.width/2),ev.clientY-(r.top+r.height/2),r.width/2);}
  function dpadSet(dir){
   if(dir===dpadDir)return;if(dpadDir){release(dpadDir);setPressed(arrows[dpadDir].b,false);}
   dpadDir=dir;dpad.dataset.dir=dir||'';
   if(dir){setPressed(arrows[dir].b,true);act(dir);held.set(dir,{node:arrows[dir].b,pointerId:dpadPointer,at:performance.now()});if(!holdTimer)holdTimer=setInterval(repeat,50);}
  }
  dpad.addEventListener('pointerdown',ev=>{if(ev.button>0)return;ev.preventDefault();stop(ev);if(dpadPointer!==null&&dpadPointer!==ev.pointerId)return;dpadPointer=ev.pointerId;try{dpad.setPointerCapture(ev.pointerId);}catch{/* optional */}dpadSet(dpadAt(ev));});
  dpad.addEventListener('pointermove',ev=>{if(ev.pointerId!==dpadPointer)return;ev.preventDefault();dpadSet(dpadAt(ev));});
  const dpadUp=ev=>{if(ev.pointerId!==dpadPointer)return;dpadSet(null);dpadPointer=null;};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])dpad.addEventListener(type,dpadUp);
  dpad.addEventListener('contextmenu',ev=>ev.preventDefault());
  for(const [dir,{b}] of Object.entries(arrows))b.addEventListener('click',ev=>{if(ev.detail===0)act(dir,'key');});
  chips.addEventListener('pointerdown',stop);skills.addEventListener('pointerdown',stop);
  // Keyboard: J / K / L throw Straight / Hook / Uppercut with automatic hands. Digits, arrows, WASD and B keep their old meaning.
  document.addEventListener('keydown',ev=>{
   if(!shown||ev.altKey||ev.ctrlKey||ev.metaKey||ev.repeat||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT|BUTTON/.test(ev.target?.tagName)||ev.target?.isContentEditable)return;
   const control={KeyJ:'straight',KeyK:'hook',KeyL:'uppercut'}[ev.code];if(!control)return;ev.preventDefault();act(control,'keyboard');
  });

  /* Facing on screen: project the fighter and what it faces (opponent, partner, bag) with the live camera. */
  const V=()=>new THREE.Vector3(),va=V(),vb=V();
  function screenFacing(){
   const c=e.camera,a=e.arena,p=player();if(!c||!e.coach?.root||typeof THREE==='undefined')return facing;
   const fv=a?.mode==='fight'?a.fightView:null;let self=e.coach.root,target=null;
   if(fv?.coaches){const me=p.actor(),other=me==='lion'?'rabbit':'lion';self=fv.coaches[me]?.root||self;target=fv.coaches[other]?.root||null;}
   else if(a)target=a.careerDrill?.trainer?.root||a.models?.[a.mode]||null;
   self.getWorldPosition(va);
   if(target&&target!==self&&target.parent){target.getWorldPosition(vb);}else vb.copy(self.localToWorld(V().set(0,0,1)));
   va.project(c);vb.project(c);return facingFrom(va.x,vb.x,facing);
  }

  /* Combo chips mirror the hidden Combos page (same list, same lock/active states, same digit keys). */
  // With combos equipped the pad keeps to the combos (and More); the loadout button is the call to action only when none are equipped.
  function railMoves(){const mc=document.getElementById('manualControls'),all=mc?.dataset.page==='combos'?[...mc.querySelectorAll('.manual-rail .manual-move')]:[];return all.some(b=>!b.dataset.meta)?all.filter(b=>b.dataset.inputMove!=='ui_combo_loadout'):all;}
  function paintChips(){
   const rail=railMoves(),key=rail.map(b=>b.dataset.inputMove+'='+b.textContent).join('|');
   if(key!==chipKey){chipKey=key;chips.replaceChildren();let digit=0;
    for(const src of rail){const id=src.dataset.inputMove,meta=!!src.dataset.meta,b=make('button',id==='ui_combo_more'?'fp-chip fp-chip-more':'fp-chip'),faceNode=make('span','fp-chip-face'),name=make('span','fp-chip-text');b.type='button';b.dataset.inputMove=id;if(meta)b.dataset.meta='true';name.dir='auto';
     name.textContent=src.textContent.replace(/\s*·\s*🔒\s*$/,'');faceNode.append(name);
     if(!meta&&++digit<=3){const k=make('kbd','fp-key');k.textContent=String(digit);k.setAttribute('aria-hidden','true');faceNode.append(k);}
     b.append(faceNode);b.addEventListener('click',()=>chip(id));chips.append(b);}
   }
   const byId=new Map(rail.map(b=>[b.dataset.inputMove,b]));
   for(const b of chips.children){const src=byId.get(b.dataset.inputMove);if(!src)continue;off(b,src.disabled);put(b,'data-locked',src.dataset.locked||'false');put(b,'data-active',src.dataset.active||'false');if(b.classList.contains('academy-next')!==src.classList.contains('academy-next'))b.classList.toggle('academy-next');put(b,'aria-label',src.getAttribute('aria-label')||src.textContent);put(b,'title',src.title||'');}
   if(chips.hidden!==!rail.length)chips.hidden=!rail.length;
  }

  /* Visibility, placement and the portrait safe frame */
  const academy=()=>body.classList.contains('academy-lesson');
  function visible(){const p=player(),mc=document.getElementById('manualControls');return !!(p?.enabled&&e.coach&&e.targetMode!=='rope'&&!academy()&&!e.fightIQDemo&&!stage.classList.contains('game-preview-live')&&mc&&!mc.hidden);}
  function burstHome(on){const burst=document.getElementById('burstControl');if(!burst)return;if(on&&burst.parentNode!==burstSlot)burstSlot.append(burst);else if(!on&&burst.parentNode===burstSlot)stage.append(burst);}
  // Lens: k >= 1 widens the view around its centre, d moves the picture up by d pixels (no camera move).
  function setFrame(next,H){
   const c=e.camera;if(!c?.setViewOffset)return;
   if(c.view?.enabled&&!ownView)return;// someone else frames the camera: leave it alone
   const none=next.k<=1.0005&&next.d<.5;if(none&&!ownView){frame={k:1,d:0};return;}
   if(!none&&ownView&&Math.abs(next.k-frame.k)<.0015&&Math.abs(next.d-frame.d)<.4)return;
   frame=none?{k:1,d:0}:{k:next.k,d:next.d};
   if(none){c.clearViewOffset();ownView=false;}
   else{c.setViewOffset(1,1,(1-frame.k)/2,(1-frame.k)/2+frame.d*frame.k/(H||1),frame.k,frame.k);ownView=true;}
   e.lastRenderStamp=null;
  }
  // Natural (lens-free) screen extent of the boxers: top of the heads and the lowest foot, in stage pixels.
  const vp=V();
  function bodies(box){
   const a=e.arena,fv=a?.mode==='fight'?a.fightView:null,c=e.camera,list=[];
   if(fv?.coaches)list.push(fv.coaches.lion,fv.coaches.rabbit);else{list.push(e.coach);const partner=a?.careerDrill?.trainer||(a?.mode==='rabbit'?a.rabbit:null);if(partner)list.push(partner);}
   const cv=e.canvas?.getBoundingClientRect?.()||box,H=box.height,mid=H/2;let top=Infinity,bottom=-Infinity;
   const natural=y=>mid+(y+frame.d-mid)*frame.k;
   const screenY=v=>{v.project(c);return cv.top+(1-v.y)/2*cv.height-box.top;};
   for(const coach of list){const j=coach?.joints;if(!j?.head||coach.root?.visible===false)continue;
    j.head.getWorldPosition(vp);vp.y+=.24;top=Math.min(top,natural(screenY(vp)));
    for(const f of [j.footL,j.footR])if(f){f.getWorldPosition(vp);vp.y-=.07;bottom=Math.max(bottom,natural(screenY(vp)));}}
   return Number.isFinite(top)&&Number.isFinite(bottom)&&bottom>top?{top,bottom,H}:null;
  }
  function layout(){
   const box=stage.getBoundingClientRect();if(!box.width||!box.height)return;
   const portrait=box.width/box.height<.95,shortLand=!portrait&&box.height<340;
   const u=portrait?Math.max(.82,Math.min(1,box.width/390)):shortLand?Math.max(.78,Math.min(.92,box.height/310)):Math.max(1,Math.min(1.35,Math.min(box.width/1000,box.height/465)));
   const kind=portrait?'portrait':shortLand?'short':'wide';put(pad,'data-layout',kind);put(body,'data-fighter-pad',kind);
   const fitKey=u.toFixed(3)+'|'+lang;
   if(pad.style.getPropertyValue('--u')!==u.toFixed(3))pad.style.setProperty('--u',u.toFixed(3));
   // Long words (Апперкот) shrink to fit their round button instead of being clipped.
   if(fitKey!==layout.key){layout.key=fitKey;for(const {b,label} of Object.values(buttons)){label.style.fontSize='';const room=b.clientWidth*.86,need=label.scrollWidth;if(room>0&&need>room)label.style.fontSize=(parseFloat(getComputedStyle(label).fontSize)*room/need).toFixed(2)+'px';}}
   // Pause and Side lock stand above the punch arc on the right edge.
   const a=arc.getBoundingClientRect(),sys=Math.round(box.bottom-a.top+8)+'px';if(a.height&&stage.style.getPropertyValue('--fp-sys-bottom')!==sys)stage.style.setProperty('--fp-sys-bottom',sys);
   if(!portrait||!e.camera||typeof THREE==='undefined'){setFrame({k:1,d:0});return;}
   const tops=[dpad,arc,skills].map(n=>n.getBoundingClientRect()).filter(r=>r.height).map(r=>r.top);
   const reserve=['#fightHealth','#fightHud','.career-drill-cue'].map(s=>document.querySelector(s)).filter(n=>n&&n.offsetParent&&!n.hidden).map(n=>n.getBoundingClientRect()).filter(r=>r.height&&r.top<box.top+box.height/2).map(r=>r.bottom-box.top);
   const ext=bodies(box);if(!ext)return;
   const goal=safeFrame({height:box.height,bandTop:Math.min(...tops)-box.top,topReserve:Math.max(0,...reserve),head:ext.top/ext.H,feet:ext.bottom/ext.H});
   // Ease toward the goal (the director already damps the camera); make room quickly, give it back slowly.
   const rate=goal.k>frame.k||goal.d>frame.d?.45:.12;
   setFrame({k:frame.k+(goal.k-frame.k)*rate,d:frame.d+(goal.d-frame.d)*rate},box.height);
  }
  function show(on){
   shown=on;pad.hidden=!on;body.classList.toggle('fighter-pad-on',on);burstHome(on);
   if(!on){for(const c of [...held.keys()])release(c);dpadSet(null);dpadPointer=null;setFrame({k:1,d:0});delete body.dataset.fighterPad;hands.reset();slips.reset();}
  }
  function paint(force=false){
   const on=visible();if(on!==shown)show(on);if(!on)return;
   const p=player(),t=w(),now=performance.now(),speed=e.targetMode==='speed';
   const mc=document.getElementById('manualControls');if(mc&&mc.dataset.page!=='combos')window.manualControls?.setPage?.('combos');
   facing=screenFacing();const b=busy();if(b.attack)hands.hold(now);
   const can=!!p.canAct?.();
   if(lang!==app.lang+'|'+speed||force){lang=app.lang+'|'+speed;
    pad.setAttribute('aria-label',t.pad);left.setAttribute('aria-label',t.move);right.setAttribute('aria-label',t.punch);skills.setAttribute('aria-label',t.combos);
    buttons.straight.label.textContent=speed?t.tap:t.straight;buttons.hook.label.textContent=speed?t.double:t.hook;buttons.uppercut.label.textContent=speed?t.triple:t.uppercut;buttons.guard.label.textContent=t.guard;
    arrows.up.cap.textContent=t.slip;arrows.down.cap.textContent=t.roll;arrows.up.b.setAttribute('aria-label',t.slipFull);arrows.down.b.setAttribute('aria-label',t.rollFull);
    buttons.guard.b.setAttribute('aria-label',t.guard+' — '+t.hold);buttons.guard.b.title=t.guard+' — '+t.hold;
   }
   for(const dir of ['left','right']){const forward=stepFor(dir,facing)==='step_forward',a=arrows[dir];text(a.cap,forward?t.forward:t.back);put(a.b,'aria-label',forward?t.stepIn:t.stepOut);put(a.b,'data-step',forward?'in':'out');}
   const nextHand=hands.hand(now),active=familyOf(b.input),flash=lastFlash&&now<lastFlash.until?lastFlash:null;
   for(const [id,{b:btn,label}] of Object.entries(buttons)){
    off(btn,!can);put(btn,'data-active',String(active===id));if(id!=='guard'){put(btn,'data-next',nextHand);put(btn,'aria-label',label.textContent+' — '+(nextHand==='lead'?t.lead:t.rear));put(btn,'title',t.hands);}
    put(btn,'data-flash',flash&&flash.control===id?(flash.ok?'ok':'no'):'');
   }
   for(const [dir,{b:btn}] of Object.entries(arrows)){const fam=dir==='up'||dir==='down'?dir:btn.dataset.step==='in'?'forward':'back';off(btn,!can);put(btn,'data-active',String(active===fam));}
   put(dpad,'data-disabled',String(!can));
   paintChips();layout();
  }
  // The camera director keeps placing the camera; in portrait the pad only shifts and widens the lens (setFrame).
  const setLanguage=app.setLanguage.bind(app);app.setLanguage=next=>{setLanguage(next);paint(true);};
  window.addEventListener('resize',()=>paint(true));
  // A thumb that leaves with the app (switching apps, a system dialog) never leaves a step or Guard held down.
  const letGo=()=>{for(const c of [...held.keys()])release(c);dpadSet(null);dpadPointer=null;for(const {b} of Object.values(buttons))setPressed(b,false);};
  window.addEventListener('blur',letGo);document.addEventListener('visibilitychange',()=>{if(document.hidden)letGo();});
  setInterval(()=>paint(),100);paint(true);
  window.fighterPad={paint,press:act,chip,log,hands,slips,get facing(){return facing;},get shown(){return shown;},get frame(){return {...frame};},rules:api};
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
