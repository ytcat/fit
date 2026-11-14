/* Compact fight HUD and transparent judge cards. */
(() => {
 const words={
 en:{fight:'Fight mode',choose:'Choose a bout',three:'Three-round exhibition',club:'Club bout · 4 rounds',six:'Six-round bout',title:'Title bout · 12 rounds',exhibition:'Quick exhibition · 3 rounds',real:'3 min per round · 1 min rest · 3 judges',quick:'1 min per round · 15 sec rest · shortened exhibition',start:'Start a new fight',close:'Close',round:'Round',rest:'Corner break',intro:'Fighters ready',count:'Knockdown count',cards:'Scorecards',waiting:'Judges’ scorecards',lion:'Lion',rabbit:'Rabbit',winner:'won',draw:'Draw',unanimous:'unanimous decision',split:'split decision',majority:'majority decision',TKO:'referee stoppage',details:'Round-by-round details',new:'New fight',judge:'Judge',pending:'Awaiting the decision',scoring:'Head/body contacts score. Glove and shoulder contacts do not.',stats:'Clean head / body · blocked · thrown',stoppage:'Scores through stoppage; TKO decides the result.'},
 he:{fight:'מצב קרב',choose:'בחירת קרב',three:'קרב ראווה · 3 סיבובים',club:'קרב מועדון · 4 סיבובים',six:'קרב של 6 סיבובים',title:'קרב אליפות · 12 סיבובים',exhibition:'קרב ראווה קצר · 3 סיבובים',real:'3 דקות לסיבוב · דקת מנוחה · 3 שופטים',quick:'דקה לסיבוב · 15 שניות מנוחה · קרב ראווה מקוצר',start:'התחלת קרב חדש',close:'סגירה',round:'סיבוב',rest:'מנוחה בפינה',intro:'הלוחמים מוכנים',count:'ספירת נוקדאון',cards:'ניקוד השופטים',waiting:'כרטיסי השופטים',lion:'אריה',rabbit:'ארנב',winner:'מנצח',draw:'תיקו',unanimous:'החלטה פה אחד',split:'החלטה חצויה',majority:'החלטת רוב',TKO:'עצירת השופט',details:'פירוט לפי סיבוב',new:'קרב חדש',judge:'שופט',pending:'ממתינים להכרעה',scoring:'פגיעות בראש ובגוף מזכות בניקוד. פגיעות בכפפה ובכתף אינן מזכות בניקוד.',stats:'ראש / גוף · חסימות · אגרופים',stoppage:'ניקוד עד העצירה; הניצחון נקבע בעצירת השופט.'},
 ru:{fight:'Режим боя',choose:'Выберите бой',three:'Показательный бой · 3 раунда',club:'Клубный бой · 4 раунда',six:'Бой на 6 раундов',title:'Титульный бой · 12 раундов',exhibition:'Короткий бой · 3 раунда',real:'3 мин раунд · 1 мин отдых · 3 судьи',quick:'1 мин раунд · 15 сек отдых · показательный бой',start:'Начать новый бой',close:'Закрыть',round:'Раунд',rest:'Перерыв',intro:'Бойцы готовы',count:'Отсчёт нокдауна',cards:'Судейские записки',waiting:'Записки судей',lion:'Лев',rabbit:'Кролик',winner:'побеждает',draw:'Ничья',unanimous:'единогласное решение',split:'раздельное решение',majority:'решение большинства',TKO:'остановка рефери',details:'Подробности по раундам',new:'Новый бой',judge:'Судья',pending:'Ожидание решения',scoring:'Очки за попадания в голову и корпус. Перчатки и плечи не дают очков.',stats:'Голова / корпус · блоки · удары',stoppage:'Записки до остановки; результат решён техническим нокаутом.'}
 };
 Object.assign(words.en,{quickfight:'Quick fight · 1 minute',quickhelp:'One 60-second round · health damage · knockout or draw',KO:'Knockout',health:'health decision'});
 Object.assign(words.he,{quickfight:'קרב מהיר · דקה אחת',quickhelp:'סיבוב אחד של דקה · מד חיים · נוקאאוט או תיקו',KO:'KO',health:'הכרעה לפי מד חיים'});
 Object.assign(words.ru,{quickfight:'Быстрый бой · 1 минута',quickhelp:'Один раунд 60 секунд · здоровье · нокаут или ничья',KO:'KO',health:'по здоровью'});
 Object.assign(words.en,{judges:'Judges'});Object.assign(words.he,{judges:'שופטים'});Object.assign(words.ru,{judges:'Судьи'});
 // GOTR-0076: the corner break (20 s) and its skip button
 Object.assign(words.en,{restNext:'Corner break · next round',clubhelp:'20-second corner break',skipBreak:'Skip break'});Object.assign(words.he,{restNext:'מנוחה בפינה · הסיבוב הבא',clubhelp:'הפסקה בפינה של 20 שניות',skipBreak:'דילוג על ההפסקה'});Object.assign(words.ru,{restNext:'Перерыв · следующий раунд',clubhelp:'Перерыв в углу 20 секунд',skipBreak:'Пропустить перерыв'});
 for(const lang of ['en','he','ru'])Object.assign(words[lang],lang==='en'?{quickfight:'20 seconds',quickhelp:'One short round',six:'40 seconds',title:'60 seconds',club:'2 × 20 seconds',real:'10-second corner breaks',quick:'20-second rounds · 10-second breaks'}:lang==='he'?{quickfight:'20 שניות',quickhelp:'סיבוב קצר אחד',six:'40 שניות',title:'60 שניות',club:'2 × 20 שניות',real:'10 שניות מנוחה',quick:'סיבובים של 20 שניות'}:{quickfight:'20 секунд',quickhelp:'Один короткий раунд',six:'40 секунд',title:'60 секунд',club:'2 × 20 секунд',real:'Перерыв 10 секунд',quick:'Раунды по 20 секунд'});
 const clock=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 function boot(){
  const app=window.app;if(!app)return;const e=app.engine,w=()=>words[app.lang]||words.en,make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text)n.textContent=text;return n;};
  const hud=make('div','fight-hud');hud.id='fightHud';hud.hidden=true;hud.setAttribute('role','status');
  const health=make('div','fight-health');health.id='fightHealth';health.hidden=true;health.setAttribute('role','group');document.getElementById('stageContainer').append(health);
  // Broadcast HUD (styled by fight-hud.css): each corner is built once so the damage trail and hit flash can animate between renders.
  const corners={};for(const actor of ['lion','rabbit']){const player=make('div','fight-health-player'),head=make('div','fight-health-head'),label=make('span','fight-health-label'),value=make('span','fight-health-value'),track=make('div','fight-health-track'),trail=make('div','fight-health-trail'),fill=make('div','fight-health-fill');
   player.dataset.corner=actor==='lion'?'red':'blue';label.setAttribute('dir','auto');value.setAttribute('aria-hidden','true');track.setAttribute('role','progressbar');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
   track.append(trail,fill);head.append(label,value);player.append(head,track);corners[actor]={player,label,value,track,trail,fill,last:null,hit:'a'};}
  const versus=make('span','fight-health-vs','VS');health.append(corners.lion.player,versus,corners.rabbit.player,hud);
  const banner=make('div','fight-knockout');banner.id='fightKnockout';banner.hidden=true;document.getElementById('stageContainer').append(banner);
  // GOTR-0076: during the corner break a button jumps straight to the next round (fight-corner.js clears the corner).
  const skip=make('button','fight-skip-break');skip.type='button';skip.hidden=true;skip.onclick=()=>{const m=e.arena?.fightView?.match;if(m?.phase==='rest'){m.phaseTime=Math.max(m.phaseTime,m.restSeconds);e.lastRenderStamp=null;}};document.getElementById('stageContainer').append(skip);
  if(document.head?.append&&!document.getElementById('fightSkipBreakStyle')){const css=make('style');css.id='fightSkipBreakStyle';css.textContent='.fight-skip-break{position:absolute;left:12px;top:96px;z-index:25;padding:7px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(15,20,30,.72);color:#fff;font:700 13px/1.1 system-ui,sans-serif;letter-spacing:.02em;backdrop-filter:blur(6px);cursor:pointer}.fight-skip-break[hidden]{display:none}[dir=rtl] .fight-skip-break{left:auto;right:12px}';document.head.append(css);}
  const panel=make('section','fight-results');panel.id='fightResults';panel.hidden=true;document.querySelector('footer').prepend(panel);
  function dialog(title){const d=make('dialog','training-dialog fight-dialog'),head=make('div','practice-control-heading');head.append(make('h2','',title));const close=make('button','', '×');close.type='button';close.setAttribute('aria-label',w().close);close.onclick=()=>d.close();head.append(close);d.append(head);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();return d;}
  function configure(){
   const d=dialog(w().choose),grid=make('div','routine-grid');
   for(const preset of ['quick','six','title','club']){const b=make('button','routine-choice');b.type='button';b.dataset.fightPreset=preset;b.append(make('strong','',preset==='quick'?w().quickfight:w()[preset]),make('span','',preset==='quick'?w().quickhelp:preset==='club'?w().clubhelp:preset==='exhibition'?w().quick:w().real));b.onclick=()=>{e.fightOptions={preset,seed:Math.floor(Math.random()*4294967296)};if(e.player&&!e.player.enabled)e.player.setEnabled(true);e.animTime=0;e.targetMode='fight';e.technique='fight';e.speed=1;e.isPlaying=true;window.trainingControls.chooseTarget('fight');d.close();};grid.append(b);}d.append(grid);
  }
  const labels=view=>window.GameIdentity?.labels(view)||w();
  function detail(view=e.arena?.fightView){
   if(!view)return;const m=view.match,d=dialog(w().cards);d.append(make('p','fight-note',labels(view).lion+' — '+labels(view).rabbit));d.append(make('p','fight-note',w().scoring));
   const table=make('table','fight-score-table'),head=make('tr');for(const t of [w().round,w().judge+' 1',w().judge+' 2',w().judge+' 3'])head.append(make('th','',t));table.append(head);
   for(let i=0;i<m.cards[0].rounds.length;i++){const row=make('tr');row.append(make('th','',String(i+1)));for(const card of m.cards)row.append(make('td','',card.rounds[i].scores.join(' – ')));table.append(row);}d.append(table);
   for(const actor of ['lion','rabbit']){const t=m.totals[actor];d.append(make('p','fight-note',labels(view)[actor]+': '+t.head+' / '+t.body+' · '+t.blocked+' · '+t.thrown));}d.append(make('p','fight-note',w().stats));
  }
  // A story fight: flagged by the story (oldtown.js), or a bout on the gym floor (GOTR-0083 place 'gym', only the story starts one).
  const story=view=>!!(view.storyFight||view.gymFight);
  let last='';
  function render(view){
   const m=view.match,s=m.snapshot(),key=[labels(view).lion,labels(view).rabbit,app.lang,s.phase,s.round,Math.ceil(s.remaining),Math.ceil(s.restRemaining),s.count,s.cardsShown,s.totals.lion.landed,s.totals.rabbit.landed,s.health?.lion,s.health?.rabbit,!!view.storyFight,story(view),!!s.finisher?.hold].join('|');if(last===key)return;last=key;
   health.hidden=false;health.setAttribute('aria-label',labels(view).lion+' VS '+labels(view).rabbit);
   for(const actor of ['lion','rabbit']){const bar=corners[actor],value=Math.max(0,Math.min(100,s.health?.[actor]??100)),shown=String(Math.ceil(value)),name=labels(view)[actor];
    bar.label.textContent=name;bar.value.textContent=shown;bar.track.setAttribute('aria-label',name+' · '+shown);bar.track.setAttribute('aria-valuenow',String(Math.round(value)));bar.track.setAttribute('aria-valuetext',shown);
    bar.fill.setAttribute('style','width:'+value+'%');bar.trail.setAttribute('style','width:'+value+'%');
    // A drop in reported health restarts the short hit flash; the values themselves are shown untouched.
    if(bar.last!=null&&value<bar.last){bar.hit=bar.hit==='a'?'b':'a';bar.player.dataset.hit=bar.hit;}bar.last=value;bar.player.dataset.low=String(value<=25);bar.player.dataset.out=String(value<=0);}
   banner.hidden=!(s.result?.stoppage==='KO')||!!s.finisher?.hold;banner.textContent=s.result?.winner?w().KO.toUpperCase()+' · '+labels(view)[s.result.winner]+' '+w().winner:w().KO.toUpperCase()+' · '+w().draw;
   const round=s.phase==='round',status=round?w().round+' '+s.round+'/'+s.rounds:s.phase==='rest'?(w().restNext||w().rest):s.phase==='count'?w().count:s.phase==='intro'?w().intro:s.phase==='scoring'?w().pending:'',time=round?clock(s.remaining):s.phase==='rest'?clock(s.restRemaining):s.phase==='count'?String(s.count):'';
   skip.hidden=!(s.phase==='rest'&&m.restSeconds>0&&!s.result);skip.textContent=w().skipBreak;
   hud.hidden=!status;hud.dataset.phase=s.phase;hud.replaceChildren(make('span','fight-hud-phase',status));if(time)hud.append(make('span','fight-hud-sr',' · '),make('span','fight-hud-clock',time));
   if(round)for(const actor of ['lion','rabbit']){const score=make('span','fight-hud-score');score.dataset.corner=actor==='lion'?'red':'blue';score.append(make('span','fight-hud-sr',' · '+labels(view)[actor]+' '),make('span','fight-hud-num',String(s.totals[actor].landed)));hud.append(score);}
   const before=panel.hidden;panel.hidden=!s.result||!!s.finisher?.hold;/* GOTR-0088: the result waits for the Sunday Punch knockout to play out */document.body?.classList?.toggle?.('fight-over',!!s.result);if(before!==panel.hidden)window.dispatchEvent?.(new Event('resize'));if(!s.result)return;panel.replaceChildren();
   const title=s.phase==='ceremony'?(s.result.winner?labels(view)[s.result.winner]+' '+w().winner+' · '+w()[s.result.decision]:w().draw):w().waiting;
   // GOTR-0075: the judges' cards only when the bout goes to the cards (points decision or draw); a KO/TKO/stoppage shows the
   // winner line alone. The cards are three score cards at one side of the scene and the buttons sit in the bottom band (stage-hud.css).
   const onCards=s.result.stoppage==='points';panel.dataset.cards=String(onCards);panel.append(make('strong','fight-result-title',title));
   if(onCards){const cards=make('div','fight-card-grid');cards.setAttribute('aria-label',w().judges);for(const [i,card] of s.result.cards.entries()){const cell=make('div','fight-card');cell.append(make('span','',w().judge+' '+(i+1)),make('strong','',i<s.cardsShown?card.totals.join(' – '):'•• – ••'));cards.append(cell);}panel.append(cards);}
   if(s.result.method==='TKO')panel.append(make('p','fight-note',w().stoppage));
   const actions=make('div','fight-result-actions'),details=make('button','workout-tool',w().details),again=make('button','workout-tool',w().new);details.onclick=()=>detail(view);again.onclick=configure;if(story(view))actions.append(details);else actions.append(details,again);panel.append(actions); // a story fight goes on with the story's own Next button; New fight only in free fights
  }
  function hide(){hud.hidden=panel.hidden=health.hidden=banner.hidden=skip.hidden=true;document.body?.classList?.toggle?.('fight-over',false);last='';for(const actor in corners)corners[actor].last=null;}
  e.onFightEvent=event=>{if(event.type==='announcement')app.audio.applause?.();else app.audio.bell(event.type==='final-bell'?'final':event.kind||'start');};
  window.fightUI={configure,detail,render,hide,words:()=>w()};
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
