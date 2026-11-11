/* GOTR-0005 Burst control: one button with a charge ring, shown in fights in Play and Watch.
   It only reads the match (BoxingFight.burstState) and gives one order (BoxingFight.requestBurst);
   the engine decides when it starts (next action boundary) and plays it through the normal punch pipeline. */
(() => {
 const TIP_KEY='gotr-burst-tip';
 const WORDS={
  en:{burst:'Burst',charging:'Charging',bell:'After bell',down:'Knockdown',round:'Round over',bout:'Bout over',paused:'Paused',ordered:'Ordered',queued:'Queued',active:'Bursting',tip:'Burst ready — tap to unleash',label:'Burst: a fast, hard run of punches. Fills from clean hits, defences and time; leaves you open for a moment',ready:'Burst ready'},
  he:{burst:'פרץ',charging:'נטען',bell:'אחרי הפעמון',down:'נוקדאון',round:'הסיבוב נגמר',bout:'הקרב נגמר',paused:'מושהה',ordered:'ניתנה פקודה',queued:'בתור',active:'פורץ!',tip:'הפרץ מוכן — הקישו לשחרור',label:'פרץ: רצף מכות מהיר וחזק. מתמלא ממכות נקיות, הגנות וזמן; משאיר אתכם חשופים לרגע',ready:'הפרץ מוכן'},
  ru:{burst:'Рывок',charging:'Заряд',bell:'После гонга',down:'Нокдаун',round:'Раунд окончен',bout:'Бой окончен',paused:'Пауза',ordered:'Приказ дан',queued:'В очереди',active:'Рывок!',tip:'Рывок готов — нажмите, чтобы выпустить',label:'Рывок: быстрая сильная серия ударов. Заряжается от чистых попаданий, защиты и времени; после него вы ненадолго открыты',ready:'Рывок готов'}
 };
 const svg=d=>'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+d+'</svg>';
 const ICONS={
  bolt:svg('<path d="M13.5 2 5 13.2h5.6L9.4 22l9.1-12.1h-5.8z" fill="currentColor"/>'),
  bell:svg('<path d="M12 3a5.5 5.5 0 0 0-5.5 5.5v3.7L4.8 15.6c-.3.6.1 1.4.8 1.4h12.8c.7 0 1.1-.8.8-1.4l-1.7-3.4V8.5A5.5 5.5 0 0 0 12 3z" fill="currentColor"/><path d="M9.8 19a2.3 2.3 0 0 0 4.4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  pause:svg('<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/>'),
  down:svg('<path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  over:svg('<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/>')
 };
 // Pure mapping from engine state + screen state to what the button shows (exported for tests).
 function view(state,{paused=false,watch=false}={}){
  if(!state)return null;const s=state.status;
  const reason=s==='over'?(state.final?'bout':'round'):s==='bell'?'bell':s==='down'?'down':paused&&s!=='active'?'paused':s==='queued'?(watch?'ordered':'queued'):s==='active'?'active':s==='ready'?'ready':'charging';
  const icon={bout:'over',round:'over',bell:'bell',down:'down',paused:'pause'}[reason]||'bolt';
  const fill=reason==='ready'||reason==='queued'||reason==='ordered'?1:reason==='active'?Math.max(0,1-state.step/state.total):Math.max(0,Math.min(1,state.charge||0));
  return {reason,icon,fill,enabled:reason==='ready',caption:reason==='ready'?'burst':reason};
 }
 function boot(){
  const app=window.app,e=app?.engine,stage=document.getElementById('stageContainer');if(!e||!stage)return;
  const w=()=>WORDS[app.lang]||WORDS.en;
  const button=document.createElement('button');button.type='button';button.id='burstControl';button.className='burst-control';button.hidden=true;
  const meter=document.createElement('span');meter.className='burst-meter';meter.setAttribute('aria-hidden','true');
  const caption=document.createElement('span');caption.className='burst-caption';button.append(meter,caption);
  const tip=document.createElement('div');tip.className='burst-tip';tip.id='burstTip';tip.setAttribute('role','status');tip.hidden=true;
  stage.append(button,tip);
  let last='',tipTimer=0,tipShown=false;try{tipShown=window.localStorage.getItem(TIP_KEY)==='1';}catch{/* Private mode: tip may repeat per session. */}
  const match=()=>e.targetMode==='fight'&&e.arena?.mode==='fight'?e.arena.fightView?.match:null;
  const actor=()=>e.player?.actor?.()||(e.coach?.species==='rabbit'?'rabbit':'lion');
  const suspended=()=>!!(e.fightIQDemo||stage.classList.contains('game-preview-live'));
  function hideTip(){tip.hidden=true;clearTimeout(tipTimer);}
  function showTip(){if(tipShown)return;tipShown=true;try{window.localStorage.setItem(TIP_KEY,'1');}catch{/* Not persisted. */}tip.textContent=w().tip;tip.hidden=false;clearTimeout(tipTimer);tipTimer=setTimeout(hideTip,5000);}
  function paint(){
   const m=match(),state=m&&!suspended()?m.burstState?.(actor()):null,v=view(state,{paused:!e.isPlaying,watch:!e.player?.enabled});
   const key=v?[v.reason,Math.round(v.fill*50),app.lang,v.icon].join('|'):'hidden';if(key===last)return v;last=key;
   button.hidden=!v;document.body.classList.toggle('burst-visible',!!v);if(!v){hideTip();return v;}
   const words=w();button.dataset.state=v.reason;button.disabled=!v.enabled;button.style.setProperty('--burst-fill',v.fill.toFixed(3));
   meter.innerHTML=ICONS[v.icon];caption.textContent=words[v.caption];
   button.setAttribute('aria-label',(v.enabled?words.ready:words.burst+' · '+words[v.caption]+(v.reason==='charging'?' '+Math.round(v.fill*100)+'%':''))+'. '+words.label);button.title=words.label;
   if(v.reason==='ready')showTip();else if(!tip.hidden&&v.reason!=='ready')hideTip();
   return v;
  }
  function press(){
   const m=match();if(!m||suspended()||!e.isPlaying)return false;const ok=m.requestBurst?.(actor());hideTip();
   if(ok){e.lastRenderStamp=null;e.onInputState?.();}paint();return ok;
  }
  button.addEventListener('click',press);
  document.addEventListener('keydown',event=>{
   if(event.altKey||event.ctrlKey||event.metaKey||event.repeat||event.key?.toLowerCase()!=='b'||document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)||event.target.isContentEditable||button.hidden)return;
   event.preventDefault();press();
  });
  const setLanguage=app.setLanguage.bind(app);app.setLanguage=lang=>{setLanguage(lang);last='';if(!tip.hidden)tip.textContent=w().tip;paint();};
  setInterval(paint,100);paint();
  window.burstControl={paint,press,view:state=>view(state),resetTip(){tipShown=false;try{window.localStorage.removeItem(TIP_KEY);}catch{/* ignore */}}};
 }
 window.BurstUI={view,WORDS};
 if(typeof document==='undefined')return;
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
