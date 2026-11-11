// GOTR-0046 i18n audit: walks the main screens and states in Hebrew and Russian and lists every visible
// text node that still contains Latin letters. Allowed: the glossary terms (glossary.js: the game name and
// boxing terms that stay in English), the version number, numbers and coins, names the player typed, and
// the language switcher's own names (EN / עב / РУ). Usage: node qa/gotr-0046/i18n-audit.cjs [port] [langs=he,ru]  (serve the repo root first)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const port=process.argv[2]||'8146',langs=(process.argv[3]||'he,ru').split(','),url='http://127.0.0.1:'+port+'/',out=__dirname;
const TYPED=['Maya'];// a typed player name (Latin) used for the second player
const GLOSSARY=require('../../glossary.js').terms;// the game name and boxing terms that stay in English (GOTR-0046)
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// Runs in the page: visible text nodes with Latin letters after removing allowed tokens.
function collect([typed,terms]){
 const allowed=t=>{let s=t.replace(/[\u2068\u2069]/g,'').replace(/\bv\d+(\.\d+)+\b/g,'');for(const name of [...typed,...terms])s=s.split(name).join(' ');return /[A-Za-z]/.test(s);};
 const found=new Set();const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while((n=walker.nextNode())){const text=n.nodeValue.replace(/\s+/g,' ').trim();if(!text||!/[A-Za-z]/.test(text))continue;const el=n.parentElement;if(!el||el.closest('script,style,noscript,template'))continue;
  // The language switcher names each language in that language (EN / עב / РУ).
  if(el.closest('#langEN,#langHE,#langRU'))continue;
  if(el.checkVisibility&&!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;if(!el.getClientRects().length)continue;if(!allowed(text))continue;found.add(text.slice(0,120));}
 return [...found];
}
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const report={};let total=0;
 try{for(const lang of langs){const findings=new Map(),errors=[];const ctx=await b.newContext({viewport:{width:402,height:690},deviceScaleFactor:1,hasTouch:true,isMobile:true});await ctx.addInitScript(l=>{try{if(!sessionStorage.getItem('audit')){localStorage.setItem('shadowbox-language',l);sessionStorage.setItem('audit','1');}}catch{}},lang);
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url,{timeout:180000});await p.waitForFunction(()=>window.ringfighterGame&&window.app&&app.engine.coach?.anatomy,null,{timeout:240000,polling:500});await wait(1500);
  const states=[];const snap=async(state,js,ms=700)=>{try{if(js)await p.evaluate(js);}catch(e){errors.push(state+': '+e.message);}await wait(ms);const list=await p.evaluate(collect,[TYPED,GLOSSARY]);states.push(state);for(const t of list){if(!findings.has(t))findings.set(t,[]);findings.get(t).push(state);}};
  const closeAll=`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`;
  await snap('first-run');
  await snap('train-home',`document.querySelector('dialog[open] .career-create .club-primary').click()`,1200);
  for(const mode of ['none','heavy','dummy','speed','rope','pads','rabbit'])await snap('station-'+mode,`trainingControls.chooseTarget('${mode}')`,1500);
  await snap('heavy-moves',`trainingControls.chooseTarget('heavy');document.querySelector('[data-input-page=moves]')?.click()`,1200);
  await snap('heavy-combos',`document.querySelector('[data-input-page=combos]')?.click()`);
  await snap('heavy-defence',`document.querySelector('[data-input-page=defence]')?.click()`);
  await snap('auto',`document.getElementById('compactControlMode').click()`);
  await snap('play-again',`document.getElementById('compactControlMode').click()`);
  for(const tab of ['practice','moves','settings'])await snap('drawer-'+tab,`if(!document.getElementById('trainingDrawer').open)document.getElementById('openTrainingDrawer').click();document.querySelector('[data-menu-tab=${tab}]').click()`);
  await snap('settings',`document.getElementById('openPracticeControls').click()`);
  await snap('stats',`${closeAll};document.querySelector('.career-stats-link').click()`);
  await snap('training-active',`${closeAll};document.querySelector('[data-input-page=moves]')?.click();document.getElementById('startTraining').click();document.querySelector('[data-input-move=jab]')?.click()`,2500);
  await snap('training-finished',`document.getElementById('startTraining').click()`,2000);
  await snap('bout-picker',`${closeAll};[...document.querySelectorAll('.game-nav-button')][1].click()`,1200);
  await snap('fight-intro',`document.querySelector('dialog[open] [data-fight-preset=quick]').click()`,3000);
  await snap('fight-round',`const v=app.engine.arena.fightView,m=v.match;let n=0;while(m.phase!=='round'&&n<2400){v.step();n++;}document.querySelector('[data-input-move=jab]')?.click();for(let i=0;i<90;i++)v.step();`,1500);
  await snap('fight-result',`const v=app.engine.arena.fightView,m=v.match;let n=0;while(!(m.result&&m.phase==='ceremony'&&m.snapshot().cardsShown>=3)&&n<6000){v.step();n++;}for(let i=0;i<600;i++)v.step();`,2500);
  await snap('fight-reward',`${closeAll}`,1000);
  await snap('shop',`${closeAll};ringfighterGame.open('club')`,2500);
  for(let i=0;i<6;i++)await snap('shop-category-'+i,`const c=document.querySelectorAll('dialog[open] .store-categories button')[${i}];c?.click();document.querySelector('dialog[open] .store-products button, dialog[open] .store-product')?.click()`,1200);
  await snap('history',`${closeAll};ringfighterGame.open('history')`,1200);
  await snap('loadouts',`${closeAll};ringfighterGame.open('lab')`,1500);
  await snap('academy',`${closeAll};ringfighterGame.open('learn')`,2500);
  await snap('academy-groups',`document.querySelectorAll('dialog[open] details').forEach(d=>d.open=true)`);
  await snap('academy-quiz',`${closeAll};ringfighterGame.open('learn',{challengeId:'IQ-C01'})`,3500);
  await snap('lesson',`${closeAll};AcademyStage.start('first_rhythm')`,3500);
  await snap('lesson-turn',`document.querySelector('.academy-hud [data-act=turn]')?.click()`,1500);
  await snap('lesson-left',`document.querySelector('.academy-hud [data-act=leave]')?.click()`,1000);
  for(const panel of ['train','school','rivals','cup','events'])await snap('world-'+panel,`if(!document.querySelector('dialog[open] .world-tabs'))ringfighterGame.open('world');document.querySelector('dialog[open] .world-tab[data-panel=${panel}]')?.click();document.querySelectorAll('dialog[open] details').forEach(d=>d.open=true)`,1200);
  await snap('venues',`${closeAll};ringfighterGame.open('venues')`,2000);
  await snap('profile',`${closeAll};document.getElementById('playerProfile').click();document.querySelectorAll('dialog[open] details').forEach(d=>d.open=true)`);
  await snap('second-player',`const d=document.querySelector('dialog[open]');d.querySelector('.career-add-group input').value='Maya';d.querySelector('.career-add-group .club-primary').click()`,1500);
  await snap('fight-as-maya',`${closeAll};ringfighterGame.quick()`,3000);
  await ctx.close();
  report[lang]={states,findings:Object.fromEntries([...findings].sort((a,b)=>a[0].localeCompare(b[0]))),errors};total+=findings.size;
  console.log(`\n== ${lang.toUpperCase()}: ${findings.size} visible texts with Latin letters across ${states.length} states`+(errors.length?` · ${errors.length} script errors`:''));for(const [t,s] of findings)console.log(`  "${t}"  [${[...new Set(s)].slice(0,4).join(', ')}${s.length>4?', …':''}]`);for(const e of errors)console.log('  ERROR '+e);}
 }finally{await b.close();}
 fs.writeFileSync(path.join(out,'audit-result.json'),JSON.stringify(report,null,1)+'\n');console.log(`\nTOTAL findings: ${total}`);process.exit(0);
})().catch(e=>{console.error(e);process.exit(2);});
