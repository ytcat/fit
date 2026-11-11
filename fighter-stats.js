/* GOTR-0041: small expandable "Fighter" chip (Level, stars, Power/Speed/Stamina, rank). Reads the save; never writes. */
(() => {
 const copy={
  en:{chip:'Fighter',level:'Level',stars:'Stars',power:'Power',speed:'Speed',stamina:'Stamina',rank:'Rank',title:'Fighter',close:'Close',dev:'Development build: every chapter is open.',ranks:{Rookie:'Rookie',Amateur:'Amateur',Prospect:'Prospect',Contender:'Contender',Professional:'Professional',Champion:'Champion','World champion':'World champion'}},
  he:{chip:'לוחם',level:'רמה',stars:'כוכבים',power:'כוח',speed:'מהירות',stamina:'סיבולת',rank:'דרגה',title:'הלוחם',close:'סגירה',dev:'גרסת פיתוח: כל הפרקים פתוחים.',ranks:{Rookie:'טירון',Amateur:'חובב',Prospect:'מבטיח',Contender:'מתמודד',Professional:'מקצוען',Champion:'אלוף','World champion':'אלוף עולם'}},
  ru:{chip:'Боец',level:'Уровень',stars:'Звёзды',power:'Сила',speed:'Скорость',stamina:'Выносливость',rank:'Ранг',title:'Боец',close:'Закрыть',dev:'Версия разработки: все главы открыты.',ranks:{Rookie:'Новичок',Amateur:'Любитель',Prospect:'Перспективный',Contender:'Претендент',Professional:'Профессионал',Champion:'Чемпион','World champion':'Чемпион мира'}}
 };
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function mount(){
  if(document.getElementById('fighterStats'))return true;
  const host=document.querySelector('body header')?.lastElementChild;if(!host)return false;
  const root=make('div','fs-root'),chip=make('button','fs-chip'),panel=make('div','fs-panel');root.id='fighterStats';chip.id='fighterStatsChip';chip.type='button';chip.setAttribute('aria-expanded','false');panel.hidden=true;panel.setAttribute('role','group');
  root.append(chip,panel);host.prepend(root);
  const state=()=>{const e=window.app?.engine,store=e?.career?.store,p=store?.current(),g=p&&store.game(p),A=window.AdventureProgress;return g&&A?{A,store,p,g,species:e.coach?.species||'lion'}:null;};
  function paint(){
   const lang=copy[document.documentElement.lang]?document.documentElement.lang:'en',w=copy[lang],s=state();root.dir=lang==='he'?'rtl':'ltr';
   if(!s){chip.textContent=w.chip;panel.replaceChildren();return;}
   const sum=s.A.summary(s.g),rank=s.store.rank(s.species,s.p).name,max=s.A.rules.maxStat;
   chip.textContent=w.chip+' · '+w.level+' '+sum.level;chip.title=w.title;
   const rows=[[w.level,sum.level],[w.stars,sum.stars+' / '+sum.maxStars],[w.power,sum.stats.power+' / '+max],[w.speed,sum.stats.speed+' / '+max],[w.stamina,sum.stats.stamina+' / '+max],[w.rank,w.ranks[rank]||rank]];
   const list=make('dl','fs-list');for(const [k,v] of rows)list.append(make('dt','',k),make('dd','',String(v)));
   const nodes=[make('strong','fs-title',w.title),list];if(sum.free)nodes.push(make('p','fs-note',w.dev));
   const close=make('button','fs-close',w.close);close.type='button';close.onclick=()=>toggle(false);nodes.push(close);panel.replaceChildren(...nodes);
  }
  function toggle(open=panel.hidden){panel.hidden=!open;chip.setAttribute('aria-expanded',String(open));if(open)paint();}
  chip.onclick=()=>toggle();
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!panel.hidden)toggle(false);});
  document.addEventListener('pointerdown',ev=>{if(!panel.hidden&&!root.contains(ev.target))toggle(false);});
  new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  setInterval(paint,2500);paint();return true;
 }
 const start=()=>{let tries=0;const t=setInterval(()=>{if(mount()||++tries>40)clearInterval(t);},250);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
