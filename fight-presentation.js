/* Match-driven announcements; one audible tick per round second, never on pause. */
(() => {
 // Announcement words in EN/HE/RU (GOTR-0046). VS and KO are glossary terms and stay in English.
 const words={
  en:{lion:'Lion',rabbit:'Rabbit',vs:'vs',round:'ROUND',ready:'GET READY',fight:'Fight',rest:'Break',next:'NEXT ROUND IN {n}s',wins:'{name} Wins',draw:'Draw',final:'FINAL RESULT',last:'FINAL SECONDS',ko:'KO'},
  he:{lion:'אריה',rabbit:'ארנב',vs:'\u2068VS\u2069',round:'סיבוב',ready:'היכונו',fight:'קרב!',rest:'הפסקה',next:'הסיבוב הבא בעוד {n} שנ׳',wins:'{name} מנצח',draw:'תיקו',final:'תוצאה סופית',last:'שניות אחרונות',ko:'KO'},
  ru:{lion:'Лев',rabbit:'Кролик',vs:'VS',round:'РАУНД',ready:'ПРИГОТОВЬТЕСЬ',fight:'Бой!',rest:'Перерыв',next:'СЛЕДУЮЩИЙ РАУНД ЧЕРЕЗ {n} С',wins:'{name} побеждает',draw:'Ничья',final:'ИТОГ',last:'ПОСЛЕДНИЕ СЕКУНДЫ',ko:'KO'}
 };
 function state(match,lang='en'){const w=words[lang]||words.en,s=match.snapshot(),seconds=Math.ceil(s.remaining),opening=s.phase==='round'&&match.roundTime<1.1;
  if(s.finisher?.hold)return {kind:'',text:'',sub:''}; // GOTR-0088: the Sunday Punch knockout plays first
  if(s.phase==='intro')return {kind:'versus',text:w.lion+' '+w.vs+' '+w.rabbit,sub:w.round+' '+s.round+' · '+w.ready};
  if(opening)return {kind:'fight',text:w.fight,sub:w.round+' '+s.round};
  if(s.phase==='rest')return {kind:'break',text:w.rest,sub:w.next.replace('{n}',Math.ceil(s.restRemaining))};
  if(s.result&&(s.phase==='ceremony'||s.phase==='scoring'&&(s.result.stoppage==='KO'||s.result.method==='KO')))return {kind:'winner',text:s.result.winner?w.wins.replace('{name}',w[s.result.winner]):w.draw,sub:(s.result.stoppage==='KO'||s.result.method==='KO')?'KO':w.final};
  if(s.phase==='round'&&seconds<=10&&seconds>0)return {kind:'countdown',text:String(seconds),sub:w.last,seconds};
  return {kind:'',text:'',sub:''};
 }
 class Clock {
  constructor(){this.seen=new WeakMap();}
  tick(match,playing){const p=state(match);if(!playing||p.kind!=='countdown')return null;let seen=this.seen.get(match);if(!seen){seen=new Set();this.seen.set(match,seen);}const key=match.round+':'+p.seconds;if(seen.has(key))return null;seen.add(key);return p.seconds;}
 }
 const api={state,Clock,words};if(typeof module!=='undefined')module.exports=api;else window.FightPresentation=api;
 if(typeof document==='undefined')return;
 function boot(){if(!window.fightUI||!window.app)return;const app=window.app,e=app.engine,clock=new Clock(),node=document.createElement('div'),title=document.createElement('strong'),sub=document.createElement('span');node.className='bout-announcement';node.hidden=true;node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.append(title,sub);document.getElementById('stageContainer').append(node);
  // GOTR-0095: the winner name is shown in full (never an ellipsis): shrink the type until the line fits the free part of the band; only then wrap.
  function fitWinner(box,strong,on){const st=strong.style;if(!st||!st.setProperty)return;st.removeProperty('font-size');st.removeProperty('white-space');if(!on||typeof requestAnimationFrame!=='function')return;
   requestAnimationFrame(()=>{let px=parseFloat(getComputedStyle(strong).fontSize)||18;while(box.scrollWidth>box.clientWidth+1&&px>11){px-=1;st.setProperty('font-size',px+'px','important');}if(box.scrollWidth>box.clientWidth+1)st.setProperty('white-space','normal','important');});}
  const oldRender=window.fightUI.render,oldHide=window.fightUI.hide;let key='';
  window.fightUI.render=view=>{oldRender(view);const w=words[app.lang]||words.en,p=state(view.match,app.lang),names=window.GameIdentity?.labels(view);if(names){if(p.kind==='versus')p.text=names.lion+' '+w.vs+' '+names.rabbit;if(p.kind==='winner'&&view.match.result?.winner)p.text=names[view.match.result.winner]+' '+(window.fightUI.words().winner||'wins');}if(p.kind==='winner'&&p.sub==='KO'){p.sub=p.text;p.text=w.ko;}const next=p.kind+'|'+p.text+'|'+p.sub;const tick=clock.tick(view.match,e.isPlaying);if(tick!=null)app.audio.countdown?.(tick);
   if(next===key)return;key=next;node.hidden=!p.kind||p.kind==='break'||e.targetMode!=='fight'; // the break countdown lives in the HUD timer (fight-ui.js), not over the fighters
   node.dataset.kind=p.kind;node.dataset.ko=String(p.kind==='winner'&&p.text===w.ko);title.textContent=p.text;sub.textContent=p.sub;fitWinner(node,title,p.kind==='winner'&&!node.hidden);node.setAttribute('aria-live',p.kind==='countdown'?'off':'polite');document.getElementById('fightHud').classList.toggle('fight-clock-urgent',p.kind==='countdown');
   // The result announcement replaces the old KO-only overlay.
   if(p.kind==='winner')document.getElementById('fightKnockout').hidden=true;
  };
  window.fightUI.hide=()=>{oldHide();node.hidden=true;key='';document.getElementById('fightHud').classList.toggle('fight-clock-urgent',false);};
  // GOTR-0086: a result line must never outlive its fight. Whatever path left the bout (story step change, modes menu,
  // home map), the announcement goes as soon as the engine is no longer in a fight.
  const stale=()=>{if(!node.hidden&&e.targetMode!=='fight'){node.hidden=true;key='';document.getElementById('fightHud')?.classList.toggle('fight-clock-urgent',false);}};
  setInterval(stale,250);window.fightUI.clearStale=stale;
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
