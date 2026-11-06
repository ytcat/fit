/* Direct boxing controls. Touch, keyboard and autoplay use the same rig/contact path. */
(() => {
 const labels={
  en:{auto:'Watch',manual:'Play',group:'Boxer control',lead:'Lead side',rear:'Rear side',ready:'Ready',bell:'Wait for the bell',recover:'Recovering',finished:'Bout finished',you:'You control',next:'Next',guard:'Guard',slip_left:'Slip left',slip_right:'Slip right',step_left:'Step left',step_right:'Step right',tap_lead:'Lead tap',tap_rear:'Rear tap',double_lead:'Lead double',double_rear:'Rear double',triple_lead:'Lead triple',triple_rear:'Rear triple'},
  he:{auto:'צפייה',manual:'משחק',group:'שליטה במתאגרף',lead:'צד קדמי',rear:'צד אחורי',ready:'מוכנים',bell:'ממתינים לפעמון',recover:'התאוששות',finished:'הקרב הסתיים',you:'אתם שולטים',next:'הבא',guard:'הגנה',slip_left:'התחמקות שמאלה',slip_right:'התחמקות ימינה',step_left:'צעד שמאלה',step_right:'צעד ימינה',tap_lead:'מכה קדמית',tap_rear:'מכה אחורית',double_lead:'כפול קדמי',double_rear:'כפול אחורי',triple_lead:'שלישייה קדמית',triple_rear:'שלישייה אחורית'},
  ru:{auto:'Смотреть',manual:'Играть',group:'Управление боксёром',lead:'Передняя',rear:'Задняя',ready:'Готов',bell:'Ждите гонга',recover:'Восстановление',finished:'Бой окончен',you:'Вы управляете',next:'Далее',guard:'Защита',slip_left:'Уклон влево',slip_right:'Уклон вправо',step_left:'Шаг влево',step_right:'Шаг вправо',tap_lead:'Передняя',tap_rear:'Задняя',double_lead:'Двойка передней',double_rear:'Двойка задней',triple_lead:'Тройка передней',triple_rear:'Тройка задней'}
 };
 const normal=[['jab','hook','uppercut','slip_left','roll','step_left'],['cross','rear_hook','rear_uppercut','slip_right','guard','step_right']];
 const speed=[['tap_lead','double_lead','triple_lead','slip_left','roll','step_left'],['tap_rear','double_rear','triple_rear','slip_right','guard','step_right']];
 const make=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
 function boot(){
  const app=window.app;if(!app||!window.BoxingInput)return;const e=app.engine;e.player=e.player||new BoxingInput(e);const input=e.player;
  const w=()=>labels[app.lang]||labels.en;
  const name=id=>w()[id]||window.COACH_TECHNIQUES?.[id]?.[{en:1,he:3,ru:5}[app.lang]||1]||id;
  const toggle=make('div','input-mode-switch');toggle.setAttribute('role','group');
  const auto=make('button',''),manual=make('button','');auto.type=manual.type='button';auto.id='watchMode';manual.id='playMode';toggle.append(auto,manual);document.querySelector('.club-stage-heading').append(toggle);
  const controls=make('div','manual-controls');controls.id='manualControls';const rails=[];
  for(let side=0;side<2;side++){const rail=make('div','manual-rail');rail.dataset.side=side?'rear':'lead';const title=make('span','manual-side-label');rail.append(title);controls.append(rail);rails.push({rail,title,buttons:[]});}
  const status=make('div','manual-status');status.id='manualStatus';status.setAttribute('aria-live','polite');controls.append(status);document.getElementById('stageContainer').append(controls);
  let lastKey='',lastSpeed;
  const press=id=>{if(input.press(id)){app.updatePlayBtnText();paint(true);window.clubInterface?.paint();}};
  function paint(force=false){
   const match=e.arena?.fightView?.match,action=match?.fighters[input.actor()]?.action||input.current,queue=match?.playerQueue||input.queue;
   const key=[app.lang,input.enabled,e.targetMode,e.coach?.species,e.isPlaying,action?.id,queue?.map(a=>a.input).join(','),match?.phase,match?.fighters[input.actor()]?.down,!!match?.result].join('|');
   if(!force&&key===lastKey)return;lastKey=key;
   const isSpeed=e.targetMode==='speed';
   if(lastSpeed!==isSpeed){
    const layout=isSpeed?speed:normal;
    rails.forEach(({rail,title,buttons},side)=>{buttons.length=0;rail.replaceChildren(title);for(const id of layout[side]){const b=make('button','manual-move');b.type='button';b.dataset.inputMove=id;b.onclick=()=>press(id);rail.append(b);buttons.push(b);}});lastSpeed=isSpeed;
   }
   document.body.classList.toggle('manual-active',input.enabled);controls.hidden=!input.enabled;
   toggle.setAttribute('aria-label',w().group);auto.textContent=w().auto;manual.textContent=w().manual;
   auto.setAttribute('aria-pressed',String(!input.enabled));manual.setAttribute('aria-pressed',String(input.enabled));manual.disabled=!e.coach||e.targetMode==='rope';
   rails.forEach(({title,buttons},side)=>{title.textContent=side?w().rear:w().lead;for(const b of buttons){b.textContent=name(b.dataset.inputMove);b.setAttribute('aria-label',name(b.dataset.inputMove));b.disabled=!input.canAct();b.dataset.active=String(action?.input===b.dataset.inputMove);}});
   const actor=({en:{lion:'Lion',rabbit:'Rabbit'},he:{lion:'אריה',rabbit:'ארנב'},ru:{lion:'Лев',rabbit:'Кролик'}}[app.lang]||{lion:'Lion',rabbit:'Rabbit'})[input.actor()];
   const state=match?.result?w().finished:match?.phase==='count'?w().recover:match&&match.phase!=='round'?w().bell:action?name(action.input||action.move):w().ready;
   status.textContent=w().you+' '+actor+' · '+state+(queue?.length?' · '+w().next+': '+name(queue[0].input||queue[0].move):'');
   if(input.enabled){document.getElementById('comboCodes').textContent='●';document.getElementById('comboCues').textContent=state;}
   window.trainingControls?.refresh?.();
  }
  auto.onclick=()=>{input.setEnabled(false);app.renderTechnique();paint(true);window.clubInterface?.paint();};
  manual.onclick=()=>{input.setEnabled(true);paint(true);window.clubInterface?.paint();};
  e.onInputState=()=>paint(true);
  const setLanguage=app.setLanguage.bind(app);app.setLanguage=lang=>{setLanguage(lang);paint(true);};
  document.addEventListener('keydown',event=>{
   if(!input.enabled||event.altKey||event.ctrlKey||event.metaKey||event.repeat||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)||event.target.isContentEditable)return;
   const keys=e.targetMode==='speed'?{'1':'tap_lead','2':'tap_rear','3':'double_lead','4':'double_rear','5':'triple_lead','6':'triple_rear'}:{'1':'jab','2':'cross','3':'hook','4':'rear_hook','5':'uppercut','6':'rear_uppercut'};
   const id=keys[event.key]||{ArrowLeft:'slip_left',ArrowRight:'slip_right',ArrowDown:'roll',ArrowUp:'guard',a:'step_left',d:'step_right'}[event.key];if(id){event.preventDefault();press(id);}
  });
  const fitViewport=()=>{const height=window.visualViewport?.height||window.innerHeight;if(Number.isFinite(height))document.documentElement.style.setProperty('--app-height',height+'px');};
  window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);fitViewport();
  window.addEventListener('shadowbox-ready',()=>paint(true));window.addEventListener('shadowbox-character',()=>{input.reset();paint(true);});
  setInterval(()=>paint(),120);paint(true);window.manualControls={paint,press};
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
