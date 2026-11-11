/* Direct boxing controls. Touch, keyboard and autoplay use the same rig/contact path. */
(() => {
 const labels={
  en:{auto:'Watch',manual:'Play',group:'Boxer control',lead:'Lead side',rear:'Rear side',ready:'Ready',bell:'Wait for the bell',recover:'Recovering',finished:'Bout finished',you:'You control',next:'Next',guard:'Guard',slip_left:'Slip left',slip_right:'Slip right',step_left:'Step left',step_right:'Step right',tap_lead:'Lead tap',tap_rear:'Rear tap',double_lead:'Lead double',double_rear:'Rear double',triple_lead:'Lead triple',triple_rear:'Rear triple'},
  he:{auto:'צפייה',manual:'משחק',group:'שליטה במתאגרף',lead:'צד קדמי',rear:'צד אחורי',ready:'מוכנים',bell:'ממתינים לפעמון',recover:'התאוששות',finished:'הקרב הסתיים',you:'אתם שולטים',next:'הבא',guard:'הגנה',slip_left:'התחמקות שמאלה',slip_right:'התחמקות ימינה',step_left:'צעד שמאלה',step_right:'צעד ימינה',tap_lead:'מכה קדמית',tap_rear:'מכה אחורית',double_lead:'כפול קדמי',double_rear:'כפול אחורי',triple_lead:'שלישייה קדמית',triple_rear:'שלישייה אחורית'},
  ru:{auto:'Смотреть',manual:'Играть',group:'Управление боксёром',lead:'Передняя',rear:'Задняя',ready:'Готов',bell:'Ждите гонга',recover:'Восстановление',finished:'Бой окончен',you:'Вы управляете',next:'Далее',guard:'Защита',slip_left:'Уклон влево',slip_right:'Уклон вправо',step_left:'Шаг влево',step_right:'Шаг вправо',tap_lead:'Передняя',tap_rear:'Задняя',double_lead:'Двойка передней',double_rear:'Двойка задней',triple_lead:'Тройка передней',triple_rear:'Тройка задней'}
 };
 Object.assign(labels.en,{moves:'Moves',combos:'Combos',defence:'Defence',high_guard:'High cover',body_guard:'Body cover',block_left:'Left cover',block_right:'Right cover',parry:'Catch',step_forward:'Step in',step_back:'Step out',combo_one_two:'1–2',combo_three:'1–2–3',combo_upper:'Upper–hook–cross',combo_counter:'Slip & counter',combo_roll:'Roll & return',combo_super:'Super burst',combo_speed_alternate:'Alternating four',combo_speed_doubles:'Two + two',combo_speed_triples:'Three + three',combo_speed_slip:'Three & slip',combo_speed_roll:'Four & roll',combo_speed_cover:'Four & cover',combo_more:'More',combo_loadout:'Choose combos'});
 Object.assign(labels.he,{moves:'מכות',combos:'שילובים',defence:'הגנה',high_guard:'הגנת ראש',body_guard:'הגנת גוף',block_left:'חסימה משמאל',block_right:'חסימה מימין',parry:'תפיסה',step_forward:'צעד פנימה',step_back:'צעד החוצה',combo_one_two:'1–2',combo_three:'1–2–3',combo_upper:'אפרקאט, הוק, קרוס',combo_counter:'התחמקות ותגובה',combo_roll:'גלגול ותגובה',combo_super:'רצף סופר',combo_speed_alternate:'ארבע לסירוגין',combo_speed_doubles:'שתיים ושתיים',combo_speed_triples:'שלוש ושלוש',combo_speed_slip:'שלוש והתחמקות',combo_speed_roll:'ארבע וגלגול',combo_speed_cover:'ארבע והגנה',combo_more:'עוד',combo_loadout:'בחירת שילובים'});
 Object.assign(labels.ru,{moves:'Удары',combos:'Серии',defence:'Защита',high_guard:'Защита головы',body_guard:'Защита корпуса',block_left:'Блок слева',block_right:'Блок справа',parry:'Встречный блок',step_forward:'Шаг вперёд',step_back:'Шаг назад',combo_one_two:'1–2',combo_three:'1–2–3',combo_upper:'Апперкот–хук–кросс',combo_counter:'Уклон и ответ',combo_roll:'Нырок и ответ',combo_super:'Суперсерия',combo_speed_alternate:'Четыре поочерёдно',combo_speed_doubles:'Два плюс два',combo_speed_triples:'Три плюс три',combo_speed_slip:'Три и уклон',combo_speed_roll:'Четыре и нырок',combo_speed_cover:'Четыре и блок',combo_more:'Ещё',combo_loadout:'Выбрать серии'});
 for(const [lang,word] of [['en','Burst'],['he','פרץ'],['ru','Рывок']])labels[lang].burst=word;
 const defence=[['high_guard','block_left','slip_left','roll','step_back','step_left'],['body_guard','block_right','slip_right','parry','step_forward','step_right']];
 const comboLayout=[['combo_one_two','combo_three','combo_upper'],['combo_counter','combo_roll','combo_super']];
 const speedCombos=[['combo_speed_alternate','combo_speed_doubles','combo_speed_triples'],['combo_speed_slip','combo_speed_roll','combo_speed_cover']];
 const normal=[['jab','hook','uppercut','slip_left','roll','step_left'],['cross','rear_hook','rear_uppercut','slip_right','guard','step_right']];
 const speed=[['tap_lead','double_lead','triple_lead','slip_left','roll','step_left'],['tap_rear','double_rear','triple_rear','slip_right','guard','step_right']];
 const make=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
 function boot(){
  const app=window.app;if(!app||!window.BoxingInput)return;const e=app.engine;e.player=e.player||new BoxingInput(e);const input=e.player;
  const w=()=>labels[app.lang]||labels.en;
  const name=id=>({en:{rope_boost:'Double under',rope_mix:'Mix footwork',rope_reset:'Easy rhythm'},he:{rope_boost:'סיבוב כפול',rope_mix:'רגליים משתנות',rope_reset:'קצב קל'},ru:{rope_boost:'Двойной оборот',rope_mix:'Смена ног',rope_reset:'Лёгкий ритм'}}[app.lang]?.[id])||w()[id]||window.COACH_TECHNIQUES?.[id]?.[{en:1,he:3,ru:5}[app.lang]||1]||id;
  const toggle=make('div','input-mode-switch');toggle.setAttribute('role','group');
  const auto=make('button',''),manual=make('button','');auto.type=manual.type='button';auto.id='watchMode';manual.id='playMode';toggle.append(auto,manual);document.querySelector('.club-stage-heading').append(toggle);
  const controls=make('div','manual-controls');controls.id='manualControls';const rails=[];
  for(let side=0;side<2;side++){const rail=make('div','manual-rail');rail.dataset.side=side?'rear':'lead';const title=make('span','manual-side-label');rail.append(title);controls.append(rail);rails.push({rail,title,buttons:[]});}
  const status=make('div','manual-status');status.id='manualStatus';status.setAttribute('aria-live','polite');controls.append(status);document.getElementById('stageContainer').append(controls);
  const supportsCombos=typeof input.canCombo==='function'&&typeof input.sequence==='function';let page=supportsCombos?'combos':'moves';const pages=make('div','manual-pages');pages.setAttribute('role','group');const pageButtons=[];
  for(const id of ['moves','combos','defence']){const b=make('button','');b.type='button';b.dataset.inputPage=id;b.onclick=()=>{page=id;paint(true);};pages.append(b);pageButtons.push(b);}
  document.querySelector('.club-view-tools')?.append(pages);
  let lastKey='',lastLayout,comboOffset=0;
  // At most three primary combo buttons: the equipped loadout (or the full drill set without the game layer), paged by More.
  const META=['ui_combo_more','ui_combo_loadout'],PRIMARY=3;
  function comboList(){if(e.targetMode==='speed')return speedCombos.flat();const all=comboLayout.flat(),g=window.ringfighterGame&&window.GameDomain&&e.career?.store.game();if(!g)return all;return g.combos[e.targetMode==='fight'?'fight':'training'].map(id=>GameDomain.combos.find(c=>c.id===id)?.controllerId).filter(id=>all.includes(id));}
  function comboPage(){const list=comboList();if(comboOffset>=list.length)comboOffset=0;const meta=[];if(list.length>PRIMARY)meta.push('ui_combo_more');if(window.ringfighterGame&&e.targetMode!=='speed')meta.push('ui_combo_loadout');return {list,visible:list.slice(comboOffset,comboOffset+PRIMARY),meta};}

  const press=id=>{if(id==='rope_boost'){const d=e.arena?.careerDrill,rate=CareerDrill.ropeDrills[d?.exercise]?.cadence||1.8,now=e.animTime,old=e.ropeTrick;if(!old||now>=old.start+3/rate)e.ropeTrick={kind:'double',start:(d?.start||0)+Math.ceil(((now-(d?.start||0))*rate)+.001)/rate};e.isPlaying=true;return;}if(id==='ui_combo_more'){const n=comboList().length;comboOffset=comboOffset+PRIMARY<n?comboOffset+PRIMARY:0;paint(true);return;}if(id==='ui_combo_loadout'){window.ringfighterGame?.open('lab');return;}const b=controls.querySelector('[data-input-move="'+id+'"]');if(b?.dataset.locked==='true'){window.ringfighterGame?.open('lab');return;}if(input.press(id)){app.updatePlayBtnText();paint(true);window.clubInterface?.paint();}};
  function paint(force=false){
   const ropeBusy=e.targetMode==='rope'&&e.ropeTrick&&e.animTime<e.ropeTrick.start+3/(CareerDrill.ropeDrills[e.arena?.careerDrill?.exercise]?.cadence||1.8);
   const match=e.arena?.fightView?.match,action=match?match.fighters[input.actor()]?.action:input.current,queue=match?.playerQueue||input.queue;
   const burst=match?.burstState?.(input.actor()),sequence=burst?.status==='active'?{id:'burst',step:burst.step,total:burst.total}:input.sequence?.(),pending=match?.pendingPlayerCombo?.id||input.queue.find(c=>c.combo?.step===1)?.combo.id;
   const key=[!!ropeBusy,JSON.stringify(e.career?.store.game()?.combos||{}),!!window.ringfighterGame?.isModalOpen,pending,page,comboOffset,sequence?.id,sequence?.step,app.lang,input.enabled,e.targetMode,e.coach?.species,e.isPlaying,action?.id,queue?.map(a=>a.input).join(','),match?.phase,match?.fighters[input.actor()]?.down,!!match?.result,burst?.status].join('|');
   if(!force&&key===lastKey)return;lastKey=key;
   const isSpeed=e.targetMode==='speed'?'speed':e.targetMode==='rope'?'rope':'';
   const combos=page==='combos'&&e.targetMode!=='rope'?comboPage():null,layoutKey=page+'|'+isSpeed+'|'+(combos?combos.visible.concat(combos.meta).join(','):'');
   controls.dataset.page=e.targetMode==='rope'?'rope':page;
   if(lastLayout!==layoutKey){
    const layout=e.targetMode==='rope'?[['rope_boost'],[]]:page==='defence'?defence:combos?[combos.visible,combos.meta]:isSpeed==='speed'?speed:normal;
    rails.forEach(({rail,title,buttons},side)=>{buttons.length=0;rail.replaceChildren(title);for(const id of layout[side]){const b=make('button','manual-move');b.type='button';b.dataset.inputMove=id;b.onclick=()=>press(id);if(META.includes(id))b.dataset.meta='true';rail.append(b);buttons.push(b);}});lastLayout=layoutKey;
   }
   document.body.classList.toggle('manual-active',input.enabled);controls.hidden=!input.enabled;
   pages.hidden=!input.enabled||!supportsCombos||e.targetMode==='rope';pages.setAttribute('aria-label',w().group);for(const b of pageButtons){b.textContent=w()[b.dataset.inputPage];b.setAttribute('aria-pressed',String(page===b.dataset.inputPage));}
   toggle.setAttribute('aria-label',w().group);auto.textContent=w().auto;manual.textContent=w().manual;
   auto.setAttribute('aria-pressed',String(!input.enabled));manual.setAttribute('aria-pressed',String(input.enabled));manual.disabled=!e.coach;
   rails.forEach(({title,buttons},side)=>{title.textContent=combos?(side?'':w().combos):side?w().rear:w().lead;title.hidden=!!combos&&side===1;for(const b of buttons){if(b.dataset.meta){const more=b.dataset.inputMove==='ui_combo_more',n=combos?.list.length||0;b.textContent=more?w().combo_more+' '+(Math.floor(comboOffset/PRIMARY)+1)+'/'+Math.ceil(n/PRIMARY):w().combo_loadout;b.setAttribute('aria-label',b.textContent);b.title='';b.dataset.locked='false';b.disabled=false;b.dataset.active='false';continue;}b.textContent=name(b.dataset.inputMove);b.setAttribute('aria-label',name(b.dataset.inputMove));const id=b.dataset.inputMove,unlock=window.ringfighterGame&&window.GameDomain?.combos.find(c=>c.controllerId===id),g=e.career?.store.game(),slot=e.targetMode==='fight'?'fight':'training',locked=unlock&&(!g?.combos.owned.includes(unlock.id)||!g.combos[slot].includes(unlock.id));b.dataset.locked=String(!!locked);b.title=locked?({en:'Equip this combination in your loadout',he:'בחרו את השילוב ברשימת המהלכים שלכם',ru:'Добавьте эту серию в свой набор'}[app.lang]||'Equip this combination in your loadout'):'';if(locked)b.textContent+=' · 🔒';b.disabled=id.startsWith('rope_')?!!ropeBusy:id.startsWith('combo_')?!input.canCombo?.():!input.canAct();b.dataset.active=String(action?.input===b.dataset.inputMove||sequence?.id===b.dataset.inputMove||pending===b.dataset.inputMove);}});
   const actor=({en:{lion:'Lion',rabbit:'Rabbit'},he:{lion:'אריה',rabbit:'ארנב'},ru:{lion:'Лев',rabbit:'Кролик'}}[app.lang]||{lion:'Lion',rabbit:'Rabbit'})[input.actor()];
   const state=ropeBusy?name('rope_boost'):match?.result?w().finished:match?.phase==='count'?w().recover:match&&match.phase!=='round'?w().bell:action?name(action.input||action.move):w().ready;
   status.textContent=w().you+' '+actor+' · '+(sequence?name(sequence.id)+' '+sequence.step+'/'+sequence.total+' · ':'')+state+(pending?' · '+w().next+': '+name(pending):queue?.length?' · '+w().next+': '+name(queue[0].input||queue[0].move):'');
   if(input.enabled){document.getElementById('comboCodes').textContent='●';document.getElementById('comboCues').textContent=state;}
   window.trainingControls?.refresh?.();
  }
  auto.onclick=()=>{input.setEnabled(false);app.renderTechnique();paint(true);window.clubInterface?.paint();};
  manual.onclick=()=>{input.setEnabled(true);paint(true);window.clubInterface?.paint();};
  e.onInputState=()=>paint(true);
  const setLanguage=app.setLanguage.bind(app);app.setLanguage=lang=>{setLanguage(lang);paint(true);};
  document.addEventListener('keydown',event=>{
   if(!input.enabled||event.altKey||event.ctrlKey||event.metaKey||event.repeat||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)||event.target.isContentEditable)return;
   const keys=e.targetMode==='rope'?{'1':'rope_boost'}:page==='combos'?Object.fromEntries(comboPage().visible.map((id,i)=>[String(i+1),id])):e.targetMode==='speed'?{'1':'tap_lead','2':'tap_rear','3':'double_lead','4':'double_rear','5':'triple_lead','6':'triple_rear'}:{'1':'jab','2':'cross','3':'hook','4':'rear_hook','5':'uppercut','6':'rear_uppercut'};
   const id=keys[event.key]||{ArrowLeft:'slip_left',ArrowRight:'slip_right',ArrowDown:'roll',ArrowUp:'guard',a:'step_left',d:'step_right',w:'step_forward',s:'step_back'}[event.key];if(id){event.preventDefault();press(id);}
  });
  const fitViewport=()=>{const height=window.visualViewport?.height||window.innerHeight;if(Number.isFinite(height))document.documentElement.style.setProperty('--app-height',height+'px');};
  window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);fitViewport();
  window.addEventListener('shadowbox-ready',()=>paint(true));window.addEventListener('shadowbox-character',()=>{input.reset();paint(true);});
  setInterval(()=>paint(),120);paint(true);window.manualControls={paint,press,setPage(value){if(['moves','combos','defence'].includes(value)){page=value;paint(true);}}};
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
