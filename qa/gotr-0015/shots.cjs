/* GOTR-0014/0015 evidence: screenshots of the main screens from the real app.
   Usage: APP_URL=http://127.0.0.1:8144 TAG=after node qa/gotr-0015/shots.cjs
   Optional: OUT=dir  VIEWS=phone,desk,small,land  LANGS=en,he,ru  SCREENS=fight,shop,academy
             PALETTE=A|B|C (alternative accents: token values only, see palettes.cjs). */
const {chromium}=require('playwright'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const URL=process.env.APP_URL||'http://127.0.0.1:8144',TAG=process.env.TAG||'after',OUT=path.resolve(process.env.OUT||__dirname),PALETTE=process.env.PALETTE||'';
const VIEWPORTS={phone:{width:393,height:852},small:{width:360,height:640},land:{width:852,height:393},desk:{width:1366,height:768}};
const views=(process.env.VIEWS||'phone,desk').split(','),langs=(process.env.LANGS||'en').split(',');
const PALETTES=require('./palettes.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const closeAll=()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());};
const SCREENS={
 train:async p=>{await p.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('watchMode')?.click();});},
 trainplay:async p=>{await p.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy',play:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelector('[data-input-page="moves"]')?.click();});},
 fight:async p=>{await p.evaluate(()=>{ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('playMode').click();document.querySelector('[data-input-page="moves"]').click();});},
 fightcombos:async p=>{await p.evaluate(()=>{ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('playMode').click();document.querySelector('[data-input-page="combos"]').click();});},
 shop:async p=>{await p.evaluate(()=>{ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.open('club');});},
 shopcombo:async p=>{await p.evaluate(()=>{ringfighterGame.open('club');document.querySelector('dialog[open] .store-category[data-category=combo]').click();});},
 academy:async p=>{await p.evaluate(()=>{ringfighterGame.quick();document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.open('learn');});},
 lesson:async p=>{await p.evaluate(()=>{ringfighterGame.open('learn');});await wait(900);await p.evaluate(()=>{const d=document.querySelector('dialog[open]');(d.querySelector('.academy-lesson .academy-start')||d.querySelector('.iq-body button'))?.click();});await wait(1500);},
 world:async p=>{await p.evaluate(()=>ringfighterGame.open('world'));},
 lab:async p=>{await p.evaluate(()=>ringfighterGame.open('lab'));},
 history:async p=>{await p.evaluate(()=>ringfighterGame.open('history'));},
 venues:async p=>{await p.evaluate(()=>ringfighterGame.open('venues'));},
 cup:async p=>{await p.evaluate(()=>ringfighterGame.open('cup'));},
 menu:async p=>{await p.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringsideLayout.setPanel('practice');document.getElementById('openTrainingDrawer').click();});},
 menumoves:async p=>{await p.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringsideLayout.setPanel('moves');document.getElementById('openTrainingDrawer').click();});},
 menusettings:async p=>{await p.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringsideLayout.setPanel('settings');document.getElementById('openTrainingDrawer').click();});},
 practice:async p=>{await p.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('openPracticeControls').click();});},
 profile:async p=>{await p.evaluate(()=>app.engine.career.profileDialog());},
 routine:async p=>{await p.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('combinationBtn').click();});},
 timing:async p=>{await p.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.getElementById('timingBtn').click();});},
 results:async p=>{await p.evaluate(()=>{ringfighterGame.startFight({watch:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());});await wait(1500);await p.evaluate(()=>app.engine.arena.fightView.match.finish('lion','points'));await p.waitForFunction(()=>{const r=document.getElementById('fightResults');return r&&!r.hidden;},null,{timeout:60000}).catch(()=>console.log('results panel did not appear'));},
 scorecards:async p=>{await p.evaluate(()=>{ringfighterGame.startFight({watch:true});document.querySelectorAll('dialog[open]').forEach(d=>d.close());});await wait(1500);await p.evaluate(()=>{app.engine.arena.fightView.match.finish('lion','points');fightUI.detail();});},
 fightsetup:async p=>{await p.evaluate(()=>{ringfighterGame.startTraining({mode:'heavy'});document.querySelectorAll('dialog[open]').forEach(d=>d.close());fightUI.configure();});}
};
const screens=(process.env.SCREENS||Object.keys(SCREENS).join(',')).split(',');
(async()=>{const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gotr15-'));const made=[];
 for(const view of views){const p=await b.newPage({viewport:VIEWPORTS[view]});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(URL);await p.waitForFunction(()=>window.ringfighterGame&&app.engine.coach?.anatomy,null,{timeout:120000});
  if(PALETTE)await p.addStyleTag({content:':root{'+Object.entries(PALETTES[PALETTE]).map(([k,v])=>k+':'+v).join(';')+'}'});
  for(const lang of langs)for(const s of screens){
   await p.evaluate(lang=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());ringfighterGame.close?.();app.setLanguage(lang);},lang);
   try{await SCREENS[s](p);}catch(e){console.log('SKIP',view,lang,s,e.message.split('\n')[0]);continue;}
   await wait(2600);const name=[TAG,PALETTE&&'palette'+PALETTE,view,s,lang].filter(Boolean).join('-'),png=path.join(tmp,name+'.png');await p.screenshot({path:png});made.push([png,path.join(OUT,name+'.webp')]);console.log('shot',name);}
  if(errors.length)console.log('PAGE ERRORS',view,errors);await p.close();}
 await b.close();
 execFileSync('python3',['-c','import sys,json\nfrom PIL import Image\nfor src,dst in json.loads(sys.argv[1]):\n Image.open(src).convert("RGB").save(dst,quality=int(sys.argv[2]),method=6)',JSON.stringify(made),process.env.QUALITY||'62']);
 fs.rmSync(tmp,{recursive:true,force:true});console.log('WROTE',made.length,'files to',OUT);})().catch(e=>{console.error('FAIL',e);process.exit(1);});
