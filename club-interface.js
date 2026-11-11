/* A responsive club workspace around the existing practice and fight controllers. */
(() => {
 const copy={
  en:{club:'BOXING CLUB',gym:'Training gym',fight:'Fight night',eyebrow:'THE TRAINING ROOM',title:'Put in the work.',intro:'Find your rhythm. Make every round count.',fighter:'01 / YOUR BOXER',lion:'Lion',rabbit:'Rabbit',lionNote:'The original powerhouse',rabbitNote:'A fresh training partner',equipment:'02 / YOUR TRAINING',none:'Shadowbox',heavy:'Heavy bag',dummy:'Body dummy',speed:'Speed bag',partner:'Sparring',session:'03 / YOUR SESSION',note:'COACH’S NOTE',skills:'TECHNIQUE LIBRARY',settings:'Settings',live:'In motion',paused:'Paused',loading:'Getting your corner ready',stance:'Orthodox stance',front:'Front',side:'Side',back:'Back',view:'View',reset:'Reset view',space:'Space to pause',gymName:'The Foundry',arenaName:'Championship arena',arenaEyebrow:'UNDER THE LIGHTS',arenaTitle:'This is fight night.',arenaIntro:'Lion. Rabbit. One ring. Watch every exchange.',fightNote:'Autonomous bout · both fighters compete. Return to the gym to change your training boxer.',return:'Back to training',freeze:'Pause motion',play:'Resume motion',select:'Selected',error:'3D is unavailable. Enable WebGL and reload to enter the gym.',summary:'Watch the exchange, then inspect the judges’ scorecards.',keyHelp:'Keyboard shortcuts: Space pauses, 1–6 select punches, G returns to the gym, F opens fight setup.',idle:'Ready',show:'Show controls'},
  he:{club:'מועדון אגרוף',gym:'אולם האימונים',fight:'ערב קרבות',eyebrow:'חדר האימונים',title:'כל סיבוב קובע.',intro:'מוצאים קצב. עובדים על הטכניקה.',fighter:'01 / המתאגרף שלכם',lion:'אריה',rabbit:'ארנב',lionNote:'המאמן המקורי',rabbitNote:'שותף חדש לאימון',equipment:'02 / סוג האימון',none:'אגרוף צל',heavy:'שק כבד',dummy:'בובת גוף',speed:'שק מהירות',partner:'ספארינג',session:'03 / האימון שלכם',note:'טיפ מהמאמן',skills:'ספריית טכניקות',settings:'הגדרות',live:'בתנועה',paused:'מושהה',loading:'מכינים את הפינה שלכם',stance:'עמידה רגילה',front:'מקדימה',side:'מהצד',back:'מאחור',view:'זווית',reset:'איפוס תצוגה',space:'רווח להשהיה',gymName:'The Foundry',arenaName:'זירת האליפות',arenaEyebrow:'מתחת לאורות',arenaTitle:'הערב עולים לזירה.',arenaIntro:'אריה. ארנב. זירה אחת. כל חילוף נחשב.',fightNote:'קרב אוטונומי בין שני המתאגרפים. חזרו לאולם כדי לבחור מתאגרף לאימון.',return:'חזרה לאימון',freeze:'השהיית תנועה',play:'המשך תנועה',select:'נבחר',error:'תלת־ממד אינו זמין. הפעילו WebGL וטענו מחדש.',summary:'צפו בחילופים ובדקו את כרטיסי השופטים.',keyHelp:'רווח להשהיה, 1–6 לבחירת אגרוף, G לאולם, F לקרב.',idle:'מוכן',show:'הצגת אפשרויות'},
  ru:{club:'БОКСЁРСКИЙ КЛУБ',gym:'Тренировка',fight:'Вечер бокса',eyebrow:'ТРЕНИРОВОЧНЫЙ ЗАЛ',title:'Работай над собой.',intro:'Найди свой ритм. Цени каждый раунд.',fighter:'01 / ВАШ БОКСЁР',lion:'Лев',rabbit:'Кролик',lionNote:'Первый тренер клуба',rabbitNote:'Новый партнёр по залу',equipment:'02 / ВАША ТРЕНИРОВКА',none:'Бой с тенью',heavy:'Мешок',dummy:'Манекен',speed:'Груша',partner:'Спарринг',session:'03 / ВАШ РЕЖИМ',note:'СОВЕТ ТРЕНЕРА',skills:'БИБЛИОТЕКА ТЕХНИК',settings:'Настройки',live:'В движении',paused:'Пауза',loading:'Готовим ваш угол',stance:'Левосторонняя стойка',front:'Спереди',side:'Сбоку',back:'Сзади',view:'Ракурс',reset:'Сбросить вид',space:'Пробел — пауза',gymName:'The Foundry',arenaName:'Арена чемпионата',arenaEyebrow:'ПОД СВЕТОМ СОФИТОВ',arenaTitle:'Время выйти на ринг.',arenaIntro:'Лев. Кролик. Один ринг. Следите за каждым обменом.',fightNote:'Автоматический бой двух боксёров. Вернитесь в зал, чтобы сменить тренера.',return:'Назад в зал',freeze:'Пауза движения',play:'Продолжить',select:'Выбран',error:'3D недоступно. Включите WebGL и обновите страницу.',summary:'Следите за боем и изучайте судейские записки.',keyHelp:'Пробел — пауза, 1–6 — удары, G — зал, F — выбор боя.',idle:'Готов',show:'Показать настройки'}
 };
 for(const [lang,labels] of Object.entries({en:['Jump rope','Coach mitts'],he:['קפיצה בחבל','אימון כפפות'],ru:['Скакалка','Лапы тренера']})){copy[lang].rope=labels[0];copy[lang].pads=labels[1];}
 const paths={none:'M5 19l3-7 5-3 4 4 4-3M8 12L4 8m9 1 1-6m-4 13-4 6m9-7 4 7',heavy:'M12 2v4m-6 3 6-3 6 3M6 9h12v12H6zM6 13h12',dummy:'M9 8a4 4 0 1 1 6 0m-6 0-4 4 2 6h10l2-6-4-4M12 18v4m-6 0h12',speed:'M3 3h18M12 3v4c-1 5-5 6-5 10a5 5 0 0 0 10 0c0-4-4-5-5-10',rabbit:'M5 15l2-6 5 1 1 7-5 2zm14 0-2-6-5 1-1 7 5 2z',gym:'M3 21V8l9-5 9 5v13M7 21v-8h10v8M3 10h18',fight:'M3 7h18v14H3zM3 12h18M3 17h18M3 5v17m18-17v17',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2'};
 paths.rope='M5 7v5c0 11 14 11 14 0V7M3 3h4v5H3zM17 3h4v5h-4z';paths.pads='M6 4c-4 0-4 14 1 14s5-14-1-14zm12 0c-6 0-6 14-1 14s5-14 1-14M5 10h3m8 0h3';
 const icon=(name)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]?'<path d="'+paths[name]+'"/>':'')+'</svg>';
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text)n.textContent=text;return n;};
 function boot(){
  const app=window.app;if(!app||!window.trainingControls)return;const e=app.engine,w=()=>copy[app.lang]||copy.en;
  const byId=id=>document.getElementById(id),body=document.body,header=document.querySelector('header'),stage=byId('stageContainer'),footer=document.querySelector('footer');
  body.classList.add('club-app');header.classList.add('club-header');
  const brand=header.firstElementChild;brand.classList.add('club-brand');if(window.APP_VERSION){const sub=byId('appSubtitle');sub.dataset.version='v'+APP_VERSION.number;sub.title='Version '+APP_VERSION.number+' · '+APP_VERSION.date;}const mark=el('span','club-mark');mark.innerHTML='<img src="./assets/brand/logo-gloves.svg?v=2026111101" alt="" width="44" height="44" decoding="async">';brand.prepend(mark);
  const nav=el('nav','club-navigation');nav.setAttribute('aria-label','Main');const gymNav=el('button'),fightNav=el('button');gymNav.type=fightNav.type='button';nav.append(gymNav,fightNav);header.append(nav);
  const headTools=el('div','club-head-tools');headTools.append(byId('stageSound'),byId('openPracticeControls'));header.append(headTools);
  const workspace=el('div','club-workspace'),sidebar=el('aside','club-sidebar'),studio=el('div','club-studio');workspace.append(sidebar,studio);header.after(workspace);
  const hero=el('div','club-intro'),eyebrow=el('p','club-eyebrow'),title=el('h2'),intro=el('p','club-description');hero.append(eyebrow,title,intro);sidebar.append(hero);
  const characterSection=el('section','club-character-section'),characterHeading=el('h3','club-section-label');characterSection.append(characterHeading);
  const characterGrid=el('div','club-character-grid'),characterButtons={};
  for(const species of ['lion','rabbit']){
   const button=el('button','club-character');button.type='button';button.dataset.character=species;
   const img=el('img');img.src='./assets/club/'+species+'.svg';img.alt='';img.width=88;img.height=90;
   const name=el('strong'),small=el('span','club-character-caption'),check=el('span','club-check','✓');check.setAttribute('aria-hidden','true');button.append(img,name,small,check);button.onclick=()=>{if(e.roster?.select(species)){paint();window.trainingControls.refresh?.();}};characterButtons[species]={button,name,small};characterGrid.append(button);
  }
  characterSection.append(characterGrid);sidebar.append(characterSection);
  const equipmentSection=el('section','club-equipment-section'),equipmentHeading=el('h3','club-section-label'),equipmentGrid=el('div','club-equipment-grid'),equipmentButtons={};equipmentSection.append(equipmentHeading,equipmentGrid);sidebar.append(equipmentSection);
  let lastPractice='none';
  for(const mode of ['none','heavy','dummy','speed','rope','pads','rabbit']){
   const button=el('button','club-equipment');button.type='button';button.dataset.equipment=mode;const name=el('span');button.innerHTML=icon(mode);button.append(name);button.onclick=()=>{lastPractice=mode;window.trainingControls.chooseTarget(mode);paint();};equipmentButtons[mode]={button,name};equipmentGrid.append(button);
  }
  const session=el('section','club-session'),sessionHeading=el('h3','club-section-label');session.append(sessionHeading,byId('trainingBar'));sidebar.append(session);
  const tip=el('div','club-tip'),tipLabel=byId('biomechanicsLabel'),notes=byId('exerciseNotes');tip.append(tipLabel,notes);sidebar.append(tip);
  const fightInfo=el('div','club-fight-info'),fightMark=el('div','club-fight-mark','L  /  R'),fightInfoText=el('p'),returnButton=el('button','club-primary');returnButton.type='button';fightInfo.append(fightMark,fightInfoText,returnButton);sidebar.append(fightInfo);
  const stageHead=el('div','club-stage-heading'),locationBlock=el('div'),locationEyebrow=el('span','club-section-label'),locationTitle=el('h2'),status=el('span','club-status');status.id='sessionStatus';locationBlock.append(locationEyebrow,locationTitle);stageHead.append(locationBlock,status);studio.append(stageHead,stage);
  const rail=byId('techniqueBar');rail.setAttribute('aria-label',w().skills);
  const railLabel=el('div','club-rail-label');stage.append(railLabel);
  const viewTools=el('div','club-view-tools'),viewLabel=el('span','club-view-label'),cameraGroup=el('div','club-camera-group');
  for(const id of ['camFront','camSide','camBack'])cameraGroup.append(byId(id));
  const zoomGroup=el('div','club-zoom-group'),zoomOut=el('button','','−'),zoomIn=el('button','','+'),zoomFit=el('button','','Fit');zoomOut.id='zoomOut';zoomIn.id='zoomIn';zoomFit.id='zoomFit';
  for(const b of [zoomOut,zoomIn,zoomFit]){b.type='button';zoomGroup.append(b);}zoomOut.onclick=()=>e.viewControls?.zoom(1/1.2);zoomIn.onclick=()=>e.viewControls?.zoom(1.2);zoomFit.onclick=()=>e.viewControls?.fit();
  const stance=el('span','club-stance'),keyboard=el('span','club-keyboard');viewTools.append(viewLabel,cameraGroup,zoomGroup,stance,keyboard);studio.append(viewTools);
  const current=document.querySelector('.practice-current');current.classList.add('club-current');studio.append(current,footer);
  footer.classList.add('club-transport');const controls=byId('playBtn').parentElement;controls.prepend(byId('prevBtn'));controls.append(byId('nextBtn'));
  const loading=el('div','club-loading');loading.setAttribute('role','status');loading.innerHTML='<span class="club-loader"></span><p></p>';stage.append(loading);
  const selectedCamera=id=>{for(const key of ['camFront','camSide','camBack'])byId(key).setAttribute('aria-pressed',String(key===id));};selectedCamera('camFront');
  for(const id of ['camFront','camSide','camBack'])byId(id).addEventListener('click',()=>selectedCamera(id));
  const returnToGym=()=>{window.trainingControls.chooseTarget(lastPractice);paint();};gymNav.onclick=returnToGym;returnButton.onclick=returnToGym;
  fightNav.onclick=()=>{if(e.targetMode!=='fight')lastPractice=e.targetMode||'none';window.fightUI.configure();};
  const setLanguage=app.setLanguage.bind(app);app.setLanguage=lang=>{setLanguage(lang);paint();};
  const previousReady=e.onImpact;e.onImpact=hit=>{previousReady?.(hit);stage.classList.toggle('club-contact',!hit.blocked);clearTimeout(contactTimer);contactTimer=setTimeout(()=>stage.classList.remove('club-contact'),110);};let contactTimer;
  let previousMode,previousState;
  function paint(){
   const t=w(),mode=e.targetMode||'none',fight=mode==='fight',species=e.coach?.species||CoachRoster.preferred();
   if(previousMode!==undefined&&previousMode!==mode)selectedCamera(mode==='none'&&!e.viewControls?.yaw?'camFront':'');
   if(!fight)lastPractice=mode;
   body.dataset.scene=fight?'arena':'gym';body.dataset.training=mode;body.dataset.character=species;
   byId('appSubtitle').textContent=t.club;byId('appTitle').textContent='Glory of the Ring';
   gymNav.innerHTML=icon('gym')+'<span>'+t.gym+'</span>';fightNav.innerHTML=icon('fight')+'<span>'+t.fight+'</span>';gymNav.setAttribute('aria-pressed',String(!fight));fightNav.setAttribute('aria-pressed',String(fight));
   byId('openPracticeControls').innerHTML=icon('settings')+'<span>'+t.settings+'</span>';byId('openPracticeControls').setAttribute('aria-label',t.settings);byId('openPracticeControls').setAttribute('aria-haspopup','dialog');
   eyebrow.textContent=fight?t.arenaEyebrow:t.eyebrow;title.textContent=fight?t.arenaTitle:t.title;intro.textContent=fight?t.arenaIntro:t.intro;
   characterHeading.textContent=t.fighter;equipmentHeading.textContent=t.equipment;sessionHeading.textContent=t.session;tipLabel.textContent=t.note;
   for(const [key,v] of Object.entries(characterButtons)){v.name.textContent=t[key];v.small.textContent=t[key+'Note'];v.button.setAttribute('aria-pressed',String(key===species));v.button.disabled=!e.roster||fight;}
   for(const [key,v] of Object.entries(equipmentButtons)){v.name.textContent=key==='rabbit'?t.partner:t[key];v.button.setAttribute('aria-pressed',String(key===mode));v.button.disabled=!e.arena;}
   locationEyebrow.textContent=fight?t.fight:t.gym;locationTitle.textContent=fight?t.arenaName:t.gymName;
   status.textContent=!e.coach?t.loading:e.isPlaying?t.live:t.paused;status.dataset.playing=String(!!e.coach&&e.isPlaying);status.setAttribute('aria-label',status.textContent);
   railLabel.textContent=t.skills;viewLabel.textContent=t.view;stance.textContent=fight?'LION  /  RABBIT':t.stance;keyboard.textContent=t.space;keyboard.title=t.keyHelp;
   byId('camFront').textContent=t.front;byId('camSide').textContent=t.side;byId('camBack').textContent=t.back;
   const z=({en:['Zoom out','Zoom in','Fit view','Fit'],he:['הרחקה','קירוב','התאמת תצוגה','התאם'],ru:['Отдалить','Приблизить','Вписать вид','Вписать']})[app.lang]||['Zoom out','Zoom in','Fit view','Fit'];for(const [i,b] of [zoomOut,zoomIn,zoomFit].entries()){b.title=z[i];b.setAttribute('aria-label',z[i]);}zoomFit.textContent=z[3];
   byId('playBtn').setAttribute('aria-pressed',String(e.isPlaying));byId('playBtn').dataset.playing=String(e.isPlaying);byId('motionPause').textContent=e.isPlaying?t.freeze:t.play;
   byId('defaultCoach').textContent=t.lion;returnButton.textContent=t.return;fightInfoText.textContent=e.player?.enabled?({en:'You control your selected boxer. The opponent attacks and defends independently.',he:'אתם שולטים במתאגרף שבחרתם. היריב תוקף ומתגונן באופן עצמאי.',ru:'Вы управляете выбранным боксёром. Противник атакует и защищается самостоятельно.'}[app.lang]):t.fightNote;fightInfo.hidden=!fight;
   loading.hidden=!!e.coach||!!byId('renderingNotice');loading.querySelector('p').textContent=e.loadError?({en:'The boxer could not load. Reload to try again.',he:'טעינת המתאגרף נכשלה. טענו מחדש כדי לנסות שוב.',ru:'Боксёр не загрузился. Обновите страницу.'}[app.lang]):t.loading;
   loading.classList.toggle('has-error',!!e.loadError);
   if(byId('renderingNotice'))byId('renderingNotice').textContent=t.error;
   for(const b of rail.querySelectorAll('[data-technique]')){b.setAttribute('aria-pressed',String(b.dataset.technique===e.technique||b.dataset.technique==='combo'&&['freestyle','random'].includes(e.technique)));}
   byId('equipmentBtn').setAttribute('tabindex','-1');
   e.world?.update(e.animTime,mode);
   previousMode=mode;previousState=[app.lang,e.coach?.species,e.isPlaying,e.technique,e.speed,e.speedDrill,!!e.coach].join('|');
  }
  const rafPaint=()=>{const state=[app.lang,e.coach?.species,e.isPlaying,e.technique,e.speed,e.speedDrill,!!e.coach].join('|');if(previousMode!==(e.targetMode||'none')||state!==previousState)paint();};
  setInterval(rafPaint,180);window.addEventListener('shadowbox-ready',paint);window.addEventListener('shadowbox-load-error',paint);window.addEventListener('shadowbox-character',paint);
  document.addEventListener('keydown',event=>{
   if(event.altKey||event.ctrlKey||event.metaKey||event.repeat||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)||event.target.isContentEditable)return;
   if(event.code==='Space'){event.preventDefault();app.toggle();paint();}
   else if(event.key.toLowerCase()==='g')returnToGym();
   else if(event.key.toLowerCase()==='f')fightNav.click();
   else if(!e.player?.enabled&&!['fight','speed'].includes(e.targetMode)){const move={'1':'jab','2':'cross','3':'hook','4':'rear_hook','5':'uppercut','6':'rear_uppercut'}[event.key];if(move)rail.querySelector('[data-technique="'+move+'"]')?.click();}
  });
  // Persist only preferences. A refresh never resumes a stale fight or hidden timer.
  for(const id of ['langEN','langHE','langRU'])byId(id).addEventListener('click',()=>{try{localStorage.setItem('shadowbox-language',app.lang);}catch(_){}});
  try{const lang=localStorage.getItem('shadowbox-language');if(copy[lang])app.setLanguage(lang);}catch(_){}
  paint();
  window.clubInterface={paint,returnToGym};
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
