/* Fight Academy on the real training stage: watch the combo, repeat it with the real move buttons, then try it in a fight. */
(() => {
 const copy={
  en:{lesson:'Fight Academy lesson',turn:'My turn',replay:'Replay',slow:'Slow motion',leave:'Leave lesson',again:'Watch again',tap:'Tap {move}',wrong:'Pressed {pressed} — needed {wanted}',late:'Too slow',single:'Single moves only',busy:'Wait…',passed:'Passed!',runs:'{n} of {total}',use:'Tap {label}',used:'{name} ✓',cup:'Finish your cup bout first.',unavailable:'Lessons are unavailable right now.',saving:'Could not save: {error}'},
  he:{lesson:'שיעור באקדמיית הקרב',turn:'תורי',replay:'הצגה חוזרת',slow:'הילוך איטי',leave:'יציאה מהשיעור',again:'צפייה חוזרת',tap:'לחצו על {move}',wrong:'לחצתם {pressed} — צריך {wanted}',late:'לאט מדי',single:'רק מהלכים בודדים',busy:'רגע…',passed:'עברתם!',runs:'{n} מתוך {total}',use:'לחצו על {label}',used:'{name} ✓',cup:'סיימו קודם את קרב הגביע.',unavailable:'השיעורים אינם זמינים כרגע.',saving:'השמירה נכשלה: {error}'},
  ru:{lesson:'Урок Академии боя',turn:'Мой ход',replay:'Повтор',slow:'Замедленно',leave:'Выйти из урока',again:'Посмотреть ещё раз',tap:'Нажмите: {move}',wrong:'Нажато: {pressed} — нужно: {wanted}',late:'Слишком медленно',single:'Только отдельные приёмы',busy:'Подождите…',passed:'Пройдено!',runs:'{n} из {total}',use:'Нажмите {label}',used:'{name} ✓',cup:'Сначала завершите бой кубка.',unavailable:'Уроки сейчас недоступны.',saving:'Не удалось сохранить: {error}'}
 };
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const fill=(text,values)=>text.replace(/\{(\w+)\}/g,(_,key)=>values[key]??'');
 function boot(){
  const app=window.app,e=app?.engine,rules=window.AcademyLesson,stage=document.getElementById('stageContainer');if(!e||!rules||!window.GameDomain||!stage)return;
  let lesson=null,hint=null,timer=null;
  const w=()=>copy[app.lang]||copy.en,shell=()=>window.ringfighterGame,store=()=>e.career?.store;
  const moveButton=id=>document.querySelector('#manualControls [data-input-move="'+id+'"]');
  // Boxes carry the same words as the real buttons, so the player can match them by reading.
  const label=id=>moveButton(id)?.textContent||shell()?.moveName?.(id)||id,comboName=id=>shell()?.comboName?.(id)||id;
  // Tempo is measured on the fighter's own clock, so a slow device is not judged harder than a fast one.
  const clock=()=>(e.player?.now?.()??performance.now()/1000)*1000;
  const currentPage=()=>document.querySelector('.manual-pages [data-input-page][aria-pressed="true"]')?.dataset.inputPage;
  const clearGlow=keep=>{for(const b of document.querySelectorAll('#manualControls .academy-next'))if(b!==keep)b.classList.remove('academy-next');};
  // Observe the real input object; everything is restored when the lesson or fight hint ends.
  function hook(handlers){
   const p=e.player,saved={};for(const key of ['press','pressCombo'])saved[key]={own:Object.prototype.hasOwnProperty.call(p,key),value:p[key]};
   const raw={press:id=>saved.press.value.call(p,id),combo:id=>saved.pressCombo.value.call(p,id)},wrapped={press:id=>handlers.press(id,raw),pressCombo:id=>handlers.combo(id,raw)};
   p.press=wrapped.press;p.pressCombo=wrapped.pressCombo;
   return {raw,restore(){for(const key of ['press','pressCombo'])if(p[key]===wrapped[key]){if(saved[key].own)p[key]=saved[key].value;else delete p[key];}}};
  }
  function run(){if(!timer)timer=setInterval(tick,80);}

  /* ---------- lesson: Watch → Repeat ×3 ---------- */
  function start(comboId){
   const combo=GameDomain.combos.find(c=>c.id===comboId),game=shell();if(!combo||!game||!store()?.current()||!e.player)return {ok:false,error:w().unavailable};
   stop();endHint();
   if(game.startTraining({mode:'heavy',play:true,lesson:true})===false)return {ok:false,error:w().cup};
   if(!e.player.enabled||e.targetMode!=='heavy')return {ok:false,error:w().unavailable};
   const L=lesson={combo,index:GameDomain.combos.indexOf(combo),mode:e.targetMode,species:e.coach.species,profileId:store().current().id,lang:app.lang,phase:'watch',speed:e.speed,page:currentPage(),demo:null,pending:null,say:null,tone:'',holdUntil:0,timers:[],fitKey:'',
    validator:rules.create(combo.sequence,{repetitions:GameDomain.lesson.repetitions,windowMs:GameDomain.lesson.windowMs})};
   window.manualControls?.setPage?.('moves');
   L.hook=hook({
    // Combo buttons would play the whole sequence for the player; a lesson counts single moves only.
    combo:()=>{if(L.phase==='repeat'){note(()=>w().single,'miss');}return false;},
    press:(id,raw)=>{if(window.BoxingInput?.combos?.[id])return e.player.pressCombo(id);if(L.phase!=='repeat')return false;
     buffered();const accepted=raw.press(id);
     // The fighter holds three moves at most. One extra tap is kept and thrown as soon as there is room, so brisk tapping of a long combo is not lost.
     if(accepted)judge(L.validator.input(id,clock()));else if(!L.pending&&e.player.canAct())L.pending={id,until:performance.now()+1500};else note(()=>w().busy,'');return accepted;}
   });
   build();document.body.classList.add('academy-lesson');watch();fit();run();return {ok:true};
  }
  function buffered(){const L=lesson,held=L?.pending;if(!held||L.phase!=='repeat')return;if(L.hook.raw.press(held.id)){L.pending=null;judge(L.validator.input(held.id,clock()));}else if(performance.now()>held.until)L.pending=null;}
  function build(){
   const L=lesson,hud=make('div','academy-hud'),row=make('div','academy-row'),bar=make('div','academy-bar'),name=make('strong','academy-name'),pips=make('span','academy-pips'),msg=make('span','academy-msg');
   hud.setAttribute('role','region');row.setAttribute('role','list');row.dataset.long=String(L.combo.sequence.length>=5);pips.setAttribute('role','img');msg.setAttribute('role','status');msg.setAttribute('aria-live','polite');
   L.boxes=L.combo.sequence.map(()=>{const b=make('span','academy-box');b.setAttribute('role','listitem');b.dataset.state='idle';row.append(b);return b;});
   L.pips=Array.from({length:L.validator.rules.repetitions},()=>{const p=make('i');pips.append(p);return p;});
   const actions={replay:()=>watch({runs:1}),slow:()=>watch({runs:1,slow:true}),turn,leave:()=>{if(L.phase==='pass')L.finish?.();else stop();}};
   const btn=(cls,act,text)=>{const b=make('button','academy-btn '+cls,text);b.type='button';b.dataset.act=act;b.onclick=()=>{b.blur();if(lesson===L)actions[act]();};return b;};
   L.ui={hud,row,bar,name,pips,msg,replay:btn('academy-icon','replay','↻'),slow:btn('academy-icon','slow','½×'),turn:btn('academy-primary','turn'),leave:btn('academy-icon','leave','✕')};
   bar.append(name,pips,msg,L.ui.replay,L.ui.slow,L.ui.turn,L.ui.leave);hud.append(row,bar);stage.append(hud);render();
  }
  function render(){
   const L=lesson;if(!L)return;const t=w(),u=L.ui,s=L.validator.state(),watching=L.phase==='watch',title=comboName(L.combo.id);
   u.hud.dir=app.lang==='he'?'rtl':'ltr';u.hud.lang=app.lang;u.hud.dataset.phase=L.phase;u.hud.setAttribute('aria-label',t.lesson+': '+title);
   L.boxes.forEach((b,i)=>{b.textContent=label(L.combo.sequence[i]);});u.row.setAttribute('aria-label',title);
   u.name.textContent=(L.index+1)+' · '+title;u.name.hidden=!watching;
   u.pips.hidden=watching&&!s.reps;u.pips.setAttribute('aria-label',fill(t.runs,{n:s.reps,total:s.required}));L.pips.forEach((p,i)=>{p.dataset.on=String(i<s.reps);p.textContent=i<s.reps?'✓':'';});
   const text=watching?'':L.say?.()||'';u.msg.textContent=text;u.msg.hidden=watching;u.msg.dataset.tone=L.tone;
   const again=watching?t.replay:t.again;u.replay.setAttribute('aria-label',again);u.replay.title=again;u.replay.hidden=L.phase==='pass';
   u.slow.setAttribute('aria-label',t.slow);u.slow.title=t.slow;u.slow.hidden=!watching;u.slow.setAttribute('aria-pressed',String(!!(L.demo?.slow&&!L.demo.finished)));
   u.turn.textContent=t.turn;u.turn.hidden=!watching;u.turn.dataset.ready=String(!!L.demo?.finished);
   u.leave.setAttribute('aria-label',t.leave);u.leave.title=t.leave;
  }
  function note(say,tone){const L=lesson;if(!L)return;L.say=say;L.tone=tone;render();}
  // Watch: the fighter throws the combo at real speed through the same input path the player uses.
  function watch(options={}){
   const L=lesson;if(!L||L.phase==='pass')return;L.phase='watch';L.pending=null;L.holdUntil=0;L.say=null;L.tone='';e.player.reset();e.speed=options.slow?.5:1;
   L.demo={slow:!!options.slow,runs:options.runs||(L.combo.sequence.length>3?1:2),run:0,fed:0,started:0,seen:null,rest:false,finished:false,wait:performance.now()+(options.delay??450)};
   document.body.classList.add('academy-watching');render();paint();
  }
  function demo(now){
   const L=lesson,d=L.demo,p=e.player,seq=L.combo.sequence;if(!d||d.finished||now<d.wait||document.hidden)return;
   if(d.rest){d.rest=false;d.fed=0;d.started=0;}
   while(d.fed<seq.length&&L.hook.raw.press(seq[d.fed]))d.fed++;
   const current=p.current;if(current&&current.id!==d.seen){d.seen=current.id;d.started=Math.min(seq.length,d.started+1);}
   if(d.fed===seq.length&&!p.current&&!p.queue.length){d.run++;d.wait=now+600;if(d.run<d.runs)d.rest=true;else{d.finished=true;e.speed=1;render();}}
  }
  // Repeat: only inputs the game really accepted are judged.
  function turn(){
   const L=lesson;if(!L||L.phase==='pass')return;L.demo=null;L.pending=null;L.phase='repeat';L.holdUntil=0;e.speed=1;e.player.reset();document.body.classList.remove('academy-watching');
   const first=L.validator.resume().first;note(()=>fill(w().tap,{move:label(first)}),'');paint();
  }
  function judge(ev){
   const L=lesson,now=performance.now();if(!L)return;
   if(ev.type==='step'){L.holdUntil=0;L.say=null;L.tone='';}
   else if(ev.type==='rep'){L.holdUntil=now+450;L.say=null;L.tone='';}
   else if(ev.type==='pass'){pass(ev);return;}
   else if(ev.type==='wrong'||ev.type==='slow'){L.pending=null;L.holdUntil=0;L.tone='miss';const {pressed,wanted}=ev;L.say=ev.type==='slow'?()=>w().late:()=>fill(w().wrong,{pressed:label(pressed),wanted:label(wanted)});
    // Several misses in a row: show the combo once more. Earned run-throughs stay.
    if(ev.rewatch)L.timers.push(setTimeout(()=>{if(lesson===L&&L.phase==='repeat')watch({runs:1,delay:300});},900));}
   else return;
   render();paint();
  }
  function pass(ev){
   const L=lesson;L.phase='pass';L.holdUntil=0;
   const result=store().gameAction({type:'lesson',comboId:L.combo.id,evidence:ev.evidence});
   L.say=()=>result.ok?w().passed:fill(w().saving,{error:result.error});L.tone=result.ok?'ok':'miss';render();paint();
   L.finish=()=>{if(lesson!==L)return;const comboId=L.combo.id;stop();shell()?.open('learn',{lessonResult:{...result,comboId}});};
   L.timers.push(setTimeout(L.finish,result.ok?1200:2600));
  }
  function paint(){
   const L=lesson;if(!L)return;const s=L.validator.state(),now=performance.now(),d=L.demo,seq=L.combo.sequence;let glow=null;
   L.boxes.forEach((b,i)=>{let state='idle';
    if(L.phase==='watch'){if(d&&(d.rest||d.finished&&now<d.wait))state='done';else if(d&&!d.finished&&d.started)state=i<d.started-1?'done':i===d.started-1?'live':'idle';}
    else if(L.phase==='pass'||now<L.holdUntil)state='done';
    else state=i<s.step?'done':i===s.step?'next':'idle';
    if(b.dataset.state!==state)b.dataset.state=state;const timed=state==='next'&&s.deadline!==null;if(b.dataset.timed!==String(timed))b.dataset.timed=String(timed);
    // Tempo cue: the bar under the next box drains until the move is due.
    if(timed)b.style.setProperty('--academy-left',Math.max(0,Math.min(1,(s.deadline-clock())/L.validator.rules.windowMs)).toFixed(3));});
   const flash=L.phase==='repeat'&&s.graceUntil!==null&&clock()<s.graceUntil?'miss':'';if(L.ui.row.dataset.flash!==flash)L.ui.row.dataset.flash=flash;
   // The real button for the move being shown (Watch) or expected next (Repeat) glows.
   if(L.phase==='repeat')glow=s.next;else if(L.phase==='watch'&&d&&!d.finished&&!d.rest&&d.started)glow=seq[d.started-1];
   const button=glow&&moveButton(glow);clearGlow(button);button?.classList.add('academy-next');
  }
  // Keep the HUD inside the free band above the move buttons, whatever the screen or theme.
  function fit(){
   const L=lesson,hud=L.ui.hud,box=stage.getBoundingClientRect(),tops=[...document.querySelectorAll('#manualControls .manual-move')].map(b=>b.getBoundingClientRect()).filter(r=>r.width&&r.height).map(r=>r.top);
   const room=Math.round((tops.length?Math.min(...tops):box.bottom)-box.top-12),key=room+'|'+Math.round(box.width);if(key===L.fitKey)return;L.fitKey=key;
   hud.style.maxHeight=Math.max(44,room)+'px';hud.dataset.wide=String(box.width>=640);
  }
  function stop(){
   const L=lesson;if(!L)return;lesson=null;for(const id of L.timers)clearTimeout(id);L.hook.restore();L.ui.hud.remove();document.body.classList.remove('academy-lesson','academy-watching');clearGlow();
   // Still on the lesson's training stage: hand back normal training exactly as it was.
   if(e.targetMode===L.mode){e.speed=L.speed;if(e.player?.enabled){e.player.reset();if(L.page&&L.page!=='moves'&&!shell()?.isModalOpen)window.manualControls?.setPage?.(L.page);}}
  }

  /* ---------- after a lesson: try the combo in a real fight ---------- */
  function tryInFight(comboId){
   const combo=GameDomain.combos.find(c=>c.id===comboId),game=shell();if(!combo||!game)return false;stop();endHint();
   try{game.startFight();}catch{return false;}
   window.manualControls?.setPage?.('combos');
   if(!store()?.game()?.combos.fight.includes(combo.id)||!e.player)return true;
   const pill=make('div','academy-hint');pill.setAttribute('role','status');pill.hidden=true;stage.append(pill);
   const h=hint={combo,pill,done:0};
   h.hook=hook({press:(id,raw)=>raw.press(id),combo:(id,raw)=>{const accepted=raw.combo(id);if(accepted&&hint===h&&id===combo.controllerId&&!h.done)h.done=performance.now();return accepted;}});
   run();return true;
  }
  function hintTick(now){
   const h=hint,match=e.arena?.fightView?.match;
   if(e.targetMode!=='fight'||!match||match.result||shell()?.isModalOpen||!e.player?.enabled||h.done&&now>h.done+2600||!h.pill.isConnected||!store()?.game()?.combos.fight.includes(h.combo.id)){endHint();return;}
   const button=!h.done&&match.phase==='round'?moveButton(h.combo.controllerId):null;clearGlow(button);button?.classList.add('academy-next');
   const text=h.done?fill(w().used,{name:comboName(h.combo.id)}):button?fill(w().use,{label:button.textContent}):'';
   if(h.pill.textContent!==text)h.pill.textContent=text;h.pill.hidden=!text;h.pill.dir=app.lang==='he'?'rtl':'ltr';h.pill.dataset.done=String(!!h.done);if(!text)return;
   // Sit under the fight header and page tabs, between the two button rails.
   const box=stage.getBoundingClientRect(),rect=n=>n?.getBoundingClientRect(),visible=r=>r&&r.width&&r.height;
   const above=['#fightHud','#fightHealth','.manual-pages'].map(sel=>rect(document.querySelector(sel))).filter(visible).map(r=>r.bottom);
   const buttons=[...document.querySelectorAll('#manualControls .manual-move')].map(rect).filter(visible),mid=box.left+box.width/2;
   const left=Math.max(box.left,...buttons.filter(r=>r.right<=mid).map(r=>r.right)),right=Math.min(box.right,...buttons.filter(r=>r.left>=mid).map(r=>r.left));
   h.pill.style.top=Math.round(Math.max(box.top,...above)-box.top+8)+'px';h.pill.style.left=Math.round((left+right)/2-box.left)+'px';h.pill.style.maxWidth=Math.max(96,Math.round(right-left-16))+'px';
  }
  function endHint(){const h=hint;if(!h)return;hint=null;h.hook.restore();h.pill.remove();clearGlow();}

  function tick(){
   const now=performance.now();
   if(lesson){const L=lesson,p=e.player;
    // Leaving in any way (dialog, another target or fight, Watch mode, a rewarded session, another fighter or player) ends the lesson cleanly.
    if(shell()?.isModalOpen||e.targetMode!==L.mode||!p?.enabled||e.career?.active||e.coach?.species!==L.species||store()?.current()?.id!==L.profileId||!L.ui.hud.isConnected)stop();
    else{if(app.lang!==L.lang){L.lang=app.lang;render();}
     if(currentPage()!=='moves'){window.manualControls?.setPage?.('moves');render();}
     if(L.phase==='watch')demo(now);else if(L.phase==='repeat'){buffered();const ev=lesson===L&&L.phase==='repeat'?L.validator.tick(clock()):null;if(ev)judge(ev);}
     if(lesson===L){paint();fit();}}}
   if(hint)hintTick(now);
   if(!lesson&&!hint&&timer){clearInterval(timer);timer=null;}
  }
  window.AcademyStage={start,stop,tryInFight,copy,get state(){const L=lesson;return L?{comboId:L.combo.id,phase:L.phase,demo:L.demo?{run:L.demo.run,runs:L.demo.runs,slow:L.demo.slow,finished:L.demo.finished}:null,...L.validator.state()}:hint?{comboId:hint.combo.id,phase:'fight',used:!!hint.done}:null;}};
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
