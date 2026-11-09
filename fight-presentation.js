/* Match-driven announcements; one audible tick per round second, never on pause. */
(() => {
 function state(match){const s=match.snapshot(),seconds=Math.ceil(s.remaining),opening=s.phase==='round'&&match.roundTime<1.1;
  if(s.phase==='intro')return {kind:'versus',text:'Lion vs Rabbit',sub:'ROUND '+s.round+' · GET READY'};
  if(opening)return {kind:'fight',text:'Fight',sub:'ROUND '+s.round};
  if(s.phase==='rest')return {kind:'break',text:'Break',sub:'NEXT ROUND IN '+Math.ceil(s.restRemaining)+'s'};
  if(s.result&&(s.phase==='ceremony'||s.phase==='scoring'&&(s.result.stoppage==='KO'||s.result.method==='KO')))return {kind:'winner',text:s.result.winner?(s.result.winner==='lion'?'Lion Wins':'Rabbit Wins'):'Draw',sub:(s.result.stoppage==='KO'||s.result.method==='KO')?'KO':'FINAL RESULT'};
  if(s.phase==='round'&&seconds<=10&&seconds>0)return {kind:'countdown',text:String(seconds),sub:'FINAL SECONDS',seconds};
  return {kind:'',text:'',sub:''};
 }
 class Clock {
  constructor(){this.seen=new WeakMap();}
  tick(match,playing){const p=state(match);if(!playing||p.kind!=='countdown')return null;let seen=this.seen.get(match);if(!seen){seen=new Set();this.seen.set(match,seen);}const key=match.round+':'+p.seconds;if(seen.has(key))return null;seen.add(key);return p.seconds;}
 }
 const api={state,Clock};if(typeof module!=='undefined')module.exports=api;else window.FightPresentation=api;
 if(typeof document==='undefined')return;
 function boot(){if(!window.fightUI||!window.app)return;const app=window.app,e=app.engine,clock=new Clock(),node=document.createElement('div'),title=document.createElement('strong'),sub=document.createElement('span');node.className='bout-announcement';node.hidden=true;node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.append(title,sub);document.getElementById('stageContainer').append(node);
  const oldRender=window.fightUI.render,oldHide=window.fightUI.hide;let key='';
  window.fightUI.render=view=>{oldRender(view);const p=state(view.match),names=window.GameIdentity?.labels(view);if(names){if(p.kind==='versus')p.text=names.lion+' vs '+names.rabbit;if(p.kind==='winner'&&view.match.result?.winner)p.text=names[view.match.result.winner]+' '+(window.fightUI.words().winner||'wins');}if(p.kind==='winner'&&p.sub==='KO'){p.sub=p.text;p.text='KO';}const next=p.kind+'|'+p.text+'|'+p.sub;const tick=clock.tick(view.match,e.isPlaying);if(tick!=null)app.audio.countdown?.(tick);
   if(next===key)return;key=next;node.hidden=!p.kind;node.dataset.kind=p.kind;node.dataset.ko=String(p.text==='KO');title.textContent=p.text;sub.textContent=p.sub;node.setAttribute('aria-live',p.kind==='countdown'?'off':'polite');document.getElementById('fightHud').classList.toggle('fight-clock-urgent',p.kind==='countdown');
   // The result announcement replaces the old KO-only overlay.
   if(p.kind==='winner')document.getElementById('fightKnockout').hidden=true;
  };
  window.fightUI.hide=()=>{oldHide();node.hidden=true;key='';document.getElementById('fightHud').classList.toggle('fight-clock-urgent',false);};
 }
 if(document.readyState==='loading'||!window.app)document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
